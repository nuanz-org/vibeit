"""GET /api/v1/tools — owner library for /profile."""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
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


def _dsn() -> str:
    return os.getenv("DATABASE_URL", _DEFAULT_URL)


def _as_user(user_id: str, *, tag: str) -> AuthUser:
    return AuthUser(
        id=user_id,
        email=f"{tag}@example.com",
        name=tag,
        email_verified=True,
    )


async def _insert_user(tag: str) -> str | None:
    user_id = f"list-owner-{tag}-{uuid.uuid4()}"
    try:
        conn = await asyncpg.connect(dsn=_dsn())
    except Exception:
        return None
    try:
        await conn.execute(
            """
            INSERT INTO "user" (id, name, email, "emailVerified")
            VALUES ($1, $2, $3, true)
            """,
            user_id,
            tag,
            f"{user_id}@example.com",
        )
        return user_id
    except Exception:
        return None
    finally:
        await conn.close()


def _insert_user_sync(tag: str) -> str | None:
    return asyncio.run(_insert_user(tag))


def test_list_tools_requires_auth() -> None:
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        res = client.get("/api/v1/tools")
        assert res.status_code == 401, res.text


def test_list_tools_owner_filters_and_payload() -> None:
    owner = _insert_user_sync("owner")
    other = _insert_user_sync("other")
    if not owner or not other:
        print("SKIP owner list: cannot insert Better Auth users")
        return

    async def _prep() -> dict[str, str]:
        pool = await asyncpg.create_pool(dsn=_dsn(), min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            original = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Owner original",
            )
            await tools.create_tool_version(
                tool_id=original.id,
                target="canvas2d",
                code="// runnable original",
            )
            not_ready = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Owner not ready",
            )
            source = await tools.create_draft_tool(
                owner_user_id=other,
                title="Someone else source",
            )
            await tools.create_tool_version(
                tool_id=source.id,
                target="canvas2d",
                code="// source",
            )
            published = await tools.set_tool_published(
                source.id,
                owner_user_id=other,
            )
            assert published is not None
            remix = await tools.create_draft_tool(
                owner_user_id=owner,
                title="Owner remix",
            )
            await tools.create_tool_version(
                tool_id=remix.id,
                target="canvas2d",
                code="// remixed copy",
            )
            await tools.set_tool_fork_metadata(
                remix.id,
                forked_from_tool_id=source.id,
            )
            stray = await tools.create_draft_tool(
                owner_user_id=other,
                title="Not mine",
            )
            await tools.create_tool_version(
                tool_id=stray.id,
                target="canvas2d",
                code="// other",
            )
            return {
                "original": str(original.id),
                "not_ready": str(not_ready.id),
                "remix": str(remix.id),
                "stray": str(stray.id),
            }
        finally:
            await pool.close()

    ids = asyncio.run(_prep())

    async def _owner() -> AuthUser:
        return _as_user(owner, tag="owner")

    app.dependency_overrides[get_current_user] = _owner
    try:
        with TestClient(app) as client:
            all_res = client.get("/api/v1/tools", params={"limit": 24})
            assert all_res.status_code == 200, all_res.text
            body = all_res.json()
            listed = {item["id"]: item for item in body["items"]}
            assert ids["original"] in listed
            assert ids["not_ready"] in listed
            assert ids["remix"] in listed
            assert ids["stray"] not in listed
            assert "latestVersion" not in listed[ids["original"]]
            assert "draftParams" not in listed[ids["original"]]
            assert "chatHistory" not in listed[ids["original"]]
            assert listed[ids["original"]]["isRemix"] is False
            assert listed[ids["original"]]["hasRunnableVersion"] is True
            assert listed[ids["original"]]["status"] == "draft"
            assert listed[ids["not_ready"]]["hasRunnableVersion"] is False
            assert listed[ids["remix"]]["isRemix"] is True
            assert listed[ids["remix"]]["hasRunnableVersion"] is True

            created = client.get("/api/v1/tools", params={"kind": "created"})
            assert created.status_code == 200, created.text
            created_ids = {item["id"] for item in created.json()["items"]}
            assert ids["original"] in created_ids
            assert ids["not_ready"] in created_ids
            assert ids["remix"] not in created_ids

            remixed = client.get("/api/v1/tools", params={"kind": "remixed"})
            assert remixed.status_code == 200, remixed.text
            remixed_ids = {item["id"] for item in remixed.json()["items"]}
            assert remixed_ids == {ids["remix"]}

            bad = client.get("/api/v1/tools", params={"kind": "liked"})
            assert bad.status_code == 422

            page = client.get(
                "/api/v1/tools",
                params={"limit": 1, "offset": 0},
            )
            assert page.status_code == 200, page.text
            assert page.json()["limit"] == 1
            assert page.json()["hasMore"] is True
            assert len(page.json()["items"]) == 1
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    test_list_tools_requires_auth()
    test_list_tools_owner_filters_and_payload()
    print("owner list tools smoke OK")
