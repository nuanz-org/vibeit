"""M1a smoke: POST /api/v1/jobs is auth-gated and returns M0e-shaped body."""

from __future__ import annotations

import sys
from pathlib import Path

# apps/api/src is the import root used by `fastapi dev src/main.py`
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from fastapi.testclient import TestClient

from adapters.auth.types import AuthUser
from core.deps import get_db_pool
from core.security import get_current_user
from main import app

_FAKE_USER = AuthUser(
    id="user_test_m1a",
    email="m1a@example.com",
    name="M1a Tester",
    email_verified=True,
)


def _override_pool():
    # Avoid real Postgres for cookie-missing path (auth_validator still Depends pool).
    return object()


async def _override_user() -> AuthUser:
    return _FAKE_USER


def test_create_job_unauthorized() -> None:
    app.dependency_overrides[get_db_pool] = _override_pool
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


def test_create_job_authenticated_returns_queued() -> None:
    app.dependency_overrides[get_current_user] = _override_user
    try:
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/jobs",
                json={
                    "visionText": "A kinetic 9:16 social frame",
                    "inspirationAssetIds": ["asset_insp_01"],
                    "clientMetadata": {"uiSource": "test"},
                },
            )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["status"] == "queued"
        assert isinstance(data["jobId"], str) and len(data["jobId"]) > 0
        assert isinstance(data["createdAt"], str) and "T" in data["createdAt"]
        assert data["userId"] == _FAKE_USER.id
    finally:
        app.dependency_overrides.clear()


def test_create_job_rejects_empty_vision() -> None:
    app.dependency_overrides[get_current_user] = _override_user
    try:
        with TestClient(app) as client:
            res = client.post("/api/v1/jobs", json={"visionText": ""})
        assert res.status_code == 422, res.text
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_create_job_unauthorized()
    test_create_job_authenticated_returns_queued()
    test_create_job_rejects_empty_vision()
    print("M1a jobs smoke OK")
