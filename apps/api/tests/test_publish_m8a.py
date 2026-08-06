"""M8a: publish metadata, version freeze, failed gens never published."""

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
from services.public_tool import normalize_tags

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


def _as_user(owner: str) -> AuthUser:
    return AuthUser(
        id=owner,
        email="m8a@example.com",
        name="M8a",
        email_verified=True,
    )


def test_normalize_tags() -> None:
    assert normalize_tags(None) is None
    assert normalize_tags([]) == []
    assert normalize_tags(["  Motion ", "MOTION", "Brand Kit", ""]) == [
        "motion",
        "brand kit",
    ]
    long = "x" * 100
    out = normalize_tags([long])
    assert out is not None and len(out[0]) == 48


def test_publish_metadata_and_version_freeze() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8a publish metadata: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> tuple[str, str, str]:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Old title",
                description="Old desc",
            )
            version = await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// m8a export const createTool = () => ({})",
                param_schema=[{"name": "speed", "kind": "number", "default": 1}],
                default_params={"speed": 1},
                asset_slots=[],
            )
            await tools.update_tool_draft_state(
                tool.id,
                draft_params={"speed": 42, "hue": 0.5},
            )
            return str(tool.id), tool.public_id, str(version.id)
        finally:
            await pool.close()

    tool_id, public_id, version_id = asyncio.run(_prep())

    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            # Publish with metadata (no freezeDraft) — draft stays private
            pub = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={
                    "title": "Gallery Title",
                    "description": "A public tool",
                    "tags": ["Motion", "  canvas ", "MOTION"],
                    "freezeDraft": False,
                },
            )
            assert pub.status_code == 200, pub.text
            body = pub.json()
            assert body["status"] == "published"
            assert body["title"] == "Gallery Title"
            assert body["description"] == "A public tool"
            assert body["tags"] == ["motion", "canvas"]
            assert body["publishedAt"] is not None
            assert body["publishedVersionId"] == version_id
            assert body["draftParams"]["speed"] == 42  # owner still sees draft

            # Public GET uses frozen version defaults, not draft
            got = client.get(f"/api/v1/public/tools/{public_id}")
            assert got.status_code == 200, got.text
            data = got.json()
            assert data["title"] == "Gallery Title"
            assert data["tags"] == ["motion", "canvas"]
            assert data["publishedVersionId"] == version_id
            assert data["version"]["id"] == version_id
            assert data["version"]["defaultParams"]["speed"] == 1
            assert "draftParams" not in data
            assert "ownerUserId" not in data
    finally:
        app.dependency_overrides.clear()


def test_publish_freeze_draft_creates_version() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8a freeze draft: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> tuple[str, str, str]:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Freeze me",
            )
            base = await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// freeze draft createTool",
                param_schema=[{"name": "speed", "kind": "number", "default": 1}],
                default_params={"speed": 1, "size": 10},
                asset_slots=[],
            )
            await tools.update_tool_draft_state(
                tool.id,
                draft_params={"speed": 7},
            )
            return str(tool.id), tool.public_id, str(base.id)
        finally:
            await pool.close()

    tool_id, public_id, base_version_id = asyncio.run(_prep())

    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            pub = client.post(
                f"/api/v1/tools/{tool_id}/publish",
                json={"freezeDraft": True, "tags": ["frozen"]},
            )
            assert pub.status_code == 200, pub.text
            body = pub.json()
            assert body["status"] == "published"
            assert body["publishedVersionId"] is not None
            assert body["publishedVersionId"] != base_version_id
            assert body["tags"] == ["frozen"]

            got = client.get(f"/api/v1/public/tools/{public_id}")
            assert got.status_code == 200, got.text
            data = got.json()
            assert data["version"]["id"] == body["publishedVersionId"]
            # Merged defaults: draft speed overrides, size kept
            assert data["version"]["defaultParams"]["speed"] == 7
            assert data["version"]["defaultParams"]["size"] == 10
    finally:
        app.dependency_overrides.clear()


def test_publish_empty_code_blocked() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M8a empty code: no Better Auth user in DB")
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
                title="Empty code",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="   ",  # not ready
                default_params={},
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


def test_publish_thin_body_still_works() -> None:
    """M7 share path: POST with no body still publishes and freezes version."""
    owner = _any_user()
    if not owner:
        print("SKIP M8a thin publish: no Better Auth user in DB")
        return

    async def _user() -> AuthUser:
        return _as_user(owner)

    async def _prep() -> tuple[str, str]:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Thin share",
            )
            version = await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// thin share",
            )
            return str(tool.id), str(version.id)
        finally:
            await pool.close()

    tool_id, version_id = asyncio.run(_prep())
    app.dependency_overrides[get_current_user] = _user
    try:
        with TestClient(app) as client:
            res = client.post(f"/api/v1/tools/{tool_id}/publish")
            assert res.status_code == 200, res.text
            body = res.json()
            assert body["status"] == "published"
            assert body["publishedVersionId"] == version_id
            assert body["tags"] == []
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_normalize_tags()
    test_publish_metadata_and_version_freeze()
    test_publish_freeze_draft_creates_version()
    test_publish_empty_code_blocked()
    test_publish_thin_body_still_works()
    print("M8a publish smoke OK")
