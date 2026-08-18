"""Gallery remix: POST /api/v1/tools/fork/{publicId}."""

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


async def _two_users() -> tuple[str, str] | None:
    """Owner + forker. Inserts a disposable user if the DB only has one."""
    try:
        conn = await asyncpg.connect(dsn=_dsn())
    except Exception:
        return None
    try:
        rows = await conn.fetch('SELECT id FROM "user" ORDER BY "createdAt" LIMIT 2')
        ids = [str(r["id"]) for r in rows]
        if not ids:
            return None
        if len(ids) >= 2:
            return ids[0], ids[1]
        extra_id = f"fork-test-{uuid.uuid4()}"
        await conn.execute(
            """
            INSERT INTO "user" (id, name, email, "emailVerified")
            VALUES ($1, $2, $3, true)
            """,
            extra_id,
            "Fork Tester",
            f"{extra_id}@example.com",
        )
        return ids[0], extra_id
    finally:
        await conn.close()


def _two_users_sync() -> tuple[str, str] | None:
    return asyncio.run(_two_users())


def _count_versions(tool_id: str) -> int:
    async def _run() -> int:
        conn = await asyncpg.connect(dsn=_dsn())
        try:
            return int(
                await conn.fetchval(
                    "SELECT COUNT(*) FROM tool_versions WHERE tool_id = $1::uuid",
                    tool_id,
                )
            )
        finally:
            await conn.close()

    return asyncio.run(_run())


def _forked_from(tool_id: str) -> str | None:
    async def _run() -> str | None:
        conn = await asyncpg.connect(dsn=_dsn())
        try:
            val = await conn.fetchval(
                "SELECT forked_from_tool_id FROM tools WHERE id = $1::uuid",
                tool_id,
            )
            return str(val) if val is not None else None
        finally:
            await conn.close()

    return asyncio.run(_run())


def _count_tools_for_public(public_id: str) -> int:
    async def _run() -> int:
        conn = await asyncpg.connect(dsn=_dsn())
        try:
            return int(
                await conn.fetchval(
                    "SELECT COUNT(*) FROM tools WHERE public_id = $1",
                    public_id,
                )
            )
        finally:
            await conn.close()

    return asyncio.run(_run())


