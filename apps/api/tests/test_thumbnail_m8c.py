"""M8c: thumb upload + attach on publish + gallery requires thumbnail."""

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
from domain.publish_gates import PublishGateInput, evaluate_publish_gates
from main import app

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"

# Minimal valid 1x1 PNG
_PNG_1X1 = (
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
        email="m8c@example.com",
        name="M8c",
        email_verified=True,
    )


def test_domain_thumbnail_gate() -> None:
    fails = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="// ok",
            target="canvas2d",
            param_schema=[],
            title="Titled",
            for_gallery=True,
            export_smoke_ok=True,
            has_thumbnail=False,
        )
    )
    assert any(f.code == "GALLERY_THUMBNAIL_REQUIRED" for f in fails)

    # Thumb implies export smoke
    fails2 = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="// ok",
            target="canvas2d",
            param_schema=[],
            title="Titled",
            for_gallery=True,
            export_smoke_ok=False,
            has_thumbnail=True,
        )
    )
    assert fails2 == []


def test_upload_thumb_and_gallery_publish() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8c thumb upload: no Better Auth user in DB")
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
                title="Thumb tool",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m8c thumb createTool",
                param_schema=[],
                default_params={},
            )
            return str(tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            # Gallery without thumb fails
            no_thumb = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "forGallery": True,
                    "exportSmokeOk": True,
                    "title": "Thumb tool",
                },
            )
            assert no_thumb.status_code == 422, no_thumb.text
            codes = {g["code"] for g in no_thumb.json()["detail"]["gates"]}
            assert "GALLERY_THUMBNAIL_REQUIRED" in codes

            # Upload kind=thumb
            up = client.post(
                "/api/v1/assets",
                data={"kind": "thumb", "toolId": tool_id},
                files={"file": ("t.png", BytesIO(_PNG_1X1), "image/png")},
            )
            assert up.status_code == 201, up.text
            asset = up.json()
            assert asset["kind"] == "thumb"
            assert asset["id"]
            assert "/assets/raw/" in asset["url"]
            thumb_id = asset["id"]

            # Anonymous raw CORS path works
            raw = client.get(f"/api/v1/assets/raw/{thumb_id}")
            assert raw.status_code == 200
            assert raw.content[:8] == b"\x89PNG\r\n\x1a\n"

            # Gallery publish with thumbnail
            pub = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "forGallery": True,
                    "exportSmokeOk": True,
                    "title": "Thumb tool",
                    "tags": ["thumb"],
                    "thumbnailAssetId": thumb_id,
                },
            )
            assert pub.status_code == 200, pub.text
            body = pub.json()
            assert body["status"] == "published"
            assert body["galleryReady"] is True
            assert body["thumbnailAssetId"] == thumb_id
            assert body["thumbnailUrl"] is not None
            assert thumb_id in body["thumbnailUrl"]

            public_id = body["publicId"]
            got = client.get(f"/api/v1/public/tools/{public_id}")
            assert got.status_code == 200, got.text
            pdata = got.json()
            assert pdata["thumbnailAssetId"] == thumb_id
            assert pdata["thumbnailUrl"] is not None
            assert "/assets/raw/" in pdata["thumbnailUrl"]
    finally:
        app.dependency_overrides.clear()


def test_publish_rejects_unowned_thumb() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8c unowned thumb: no Better Auth user in DB")
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
                title="Bad thumb",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// bad thumb",
            )
            return str(tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            res = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "forGallery": True,
                    "title": "Bad thumb",
                    "thumbnailAssetId": "00000000-0000-0000-0000-000000000099",
                },
            )
            assert res.status_code == 422, res.text
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_domain_thumbnail_gate()
    test_upload_thumb_and_gallery_publish()
    test_publish_rejects_unowned_thumb()
    print("M8c thumbnail smoke OK")
