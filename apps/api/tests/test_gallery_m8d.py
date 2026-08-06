"""M8d: public gallery list + detail — only gallery_ready published tools."""

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

_DEFAULT_URL = "postgresql://vibeit:vibeit@localhost:5432/vibeit"

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
        email="m8d@example.com",
        name="M8d",
        email_verified=True,
    )


def test_gallery_list_excludes_draft_and_thin_share() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8d gallery list: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> tuple[str, str, str]:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            draft = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Draft never listed",
            )
            await tools.create_tool_version(
                tool_id=draft.id,
                target="canvas2d",
                code="// draft",
            )

            thin = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Thin share only",
            )
            await tools.create_tool_version(
                tool_id=thin.id,
                target="canvas2d",
                code="// thin share",
            )

            gallery = await tools.create_draft_tool(
                owner_user_id=owner,
                title="In gallery",
                description="Listed card",
            )
            await tools.create_tool_version(
                tool_id=gallery.id,
                target="canvas2d",
                code="// gallery ready",
            )
            return str(draft.id), str(thin.id), str(gallery.id)
        finally:
            await pool.close()

    draft_id, thin_id, gallery_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            # Thin publish (no forGallery) — shareable but not gallery
            thin_pub = client.post(f"/api/v1/tools/{thin_id}/publish")
            assert thin_pub.status_code == 200, thin_pub.text
            thin_public_id = thin_pub.json()["publicId"]
            assert thin_pub.json()["galleryReady"] is False

            # Gallery publish with thumb
            up = client.post(
                "/api/v1/assets",
                data={"kind": "thumb", "toolId": gallery_id},
                files={"file": ("t.png", BytesIO(_PNG), "image/png")},
            )
            assert up.status_code == 201, up.text
            thumb_id = up.json()["id"]

            gal_pub = client.post(
                f"/api/v1/tools/{gallery_id}/publish",
                json={
                    "forGallery": True,
                    "exportSmokeOk": True,
                    "title": "In gallery",
                    "description": "Listed card",
                    "tags": ["Motion", "Demo"],
                    "thumbnailAssetId": thumb_id,
                },
            )
            assert gal_pub.status_code == 200, gal_pub.text
            gal_body = gal_pub.json()
            assert gal_body["galleryReady"] is True
            gal_public_id = gal_body["publicId"]

            # Anonymous list — no auth override needed
            listed = client.get("/api/v1/public/gallery?limit=50&offset=0")
            assert listed.status_code == 200, listed.text
            data = listed.json()
            assert "items" in data
            assert data["limit"] == 50
            assert data["offset"] == 0
            assert "hasMore" in data

            ids = {item["publicId"] for item in data["items"]}
            assert gal_public_id in ids
            assert thin_public_id not in ids

            card = next(i for i in data["items"] if i["publicId"] == gal_public_id)
            assert card["title"] == "In gallery"
            assert card["description"] == "Listed card"
            assert card["tags"] == ["motion", "demo"]
            assert card["thumbnailAssetId"] == thumb_id
            assert card["thumbnailUrl"] is not None
            assert "/assets/raw/" in card["thumbnailUrl"]
            assert card["publishedAt"] is not None
            # No owner / draft / code leaks
            assert "ownerUserId" not in card
            assert "draftParams" not in card
            assert "version" not in card
            assert "id" not in card or card.get("id") is None

            # Detail card
            one = client.get(f"/api/v1/public/gallery/{gal_public_id}")
            assert one.status_code == 200, one.text
            assert one.json()["publicId"] == gal_public_id
            assert one.json()["thumbnailAssetId"] == thumb_id

            # Thin share published but not gallery-ready → 404 on gallery detail
            thin_detail = client.get(f"/api/v1/public/gallery/{thin_public_id}")
            assert thin_detail.status_code == 404

            # Thin share still works on public tool run API
            thin_run = client.get(f"/api/v1/public/tools/{thin_public_id}")
            assert thin_run.status_code == 200

            # Draft public_id never in gallery
            draft_tool = client.get(f"/api/v1/tools/{draft_id}")
            assert draft_tool.status_code == 200
            draft_pid = draft_tool.json()["publicId"]
            draft_gal = client.get(f"/api/v1/public/gallery/{draft_pid}")
            assert draft_gal.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_gallery_pagination_has_more() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8d pagination: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> list[str]:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            ids: list[str] = []
            for i in range(3):
                tool = await tools.create_draft_tool(
                    owner_user_id=owner,
                    title=f"Page tool {i}",
                )
                await tools.create_tool_version(
                    tool_id=tool.id,
                    target="canvas2d",
                    code=f"// page {i}",
                )
                ids.append(str(tool.id))
            return ids
        finally:
            await pool.close()

    tool_ids = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            for tid in tool_ids:
                up = client.post(
                    "/api/v1/assets",
                    data={"kind": "thumb", "toolId": tid},
                    files={"file": ("t.png", BytesIO(_PNG), "image/png")},
                )
                assert up.status_code == 201, up.text
                res = client.post(
                    f"/api/v1/tools/{tid}/publish",
                    json={
                        "forGallery": True,
                        "exportSmokeOk": True,
                        "title": f"Page {tid[:8]}",
                        "thumbnailAssetId": up.json()["id"],
                    },
                )
                assert res.status_code == 200, res.text

            page0 = client.get("/api/v1/public/gallery?limit=1&offset=0")
            assert page0.status_code == 200
            body0 = page0.json()
            assert len(body0["items"]) == 1
            assert body0["hasMore"] is True

            page1 = client.get("/api/v1/public/gallery?limit=1&offset=1")
            assert page1.status_code == 200
            body1 = page1.json()
            assert len(body1["items"]) == 1
            # Different page of results (may still hasMore depending on prior data)
            assert body0["items"][0]["publicId"] != body1["items"][0]["publicId"]
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_gallery_list_excludes_draft_and_thin_share()
    test_gallery_pagination_has_more()
    print("M8d gallery smoke OK")
