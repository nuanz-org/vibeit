"""
In-process Create generation worker (M3e).

Invoked via FastAPI BackgroundTasks after POST /jobs.
Updates job status/phase while running the repair-capable agent runner.
"""

from __future__ import annotations

import traceback
from typing import Any

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.llm.openrouter import ASAP_CODEGEN_MODEL, OpenRouterLLMClient
from adapters.llm.protocol import LLMClient, LLMConfigError
from agent.runner import run_create_with_repairs
from agent.state import CreateGraphState
from core.config import Settings, get_settings
from services.finalize_job import finalize_from_agent_state


def _build_llm(settings: Settings) -> LLMClient:
    if not settings.openrouter_api_key:
        raise LLMConfigError("OPENROUTER_API_KEY missing for generation worker")
    return OpenRouterLLMClient(
        api_key=settings.openrouter_api_key,
        default_model=ASAP_CODEGEN_MODEL,
        timeout_seconds=settings.llm_timeout_seconds,
        http_referer=settings.llm_http_referer or None,
        app_title=settings.llm_app_title or "Vibeit",
    )


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

        state = await run_create_with_repairs(
            vision_text=job.vision_text,
            llm=client,
            use_fixture_code=use_fixture_code,
            max_repairs=max_repairs,
            wall_time_seconds=wall,
            job_id=str(job.id),
            tool_id=str(job.tool_id) if job.tool_id else None,
            on_phase=on_phase,
        )
        await finalize_from_agent_state(
            job_id=job_id,
            state=state,
            jobs=jobs,
            tools=tools,
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
