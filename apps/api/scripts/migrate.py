#!/usr/bin/env python3
"""
Apply versioned SQL migrations under apps/api/migrations/.

Usage (from apps/api):
  uv run python scripts/migrate.py
  uv run python scripts/migrate.py --database-url postgresql://...

Tracks applied files in public.schema_migrations (version = filename stem).
Requires Better Auth tables (at least "user") for product FKs.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

import asyncpg

_API_ROOT = Path(__file__).resolve().parents[1]
_MIGRATIONS_DIR = _API_ROOT / "migrations"
_DEFAULT_URL = "postgresql://vibeit:vibeit@localhost:5432/vibeit"

_VERSION_RE = re.compile(r"^(\d{3,})_.+\.sql$")


def _database_url(cli: str | None) -> str:
    return (
        cli
        or os.getenv("DATABASE_URL")
        or _DEFAULT_URL
    )


async def _ensure_migrations_table(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def _list_migration_files() -> list[Path]:
    if not _MIGRATIONS_DIR.is_dir():
        return []
    files = [
        p
        for p in sorted(_MIGRATIONS_DIR.iterdir())
        if p.is_file() and _VERSION_RE.match(p.name)
    ]
    return files


async def _applied_versions(conn: asyncpg.Connection) -> set[str]:
    rows = await conn.fetch("SELECT version FROM schema_migrations")
    return {str(r["version"]) for r in rows}


async def migrate(database_url: str) -> int:
    files = _list_migration_files()
    if not files:
        print(f"No migrations found in {_MIGRATIONS_DIR}")
        return 0

    print(f"Connecting…")
    conn = await asyncpg.connect(dsn=database_url)
    try:
        # Fail early if Better Auth is missing (product FKs need "user").
        has_user = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'user'
            )
            """
        )
        if not has_user:
            print(
                'ERROR: Better Auth table "user" not found.\n'
                "Run web auth migrate first, then re-run this script.\n"
                "  cd apps/web && pnpm auth:migrate",
                file=sys.stderr,
            )
            return 1

        await _ensure_migrations_table(conn)
        applied = await _applied_versions(conn)
        pending = [p for p in files if p.stem not in applied]

        if not pending:
            print("Already up to date.")
            for p in files:
                print(f"  ✓ {p.name}")
            return 0

        for path in pending:
            sql = path.read_text(encoding="utf-8")
            version = path.stem
            print(f"Applying {path.name}…")
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO schema_migrations (version) VALUES ($1)",
                    version,
                )
            print(f"  ✓ {path.name}")

        print(f"Done. Applied {len(pending)} migration(s).")
        return 0
    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply Vibeit API SQL migrations")
    parser.add_argument(
        "--database-url",
        default=None,
        help="Postgres URL (default: DATABASE_URL or local vibeit)",
    )
    args = parser.parse_args()
    code = asyncio.run(migrate(_database_url(args.database_url)))
    raise SystemExit(code)


if __name__ == "__main__":
    main()
