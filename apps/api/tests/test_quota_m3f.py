"""M3f: daily create quota + cost estimate helpers."""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import asyncpg

from adapters.auth.types import AuthUser
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from core.config import Settings
from core.deps import get_jobs_repo, get_tools_repo
from core.security import get_current_user
from fastapi.testclient import TestClient
from main import app
from services.create_job import QuotaExceededError, enqueue_create_job
from services.quota import estimate_cost_cents, get_quota_snapshot, utc_day_start

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"


def test_estimate_cost_cents() -> None:
    assert estimate_cost_cents(0) == 0
    assert estimate_cost_cents(1_000_000, cents_per_million=15) == 15
    # ceiling division: any positive tokens with rate>0 costs at least 1 cent
    assert estimate_cost_cents(100, cents_per_million=15) == 1
    assert estimate_cost_cents(100_000, cents_per_million=15) == 2


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


def test_quota_blocks_after_limit() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M3f quota: no user")
        return

    async def _run() -> None:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            jobs = JobsRepository(pool)
            tools = ToolsRepository(pool)
            settings = Settings()
            settings.create_quota_per_day = 2
            settings.create_repair_max = 3

            # Use a unique owner-like path: count only jobs we create in this window
            # by setting a high limit first to create, then lower... better: set limit 2
            # and create until fail.
            # Clear is hard; use high offset by creating with skip and then checking
            # relative: get current used, set limit = used + 1, create once ok, twice fail.
            snap0 = await get_quota_snapshot(
                owner_user_id=owner,
                jobs=jobs,
                settings=settings,
            )
            # Force limit so only one more create is allowed
            settings.create_quota_per_day = snap0.creates_used + 1

            ok = await enqueue_create_job(
                owner_user_id=owner,
                vision_text="m3f quota ok",
                inspiration_asset_ids=[],
                tools=tools,
                jobs=jobs,
                settings=settings,
            )
            assert ok.quota.creates_used == snap0.creates_used + 1
            assert ok.quota.creates_limit == settings.create_quota_per_day

            try:
                await enqueue_create_job(
                    owner_user_id=owner,
                    vision_text="m3f quota block",
                    inspiration_asset_ids=[],
                    tools=tools,
                    jobs=jobs,
                    settings=settings,
                )
                raise AssertionError("expected QuotaExceededError")
            except QuotaExceededError as exc:
                assert exc.snapshot.exceeded
                assert exc.snapshot.creates_used >= settings.create_quota_per_day
        finally:
            await pool.close()

    asyncio.run(_run())


def test_http_quota_exceeded_429() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M3f HTTP quota: no user")
        return

    async def _user() -> AuthUser:
        return AuthUser(
            id=owner,
            email="m3f@example.com",
            name="M3f",
            email_verified=True,
        )

    # Patch settings via get_settings cache — replace with thin wrapper
    from core import config as config_mod

    real_settings = Settings()
    # Make limit = current used so next create fails
    pool_url = os.getenv("DATABASE_URL", _DEFAULT_URL)

    async def _used() -> int:
        pool = await asyncpg.create_pool(dsn=pool_url, min_size=1, max_size=2)
        try:
            jobs = JobsRepository(pool)
            s = Settings()
            snap = await get_quota_snapshot(
                owner_user_id=owner, jobs=jobs, settings=s
            )
            return snap.creates_used
        finally:
            await pool.close()

    used = asyncio.run(_used())
    real_settings.create_quota_per_day = used  # zero remaining
    real_settings.create_worker_enabled = False
    real_settings.openrouter_api_key = ""

    def _fake_settings() -> Settings:
        return real_settings

    app.dependency_overrides[get_current_user] = _user
    with patch("api.v1.jobs.get_settings", _fake_settings):
        try:
            with TestClient(app) as client:
                res = client.post(
                    "/api/v1/jobs",
                    json={"visionText": "should be blocked by quota"},
                )
            assert res.status_code == 429, res.text
            data = res.json()
            assert data["errorCode"] == "QUOTA_EXCEEDED"
            assert data["quota"]["createsLimit"] == used
            assert data["quota"]["createsUsed"] >= used
        finally:
            app.dependency_overrides.clear()


def test_utc_day_start() -> None:
    d = datetime(2026, 8, 4, 15, 30, tzinfo=timezone.utc)
    assert utc_day_start(d).hour == 0
    assert utc_day_start(d).day == 4


if __name__ == "__main__":
    test_estimate_cost_cents()
    test_utc_day_start()
    test_quota_blocks_after_limit()
    test_http_quota_exceeded_429()
    print("M3f quota smoke OK")
