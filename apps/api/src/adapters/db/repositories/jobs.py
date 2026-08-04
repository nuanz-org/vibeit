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
    repair_budget, repairs_used, created_at, updated_at
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
        repair_budget: int = 2,
        status: str = "queued",
    ) -> GenerationJobRow:
        if status not in JOB_STATUSES:
            raise ValueError(f"invalid job status: {status}")
        ids = inspiration_asset_ids or []
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                INSERT INTO generation_jobs (
                    owner_user_id, tool_id, status, vision_text,
                    inspiration_asset_ids, repair_budget
                )
                VALUES (
                    $1, $2::uuid, $3, $4, $5::jsonb, $6
                )
                RETURNING {_JOB_COLUMNS}
                """,
                owner_user_id,
                str(tool_id) if tool_id is not None else None,
                status,
                vision_text,
                json.dumps(ids),
                repair_budget,
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

    async def update_job_status(
        self,
        job_id: UUID | str,
        *,
        status: str,
        error_code: str | None = None,
        error_message: str | None = None,
        tool_id: UUID | str | None = None,
        repairs_used: int | None = None,
    ) -> GenerationJobRow | None:
        if status not in JOB_STATUSES:
            raise ValueError(f"invalid job status: {status}")

        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE generation_jobs
                SET
                    status = $2,
                    error_code = COALESCE($3, error_code),
                    error_message = COALESCE($4, error_message),
                    tool_id = COALESCE($5::uuid, tool_id),
                    repairs_used = COALESCE($6, repairs_used),
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
            )
        return job_from_record(row) if row else None
