"""M3a smoke: persist create job + owner status/result API."""

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
from fastapi.testclient import TestClient

from adapters.auth.types import AuthUser
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from core.deps import get_db_pool
from core.security import get_current_user
from domain.job_status import IllegalJobTransition, assert_job_transition
from main import app
from services.create_job import transition_job_status

_DEFAULT_URL = "postgresql://vibeit:vibeit@localhost:5432/vibeit"


def test_illegal_transitions() -> None:
    assert_job_transition("queued", "running")
    assert_job_transition("running", "succeeded")
    assert_job_transition("running", "failed")
    try:
        assert_job_transition("succeeded", "running")
        raise AssertionError("expected IllegalJobTransition")
    except IllegalJobTransition:
        pass
    try:
        assert_job_transition("failed", "succeeded")
        raise AssertionError("expected IllegalJobTransition")
    except IllegalJobTransition:
        pass


def test_create_job_unauthorized() -> None:
    app.dependency_overrides[get_db_pool] = lambda: object()
    app.dependency_overrides.pop(get_current_user, None)
    try:
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/jobs",
                json={"visionText": "A kinetic social frame"},
            )
        assert res.status_code == 401, res.text
    finally:
        app.dependency_overrides.clear()


def test_create_job_rejects_empty_vision() -> None:
    async def _user() -> AuthUser:
        return AuthUser(
            id="user_test_m3a",
            email="m3a@example.com",
            name="M3a",
            email_verified=True,
        )

    app.dependency_overrides[get_current_user] = _user
    # No pool needed — validation fails before service if body empty
    app.dependency_overrides[get_db_pool] = lambda: object()
    try:
        with TestClient(app) as client:
            res = client.post("/api/v1/jobs", json={"visionText": ""})
        assert res.status_code == 422, res.text
    finally:
        app.dependency_overrides.clear()


def _any_user_id() -> str | None:
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)

    async def _run() -> str | None:
        try:
            conn = await asyncpg.connect(dsn=url)
            try:
                row = await conn.fetchrow('SELECT id FROM "user" LIMIT 1')
                return str(row["id"]) if row else None
            finally:
                await conn.close()
        except Exception:
            return None

    return asyncio.run(_run())


def test_persist_create_status_and_result() -> None:
    """
    Full M3a path with real DB + Better Auth user FK.
    """
    owner = _any_user_id()
    if not owner:
        print("SKIP M3a persist: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return AuthUser(
            id=owner,
            email="m3a@example.com",
            name="M3a",
            email_verified=True,
        )

    app.dependency_overrides[get_current_user] = _user
    # Use lifespan pool — do not override get_db_pool

    job_id: str | None = None
    try:
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/jobs",
                json={
                    "visionText": "A kinetic 9:16 social frame with purple pulse",
                    "inspirationAssetIds": [],
                    "clientMetadata": {"uiSource": "test-m3a"},
                },
            )
            assert res.status_code == 201, res.text
            data = res.json()
            assert data["status"] == "queued"
            assert data["jobId"]
            assert data.get("userId") == owner
            job_id = data["jobId"]

            st = client.get(f"/api/v1/jobs/{job_id}")
            assert st.status_code == 200, st.text
            body = st.json()
            assert body["jobId"] == job_id
            assert body["status"] == "queued"
            assert body["resultReady"] is False
            assert body["repair"]["maxRepairs"] == 3
            assert body["repair"]["repairsUsed"] == 0

            # Result not ready while queued
            r0 = client.get(f"/api/v1/jobs/{job_id}/result")
            assert r0.status_code == 409, r0.text

            # Non-owner sees 404
            async def _other() -> AuthUser:
                return AuthUser(
                    id="not_the_owner_" + uuid4().hex[:8],
                    email="other@example.com",
                    name="Other",
                    email_verified=True,
                )

            app.dependency_overrides[get_current_user] = _other
            st2 = client.get(f"/api/v1/jobs/{job_id}")
            assert st2.status_code == 404, st2.text

            # Restore owner; simulate M3e finalize for result endpoint.
            # Use a dedicated asyncpg pool (not TestClient lifespan loop).
            app.dependency_overrides[get_current_user] = _user

            async def _finalize() -> None:
                url = os.getenv("DATABASE_URL", _DEFAULT_URL)
                pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
                try:
                    jobs = JobsRepository(pool)
                    tools = ToolsRepository(pool)
                    job = await jobs.get_job(job_id)
                    assert job is not None and job.tool_id is not None
                    await tools.create_tool_version(
                        tool_id=job.tool_id,
                        target="canvas2d",
                        code="// m3a fixture version",
                    )
                    await transition_job_status(
                        job_id=job_id,
                        to_status="running",
                        jobs=jobs,
                    )
                    await transition_job_status(
                        job_id=job_id,
                        to_status="succeeded",
                        jobs=jobs,
                    )
                finally:
                    await pool.close()

            asyncio.run(_finalize())

            st3 = client.get(f"/api/v1/jobs/{job_id}")
            assert st3.status_code == 200
            assert st3.json()["status"] == "succeeded"
            assert st3.json()["resultReady"] is True

            result = client.get(f"/api/v1/jobs/{job_id}/result")
            assert result.status_code == 200, result.text
            payload = result.json()
            assert payload["jobId"] == job_id
            assert payload["toolId"]
            assert payload["versionId"]
            assert payload["target"] == "canvas2d"
            assert payload["publicId"]
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_illegal_transitions()
    test_create_job_unauthorized()
    test_create_job_rejects_empty_vision()
    test_persist_create_status_and_result()
    print("M3a jobs smoke OK")
