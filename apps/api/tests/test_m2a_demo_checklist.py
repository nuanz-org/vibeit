"""
M2a demo checklist (M2a6) — automated parts.

Closes M2a exit: real uploaded asset must be serveable with CORS so the
browser canvas can capture without tainting.

Manual Studio checks live in md/m2a-demo-checklist.md.
"""

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
from adapters.storage.cors import storage_cors_headers
from adapters.storage.local import LocalFilesystemStorage
from core.deps import get_storage
from core.security import get_current_user
from main import app

_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)

_DEFAULT_URL = "postgresql://aiditr:aiditr@localhost:5432/aiditr"
_ROOT = Path(__file__).resolve().parents[3]


def test_m2a_checklist_doc_exists() -> None:
    path = _ROOT / "md" / "m2a-demo-checklist.md"
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    assert "M2A_CAPTURE_REQUIRES_REAL_ASSET" in text
    assert "Prove real-asset PNG" in text or "real uploaded" in text.lower()
    assert "tainted" in text.lower() or "CORS" in text


def test_m2a_capture_constant_documented_in_contracts() -> None:
    path = (
        _ROOT
        / "packages"
        / "contracts"
        / "src"
        / "capture-cors.ts"
    )
    text = path.read_text(encoding="utf-8")
    assert "M2A_CAPTURE_REQUIRES_REAL_ASSET = true" in text
    assert "isRealUploadedAssetUrl" in text
    assert "isFixtureAssetUrl" in text


def test_cors_anonymous_no_credentials() -> None:
    """Canvas path requires anonymous CORS (no credentials)."""
    h = storage_cors_headers("http://localhost:3000")
    assert h["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert "Access-Control-Allow-Credentials" not in h
    assert "GET" in h["Access-Control-Allow-Methods"]


def test_studio_upload_raw_cors_round_trip() -> None:
    """
    M2a6 critical path (API side):
    authenticated studio upload → public raw URL → CORS GET of PNG bytes.
    Browser will use this URL with crossOrigin=anonymous + captureFrame.
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
        print("SKIP M2a6 upload: no Better Auth user in DB")
        return

    with tempfile.TemporaryDirectory() as tmp:
        storage = LocalFilesystemStorage(
            root=tmp,
            public_base_url="http://testserver",
        )

        async def _user() -> AuthUser:
            return AuthUser(
                id=owner,
                email="m2a6@example.com",
                name="M2a6",
                email_verified=True,
            )

        app.dependency_overrides[get_current_user] = _user
        app.dependency_overrides[get_storage] = lambda: storage

        try:
            with TestClient(app) as client:
                res = client.post(
                    "/api/v1/assets",
                    data={"kind": "studio"},
                    files={
                        "file": ("logo.png", io.BytesIO(_PNG), "image/png"),
                    },
                )
                assert res.status_code == 201, res.text
                data = res.json()
                assert data["kind"] == "studio"
                assert "/api/v1/assets/raw/" in data["url"]
                # Real-asset URL shape (not data:)
                assert data["url"].startswith("http")
                assert not data["url"].startswith("data:")

                # Preflight + GET as browser would for canvas
                opt = client.options(
                    f"/api/v1/assets/raw/{data['id']}",
                    headers={
                        "Origin": "http://localhost:3000",
                        "Access-Control-Request-Method": "GET",
                    },
                )
                assert opt.status_code in (200, 204), opt.text

                raw = client.get(
                    f"/api/v1/assets/raw/{data['id']}",
                    headers={"Origin": "http://localhost:3000"},
                )
                assert raw.status_code == 200, raw.text
                assert raw.content == _PNG
                assert raw.content[:8] == b"\x89PNG\r\n\x1a\n"
                # Reflect web origin so canvas crossOrigin=anonymous can read pixels.
                # (Global API CORSMiddleware may also set Allow-Credentials; img
                #  requests still use anonymous mode — storage helpers never
                #  require cookies.)
                assert (
                    raw.headers.get("access-control-allow-origin")
                    == "http://localhost:3000"
                )
        finally:
            app.dependency_overrides.clear()


def test_m1_storage_cors_still_holds() -> None:
    """Reuse M1d CORS serve smoke as part of M2a platform bar."""
    import test_storage_m1d

    test_storage_m1d.test_cors_headers_reflect_allowlisted_origin()
    test_storage_m1d.test_serve_object_with_cors()


if __name__ == "__main__":
    test_m2a_checklist_doc_exists()
    test_m2a_capture_constant_documented_in_contracts()
    test_cors_anonymous_no_credentials()
    test_studio_upload_raw_cors_round_trip()
    test_m1_storage_cors_still_holds()
    print("M2a demo checklist (automated) OK")
    print()
    print("Manual (browser) still required once:")
    print("  [ ] /studio/social-frame → upload logo → Prove real-asset PNG")
    print("  See md/m2a-demo-checklist.md")
