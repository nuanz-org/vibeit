"""Tools + tool_versions repository (M1c)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from adapters.db.ids import new_public_id
from adapters.db.repositories._mapping import tool_from_record, tool_version_from_record
from adapters.db.types import ToolRow, ToolVersionRow

_TOOL_COLUMNS = """
    id, public_id, owner_user_id, status, title, description,
    thumbnail_asset_id, published_at, created_at, updated_at
"""

_VERSION_COLUMNS = """
    id, tool_id, target, code, param_schema, default_params,
    asset_slots, plan, created_at
"""


class ToolsRepository:
    def __init__(self, pool: Any) -> None:
        self._pool = pool

    async def create_draft_tool(
        self,
        *,
        owner_user_id: str,
        public_id: str | None = None,
        title: str | None = None,
        description: str | None = None,
    ) -> ToolRow:
        pid = public_id or new_public_id("t")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                INSERT INTO tools (public_id, owner_user_id, status, title, description)
                VALUES ($1, $2, 'draft', $3, $4)
                RETURNING {_TOOL_COLUMNS}
                """,
                pid,
                owner_user_id,
                title,
                description,
            )
        assert row is not None
        return tool_from_record(row)

    async def get_tool_by_id(self, tool_id: UUID | str) -> ToolRow | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_TOOL_COLUMNS}
                FROM tools
                WHERE id = $1::uuid
                """,
                str(tool_id),
            )
        return tool_from_record(row) if row else None

    async def get_tool_by_public_id(self, public_id: str) -> ToolRow | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_TOOL_COLUMNS}
                FROM tools
                WHERE public_id = $1
                """,
                public_id,
            )
        return tool_from_record(row) if row else None

    async def create_tool_version(
        self,
        *,
        tool_id: UUID | str,
        target: str = "canvas2d",
        code: str = "",
        param_schema: Any | None = None,
        default_params: Any | None = None,
        asset_slots: Any | None = None,
        plan: Any | None = None,
    ) -> ToolVersionRow:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                INSERT INTO tool_versions (
                    tool_id, target, code, param_schema, default_params, asset_slots, plan
                )
                VALUES (
                    $1::uuid, $2, $3,
                    $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb
                )
                RETURNING {_VERSION_COLUMNS}
                """,
                str(tool_id),
                target,
                code,
                json.dumps(param_schema if param_schema is not None else []),
                json.dumps(default_params if default_params is not None else {}),
                json.dumps(asset_slots if asset_slots is not None else []),
                json.dumps(plan) if plan is not None else None,
            )
        assert row is not None
        return tool_version_from_record(row)

    async def get_tool_version(self, version_id: UUID | str) -> ToolVersionRow | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_VERSION_COLUMNS}
                FROM tool_versions
                WHERE id = $1::uuid
                """,
                str(version_id),
            )
        return tool_version_from_record(row) if row else None
