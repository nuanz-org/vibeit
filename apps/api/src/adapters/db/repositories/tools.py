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
    thumbnail_asset_id, published_at, created_at, updated_at,
    draft_params, draft_assets
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

    async def get_latest_tool_version(
        self,
        tool_id: UUID | str,
    ) -> ToolVersionRow | None:
        """Most recent version for a tool (finalize / job result)."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_VERSION_COLUMNS}
                FROM tool_versions
                WHERE tool_id = $1::uuid
                ORDER BY created_at DESC
                LIMIT 1
                """,
                str(tool_id),
            )
        return tool_version_from_record(row) if row else None

    async def update_tool_draft_state(
        self,
        tool_id: UUID | str,
        *,
        draft_params: Any | None = None,
        draft_assets: Any | None = None,
    ) -> ToolRow | None:
        """
        M5c: replace draft personalization bags on the tool row.
        Pass only the bags to update; omitted bags keep existing values.
        Does not insert a tool_versions row.
        """
        if draft_params is None and draft_assets is None:
            return await self.get_tool_by_id(tool_id)

        sets: list[str] = ["updated_at = now()"]
        args: list[Any] = [str(tool_id)]
        # $1 = tool_id; subsequent params for bags
        if draft_params is not None:
            args.append(json.dumps(draft_params))
            sets.append(f"draft_params = ${len(args)}::jsonb")
        if draft_assets is not None:
            args.append(json.dumps(draft_assets))
            sets.append(f"draft_assets = ${len(args)}::jsonb")

        sql = f"""
            UPDATE tools
            SET {", ".join(sets)}
            WHERE id = $1::uuid
            RETURNING {_TOOL_COLUMNS}
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(sql, *args)
        return tool_from_record(row) if row else None
