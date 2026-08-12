"""
Finalize Create job after agent runner (M3e).

Success: tool_versions row + job succeeded + auto-publish to public gallery.
Failure: job failed; optional salvage version from best_valid_code (stays draft).
"""

from __future__ import annotations

from typing import Any

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import GenerationJobRow, ToolVersionRow
from agent.state import CreateGraphState
from domain.chat_messages import (
    assistant_error_message,
    assistant_refine_message,
    assistant_success_message,
)
from domain.job_status import IllegalJobTransition, assert_job_transition
from services.create_job import JobNotFoundError
from services.quota import estimate_cost_cents


def _defaults_from_plan(plan: dict[str, Any] | None) -> dict[str, Any]:
    if not plan or not isinstance(plan.get("params"), list):
        return {}
    out: dict[str, Any] = {}
    for p in plan["params"]:
        if isinstance(p, dict) and p.get("name") is not None:
            out[str(p["name"])] = p.get("default")
    return out


async def finalize_from_agent_state(
    *,
    job_id: str,
    state: CreateGraphState,
    jobs: JobsRepository,
    tools: ToolsRepository,
    cost_cents_per_million_tokens: int = 15,
) -> GenerationJobRow:
    """
    Persist outcome of run_create_with_repairs.

    - ready_for_finalize + smoke_ok → succeeded + version from code
    - else → failed; if best_valid_code, write salvage version on draft tool
    """
    job = await jobs.get_job(job_id)
    if job is None:
        raise JobNotFoundError(job_id)

    # Ensure running → terminal transition is legal
    if job.status == "queued":
        await jobs.update_job_status(job_id, status="running", phase="finalize")
        job = await jobs.get_job(job_id) or job

    tokens = state.get("llm_tokens_used")
    repairs = state.get("repair_count")
    plan = state.get("plan") if isinstance(state.get("plan"), dict) else None
    code = (state.get("code") or "").strip()
    best = (state.get("best_valid_code") or "").strip()

    success = bool(
        state.get("ready_for_finalize")
        and state.get("smoke_ok")
        and state.get("validate_ok")
        and code
    )

    token_count = int(tokens or 0)
    cost = estimate_cost_cents(
        token_count,
        cents_per_million=cost_cents_per_million_tokens,
    )

    if success:
        assert_job_transition(job.status, "succeeded")
        # AM7 refine may carry updated default_params without plan regen
        defaults = state.get("default_params")
        if not isinstance(defaults, dict):
            defaults = _defaults_from_plan(plan)
        param_schema = state.get("param_schema")
        if not isinstance(param_schema, list):
            param_schema = plan.get("params") if plan else []
        asset_slots = state.get("asset_slots")
        if not isinstance(asset_slots, list):
            asset_slots = plan.get("assetSlots") if plan else []
        target = (state.get("target") or "canvas2d") or "canvas2d"
        job_kind = getattr(job, "job_kind", None) or "create"
        tool_id = job.tool_id or state.get("tool_id")
        base_code = (state.get("base_code") or "").strip()
        needs_version = state.get("needs_version")
        if needs_version is None:
            needs_version = True
        # Capability draft-only: skip new version when code unchanged
        write_version = bool(needs_version) or (code != base_code) or job_kind != "refine"
        if job_kind == "refine" and not write_version and code == base_code:
            write_version = False

        version: ToolVersionRow | None = None
        if write_version:
            version = await tools.create_tool_version(
                tool_id=tool_id,  # type: ignore[arg-type]
                target=str(target),
                code=code,
                param_schema=param_schema or [],
                default_params=defaults or {},
                asset_slots=asset_slots or [],
                plan=plan,
            )
        elif tool_id is not None:
            # Keep latest version pointer for result API
            version = await tools.get_latest_tool_version(tool_id)

        # Merge draft param patches from capability agent
        draft_patch = state.get("draft_params_patch")
        if (
            tool_id is not None
            and isinstance(draft_patch, dict)
            and draft_patch
        ):
            try:
                existing = await tools.get_tool_by_id(tool_id)
                prev = (
                    dict(existing.draft_params)
                    if existing and isinstance(existing.draft_params, dict)
                    else {}
                )
                prev.update(draft_patch)
                await tools.update_tool_draft_state(
                    tool_id,
                    draft_params=prev,
                )
            except Exception:  # noqa: BLE001
                pass

        updated = await jobs.update_job_status(
            job_id,
            status="succeeded",
            error_code=None,
            error_message=None,
            repairs_used=int(repairs or 0),
            phase="finalize",
            tokens_used=token_count if tokens is not None else None,
            clear_errors=True,
        )
        if updated is None:
            raise JobNotFoundError(job_id)
        if tokens is not None or cost:
            await jobs.update_job_usage(
                job_id,
                tokens_used=token_count if tokens is not None else None,
                cost_cents=cost if tokens is not None else None,
                repairs_used=int(repairs or 0),
            )
            updated = await jobs.get_job(job_id) or updated

        explain = state.get("explain")
        ops_applied = state.get("ops_applied")
        success_msg = (
            assistant_refine_message(
                str(explain) if isinstance(explain, str) and explain.strip() else "",
                meta={
                    "ops": ops_applied if isinstance(ops_applied, list) else [],
                    "versionId": str(version.id) if version else None,
                    "jobId": str(job.id),
                    "needsVersion": bool(write_version),
                },
            )
            if job_kind == "refine"
            else assistant_success_message(job_kind=str(job_kind))
        )
        try:
            with_msg = await jobs.append_job_messages(job_id, [success_msg])
            if with_msg is not None:
                updated = with_msg
        except Exception:  # noqa: BLE001 — history is best-effort
            pass

        # Tool-scoped continuous chat
        if job_kind == "refine" and tool_id is not None:
            try:
                await tools.append_chat_messages(tool_id, [success_msg])
            except Exception:  # noqa: BLE001
                pass

        # Public by default when a new version was written
        if (
            write_version
            and version is not None
            and tool_id is not None
            and job.owner_user_id
        ):
            await tools.set_tool_published(
                tool_id,
                owner_user_id=job.owner_user_id,
                published_version_id=version.id,
                gallery_ready=True,
            )
        return updated

    # --- fail / salvage ---
    salvage_written: ToolVersionRow | None = None
    salvage_code = best or ""
    # Only salvage code that passed static validate at some point
    if salvage_code and job.tool_id is not None:
        salvage_written = await tools.create_tool_version(
            tool_id=job.tool_id,
            target="canvas2d",
            code=salvage_code,
            param_schema=plan.get("params") if plan else [],
            default_params=_defaults_from_plan(plan),
            asset_slots=plan.get("assetSlots") if plan else [],
            plan=plan,
        )

    err_code = state.get("error_code") or "GENERATION_FAILED"
    err_msg = state.get("error_message") or "create pipeline failed"
    if salvage_written is not None:
        err_msg = (
            f"{err_msg} | salvage_draft=true toolId={job.tool_id} "
            f"versionId={salvage_written.id}"
        )

    # Append refine failure to tool chat history
    if (getattr(job, "job_kind", None) or "create") == "refine" and job.tool_id:
        try:
            fail_msg = assistant_error_message(
                error_message=err_msg,
                error_code=str(err_code) if err_code else None,
            )
            await tools.append_chat_messages(job.tool_id, [fail_msg])
        except Exception:  # noqa: BLE001
            pass

    if job.status not in ("failed", "succeeded"):
        try:
            assert_job_transition(job.status, "failed")
        except IllegalJobTransition:
            # already terminal somehow
            pass

    updated = await jobs.update_job_status(
        job_id,
        status="failed",
        error_code=str(err_code),
        error_message=err_msg,
        repairs_used=int(repairs or 0),
        phase="finalize",
        tokens_used=token_count if tokens is not None else None,
        clear_errors=True,
    )
    if updated is None:
        raise JobNotFoundError(job_id)
    if tokens is not None:
        await jobs.update_job_usage(
            job_id,
            tokens_used=token_count,
            cost_cents=cost,
            repairs_used=int(repairs or 0),
        )
        updated = await jobs.get_job(job_id) or updated
    try:
        with_msg = await jobs.append_job_messages(
            job_id,
            [
                assistant_error_message(
                    error_message=err_msg,
                    error_code=str(err_code) if err_code else None,
                )
            ],
        )
        if with_msg is not None:
            updated = with_msg
    except Exception:  # noqa: BLE001 — history is best-effort
        pass
    return updated
