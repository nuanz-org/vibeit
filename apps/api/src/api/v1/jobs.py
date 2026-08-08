"""
Create-job HTTP surface (M3a + M3e worker + M3f quota).

POST /api/v1/jobs — quota check + persist + background worker.
GET  /api/v1/jobs/{jobId} — owner poll status (incl. phase + quota).
GET  /api/v1/jobs/{jobId}/result — owner result only when succeeded.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from adapters.auth.types import AuthUser
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.llm.protocol import LLMConfigError
from adapters.llm.router import assert_selectable_model
from core.config import get_settings
from core.deps import get_jobs_repo, get_tools_repo
from core.security import get_current_user
from schemas.jobs import (
    ClarifyJobRequest,
    ClarifyJobResponse,
    CreateJobRequest,
    CreateJobResponse,
    JobErrorBody,
    JobResultResponse,
    JobStatusResponse,
    QuotaFields,
    RepairBudgetFields,
)
from services.clarify_job import (
    ClarifyNotReadyError,
    ClarifyValidationError,
    submit_clarify_answers,
)
from services.create_job import (
    JobNotFoundError,
    JobResultMissingVersionError,
    JobResultNotReadyError,
    QuotaExceededError,
    _utc_iso,
    enqueue_create_job,
    get_job_result_for_owner,
    get_owned_job,
    job_to_status_fields,
)
from services.quota import get_quota_snapshot, quota_to_wire
from workers.generation import run_generation_job
router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post(
    "",
    response_model=CreateJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a Create job",
    responses={
        429: {"model": JobErrorBody, "description": "Daily create quota exceeded"},
    },
)
async def create_job(
    body: CreateJobRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    tools: ToolsRepository = Depends(get_tools_repo),
    jobs: JobsRepository = Depends(get_jobs_repo),
) -> CreateJobResponse | JSONResponse:
    """
    Accept a create job for the authenticated user.

    M3f: enforces CREATE_QUOTA_PER_DAY (default 10) per UTC day.
    Persists job + draft tool; enqueues worker when OpenRouter key is set.
    """
    settings = get_settings()
    llm_model: str | None = None
    if body.model is not None and str(body.model).strip():
        try:
            llm_model = assert_selectable_model(str(body.model))
        except LLMConfigError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

    try:
        result = await enqueue_create_job(
            owner_user_id=user.id,
            vision_text=body.vision_text,
            inspiration_asset_ids=body.inspiration_asset_ids,
            llm_model=llm_model,
            plan_mode=bool(body.plan_mode),
            tools=tools,
            jobs=jobs,
            settings=settings,
        )
    except QuotaExceededError as exc:
        body_err = JobErrorBody(
            error_code="QUOTA_EXCEEDED",
            error_message=str(exc),
            quota=QuotaFields(**quota_to_wire(exc.snapshot)),
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content=body_err.model_dump(by_alias=True),
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
        plan_mode=bool(job.plan_mode),
        quota=QuotaFields(**quota_to_wire(result.quota)),
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
    settings = get_settings()
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

    quota = await get_quota_snapshot(
        owner_user_id=user.id,
        jobs=jobs,
        settings=settings,
    )
    fields = job_to_status_fields(
        job,
        quota=quota,
        wall_time_ms=int(settings.create_wall_time_seconds * 1000),
    )
    repair_raw = fields.pop("repair")
    quota_raw = fields.pop("quota")
    return JobStatusResponse(
        **fields,
        repair=RepairBudgetFields(**repair_raw) if repair_raw else None,
        quota=QuotaFields(**quota_raw) if quota_raw else None,
    )


@router.post(
    "/{job_id}/clarify",
    response_model=ClarifyJobResponse,
    summary="Submit planMode clarify answers (A3)",
)
async def post_job_clarify(
    job_id: str,
    body: ClarifyJobRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    jobs: JobsRepository = Depends(get_jobs_repo),
) -> ClarifyJobResponse:
    """
    Fold answers into forced enum axes and re-queue the job for build.
    Only valid when status is awaiting_clarify.
    """
    settings = get_settings()
    try:
        job = await submit_clarify_answers(
            job_id=job_id,
            owner_user_id=user.id,
            answers=body.answers,
            jobs=jobs,
            build_now=bool(body.build_now),
        )
    except JobNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        ) from exc
    except ClarifyNotReadyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ClarifyValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if (
        body.build_now
        and job.status == "queued"
        and settings.create_worker_enabled
        and settings.openrouter_api_key
    ):
        pool = getattr(request.app.state, "db_pool", None)
        if pool is not None:
            background_tasks.add_task(
                run_generation_job,
                str(job.id),
                pool=pool,
                settings=settings,
            )

    clarify = job.clarify if isinstance(job.clarify, dict) else None
    return ClarifyJobResponse(
        job_id=str(job.id),
        status=job.status,  # type: ignore[arg-type]
        clarify=clarify,
        updated_at=_utc_iso(job.updated_at),
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
