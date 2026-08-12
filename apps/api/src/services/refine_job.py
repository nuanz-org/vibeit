"""
AM7 — enqueue Control refine jobs (chat → patch → gates → new version).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import GenerationJobRow, ToolRow, ToolVersionRow
from core.config import Settings
from domain.chat_messages import user_refine_message
from services.create_job import (
    CreateJobError,
    CreateJobResult,
    JobNotFoundError,
    QuotaExceededError,
    _utc_iso,
)
from services.quota import QuotaSnapshot, get_quota_snapshot
from services.refine_context import build_refine_context_pack


class RefineJobError(CreateJobError):
    """Base for refine enqueue failures."""


class ToolNotFoundError(RefineJobError):
    """Tool missing or not owned (map to 404)."""


class NoVersionError(RefineJobError):
    """Tool has no version to patch (map to 409)."""


class RefineBudgetExceededError(RefineJobError):
    """Per-tool refine session budget exhausted (map to 429)."""

    def __init__(self, message: str, *, used: int, limit: int) -> None:
        super().__init__(message)
        self.used = used
        self.limit = limit


@dataclass(frozen=True, slots=True)
class RefineJobResult:
    job: GenerationJobRow
    tool: ToolRow
    base_version: ToolVersionRow
    refine_used: int
    refine_limit: int


def _defaults_from_version(version: ToolVersionRow) -> dict[str, Any]:
    raw = version.default_params
    return dict(raw) if isinstance(raw, dict) else {}


def _schema_from_version(version: ToolVersionRow) -> list[Any]:
    raw = version.param_schema
    return list(raw) if isinstance(raw, list) else []


def _slots_from_version(version: ToolVersionRow) -> list[Any]:
    raw = version.asset_slots
    return list(raw) if isinstance(raw, list) else []


def _plan_from_version(version: ToolVersionRow) -> dict[str, Any] | None:
    raw = version.plan
    return dict(raw) if isinstance(raw, dict) else None


async def enqueue_refine_job(
    *,
    owner_user_id: str,
    tool_id: str,
    chat_message: str,
    tools: ToolsRepository,
    jobs: JobsRepository,
    settings: Settings | None = None,
    base_version_id: str | None = None,
    client_params: dict[str, Any] | None = None,
    skip_budget: bool = False,
) -> RefineJobResult:
    """
    Enqueue a refine job against an owned tool's version.

    Does not create a new draft tool. Does not count against daily create quota
    (refine has its own per-tool session budget).
    """
    message = (chat_message or "").strip()
    if not message:
        raise ValueError("message is required")

    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != owner_user_id:
        raise ToolNotFoundError(tool_id)

    if base_version_id:
        version = await tools.get_tool_version(base_version_id)
        if version is None or str(version.tool_id) != str(tool.id):
            raise NoVersionError("base version not found for tool")
    else:
        version = await tools.get_latest_tool_version(tool.id)
        if version is None:
            raise NoVersionError("tool has no version to refine")

    if not (version.code or "").strip():
        raise NoVersionError("base version has empty source")

    refine_limit = 20
    window_hours = 24
    if settings is not None:
        refine_limit = int(getattr(settings, "refine_budget_per_tool", 20) or 20)
        window_hours = int(getattr(settings, "refine_budget_window_hours", 24) or 24)

    since = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    used = 0
    if not skip_budget:
        try:
            used = await jobs.count_refine_jobs_for_tool_since(
                tool_id=tool.id,
                owner_user_id=owner_user_id,
                since_utc=since,
            )
        except Exception:  # noqa: BLE001 — column may be missing pre-migrate
            used = 0
        if used >= refine_limit:
            raise RefineBudgetExceededError(
                f"Refine budget exceeded ({used}/{refine_limit} in "
                f"{window_hours}h for this tool)",
                used=used,
                limit=refine_limit,
            )

    repair_budget = 3
    token_budget: int | None = None
    if settings is not None:
        repair_budget = int(settings.create_repair_max)
        token_budget = settings.create_token_budget

    user_meta: dict[str, Any] | None = None
    if isinstance(client_params, dict) and client_params:
        user_meta = {"clientParams": client_params}
    user_msg = user_refine_message(message, meta=user_meta)

    # Tool-scoped continuous history (source of truth for Studio)
    try:
        await tools.append_chat_messages(tool.id, [user_msg])
        refreshed = await tools.get_tool_by_id(tool.id)
        if refreshed is not None:
            tool = refreshed
    except Exception:  # noqa: BLE001 — pre-migrate column
        pass

    job = await jobs.create_job(
        owner_user_id=owner_user_id,
        vision_text=message,
        inspiration_asset_ids=None,
        tool_id=tool.id,
        repair_budget=repair_budget,
        status="queued",
        token_budget=token_budget,
        job_kind="refine",
        base_version_id=version.id,
        message_history=[user_msg],
    )

    return RefineJobResult(
        job=job,
        tool=tool,
        base_version=version,
        refine_used=used + 1,
        refine_limit=refine_limit,
    )


def base_version_payload(version: ToolVersionRow) -> dict[str, Any]:
    """Artifacts the refine runner needs from the base version."""
    return {
        "base_code": version.code or "",
        "base_plan": _plan_from_version(version),
        "base_default_params": _defaults_from_version(version),
        "base_param_schema": _schema_from_version(version),
        "base_asset_slots": _slots_from_version(version),
        "target": version.target or "canvas2d",
        "base_version_id": str(version.id),
    }


def client_params_from_job_history(job: GenerationJobRow) -> dict[str, Any] | None:
    """Extract clientParams snapshot stored on the user refine message meta."""
    history = job.message_history if isinstance(job.message_history, list) else []
    for item in history:
        if not isinstance(item, dict):
            continue
        if item.get("kind") != "refine" and item.get("role") != "user":
            continue
        meta = item.get("meta")
        if isinstance(meta, dict):
            cp = meta.get("clientParams") or meta.get("client_params")
            if isinstance(cp, dict):
                return cp
    return None


def refine_runner_inputs(
    *,
    tool: ToolRow,
    version: ToolVersionRow,
    chat_message: str,
    client_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Payload for run_refine_with_repairs including context pack."""
    payload = base_version_payload(version)
    pack = build_refine_context_pack(
        tool=tool,
        version=version,
        user_message=chat_message,
        client_params=client_params,
    )
    draft = pack.get("draftParams") if isinstance(pack.get("draftParams"), dict) else {}
    payload["refine_context"] = pack
    payload["draft_params"] = draft
    return payload
