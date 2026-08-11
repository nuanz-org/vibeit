"""M1e smoke: auth-gated multipart upload → storage + DB + raw URL."""

from __future__ import annotations

import asyncio
import io
import os
import sys
import tempfile
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import asyncpg
from fastapi.testclient import TestClient

from adapters.auth.types import AuthUser
from adapters.storage.local import LocalFilesystemStorage
from core.deps import get_db_pool, get_storage
from core.security import get_current_user
from main import app
from services.upload_asset import UploadValidationError, upload_asset
from adapters.db.repositories.assets import AssetsRepository

# Minimal 1x1 PNG
_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"


def test_upload_unauthorized() -> None:
    app.dependency_overrides[get_db_pool] = lambda: object()
    app.dependency_overrides.pop(get_current_user, None)
    try:
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/assets",
                data={"kind": "inspiration"},
                files={"file": ("x.png", io.BytesIO(_PNG), "image/png")},
            )
        assert res.status_code == 401, res.text
    finally:
        app.dependency_overrides.clear()


def test_service_validation_rejects_bad_mime() -> None:
    async def _run() -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalFilesystemStorage(root=tmp, public_base_url="http://x")

            class _DummyAssets:
                pass

            try:
                await upload_asset(
                    owner_user_id="u1",
                    kind="inspiration",
                    data=b"hello",
                    content_type="text/plain",
                    original_filename="x.txt",
                    storage=storage,
                    assets=_DummyAssets(),  # type: ignore[arg-type]
                    api_public_base_url="http://x",
                )
                raise AssertionError("expected UploadValidationError")
            except UploadValidationError:
                pass

    asyncio.run(_run())


def test_upload_authenticated_http_round_trip() -> None:
    """
    Use TestClient lifespan pool (same event loop) + real Better Auth user FK.
    Storage root overridden to a temp dir via get_storage.
    """
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)

    async def _any_user() -> str | None:
        try:
            conn = await asyncpg.connect(dsn=url)
            try:
                row = await conn.fetchrow('SELECT id FROM "user" LIMIT 1')
                return str(row["id"]) if row else None
            finally:
                await conn.close()
        except Exception:
            return None

    owner = asyncio.run(_any_user())
    if not owner:
        print("SKIP authenticated upload: no Better Auth user in DB")
        return

    with tempfile.TemporaryDirectory() as tmp:
        storage = LocalFilesystemStorage(
            root=tmp,
            public_base_url="http://testserver",
        )

        async def _user() -> AuthUser:
            return AuthUser(
                id=owner,
                email="m1e@example.com",
                name="M1e",
                email_verified=True,
            )

        app.dependency_overrides[get_current_user] = _user
        app.dependency_overrides[get_storage] = lambda: storage
        # Do NOT override get_db_pool — use lifespan pool on same loop as TestClient

        try:
            with TestClient(app) as client:
                res = client.post(
                    "/api/v1/assets",
                    data={"kind": "inspiration"},
                    files={
                        "file": ("smoke.png", io.BytesIO(_PNG), "image/png"),
                    },
                )
                assert res.status_code == 201, res.text
                data = res.json()
                assert data["kind"] == "inspiration"
                assert data["contentType"] == "image/png"
                assert data["byteSize"] == len(_PNG)
                assert data["id"]
                assert "/api/v1/assets/raw/" in data["url"]

                raw = client.get(
                    f"/api/v1/assets/raw/{data['id']}",
                    headers={"Origin": "http://localhost:3000"},
                )
                assert raw.status_code == 200, raw.text
                assert raw.content == _PNG
                assert (
                    raw.headers.get("access-control-allow-origin")
                    == "http://localhost:3000"
                )

                meta = client.get(f"/api/v1/assets/{data['id']}")
                assert meta.status_code == 200
                assert meta.json()["id"] == data["id"]

                deleted = client.delete(f"/api/v1/assets/{data['id']}")
                assert deleted.status_code == 204
        finally:
            app.dependency_overrides.clear()


def test_service_upload_round_trip() -> None:
    """Direct service test without HTTP (asyncpg single loop)."""
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)

    async def _run() -> None:
        conn = await asyncpg.connect(dsn=url)
        try:
            row = await conn.fetchrow('SELECT id FROM "user" LIMIT 1')
            if row is None:
                print("SKIP service upload: no user")
                return
            owner = str(row["id"])
        finally:
            await conn.close()

        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            with tempfile.TemporaryDirectory() as tmp:
                storage = LocalFilesystemStorage(
                    root=tmp,
                    public_base_url="http://localhost:8000",
                )
                assets = AssetsRepository(pool)
                asset, public_url = await upload_asset(
                    owner_user_id=owner,
                    kind="studio",
                    data=_PNG,
                    content_type="image/png",
                    original_filename="svc.png",
                    storage=storage,
                    assets=assets,
                    api_public_base_url="http://localhost:8000",
                )
                assert asset.kind == "studio"
                assert str(asset.id) in public_url
                got = await storage.get_object(asset.storage_key)
                assert got is not None and got[0] == _PNG
                await storage.delete_object(asset.storage_key)
                await assets.delete_asset(asset.id, owner_user_id=owner)
        finally:
            await pool.close()

    asyncio.run(_run())


if __name__ == "__main__":
    test_upload_unauthorized()
    test_service_validation_rejects_bad_mime()
    test_service_upload_round_trip()
    test_upload_authenticated_http_round_trip()
    print("M1e upload smoke OK")
