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
from adapters.llm.router import assert_allowed_model
from adapters.storage import create_storage
from agent.runner import run_create_with_repairs
from agent.state import CreateGraphState
from core.config import Settings, get_settings
from services.finalize_job import finalize_from_agent_state


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
