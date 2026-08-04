"""M3g: GET /api/v1/tools/{id} owner read."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import asyncpg
from fastapi.testclient import TestClient

from adapters.auth.types import AuthUser
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from core.security import get_current_user
from main import app
from services.create_job import enqueue_create_job
from workers.generation import run_generation_job

_DEFAULT_URL = "postgresql://vibeit:vibeit@localhost:5432/vibeit"


def _any_user() -> str | None:
    async def _run() -> str | None:
        try:
            conn = await asyncpg.connect(dsn=os.getenv("DATABASE_URL", _DEFAULT_URL))
            try:
                row = await conn.fetchrow('SELECT id FROM "user" LIMIT 1')
                return str(row["id"]) if row else None
            finally:
                await conn.close()
        except Exception:
            return None

    return asyncio.run(_run())


def test_get_tool_owner() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M3g tools: no user")
        return

    async def _user() -> AuthUser:
        return AuthUser(
            id=owner,
            email="m3g@example.com",
            name="M3g",
            email_verified=True,
        )

    async def _prep() -> str:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            jobs = JobsRepository(pool)
            tools = ToolsRepository(pool)
            enq = await enqueue_create_job(
                owner_user_id=owner,
                vision_text="m3g tools api",
                inspiration_asset_ids=[],
                tools=tools,
                jobs=jobs,
                skip_quota=True,
            )
            await run_generation_job(
                str(enq.job.id),
                pool=pool,
                use_fixture_code=True,
            )
            return str(enq.tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())

    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            res = client.get(f"/api/v1/tools/{tool_id}")
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["id"] == tool_id
            assert data["status"] == "draft"
            assert data["latestVersion"] is not None
            assert data["latestVersion"]["code"]
            assert data["latestVersion"]["target"] == "canvas2d"

            # non-owner
            async def _other() -> AuthUser:
                return AuthUser(
                    id="not-owner-m3g",
                    email="x@y.com",
                    name="x",
                    email_verified=True,
                )

            app.dependency_overrides[get_current_user] = _other
            res2 = client.get(f"/api/v1/tools/{tool_id}")
            assert res2.status_code == 404
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_get_tool_owner()
    print("M3g tools smoke OK")
