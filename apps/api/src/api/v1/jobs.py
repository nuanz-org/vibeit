"""
Create-job HTTP surface (M3a + M3e worker enqueue).

POST /api/v1/jobs — persist + background generation worker.
GET  /api/v1/jobs/{jobId} — owner poll status (incl. phase).
GET  /api/v1/jobs/{jobId}/result — owner result only when succeeded.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from adapters.auth.types import AuthUser
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from core.config import get_settings
from core.deps import get_jobs_repo, get_tools_repo
from core.security import get_current_user
from schemas.jobs import (
    CreateJobRequest,
    CreateJobResponse,
    JobResultResponse,
    JobStatusResponse,
    RepairBudgetFields,
)
from services.create_job import (
    JobNotFoundError,
    JobResultMissingVersionError,
    JobResultNotReadyError,
    _utc_iso,
    enqueue_create_job,
    get_job_result_for_owner,
    get_owned_job,
    job_to_status_fields,
)
from workers.generation import run_generation_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post(
    "",
    response_model=CreateJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a Create job",
)
async def create_job(
    body: CreateJobRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    tools: ToolsRepository = Depends(get_tools_repo),
    jobs: JobsRepository = Depends(get_jobs_repo),
) -> CreateJobResponse:
    """
    Accept a create job for the authenticated user.

    Persists `generation_jobs` (queued) + draft tool, then enqueues the
    in-process generation worker (M3e) unless CREATE_WORKER_ENABLED=false.
    """
    settings = get_settings()
    try:
        result = await enqueue_create_job(
            owner_user_id=user.id,
            vision_text=body.vision_text,
            inspiration_asset_ids=body.inspiration_asset_ids,
            tools=tools,
            jobs=jobs,
            repair_budget=settings.create_repair_max,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    job = result.job

    # Auto-run worker when enabled and OpenRouter key is configured.
    # Without a key, job stays queued (fixture/manual worker tests call runner directly).
    if settings.create_worker_enabled and settings.openrouter_api_key:
        pool = getattr(request.app.state, "db_pool", None)
        if pool is not None:
            background_tasks.add_task(
                run_generation_job,
                str(job.id),
                pool=pool,
                settings=settings,
            )

    return CreateJobResponse(
        job_id=str(job.id),
        status=job.status,  # type: ignore[arg-type]
        created_at=_utc_iso(job.created_at),
        user_id=user.id,
    )


@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Get Create job status (owner poll)",
)
async def get_job_status(
    job_id: str,
    user: AuthUser = Depends(get_current_user),
    jobs: JobsRepository = Depends(get_jobs_repo),
) -> JobStatusResponse:
    try:
        job = await get_owned_job(
            job_id=job_id,
            owner_user_id=user.id,
            jobs=jobs,
        )
    except JobNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        ) from exc

    fields = job_to_status_fields(job)
    repair_raw = fields.pop("repair")
    return JobStatusResponse(
        **fields,
        repair=RepairBudgetFields(**repair_raw) if repair_raw else None,
    )


@router.get(
    "/{job_id}/result",
    response_model=JobResultResponse,
    summary="Get Create job result (succeeded only)",
)
async def get_job_result(
    job_id: str,
    user: AuthUser = Depends(get_current_user),
    jobs: JobsRepository = Depends(get_jobs_repo),
    tools: ToolsRepository = Depends(get_tools_repo),
) -> JobResultResponse:
    try:
        job, tool, version = await get_job_result_for_owner(
            job_id=job_id,
            owner_user_id=user.id,
            jobs=jobs,
            tools=tools,
        )
    except JobNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        ) from exc
    except JobResultNotReadyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except JobResultMissingVersionError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return JobResultResponse(
        job_id=str(job.id),
        tool_id=str(tool.id),
        version_id=str(version.id),
        target=version.target,
        public_id=tool.public_id,
        completed_at=_utc_iso(version.created_at),
    )
