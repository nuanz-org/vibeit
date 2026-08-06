"""M7d: public tool GET by publicId + thin owner publish."""

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


def test_public_tool_draft_404_then_publish_200() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M7d public tools: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return AuthUser(
            id=owner,
            email="m7d@example.com",
            name="M7d",
            email_verified=True,
        )

    async def _prep() -> tuple[str, str]:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="M7d public tool",
                description="Share me",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m7d public export const createTool = () => ({})",
                param_schema=[{"name": "speed", "kind": "number", "default": 1}],
                default_params={"speed": 1},
                asset_slots=[{"id": "logo", "label": "Logo"}],
            )
            # seed draft personalization that must NOT leak on public GET
            await tools.update_tool_draft_state(
                tool.id,
                draft_params={"speed": 99, "secret": "nope"},
                draft_assets={
                    "logo": "http://127.0.0.1:8000/api/v1/assets/raw/private",
                },
            )
            return str(tool.id), tool.public_id
        finally:
            await pool.close()

    tool_id, public_id = asyncio.run(_prep())

    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            # Draft: anonymous public surface must 404
            draft_pub = client.get(f"/api/v1/public/tools/{public_id}")
            assert draft_pub.status_code == 404, draft_pub.text

            # Unknown id
            missing = client.get("/api/v1/public/tools/t_does_not_exist_m7d")
            assert missing.status_code == 404

            # Owner publish
            pub = client.post(f"/api/v1/tools/{tool_id}/publish")
            assert pub.status_code == 200, pub.text
            pub_body = pub.json()
            assert pub_body["status"] == "published"
            assert pub_body["publicId"] == public_id
            # Owner still sees draft bags on private GET shape
            assert pub_body["draftParams"]["speed"] == 99

            # Public GET — no auth override needed for this route
            got = client.get(f"/api/v1/public/tools/{public_id}")
            assert got.status_code == 200, got.text
            data = got.json()
            assert data["publicId"] == public_id
            assert data["status"] == "published"
            assert data["title"] == "M7d public tool"
            assert data["description"] == "Share me"
            assert data["publishedAt"] is not None
            assert "ownerUserId" not in data
            assert "draftParams" not in data
            assert "draftAssets" not in data
            assert "id" not in data  # internal UUID not on public surface

            ver = data["version"]
            assert ver["target"] == "canvas2d"
            assert "createTool" in ver["code"] or ver["code"].startswith("// m7d")
            assert ver["defaultParams"]["speed"] == 1  # not draft 99
            assert ver["paramSchema"][0]["name"] == "speed"
            assert ver["assetSlots"][0]["id"] == "logo"
            # no plan field required; if present shouldn't be required

            # Idempotent publish
            pub2 = client.post(f"/api/v1/tools/{tool_id}/publish")
            assert pub2.status_code == 200
            assert pub2.json()["status"] == "published"

            # Non-owner cannot publish someone else's tool
            async def _other() -> AuthUser:
                return AuthUser(
                    id="not-owner-m7d",
                    email="x@y.com",
                    name="x",
                    email_verified=True,
                )

            app.dependency_overrides[get_current_user] = _other
            denied = client.post(f"/api/v1/tools/{tool_id}/publish")
            assert denied.status_code == 404

            # No download route on tools
            tools_src = (
                Path(__file__).resolve().parents[1]
                / "src"
                / "api"
                / "v1"
                / "tools.py"
            ).read_text(encoding="utf-8")
            public_src = (
                Path(__file__).resolve().parents[1]
                / "src"
                / "api"
                / "v1"
                / "public_tools.py"
            ).read_text(encoding="utf-8")
            assert "/download" not in tools_src
            assert "/download" not in public_src
            assert "Content-Disposition" not in public_src
    finally:
        app.dependency_overrides.clear()


def test_publish_without_version_422() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M7d no-version: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return AuthUser(
            id=owner,
            email="m7d-nv@example.com",
            name="M7d",
            email_verified=True,
        )

    async def _prep() -> str:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="M7d no version",
            )
            return str(tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            res = client.post(f"/api/v1/tools/{tool_id}/publish")
            assert res.status_code == 422, res.text
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_public_tool_draft_404_then_publish_200()
    test_publish_without_version_422()
    print("M7d public tools smoke OK")
