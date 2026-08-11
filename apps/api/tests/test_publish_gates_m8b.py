"""M8b: publish quality gates — domain unit + gallery publish API."""

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
from domain.publish_gates import PublishGateInput, evaluate_publish_gates
from main import app

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


def _as_user(owner: str) -> AuthUser:
    return AuthUser(
        id=owner,
        email="m8b@example.com",
        name="M8b",
        email_verified=True,
    )


def test_domain_gates_thin_share_skips_gallery_rules() -> None:
    fails = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="export const createTool = () => ({})",
            target="canvas2d",
            param_schema=[],
            title=None,
            for_gallery=False,
            export_smoke_ok=False,
        )
    )
    assert fails == []


def test_domain_gates_gallery_requires_title_and_export() -> None:
    fails = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="export const createTool = () => ({})",
            target="canvas2d",
            param_schema=[],
            title=None,
            for_gallery=True,
            export_smoke_ok=False,
            has_thumbnail=False,
        )
    )
    codes = {f.code for f in fails}
    assert "GALLERY_TITLE_REQUIRED" in codes
    assert "EXPORT_SMOKE_REQUIRED" in codes
    assert "GALLERY_THUMBNAIL_REQUIRED" in codes


def test_domain_gates_preview_failures() -> None:
    fails = evaluate_publish_gates(
        PublishGateInput(
            has_version=False,
            code="",
            target="",
            param_schema=None,
            title="x",
            for_gallery=True,
            export_smoke_ok=True,
            has_thumbnail=True,
        )
    )
    assert any(f.code == "PREVIEW_NO_VERSION" for f in fails)

    fails2 = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="   ",
            target="canvas2d",
            param_schema={"bad": True},
            title="ok",
            for_gallery=True,
            export_smoke_ok=True,
            has_thumbnail=True,
        )
    )
    codes = {f.code for f in fails2}
    assert "PREVIEW_EMPTY_CODE" in codes
    assert "PREVIEW_PARAM_SCHEMA" in codes

    fails3 = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="ok",
            target="unknown-target",
            param_schema=[],
            title="ok",
            for_gallery=True,
            export_smoke_ok=True,
            has_thumbnail=True,
        )
    )
    assert any(f.code == "PREVIEW_TARGET" for f in fails3)


def test_domain_gates_gallery_happy() -> None:
    fails = evaluate_publish_gates(
        PublishGateInput(
            has_version=True,
            code="// ready",
            target="canvas2d",
            param_schema=[{"name": "speed"}],
            title="My tool",
            for_gallery=True,
            export_smoke_ok=True,
            has_thumbnail=True,
        )
    )
    assert fails == []


def test_gallery_publish_fails_structured_without_smoke() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8b gallery fail: no Better Auth user in DB")
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
                title="Has title",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m8b gallery fail",
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
            # Gallery without export smoke → structured 422
            res = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "forGallery": True,
                    "exportSmokeOk": False,
                    "title": "Has title",
                },
            )
            assert res.status_code == 422, res.text
            detail = res.json()["detail"]
            assert detail["code"] == "GATES_FAILED"
            assert isinstance(detail["gates"], list)
            codes = {g["code"] for g in detail["gates"]}
            assert "EXPORT_SMOKE_REQUIRED" in codes

            # Tool must NOT be gallery_ready (and preferably still draft if never published)
            got = client.get(f"/api/v1/tools/{tool_id}")
            assert got.status_code == 200
            body = got.json()
            assert body.get("galleryReady") is False
            # status may still be draft — gates blocked before publish
            assert body["status"] == "draft"
    finally:
        app.dependency_overrides.clear()


def test_gallery_publish_pass_sets_gallery_ready() -> None:
    """M8b+M8c: gallery pass needs thumb (upload) + title + smoke."""
    owner = _any_user()
    if not owner:
        print("SKIP M8b gallery pass: no Better Auth user in DB")
        return

    from io import BytesIO

    _PNG = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> str:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Gallery ready tool",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m8b gallery pass createTool",
                param_schema=[{"name": "n", "kind": "number", "default": 1}],
                default_params={"n": 1},
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

            res = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "forGallery": True,
                    "exportSmokeOk": True,
                    "title": "Gallery ready tool",
                    "tags": ["Demo"],
                    "thumbnailAssetId": thumb_id,
                },
            )
            assert res.status_code == 200, res.text
            body = res.json()
            assert body["status"] == "published"
            assert body["galleryReady"] is True
            assert body["exportSmokeAt"] is not None
            assert body["tags"] == ["demo"]
            assert body["publishedVersionId"] is not None
            assert body["thumbnailAssetId"] == thumb_id
    finally:
        app.dependency_overrides.clear()


def test_thin_share_does_not_set_gallery_ready() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8b thin share: no Better Auth user in DB")
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
                title="Share only",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// thin only",
            )
            return str(tool.id)
        finally:
            await pool.close()

    tool_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            res = client.post(f"/api/v1/tools/{tool_id}/publish")
            assert res.status_code == 200, res.text
            body = res.json()
            assert body["status"] == "published"
            assert body.get("galleryReady") is False
    finally:
        app.dependency_overrides.clear()


def test_empty_code_gallery_structured_fail() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8b empty code gallery: no Better Auth user in DB")
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
                title="Empty",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                code="  ",
                target="canvas2d",
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
                    "exportSmokeOk": True,
                    "title": "Empty",
                    # no thumb — still get PREVIEW_EMPTY_CODE among failures
                },
            )
            assert res.status_code == 422, res.text
            detail = res.json()["detail"]
            assert detail["code"] == "GATES_FAILED"
            codes = {g["code"] for g in detail["gates"]}
            assert "PREVIEW_EMPTY_CODE" in codes
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_domain_gates_thin_share_skips_gallery_rules()
    test_domain_gates_gallery_requires_title_and_export()
    test_domain_gates_preview_failures()
    test_domain_gates_gallery_happy()
    test_gallery_publish_fails_structured_without_smoke()
    test_gallery_publish_pass_sets_gallery_ready()
    test_thin_share_does_not_set_gallery_ready()
    test_empty_code_gallery_structured_fail()
    print("M8b publish gates smoke OK")
