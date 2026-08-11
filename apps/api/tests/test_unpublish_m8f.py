"""M8f: unpublish full takedown + gallery/public hide."""

from __future__ import annotations

import asyncio
import os
import sys
from io import BytesIO
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

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"

_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


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


def _as_user(owner: str) -> AuthUser:
    return AuthUser(
        id=owner,
        email="m8f@example.com",
        name="M8f",
        email_verified=True,
    )


def test_unpublish_hides_public_and_gallery() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8f unpublish: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> str:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Unpublish me",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m8f unpublish",
            )
            return str(tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            up = client.post(
                "/api/v1/assets",
                data={"kind": "thumb", "toolId": tool_id},
                files={"file": ("t.png", BytesIO(_PNG), "image/png")},
            )
            assert up.status_code == 201, up.text
            thumb_id = up.json()["id"]

            pub = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "forGallery": True,
                    "exportSmokeOk": True,
                    "title": "Unpublish me",
                    "tags": ["tmp"],
                    "thumbnailAssetId": thumb_id,
                },
            )
            assert pub.status_code == 200, pub.text
            body = pub.json()
            assert body["status"] == "published"
            assert body["galleryReady"] is True
            public_id = body["publicId"]

            assert client.get(f"/api/v1/public/tools/{public_id}").status_code == 200
            assert (
                client.get(f"/api/v1/public/gallery/{public_id}").status_code == 200
            )

            un = client.post(f"/api/v1/tools/{tool_id}/unpublish")
            assert un.status_code == 200, un.text
            ub = un.json()
            assert ub["status"] == "draft"
            assert ub["galleryReady"] is False
            assert ub["publishedAt"] is None
            # thumb kept for re-publish
            assert ub["thumbnailAssetId"] == thumb_id

            assert client.get(f"/api/v1/public/tools/{public_id}").status_code == 404
            assert (
                client.get(f"/api/v1/public/gallery/{public_id}").status_code == 404
            )

            # Non-owner cannot unpublish
            async def _other() -> AuthUser:
                return AuthUser(
                    id="not-owner-m8f",
                    email="x@y.com",
                    name="x",
                    email_verified=True,
                )

            app.dependency_overrides[get_current_user] = _other
            denied = client.post(f"/api/v1/tools/{tool_id}/unpublish")
            assert denied.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_publish_panel_surface_exists() -> None:
    web = Path(__file__).resolve().parents[2].parent / "apps" / "web"
    panel = web / "features" / "studio" / "components" / "publish-panel.tsx"
    assert panel.is_file()
    text = panel.read_text(encoding="utf-8")
    assert "forGallery" in text
    assert "Unpublish" in text
    assert "Publish to gallery" in text
    assert "unpublishTool" in text
    tools_ts = (web / "lib" / "api" / "tools.ts").read_text(encoding="utf-8")
    assert "unpublishTool" in tools_ts


if __name__ == "__main__":
    test_unpublish_hides_public_and_gallery()
    test_publish_panel_surface_exists()
    print("M8f unpublish smoke OK")
