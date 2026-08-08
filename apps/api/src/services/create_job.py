"""
Create-job use-case (M3a / M3f).

Persist generation_jobs + draft tool; enforce daily quota on enqueue.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import GenerationJobRow, ToolRow, ToolVersionRow
from core.config import Settings
from domain.job_status import (
    IllegalJobTransition,
    assert_job_transition,
    job_result_ready,
)
from services.quota import (
    QuotaSnapshot,
    get_quota_snapshot,
    quota_to_wire,
)

# Defaults match consensus freeze when settings not passed.
DEFAULT_REPAIR_BUDGET = 3


class CreateJobError(Exception):
    """Base for create-job service failures."""


class JobNotFoundError(CreateJobError):
    """Job missing or not owned by caller (map to 404)."""


class JobResultNotReadyError(CreateJobError):
    """Result requested before succeeded (map to 409)."""


class JobResultMissingVersionError(CreateJobError):
    """Succeeded job without a tool version (map to 404/500)."""


class QuotaExceededError(CreateJobError):
    """Daily create quota exhausted (map to 429 + QUOTA_EXCEEDED)."""

    def __init__(self, message: str, *, snapshot: QuotaSnapshot) -> None:
        super().__init__(message)
        self.snapshot = snapshot


@dataclass(frozen=True, slots=True)
class CreateJobResult:
    job: GenerationJobRow
    tool: ToolRow
    quota: QuotaSnapshot


def _utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _draft_title(vision_text: str) -> str:
    text = " ".join(vision_text.strip().split())
    if not text:
        return "Untitled tool"
    if len(text) <= 60:
        return text
    return text[:57].rstrip() + "…"


async def enqueue_create_job(
    *,
    owner_user_id: str,
    vision_text: str,
    inspiration_asset_ids: list[str] | None,
    tools: ToolsRepository,
    jobs: JobsRepository,
    repair_budget: int = DEFAULT_REPAIR_BUDGET,
    settings: Settings | None = None,
    skip_quota: bool = False,
    llm_model: str | None = None,
    plan_mode: bool = False,
) -> CreateJobResult:
    """
    Create draft tool + queued generation_jobs row.

    Prefer draft tool at enqueue so Studio tool id is stable before worker runs.
    Counts this enqueue against the daily quota (M3f) unless skip_quota=True.
    Optional llm_model is the user-selected OpenRouter id for plan/codegen/repair.
    A3: plan_mode=True → worker runs clarify first and may pause at awaiting_clarify.
    """
    vision = vision_text.strip()
    if not vision:
        raise ValueError("vision_text is required")

    quota_after: QuotaSnapshot | None = None
    token_budget: int | None = None
    if settings is not None:
        token_budget = settings.create_token_budget
        repair_budget = settings.create_repair_max
        if not skip_quota:
            snap = await get_quota_snapshot(
                owner_user_id=owner_user_id,
                jobs=jobs,
                settings=settings,
            )
            if snap.exceeded:
                raise QuotaExceededError(
                    f"Daily create quota exceeded ({snap.creates_used}/"
                    f"{snap.creates_limit}). Resets at {snap.resets_at.isoformat()}",
                    snapshot=snap,
                )

    tool = await tools.create_draft_tool(
        owner_user_id=owner_user_id,
        title=_draft_title(vision),
        description=vision[:280] if vision else None,
    )
    job = await jobs.create_job(
        owner_user_id=owner_user_id,
        vision_text=vision,
        inspiration_asset_ids=inspiration_asset_ids,
        tool_id=tool.id,
        repair_budget=repair_budget,
        status="queued",
        token_budget=token_budget,
        llm_model=llm_model,
        plan_mode=bool(plan_mode),
    )
    if settings is not None:
        quota_after = await get_quota_snapshot(
            owner_user_id=owner_user_id,
            jobs=jobs,
            settings=settings,
        )
    else:
        # Minimal snapshot when settings omitted (legacy tests)
        quota_after = QuotaSnapshot(
            creates_used=1,
            creates_limit=10,
            resets_at=datetime.now(timezone.utc),
        )

    return CreateJobResult(job=job, tool=tool, quota=quota_after)


async def get_owned_job(
    *,
    job_id: str,
    owner_user_id: str,
    jobs: JobsRepository,
) -> GenerationJobRow:
    row = await jobs.get_job_for_owner(job_id, owner_user_id=owner_user_id)
    if row is None:
        raise JobNotFoundError(job_id)
    return row


def job_to_status_fields(
    job: GenerationJobRow,
    *,
    quota: QuotaSnapshot | None = None,
    wall_time_ms: int | None = None,
) -> dict:
    """Map DB row → JobStatusResponse field dict (service layer)."""
    # Map graph phases onto M0e JobPhase where possible
    phase = job.phase
    # AM2/AM3: smoke:*, critique are agent-internal; poll UX still "validate"
    if phase in ("ingest", "smoke", "critique", "finalize") or (
        isinstance(phase, str) and phase.startswith("smoke")
    ):
        if isinstance(phase, str) and (
            phase.startswith("smoke") or phase == "critique"
        ):
            phase_out = "validate"
        else:
            phase_out = {
                "ingest": "plan",
                "smoke": "validate",
                "critique": "validate",
                "finalize": "validate",
            }.get(phase, phase)
    else:
        phase_out = phase

    clarify = job.clarify if isinstance(job.clarify, dict) else {}
    # Map internal clarify phase onto wire JobPhase
    if phase_out == "clarify" or (
        isinstance(job.phase, str) and job.phase == "clarify"
    ):
        phase_out = "clarify"

    return {
        "job_id": str(job.id),
        "status": job.status,
        "phase": phase_out,
        "progress": None,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "quota": quota_to_wire(quota) if quota is not None else None,
        "repair": {
            "max_repairs": job.repair_budget,
            "repairs_used": job.repairs_used,
            "token_budget": job.token_budget,
            "tokens_used": job.tokens_used,
            "wall_time_ms": wall_time_ms,
            "wall_time_used_ms": None,
        },
        "updated_at": _utc_iso(job.updated_at),
        "result_ready": job_result_ready(job.status),
        "plan_mode": bool(job.plan_mode),
        "clarify": clarify if clarify else None,
    }

async def get_job_result_for_owner(
    *,
    job_id: str,
    owner_user_id: str,
    jobs: JobsRepository,
    tools: ToolsRepository,
) -> tuple[GenerationJobRow, ToolRow, ToolVersionRow]:
    """
    Success payload only when status === succeeded and a version exists.
    Failed jobs never return a publishable result.
    """
    job = await get_owned_job(
        job_id=job_id,
        owner_user_id=owner_user_id,
        jobs=jobs,
    )
    if job.status != "succeeded":
        raise JobResultNotReadyError(
            f"job status is {job.status!r}; result only when succeeded"
        )
    if job.tool_id is None:
        raise JobResultMissingVersionError("succeeded job has no tool_id")

    tool = await tools.get_tool_by_id(job.tool_id)
    if tool is None or tool.owner_user_id != owner_user_id:
        raise JobNotFoundError(job_id)

    version = await tools.get_latest_tool_version(tool.id)
    if version is None:
        raise JobResultMissingVersionError(
            "succeeded job has no tool_versions row yet"
        )
    return job, tool, version


async def transition_job_status(
    *,
    job_id: str,
    to_status: str,
    jobs: JobsRepository,
    error_code: str | None = None,
    error_message: str | None = None,
    tool_id: str | None = None,
    repairs_used: int | None = None,
) -> GenerationJobRow:
    """
    Apply a legal status transition (used by worker in M3e; tested in M3a).
    """
    current = await jobs.get_job(job_id)
    if current is None:
        raise JobNotFoundError(job_id)
    try:
        assert_job_transition(current.status, to_status)
    except IllegalJobTransition:
        raise
    updated = await jobs.update_job_status(
        job_id,
        status=to_status,
        error_code=error_code,
        error_message=error_message,
        tool_id=tool_id,
        repairs_used=repairs_used,
    )
    if updated is None:
        raise JobNotFoundError(job_id)
    return updated
