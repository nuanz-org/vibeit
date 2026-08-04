"""
Create-job use-case (M3a).

Persist generation_jobs + draft tool. Worker / LangGraph lands in M3c–M3e.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import GenerationJobRow, ToolRow, ToolVersionRow
from domain.job_status import (
    IllegalJobTransition,
    assert_job_transition,
    job_result_ready,
)

# M3f will read from config; M3a defaults match consensus freeze.
DEFAULT_REPAIR_BUDGET = 3


class CreateJobError(Exception):
    """Base for create-job service failures."""


class JobNotFoundError(CreateJobError):
    """Job missing or not owned by caller (map to 404)."""


class JobResultNotReadyError(CreateJobError):
    """Result requested before succeeded (map to 409)."""


class JobResultMissingVersionError(CreateJobError):
    """Succeeded job without a tool version (map to 404/500)."""


@dataclass(frozen=True, slots=True)
class CreateJobResult:
    job: GenerationJobRow
    tool: ToolRow


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
) -> CreateJobResult:
    """
    Create draft tool + queued generation_jobs row.

    Prefer draft tool at enqueue so Studio tool id is stable before worker runs.
    """
    vision = vision_text.strip()
    if not vision:
        raise ValueError("vision_text is required")

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
    )
    return CreateJobResult(job=job, tool=tool)


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


def job_to_status_fields(job: GenerationJobRow) -> dict:
    """Map DB row → JobStatusResponse field dict (service layer)."""
    # Map graph phases onto M0e JobPhase where possible
    phase = job.phase
    if phase in ("ingest", "smoke", "finalize"):
        # not in public JobPhase union — coerce for poll UX
        phase_out = {
            "ingest": "plan",
            "smoke": "validate",
            "finalize": "validate",
        }.get(phase, phase)
    else:
        phase_out = phase

    return {
        "job_id": str(job.id),
        "status": job.status,
        "phase": phase_out,
        "progress": None,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "quota": None,  # M3f
        "repair": {
            "max_repairs": job.repair_budget,
            "repairs_used": job.repairs_used,
            "token_budget": job.token_budget,
            "tokens_used": job.tokens_used,
            "wall_time_ms": None,
            "wall_time_used_ms": None,
        },
        "updated_at": _utc_iso(job.updated_at),
        "result_ready": job_result_ready(job.status),
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
