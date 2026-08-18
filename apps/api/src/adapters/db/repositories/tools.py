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
    draft_params, draft_assets, tags, published_version_id,
    gallery_ready, export_smoke_at, chat_history, forked_from_tool_id
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

    async def get_published_tool_by_public_id(
        self,
        public_id: str,
    ) -> ToolRow | None:
        """M7d: anonymous public lookup — only `status = published`."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_TOOL_COLUMNS}
                FROM tools
                WHERE public_id = $1 AND status = 'published'
                """,
                public_id,
            )
        return tool_from_record(row) if row else None

    async def get_gallery_tool_by_public_id(
        self,
        public_id: str,
    ) -> ToolRow | None:
        """M8d: gallery detail — published AND gallery_ready."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_TOOL_COLUMNS}
                FROM tools
                WHERE public_id = $1
                  AND status = 'published'
                  AND gallery_ready = true
                """,
                public_id,
            )
        return tool_from_record(row) if row else None

    async def list_tools_for_owner(
        self,
        *,
        owner_user_id: str,
        kind: str = "all",
        limit: int = 24,
        offset: int = 0,
    ) -> list[tuple[ToolRow, bool]]:
        """
        Owner library: every tool they own, newest updated first.
        kind=created → originals (no fork lineage); remixed → forks.
        Fetch limit+1 so callers can detect has_more.
        Second tuple item is has_runnable_version (non-empty version code).
        """
        lim = max(1, min(int(limit), 100))
        off = max(0, int(offset))
        kind_norm = (kind or "all").strip().lower()
        extra = ""
        if kind_norm == "created":
            extra = "AND t.forked_from_tool_id IS NULL"
        elif kind_norm == "remixed":
            extra = "AND t.forked_from_tool_id IS NOT NULL"

        cols = ", ".join(
            f"t.{part.strip()}"
            for part in _TOOL_COLUMNS.split(",")
            if part.strip()
        )
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                SELECT {cols},
                       EXISTS (
                         SELECT 1
                         FROM tool_versions v
                         WHERE v.tool_id = t.id
                           AND length(btrim(v.code)) > 0
                       ) AS has_runnable_version
                FROM tools t
                WHERE t.owner_user_id = $1
                  {extra}
                ORDER BY t.updated_at DESC, t.public_id ASC
                LIMIT $2 OFFSET $3
                """,
                owner_user_id,
                lim + 1,
                off,
            )
        return [
            (tool_from_record(r), bool(r["has_runnable_version"]))
            for r in rows
        ]

    async def list_gallery_tools(
        self,
        *,
        limit: int = 24,
        offset: int = 0,
    ) -> list[ToolRow]:
        """
        M8d: anonymous gallery browse.
        Only status=published AND gallery_ready (gates passed).
        Newest first; fetch limit+1 so callers can detect has_more.
        """
        lim = max(1, min(int(limit), 100))
        off = max(0, int(offset))
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                SELECT {_TOOL_COLUMNS}
                FROM tools
                WHERE status = 'published' AND gallery_ready = true
                ORDER BY published_at DESC NULLS LAST, public_id ASC
                LIMIT $1 OFFSET $2
                """,
                lim + 1,
                off,
            )
        return [tool_from_record(r) for r in rows]

    async def set_tool_published(
        self,
        tool_id: UUID | str,
        *,
        owner_user_id: str,
        published_version_id: UUID | str | None = None,
        title: str | None = None,
        description: str | None = None,
        tags: list[str] | None = None,
        gallery_ready: bool | None = None,
        mark_export_smoke: bool = False,
        thumbnail_asset_id: UUID | str | None = None,
        set_thumbnail: bool = False,
    ) -> ToolRow | None:
        """
        Owner sets status=published (+ optional M8a/M8b/M8c metadata).
        Idempotent if already published (keeps first published_at).
        Returns None if tool missing or not owned by owner_user_id.

        - title/description/tags: only applied when not None (tags replaces full list).
        - published_version_id: when set, pins public run to that version.
        - gallery_ready: when True/False, set eligibility for gallery list (M8b).
        - mark_export_smoke: when True, set export_smoke_at = now().
        - set_thumbnail + thumbnail_asset_id: set tools.thumbnail_asset_id (M8c).
          Pass set_thumbnail=True with thumbnail_asset_id=None to clear.
        """
        sets: list[str] = [
            "status = 'published'",
            "published_at = COALESCE(published_at, now())",
            "updated_at = now()",
        ]
        args: list[Any] = [str(tool_id), owner_user_id]
        # $1 = tool_id, $2 = owner

        if published_version_id is not None:
            args.append(str(published_version_id))
            sets.append(f"published_version_id = ${len(args)}::uuid")

        if title is not None:
            args.append(title)
            sets.append(f"title = ${len(args)}")

        if description is not None:
            args.append(description)
            sets.append(f"description = ${len(args)}")

        if tags is not None:
            args.append(tags)
            sets.append(f"tags = ${len(args)}::text[]")

        if gallery_ready is not None:
            args.append(gallery_ready)
            sets.append(f"gallery_ready = ${len(args)}")

        if mark_export_smoke:
            sets.append("export_smoke_at = now()")

        if set_thumbnail:
            if thumbnail_asset_id is None:
                sets.append("thumbnail_asset_id = NULL")
            else:
                args.append(str(thumbnail_asset_id))
                sets.append(f"thumbnail_asset_id = ${len(args)}::uuid")

        sql = f"""
            UPDATE tools
            SET {", ".join(sets)}
            WHERE id = $1::uuid AND owner_user_id = $2
            RETURNING {_TOOL_COLUMNS}
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(sql, *args)
        return tool_from_record(row) if row else None

    async def set_tool_thumbnail(
        self,
        tool_id: UUID | str,
        *,
        owner_user_id: str,
        thumbnail_asset_id: UUID | str,
        mark_export_smoke: bool = True,
    ) -> ToolRow | None:
        """
        M8c auto/manual thumb: attach kind=thumb asset to an owned tool.
        Does not change status or gallery_ready — only thumbnail + optional smoke.
        Returns None if missing or not owned.
        """
        sets = [
            "thumbnail_asset_id = $3::uuid",
            "updated_at = now()",
        ]
        if mark_export_smoke:
            sets.append("export_smoke_at = now()")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE tools
                SET {", ".join(sets)}
                WHERE id = $1::uuid AND owner_user_id = $2
                RETURNING {_TOOL_COLUMNS}
                """,
                str(tool_id),
                owner_user_id,
                str(thumbnail_asset_id),
            )
        return tool_from_record(row) if row else None

    async def set_tool_unpublished(
        self,
        tool_id: UUID | str,
        *,
        owner_user_id: str,
    ) -> ToolRow | None:
        """
        M8f full takedown: status=draft, gallery_ready=false, clear published_at.
        Keeps thumbnail_asset_id + published_version_id for easy re-publish.
        Hides from /t/:publicId and gallery list (404 hide).
        Returns None if missing or not owned.
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE tools
                SET
                    status = 'draft',
                    gallery_ready = false,
                    published_at = NULL,
                    updated_at = now()
                WHERE id = $1::uuid AND owner_user_id = $2
                RETURNING {_TOOL_COLUMNS}
                """,
                str(tool_id),
                owner_user_id,
            )
        return tool_from_record(row) if row else None

    async def get_tool_version_for_public(
        self,
        tool_id: UUID | str,
        *,
        published_version_id: UUID | str | None = None,
    ) -> ToolVersionRow | None:
        """
        M8a: prefer frozen published_version_id; fall back to latest.
        """
        if published_version_id is not None:
            version = await self.get_tool_version(published_version_id)
            if version is not None and str(version.tool_id) == str(tool_id):
                return version
        return await self.get_latest_tool_version(tool_id)

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

    async def set_tool_fork_metadata(
        self,
        tool_id: UUID | str,
        *,
        forked_from_tool_id: UUID | str,
        tags: list[str] | None = None,
        thumbnail_asset_id: UUID | str | None = None,
    ) -> ToolRow | None:
        """
        Copy gallery remix fields onto a newly created draft.
        Returns the updated row (RETURNING) so callers skip a re-fetch.
        """
        tag_list = list(tags) if tags is not None else []
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE tools
                SET
                    forked_from_tool_id = $2::uuid,
                    tags = $3::text[],
                    thumbnail_asset_id = $4::uuid,
                    updated_at = now()
                WHERE id = $1::uuid
                RETURNING {_TOOL_COLUMNS}
                """,
                str(tool_id),
                str(forked_from_tool_id),
                tag_list,
                str(thumbnail_asset_id) if thumbnail_asset_id is not None else None,
            )
        return tool_from_record(row) if row else None

    async def append_chat_messages(
        self,
        tool_id: UUID | str,
        messages: list[dict[str, Any]],
        *,
        max_turns: int = 40,
    ) -> ToolRow | None:
        """
        Append Studio refine chat turns to tools.chat_history (capped).
        Each message should be a camelCase history dict from domain.chat_messages.
        """
        if not messages:
            return await self.get_tool_by_id(tool_id)

        tool = await self.get_tool_by_id(tool_id)
        if tool is None:
            return None

        existing = tool.chat_history if isinstance(tool.chat_history, list) else []
        merged: list[Any] = list(existing) + list(messages)
        if max_turns > 0 and len(merged) > max_turns:
            merged = merged[-max_turns:]

        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE tools
                SET chat_history = $2::jsonb, updated_at = now()
                WHERE id = $1::uuid
                RETURNING {_TOOL_COLUMNS}
                """,
                str(tool_id),
                json.dumps(merged),
            )
        return tool_from_record(row) if row else None
