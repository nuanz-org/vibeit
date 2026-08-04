"""generation_jobs repository (M1c)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from adapters.db.repositories._mapping import job_from_record
from adapters.db.schema_notes import JOB_STATUSES
from adapters.db.types import GenerationJobRow

_JOB_COLUMNS = """
    id, owner_user_id, tool_id, status, vision_text, inspiration_asset_ids,
    error_code, error_message, tokens_used, token_budget, cost_cents,
    repair_budget, repairs_used, phase, created_at, updated_at
"""


class JobsRepository:
    def __init__(self, pool: Any) -> None:
        self._pool = pool

    async def create_job(
        self,
        *,
        owner_user_id: str,
        vision_text: str,
        inspiration_asset_ids: list[str] | None = None,
        tool_id: UUID | str | None = None,
        repair_budget: int = 3,
        status: str = "queued",
        token_budget: int | None = None,
    ) -> GenerationJobRow:
        if status not in JOB_STATUSES:
            raise ValueError(f"invalid job status: {status}")
        ids = inspiration_asset_ids or []
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                INSERT INTO generation_jobs (
                    owner_user_id, tool_id, status, vision_text,
                    inspiration_asset_ids, repair_budget, token_budget
                )
                VALUES (
                    $1, $2::uuid, $3, $4, $5::jsonb, $6, $7
                )
                RETURNING {_JOB_COLUMNS}
                """,
                owner_user_id,
                str(tool_id) if tool_id is not None else None,
                status,
                vision_text,
                json.dumps(ids),
                repair_budget,
                token_budget,
            )
        assert row is not None
        return job_from_record(row)

    async def get_job(self, job_id: UUID | str) -> GenerationJobRow | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_JOB_COLUMNS}
                FROM generation_jobs
                WHERE id = $1::uuid
                """,
                str(job_id),
            )
        return job_from_record(row) if row else None

    async def get_job_for_owner(
        self,
        job_id: UUID | str,
        *,
        owner_user_id: str,
    ) -> GenerationJobRow | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_JOB_COLUMNS}
                FROM generation_jobs
                WHERE id = $1::uuid AND owner_user_id = $2
                """,
                str(job_id),
                owner_user_id,
            )
        return job_from_record(row) if row else None

    async def update_job_status(
        self,
        job_id: UUID | str,
        *,
        status: str,
        error_code: str | None = None,
        error_message: str | None = None,
        tool_id: UUID | str | None = None,
        repairs_used: int | None = None,
        phase: str | None = None,
        tokens_used: int | None = None,
        cost_cents: int | None = None,
        clear_errors: bool = False,
    ) -> GenerationJobRow | None:
        if status not in JOB_STATUSES:
            raise ValueError(f"invalid job status: {status}")

        async with self._pool.acquire() as conn:
            if clear_errors:
                row = await conn.fetchrow(
                    f"""
                    UPDATE generation_jobs
                    SET
                        status = $2,
                        error_code = $3,
                        error_message = $4,
                        tool_id = COALESCE($5::uuid, tool_id),
                        repairs_used = COALESCE($6, repairs_used),
                        phase = COALESCE($7, phase),
                        tokens_used = COALESCE($8, tokens_used),
                        cost_cents = COALESCE($9, cost_cents),
                        updated_at = now()
                    WHERE id = $1::uuid
                    RETURNING {_JOB_COLUMNS}
                    """,
                    str(job_id),
                    status,
                    error_code,
                    error_message,
                    str(tool_id) if tool_id is not None else None,
                    repairs_used,
                    phase,
                    tokens_used,
                    cost_cents,
                )
            else:
                row = await conn.fetchrow(
                    f"""
                    UPDATE generation_jobs
                    SET
                        status = $2,
                        error_code = COALESCE($3, error_code),
                        error_message = COALESCE($4, error_message),
                        tool_id = COALESCE($5::uuid, tool_id),
                        repairs_used = COALESCE($6, repairs_used),
                        phase = COALESCE($7, phase),
                        tokens_used = COALESCE($8, tokens_used),
                        cost_cents = COALESCE($9, cost_cents),
                        updated_at = now()
                    WHERE id = $1::uuid
                    RETURNING {_JOB_COLUMNS}
                    """,
                    str(job_id),
                    status,
                    error_code,
                    error_message,
                    str(tool_id) if tool_id is not None else None,
                    repairs_used,
                    phase,
                    tokens_used,
                    cost_cents,
                )
        return job_from_record(row) if row else None

    async def update_job_phase(
        self,
        job_id: UUID | str,
        *,
        phase: str,
        repairs_used: int | None = None,
        tokens_used: int | None = None,
    ) -> GenerationJobRow | None:
        """Update phase while status stays running (status poll UX)."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE generation_jobs
                SET
                    phase = $2,
                    repairs_used = COALESCE($3, repairs_used),
                    tokens_used = COALESCE($4, tokens_used),
                    updated_at = now()
                WHERE id = $1::uuid
                RETURNING {_JOB_COLUMNS}
                """,
                str(job_id),
                phase,
                repairs_used,
                tokens_used,
            )
        return job_from_record(row) if row else None

    async def count_jobs_for_owner_since(
        self,
        *,
        owner_user_id: str,
        since_utc: Any,
    ) -> int:
        """
        Count generation_jobs created by owner at or after `since_utc` (UTC).

        M3f: used for daily create quota (accepted enqueues).
        """
        async with self._pool.acquire() as conn:
            val = await conn.fetchval(
                """
                SELECT COUNT(*)::int
                FROM generation_jobs
                WHERE owner_user_id = $1
                  AND created_at >= $2
                """,
                owner_user_id,
                since_utc,
            )
        return int(val or 0)

    async def update_job_usage(
        self,
        job_id: UUID | str,
        *,
        tokens_used: int | None = None,
        token_budget: int | None = None,
        cost_cents: int | None = None,
        repairs_used: int | None = None,
    ) -> GenerationJobRow | None:
        """Persist token/cost usage (M3f)."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE generation_jobs
                SET
                    tokens_used = COALESCE($2, tokens_used),
                    token_budget = COALESCE($3, token_budget),
                    cost_cents = COALESCE($4, cost_cents),
                    repairs_used = COALESCE($5, repairs_used),
                    updated_at = now()
                WHERE id = $1::uuid
                RETURNING {_JOB_COLUMNS}
                """,
                str(job_id),
                tokens_used,
                token_budget,
                cost_cents,
                repairs_used,
            )
        return job_from_record(row) if row else None
