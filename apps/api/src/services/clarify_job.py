"""
A3: submit clarify answers and resume Create build.
"""

from __future__ import annotations

from typing import Any

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.types import GenerationJobRow
from agent.clarify_parse import normalize_clarify_answers
from domain.job_status import IllegalJobTransition, assert_job_transition
from services.create_job import CreateJobError, JobNotFoundError, get_owned_job


class ClarifyNotReadyError(CreateJobError):
    """Job is not in awaiting_clarify (map to 409)."""


class ClarifyValidationError(CreateJobError):
    """Bad answers payload (map to 422)."""


def _questions_from_clarify(clarify: Any) -> list[dict[str, Any]]:
    if not isinstance(clarify, dict):
        return []
    qs = clarify.get("questions")
    if not isinstance(qs, list):
        return []
    return [q for q in qs if isinstance(q, dict)]


async def submit_clarify_answers(
    *,
    job_id: str,
    owner_user_id: str,
    answers: dict[str, Any],
    jobs: JobsRepository,
    build_now: bool = True,
) -> GenerationJobRow:
    """
    Normalize answers into ClarifyResult, persist on job, re-queue for build.

    Requires status == awaiting_clarify.
    """
    if not isinstance(answers, dict) or not answers:
        raise ClarifyValidationError("answers object is required")

    job = await get_owned_job(
        job_id=job_id,
        owner_user_id=owner_user_id,
        jobs=jobs,
    )
    if job.status != "awaiting_clarify":
        raise ClarifyNotReadyError(
            f"job status is {job.status!r}; clarify answers only when "
            "awaiting_clarify"
        )
    if not job.plan_mode:
        raise ClarifyNotReadyError("job was not started with planMode")

    clarify = job.clarify if isinstance(job.clarify, dict) else {}
    questions = _questions_from_clarify(clarify)
    if not questions:
        raise ClarifyValidationError("job has no clarify questions to answer")

    understanding = str(clarify.get("understanding") or "")
    result = normalize_clarify_answers(
        questions=questions,
        answers=answers,
        understanding=understanding,
    )

    new_clarify: dict[str, Any] = {
        **clarify,
        "answers": answers,
        "result": result,
        "answered": True,
    }

    if build_now:
        try:
            assert_job_transition(job.status, "queued")
        except IllegalJobTransition as exc:
            raise ClarifyNotReadyError(str(exc)) from exc
        updated = await jobs.update_job_clarify(
            job_id,
            clarify=new_clarify,
            status="queued",
            clear_phase=True,
            clear_errors=True,
        )
    else:
        updated = await jobs.update_job_clarify(
            job_id,
            clarify=new_clarify,
            clear_errors=True,
        )

    if updated is None:
        raise JobNotFoundError(job_id)
    return updated
