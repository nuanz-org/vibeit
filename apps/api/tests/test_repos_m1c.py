"""M1c smoke: repositories insert/read with a real Better Auth user."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from uuid import uuid4

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import asyncpg

from adapters.db.repositories.assets import AssetsRepository
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"


async def _any_user_id(conn: asyncpg.Connection) -> str:
    row = await conn.fetchrow('SELECT id FROM "user" LIMIT 1')
    if row is None:
        raise RuntimeError(
            'No Better Auth user found. Sign up via apps/web first, then re-run.'
        )
    return str(row["id"])


async def _run() -> None:
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)
    pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
    try:
        async with pool.acquire() as conn:
            owner_id = await _any_user_id(conn)

        tools = ToolsRepository(pool)
        jobs = JobsRepository(pool)
        assets = AssetsRepository(pool)

        tool = await tools.create_draft_tool(
            owner_user_id=owner_id,
            title="M1c smoke tool",
        )
        assert tool.status == "draft"
        assert tool.owner_user_id == owner_id
        assert tool.public_id.startswith("t_")

        by_id = await tools.get_tool_by_id(tool.id)
        assert by_id is not None and by_id.id == tool.id

        by_public = await tools.get_tool_by_public_id(tool.public_id)
        assert by_public is not None and by_public.public_id == tool.public_id

        version = await tools.create_tool_version(
            tool_id=tool.id,
            target="canvas2d",
            code="// m1c placeholder",
            param_schema=[{"name": "speed", "kind": "number"}],
            default_params={"speed": 1},
            asset_slots=[{"id": "logo", "label": "Logo"}],
        )
        assert version.target == "canvas2d"
        assert version.tool_id == tool.id
        got_version = await tools.get_tool_version(version.id)
        assert got_version is not None and got_version.code == "// m1c placeholder"

        job = await jobs.create_job(
            owner_user_id=owner_id,
            vision_text="M1c smoke vision",
            inspiration_asset_ids=[],
        )
        assert job.status == "queued"
        job2 = await jobs.update_job_status(job.id, status="running")
        assert job2 is not None and job2.status == "running"
        job3 = await jobs.get_job(job.id)
        assert job3 is not None and job3.status == "running"

        storage_key = f"inspiration/{owner_id}/{uuid4()}/smoke.png"
        asset = await assets.create_asset(
            owner_user_id=owner_id,
            kind="inspiration",
            storage_key=storage_key,
            content_type="image/png",
            byte_size=128,
            original_filename="smoke.png",
            tool_id=tool.id,
        )
        owned = await assets.get_asset_for_owner(asset.id, owner_user_id=owner_id)
        assert owned is not None and owned.storage_key == storage_key

        # Other owner cannot see
        missing = await assets.get_asset_for_owner(
            asset.id, owner_user_id="not-the-owner"
        )
        assert missing is None

        deleted = await assets.delete_asset(asset.id, owner_user_id=owner_id)
        assert deleted is True
        assert (
            await assets.get_asset_for_owner(asset.id, owner_user_id=owner_id) is None
        )

        # Cleanup tool (versions + jobs cascade / set null)
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM generation_jobs WHERE id = $1", job.id)
            await conn.execute("DELETE FROM tools WHERE id = $1", tool.id)
    finally:
        await pool.close()


def test_repositories_with_real_user() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    test_repositories_with_real_user()
    print("M1c repos smoke OK")
