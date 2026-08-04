"""
Create-job HTTP surface (M1a stub).

POST /api/v1/jobs is auth-gated and returns an M0e-shaped CreateJobResponse.
No DB persistence or worker yet — real jobs land with M1b/M3.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, status

from adapters.auth.types import AuthUser
from core.security import get_current_user
from schemas.jobs import CreateJobRequest, CreateJobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


@router.post(
    "",
    response_model=CreateJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a Create job (stub)",
)
async def create_job(
    body: CreateJobRequest,
    user: AuthUser = Depends(get_current_user),
) -> CreateJobResponse:
    """
    Accept a create job for the authenticated user.

    M1a: returns `queued` without persisting or running a worker.
    M3 will write generation_jobs and enqueue the Create graph.
    """
    # Identity is stable Better Auth user.id (product owner key for M1b+).
    _owner_id = user.id

    return CreateJobResponse(
        job_id=str(uuid4()),
        status="queued",
        created_at=_utc_now_iso(),
        user_id=_owner_id,
    )
