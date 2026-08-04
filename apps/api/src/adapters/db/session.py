"""
Postgres pool helpers (asyncpg).

The app lifespan creates `app.state.db_pool` (see main.py).
Repositories (M1c) should take a pool/connection — not open ad-hoc engines.
"""

from __future__ import annotations

from typing import Any

import asyncpg

from core.config import Settings, get_settings


async def create_pool(
    settings: Settings | None = None,
    *,
    min_size: int = 1,
    max_size: int = 5,
) -> asyncpg.Pool:
    """Create an asyncpg pool from settings (or env defaults)."""
    cfg = settings or get_settings()
    return await asyncpg.create_pool(
        dsn=cfg.database_url,
        min_size=min_size,
        max_size=max_size,
    )


async def fetch_table_names(pool: Any) -> list[str]:
    """List public base tables (useful for smoke / health)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """
        )
    return [str(r["table_name"]) for r in rows]
