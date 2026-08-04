"""
Finalize Create job after agent runner (M3e).

Success: tool_versions row + job succeeded (draft tool, not published).
Failure: job failed; optional salvage version from best_valid_code.
"""

from __future__ import annotations

from typing import Any

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import GenerationJobRow, ToolVersionRow
from agent.state import CreateGraphState
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
        version = await tools.create_tool_version(
            tool_id=job.tool_id or state.get("tool_id"),  # type: ignore[arg-type]
            target="canvas2d",
            code=code,
            param_schema=plan.get("params") if plan else [],
            default_params=_defaults_from_plan(plan),
            asset_slots=plan.get("assetSlots") if plan else [],
            plan=plan,
        )
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
        # attach version id is not on job row — result uses latest version
        _ = version
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
    return updated
