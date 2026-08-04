"""M1d smoke: local storage put/get/delete + CORS on serve route."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from fastapi.testclient import TestClient

from adapters.storage.cors import storage_cors_headers
from adapters.storage.local import LocalFilesystemStorage, StorageKeyError
from core.deps import get_storage
from main import app

# Minimal 1x1 PNG
_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_cors_headers_reflect_allowlisted_origin() -> None:
    h = storage_cors_headers("http://localhost:3000")
    assert h["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert "GET" in h["Access-Control-Allow-Methods"]
    assert "Access-Control-Allow-Credentials" not in h


def test_local_storage_round_trip() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = LocalFilesystemStorage(
            root=tmp,
            public_base_url="http://localhost:8000",
        )
        key = "inspiration/user1/asset1/logo.png"
        import asyncio

        asyncio.run(storage.put_object(key, _PNG, "image/png"))
        url = storage.get_url(key)
        assert url.startswith("http://localhost:8000/api/v1/storage/objects/")
        assert "inspiration" in url

        got = asyncio.run(storage.get_object(key))
        assert got is not None
        data, ctype = got
        assert data == _PNG
        assert ctype == "image/png"

        asyncio.run(storage.delete_object(key))
        assert asyncio.run(storage.get_object(key)) is None


def test_reject_path_traversal() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = LocalFilesystemStorage(root=tmp, public_base_url="http://x")
        import asyncio

        try:
            asyncio.run(storage.put_object("../etc/passwd", b"x", "text/plain"))
            raise AssertionError("expected StorageKeyError")
        except StorageKeyError:
            pass


def test_serve_object_with_cors() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        storage = LocalFilesystemStorage(
            root=tmp,
            public_base_url="http://testserver",
        )
        key = "studio/u1/a1/pic.png"
        import asyncio

        asyncio.run(storage.put_object(key, _PNG, "image/png"))

        app.dependency_overrides[get_storage] = lambda: storage
        try:
            with TestClient(app) as client:
                res = client.get(
                    f"/api/v1/storage/objects/{key}",
                    headers={"Origin": "http://localhost:3000"},
                )
                assert res.status_code == 200, res.text
                assert res.content == _PNG
                assert res.headers.get("access-control-allow-origin") == (
                    "http://localhost:3000"
                )
                assert res.headers.get("content-type", "").startswith("image/png")

                opt = client.options(
                    f"/api/v1/storage/objects/{key}",
                    headers={"Origin": "http://localhost:3000"},
                )
                assert opt.status_code == 204
                assert opt.headers.get("access-control-allow-origin") == (
                    "http://localhost:3000"
                )
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    test_cors_headers_reflect_allowlisted_origin()
    test_local_storage_round_trip()
    test_reject_path_traversal()
    test_serve_object_with_cors()
    print("M1d storage smoke OK")
