"""M1b smoke: product tables exist after migrate (requires live Postgres + Better Auth)."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import asyncpg

from adapters.db.schema_notes import PRODUCT_TABLES

_DEFAULT_URL = "postgresql://vibeit:vibeit@localhost:5432/vibeit"


async def _check() -> None:
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)
    conn = await asyncpg.connect(dsn=url)
    try:
        for name in PRODUCT_TABLES:
            exists = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = $1
                )
                """,
                name,
            )
            assert exists, f"missing table: {name}"

        # No second users table
        for forbidden in ("users", "product_users"):
            exists = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = $1
                )
                """,
                forbidden,
            )
            assert not exists, f"unexpected table: {forbidden}"

        # Indexes we care about
        for idx in (
            "tools_owner_user_id_idx",
            "tools_public_id_idx",
            "assets_owner_user_id_idx",
            "generation_jobs_owner_user_id_idx",
            "generation_jobs_status_idx",
        ):
            exists = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname = 'public' AND indexname = $1
                )
                """,
                idx,
            )
            assert exists, f"missing index: {idx}"

        # FK owner_user_id → user.id on tools
        fk = await conn.fetchval(
            """
            SELECT COUNT(*) FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'tools'
              AND constraint_type = 'FOREIGN KEY'
            """
        )
        assert int(fk) >= 1, "tools should FK to user"

        applied = await conn.fetchval(
            "SELECT version FROM schema_migrations WHERE version = $1",
            "001_product_tables",
        )
        assert applied == "001_product_tables"
    finally:
        await conn.close()


def test_product_schema_present() -> None:
    asyncio.run(_check())


if __name__ == "__main__":
    test_product_schema_present()
    print("M1b schema smoke OK")
