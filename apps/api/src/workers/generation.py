"""
In-process Create generation worker (M3e).

Invoked via FastAPI BackgroundTasks after POST /jobs.
Updates job status/phase while running the repair-capable agent runner.
"""

from __future__ import annotations

import base64
import json
import traceback
from typing import Any

from adapters.db.repositories.assets import AssetsRepository
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.llm.openrouter import OpenRouterLLMClient
from adapters.llm.protocol import LLMClient, LLMConfigError
from adapters.llm.router import (
    assert_allowed_model,
    reset_role_overrides,
    set_role_overrides,
)
from adapters.storage import create_storage
from agent.clarify_parse import clarify_has_result
from agent.nodes.clarify import clarify_node
from agent.runner import run_create_with_repairs, run_refine_with_repairs
from agent.state import CreateGraphState
from core.config import Settings, get_settings
from domain.job_status import assert_job_transition
from services.finalize_job import finalize_from_agent_state
from services.refine_job import base_version_payload

def _build_llm(settings: Settings) -> LLMClient:
    if not settings.openrouter_api_key:
        raise LLMConfigError("OPENROUTER_API_KEY missing for generation worker")
    default = assert_allowed_model(
        settings.llm_model_codegen or settings.llm_default_model
    )
    return OpenRouterLLMClient(
        api_key=settings.openrouter_api_key,
        default_model=default,
        timeout_seconds=settings.llm_timeout_seconds,
        http_referer=settings.llm_http_referer or None,
        app_title=settings.llm_app_title or "Vibeit",
    )


