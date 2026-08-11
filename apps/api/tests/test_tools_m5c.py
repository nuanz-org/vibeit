"""M5c: PATCH /api/v1/tools/{id}/draft + GET round-trip for draft state."""

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
from adapters.db.repositories.tools import ToolsRepository
from core.security import get_current_user
from main import app
from services.update_tool_draft import (
    DraftValidationError,
    normalize_draft_assets,
    normalize_draft_params,
)

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"


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


def test_normalize_draft_assets_rejects_data() -> None:
    try:
        normalize_draft_assets({"logo": "data:image/png;base64,xxx"})
        raise AssertionError("expected DraftValidationError")
    except DraftValidationError:
        pass

    out = normalize_draft_assets(
        {
            "logo": "http://localhost:8000/api/v1/assets/raw/abc",
            "bg": None,
        },
    )
    assert out["logo"].startswith("http")
    assert out["bg"] is None

    params = normalize_draft_params({"accent": "#ff00aa", "speed": 1.5})
    assert params["accent"] == "#ff00aa"
    assert params["speed"] == 1.5


def test_draft_patch_round_trip() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M5c tools: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return AuthUser(
            id=owner,
            email="m5c@example.com",
            name="M5c",
            email_verified=True,
        )

    async def _prep() -> str:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="M5c draft tool",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m5c",
                default_params={"accent": "#000000"},
            )
            return str(tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())

    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            # unauth without override would 401; with override we test body validation
            empty = client.patch(
                f"/api/v1/tools/{tool_id}/draft",
                json={},
            )
            assert empty.status_code == 422, empty.text

            bad_asset = client.patch(
                f"/api/v1/tools/{tool_id}/draft",
                json={"draftAssets": {"logo": "data:image/png;base64,x"}},
            )
            assert bad_asset.status_code == 422, bad_asset.text

            res = client.patch(
                f"/api/v1/tools/{tool_id}/draft",
                json={
                    "draftParams": {"accent": "#7c5cff", "speed": 1.25},
                    "draftAssets": {
                        "logo": "http://127.0.0.1:8000/api/v1/assets/raw/test-logo",
                    },
                },
            )
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["id"] == tool_id
            assert data["draftParams"]["accent"] == "#7c5cff"
            assert data["draftParams"]["speed"] == 1.25
            assert data["draftAssets"]["logo"].endswith("test-logo")
            # No extra version from draft save — latest still exists
            assert data["latestVersion"] is not None
            assert data["latestVersion"]["code"] == "// m5c"

            got = client.get(f"/api/v1/tools/{tool_id}")
            assert got.status_code == 200, got.text
            body = got.json()
            assert body["draftParams"]["accent"] == "#7c5cff"
            assert body["draftAssets"]["logo"].endswith("test-logo")

            # Partial replace: params only keeps assets
            res2 = client.patch(
                f"/api/v1/tools/{tool_id}/draft",
                json={"draftParams": {"accent": "#111111"}},
            )
            assert res2.status_code == 200, res2.text
            d2 = res2.json()
            assert d2["draftParams"] == {"accent": "#111111"}
            assert d2["draftAssets"]["logo"].endswith("test-logo")

            # non-owner
            async def _other() -> AuthUser:
                return AuthUser(
                    id="not-owner-m5c",
                    email="x@y.com",
                    name="x",
                    email_verified=True,
                )

            app.dependency_overrides[get_current_user] = _other
            denied = client.patch(
                f"/api/v1/tools/{tool_id}/draft",
                json={"draftParams": {"accent": "#fff"}},
            )
            assert denied.status_code == 404

            denied_get = client.get(f"/api/v1/tools/{tool_id}")
            assert denied_get.status_code == 404
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_normalize_draft_assets_rejects_data()
    test_draft_patch_round_trip()
    print("M5c tools draft smoke OK")
