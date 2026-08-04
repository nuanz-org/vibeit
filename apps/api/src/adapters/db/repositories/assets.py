"""assets repository (M1c)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from adapters.db.repositories._mapping import asset_from_record
from adapters.db.schema_notes import ASSET_KINDS
from adapters.db.types import AssetRow

_ASSET_COLUMNS = """
    id, owner_user_id, kind, storage_key, content_type, byte_size,
    original_filename, tool_id, created_at, updated_at
"""


class AssetsRepository:
    def __init__(self, pool: Any) -> None:
        self._pool = pool

    async def create_asset(
        self,
        *,
        owner_user_id: str,
        kind: str,
        storage_key: str,
        content_type: str,
        byte_size: int,
        original_filename: str | None = None,
        tool_id: UUID | str | None = None,
        asset_id: UUID | str | None = None,
    ) -> AssetRow:
        if kind not in ASSET_KINDS:
            raise ValueError(f"invalid asset kind: {kind}")
        if byte_size < 0:
            raise ValueError("byte_size must be >= 0")

        async with self._pool.acquire() as conn:
            if asset_id is not None:
                row = await conn.fetchrow(
                    f"""
                    INSERT INTO assets (
                        id, owner_user_id, kind, storage_key, content_type,
                        byte_size, original_filename, tool_id
                    )
                    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::uuid)
                    RETURNING {_ASSET_COLUMNS}
                    """,
                    str(asset_id),
                    owner_user_id,
                    kind,
                    storage_key,
                    content_type,
                    byte_size,
                    original_filename,
                    str(tool_id) if tool_id is not None else None,
                )
            else:
                row = await conn.fetchrow(
                    f"""
                    INSERT INTO assets (
                        owner_user_id, kind, storage_key, content_type,
                        byte_size, original_filename, tool_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
                    RETURNING {_ASSET_COLUMNS}
                    """,
                    owner_user_id,
                    kind,
                    storage_key,
                    content_type,
                    byte_size,
                    original_filename,
                    str(tool_id) if tool_id is not None else None,
                )
        assert row is not None
        return asset_from_record(row)

    async def get_asset_by_id(self, asset_id: UUID | str) -> AssetRow | None:
        """Lookup by primary key (used by anonymous raw serve / M1d)."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_ASSET_COLUMNS}
                FROM assets
                WHERE id = $1::uuid
                """,
                str(asset_id),
            )
        return asset_from_record(row) if row else None

    async def get_asset_for_owner(
        self,
        asset_id: UUID | str,
        *,
        owner_user_id: str,
    ) -> AssetRow | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                SELECT {_ASSET_COLUMNS}
                FROM assets
                WHERE id = $1::uuid AND owner_user_id = $2
                """,
                str(asset_id),
                owner_user_id,
            )
        return asset_from_record(row) if row else None

    async def delete_asset(
        self,
        asset_id: UUID | str,
        *,
        owner_user_id: str,
    ) -> bool:
        """Delete if owned by user. Returns True when a row was removed."""
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM assets
                WHERE id = $1::uuid AND owner_user_id = $2
                """,
                str(asset_id),
                owner_user_id,
            )
        # asyncpg: "DELETE N"
        return result.endswith("1") or result == "DELETE 1"