def _parse_inspiration_ids(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return [raw] if raw.strip() else []
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
    return out[:4]


async def _load_inspiration_images(
    *,
    asset_ids: list[str],
    owner_user_id: str,
    pool: Any,
    settings: Settings,
) -> list[dict[str, Any]]:
    """Load inspiration assets as base64 payloads for style extract (AM5)."""
    if not asset_ids:
        return []
    assets = AssetsRepository(pool)
    storage = create_storage(
        backend=settings.storage_backend,
        local_root=settings.storage_local_root,
        public_base_url=settings.api_public_base_url,
    )
    images: list[dict[str, Any]] = []
    for aid in asset_ids[:4]:
        row = await assets.get_asset_for_owner(aid, owner_user_id=owner_user_id)
        if row is None or row.kind != "inspiration":
            continue
        obj = await storage.get_object(row.storage_key)
        if not obj:
            continue
        data, content_type = obj
        if not data:
            continue
        images.append(
            {
                "asset_id": str(row.id),
                "content_type": content_type or row.content_type or "image/png",
                "base64": base64.b64encode(data).decode("ascii"),
            }
        )
    return images


async def run_generation_job(
    job_id: str,
    *,
    pool: Any,
    settings: Settings | None = None,
    llm: LLMClient | None = None,
    use_fixture_code: bool = False,
) -> None:
    """
    Execute create pipeline for a queued job and finalize.

    `use_fixture_code=True` is for tests (no LLM).
    """
    settings = settings or get_settings()
    jobs = JobsRepository(pool)
    tools = ToolsRepository(pool)

    job = await jobs.get_job(job_id)
    if job is None:
        print(f"[worker] job {job_id} not found")
        return
    if job.status not in ("queued", "running"):
        print(f"[worker] job {job_id} status={job.status} — skip")
        return

    await jobs.update_job_status(
        job_id,
        status="running",
        phase="ingest",
        clear_errors=True,
        error_code=None,
        error_message=None,
    )

    async def on_phase(phase: str, state: CreateGraphState) -> None:
        await jobs.update_job_phase(
            job_id,
            phase=phase,
            repairs_used=int(state.get("repair_count") or 0),
            tokens_used=int(state.get("llm_tokens_used") or 0) or None,
        )

    override_token = None
    try:
        client = llm
        if not use_fixture_code and client is None:
            client = _build_llm(settings)

        wall = float(
            getattr(settings, "create_wall_time_seconds", None)
            or getattr(settings, "llm_timeout_seconds", 60)
            or 60
        )
        # Prefer dedicated wall budget if present
        if hasattr(settings, "create_wall_time_seconds"):
            wall = float(settings.create_wall_time_seconds)

        max_repairs = int(
            getattr(settings, "create_repair_max", None) or job.repair_budget or 3
        )

        job_kind = getattr(job, "job_kind", None) or "create"

        # User-selected Create model drives plan + codegen + repair for this job.
        job_model = getattr(job, "llm_model", None)
        if isinstance(job_model, str) and job_model.strip():
            mid = job_model.strip()
            print(f"[worker] job {job_id} llm_model={mid}")
            override_token = set_role_overrides(
                {"plan": mid, "codegen": mid, "repair": mid}
            )

        if job_kind == "refine":
            if job.tool_id is None:
                await jobs.update_job_status(
                    job_id,
                    status="failed",
                    error_code="VALIDATION_FAILED",
                    error_message="refine job missing tool_id",
                    phase="finalize",
                    clear_errors=True,
                )
                return
            base_vid = getattr(job, "base_version_id", None)
            if base_vid is not None:
                version = await tools.get_tool_version(base_vid)
            else:
                version = await tools.get_latest_tool_version(job.tool_id)
            if version is None or not (version.code or "").strip():
                await jobs.update_job_status(
                    job_id,
                    status="failed",
                    error_code="VALIDATION_FAILED",
                    error_message="refine base version missing or empty",
                    phase="finalize",
                    clear_errors=True,
                )
                return
            payload = base_version_payload(version)
            refine_wall = float(
                getattr(settings, "refine_wall_time_seconds", None) or wall
            )
            state = await run_refine_with_repairs(
                chat_message=job.vision_text,
                base_code=payload["base_code"],
                llm=client,
                base_plan=payload["base_plan"],
                base_default_params=payload["base_default_params"],
                base_param_schema=payload["base_param_schema"],
                base_asset_slots=payload["base_asset_slots"],
                base_version_id=payload["base_version_id"],
                target=payload["target"],
                max_repairs=max_repairs,
                wall_time_seconds=refine_wall,
                job_id=str(job.id),
                tool_id=str(job.tool_id),
                on_phase=on_phase,
            )
        else:
            # A3 planMode: clarify-only pass when answers not yet folded
            plan_mode = bool(getattr(job, "plan_mode", False))
            clarify_bag = (
                job.clarify if isinstance(getattr(job, "clarify", None), dict) else {}
            )
            if (
                plan_mode
                and not use_fixture_code
                and not clarify_has_result(clarify_bag)
            ):
                await jobs.update_job_phase(job_id, phase="clarify")
                if client is None:
                    await jobs.update_job_status(
                        job_id,
                        status="failed",
                        error_code="INTERNAL",
                        error_message="LLM client required for clarify",
                        phase="clarify",
                        clear_errors=True,
                    )
                    return
                clarify_state: CreateGraphState = {
                    "vision_text": job.vision_text,
                    "llm_tokens_used": int(job.tokens_used or 0),
                    "phase": "clarify",
                }
                clarify_updates = await clarify_node(clarify_state, llm=client)
                tokens = int(clarify_updates.get("llm_tokens_used") or 0) or None
                if clarify_updates.get("error_code"):
                    await jobs.update_job_status(
                        job_id,
                        status="failed",
                        error_code=str(clarify_updates.get("error_code")),
                        error_message=str(
                            clarify_updates.get("error_message") or "clarify failed"
                        )[:500],
                        phase="clarify",
                        tokens_used=tokens,
                        clear_errors=True,
                    )
                    return

                payload = clarify_updates.get("clarify_payload") or {}
                questions = (
                    payload.get("questions")
                    if isinstance(payload, dict)
                    else None
                )
                if not isinstance(questions, list):
                    questions = []
                new_clarify: dict[str, Any] = {
                    **(clarify_bag if isinstance(clarify_bag, dict) else {}),
                    "understanding": (
                        payload.get("understanding")
                        if isinstance(payload, dict)
                        else None
                    ),
                    "questions": questions,
                }
                if isinstance(payload, dict) and payload.get("skipReason"):
                    new_clarify["skipReason"] = payload["skipReason"]

                # No questions → skip pause; mark answered empty and continue build
                if not questions:
                    new_clarify["answered"] = True
                    new_clarify["result"] = {
                        "transcript": (
                            f"Understanding: {new_clarify.get('understanding') or ''}"
                        ).strip(),
                        "forcedEnums": [],
                        "lockedNotes": [],
                        "summary": "No clarify questions needed",
                    }
                    await jobs.update_job_clarify(
                        job_id,
                        clarify=new_clarify,
                        phase="plan",
                        tokens_used=tokens,
                    )
                    # Fall through to full create with empty clarify result
                    job = await jobs.get_job(job_id) or job
                    clarify_bag = new_clarify
                else:
                    assert_job_transition("running", "awaiting_clarify")
                    await jobs.update_job_clarify(
                        job_id,
                        clarify=new_clarify,
                        status="awaiting_clarify",
                        phase="clarify",
                        tokens_used=tokens,
                        clear_errors=True,
                    )
                    print(
                        f"[worker] job {job_id} awaiting_clarify "
                        f"({len(questions)} questions)"
                    )
                    return

            insp_ids = _parse_inspiration_ids(job.inspiration_asset_ids)
            insp_images: list[dict[str, Any]] = []
            if not use_fixture_code and insp_ids:
                try:
                    insp_images = await _load_inspiration_images(
                        asset_ids=insp_ids,
                        owner_user_id=job.owner_user_id,
                        pool=pool,
                        settings=settings,
                    )
                except Exception as load_exc:  # noqa: BLE001 — soft fail style path
                    print(f"[worker] inspiration load failed: {load_exc}")

            clarify_result = None
            if plan_mode and isinstance(clarify_bag, dict):
                result = clarify_bag.get("result")
                if isinstance(result, dict):
                    clarify_result = result

            state = await run_create_with_repairs(
                vision_text=job.vision_text,
                llm=client,
                use_fixture_code=use_fixture_code,
                max_repairs=max_repairs,
                wall_time_seconds=wall,
                job_id=str(job.id),
                tool_id=str(job.tool_id) if job.tool_id else None,
                inspiration_asset_ids=insp_ids,
                inspiration_images=insp_images,
                plan_mode=plan_mode,
                clarify_result=clarify_result,
                on_phase=on_phase,
            )

        await finalize_from_agent_state(
            job_id=job_id,
            state=state,
            jobs=jobs,
            tools=tools,
            cost_cents_per_million_tokens=settings.create_cost_cents_per_million_tokens,
        )
    except Exception as exc:  # noqa: BLE001 — worker must not crash process
        print(f"[worker] job {job_id} crashed: {exc}")
        traceback.print_exc()
        try:
            await jobs.update_job_status(
                job_id,
                status="failed",
                error_code="INTERNAL",
                error_message=str(exc)[:500],
                phase="finalize",
                clear_errors=True,
            )
        except Exception:  # noqa: BLE001
            pass
    finally:
        if override_token is not None:
            reset_role_overrides(override_token)