def test_fork_published_tool_as_other_user() -> None:
    pair = _two_users_sync()
    if not pair:
        print("SKIP fork: no Better Auth user in DB")
        return
    owner_id, forker_id = pair

    plan = {"aspect": "9:16", "intent": "fork-source"}
    schema = [{"name": "speed", "kind": "number", "default": 1}]
    slots = [{"id": "logo", "label": "Logo"}]
    code = "// fork source export const createTool = () => ({})"

    async def _prep() -> tuple[str, str, int]:
        pool = await asyncpg.create_pool(dsn=_dsn(), min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner_id,
                title="Fork source",
                description="Thin share remix me",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code=code,
                param_schema=schema,
                default_params={"speed": 1},
                asset_slots=slots,
                plan=plan,
            )
            await tools.update_tool_draft_state(
                tool.id,
                draft_params={"speed": 7},
                draft_assets={
                    "logo": "http://127.0.0.1:8000/api/v1/assets/raw/src-asset",
                },
            )
            published = await tools.set_tool_published(
                tool.id,
                owner_user_id=owner_id,
                title="Fork source",
                description="Thin share remix me",
                tags=["kinetic", "demo"],
            )
            assert published is not None
            return str(tool.id), tool.public_id
        finally:
            await pool.close()

    source_id, public_id = asyncio.run(_prep())
    src_versions = _count_versions(source_id)

    async def _forker() -> AuthUser:
        return _as_user(forker_id, tag="forker")

    app.dependency_overrides[get_current_user] = _forker
    try:
        with TestClient(app) as client:
            res = client.post(f"/api/v1/tools/fork/{public_id}")
            assert res.status_code == 201, res.text
            body = res.json()
            assert body["id"] != source_id
            assert body["publicId"] != public_id
            assert body["ownerUserId"] == forker_id
            assert body["status"] == "draft"
            assert body["galleryReady"] is False
            assert body["publishedVersionId"] is None
            assert body["title"] == "Fork source"
            assert body["description"] == "Thin share remix me"
            assert body["tags"] == ["kinetic", "demo"]
            assert body["chatHistory"] == []
            assert body["draftParams"]["speed"] == 7
            assert (
                body["draftAssets"]["logo"]
                == "http://127.0.0.1:8000/api/v1/assets/raw/src-asset"
            )
            ver = body["latestVersion"]
            assert ver is not None
            assert ver["code"] == code
            assert ver["target"] == "canvas2d"
            assert ver["paramSchema"] == schema
            assert ver["defaultParams"] == {"speed": 1}
            assert ver["assetSlots"] == slots
            assert ver["plan"] == plan
            assert _forked_from(body["id"]) == source_id
            assert _count_versions(source_id) == src_versions

            got = client.get(f"/api/v1/tools/{body['id']}")
            assert got.status_code == 200, got.text
            assert got.json()["ownerUserId"] == forker_id

            refine = client.post(
                f"/api/v1/tools/{body['id']}/refine",
                json={"message": "make it faster"},
            )
            assert refine.status_code in (201, 429), refine.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    async def _owner() -> AuthUser:
        return _as_user(owner_id, tag="owner")

    app.dependency_overrides[get_current_user] = _owner
    try:
        with TestClient(app) as client:
            hidden = client.get(f"/api/v1/tools/{body['id']}")
            assert hidden.status_code == 404, hidden.text
            src = client.get(f"/api/v1/tools/{source_id}")
            assert src.status_code == 200, src.text
            assert src.json()["status"] == "published"
            assert src.json()["publicId"] == public_id
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_fork_draft_and_unpublished_404() -> None:
    pair = _two_users_sync()
    if not pair:
        print("SKIP fork 404: no Better Auth user in DB")
        return
    owner_id, forker_id = pair

    async def _prep() -> tuple[str, str]:
        pool = await asyncpg.create_pool(dsn=_dsn(), min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            draft = await tools.create_draft_tool(
                owner_user_id=owner_id,
                title="Never published",
            )
            await tools.create_tool_version(
                tool_id=draft.id,
                target="canvas2d",
                code="// draft only",
            )
            pub = await tools.create_draft_tool(
                owner_user_id=owner_id,
                title="Will unpublish",
            )
            await tools.create_tool_version(
                tool_id=pub.id,
                target="canvas2d",
                code="// then hide",
            )
            await tools.set_tool_published(pub.id, owner_user_id=owner_id)
            await tools.set_tool_unpublished(pub.id, owner_user_id=owner_id)
            return draft.public_id, pub.public_id
        finally:
            await pool.close()

    draft_pid, unpub_pid = asyncio.run(_prep())

    async def _forker() -> AuthUser:
        return _as_user(forker_id, tag="forker")

    app.dependency_overrides[get_current_user] = _forker
    try:
        with TestClient(app) as client:
            for pid in (draft_pid, unpub_pid, "t_does_not_exist_fork"):
                before = _count_tools_for_public(pid)
                res = client.post(f"/api/v1/tools/fork/{pid}")
                assert res.status_code == 404, res.text
                assert _count_tools_for_public(pid) == before
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_fork_published_empty_version_404() -> None:
    pair = _two_users_sync()
    if not pair:
        print("SKIP fork empty version: no Better Auth user in DB")
        return
    owner_id, forker_id = pair

    async def _prep() -> str:
        pool = await asyncpg.create_pool(dsn=_dsn(), min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner_id,
                title="Empty code",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="",
            )
            await tools.set_tool_published(tool.id, owner_user_id=owner_id)
            return tool.public_id
        finally:
            await pool.close()

    public_id = asyncio.run(_prep())

    async def _forker() -> AuthUser:
        return _as_user(forker_id, tag="forker")

    app.dependency_overrides[get_current_user] = _forker
    try:
        with TestClient(app) as client:
            res = client.post(f"/api/v1/tools/fork/{public_id}")
            assert res.status_code == 404, res.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_owner_can_fork_own_published_tool() -> None:
    pair = _two_users_sync()
    if not pair:
        print("SKIP fork own: no Better Auth user in DB")
        return
    owner_id, _ = pair

    async def _prep() -> str:
        pool = await asyncpg.create_pool(dsn=_dsn(), min_size=1, max_size=2)
        try:
            tools = ToolsRepository(pool)
            tool = await tools.create_draft_tool(
                owner_user_id=owner_id,
                title="Self remix",
            )
            await tools.create_tool_version(
                tool_id=tool.id,
                target="canvas2d",
                code="// own published",
            )
            await tools.set_tool_published(tool.id, owner_user_id=owner_id)
            return tool.public_id
        finally:
            await pool.close()

    public_id = asyncio.run(_prep())

    async def _owner() -> AuthUser:
        return _as_user(owner_id, tag="owner")

    app.dependency_overrides[get_current_user] = _owner
    try:
        with TestClient(app) as client:
            res = client.post(f"/api/v1/tools/fork/{public_id}")
            assert res.status_code == 201, res.text
            body = res.json()
            assert body["ownerUserId"] == owner_id
            assert body["status"] == "draft"
            assert body["publicId"] != public_id
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_fork_requires_auth() -> None:
    app.dependency_overrides.pop(get_current_user, None)
    with TestClient(app) as client:
        res = client.post("/api/v1/tools/fork/t_anything")
        assert res.status_code == 401, res.text
