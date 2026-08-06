"""
M8 demo checklist (M8g) — automated parts.

Manual publish / gallery path: md/m8-demo-checklist.md
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_API = Path(__file__).resolve().parents[1]
_ROOT = _API.parents[1]
_SRC = _API / "src"
_WEB = _ROOT / "apps" / "web"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))


def test_m8_checklist_doc_exists() -> None:
    path = _ROOT / "md" / "m8-demo-checklist.md"
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    assert "M8" in text
    assert "gallery" in text.lower()
    assert "unpublish" in text.lower()
    assert "thumbnail" in text.lower() or "thumb" in text.lower()
    assert "forGallery" in text or "for gallery" in text.lower() or "Publish to gallery" in text
    assert "core loop" in text.lower() or "core-loop" in text.lower()
    assert "GATES_FAILED" in text or "gate" in text.lower()


def test_no_source_download_on_tools_public_gallery() -> None:
    tools_py = (_API / "src" / "api" / "v1" / "tools.py").read_text(encoding="utf-8")
    public_py = (_API / "src" / "api" / "v1" / "public_tools.py").read_text(
        encoding="utf-8",
    )
    gallery_py = (_API / "src" / "api" / "v1" / "public_gallery.py").read_text(
        encoding="utf-8",
    )
    assert "/download" not in tools_py
    assert "/download" not in public_py
    assert "/download" not in gallery_py
    assert "Content-Disposition" not in public_py
    assert "Content-Disposition" not in gallery_py


def test_m8_api_surfaces_exist() -> None:
    assert (_API / "src" / "domain" / "publish_gates.py").is_file()
    assert (_API / "src" / "services" / "public_tool.py").is_file()
    assert (_API / "src" / "services" / "gallery.py").is_file()
    assert (_API / "src" / "api" / "v1" / "public_gallery.py").is_file()
    tools_py = (_API / "src" / "api" / "v1" / "tools.py").read_text(encoding="utf-8")
    assert "/publish" in tools_py
    assert "/unpublish" in tools_py
    assert "for_gallery" in tools_py or "forGallery" in tools_py
    gallery_py = (_API / "src" / "api" / "v1" / "public_gallery.py").read_text(
        encoding="utf-8",
    )
    assert "public/gallery" in gallery_py or "gallery" in gallery_py
    migrations = list((_API / "migrations").glob("004_*.sql")) + list(
        (_API / "migrations").glob("005_*.sql"),
    )
    assert any("publish" in p.name for p in migrations)
    assert any("gate" in p.name for p in migrations)


def test_m8_web_surfaces_exist() -> None:
    studio = _WEB / "features" / "studio"
    for rel in [
        "components/publish-panel.tsx",
        "components/share-panel.tsx",
        "components/export-panel.tsx",
        "lib/upload-thumbnail.ts",
    ]:
        assert (studio / rel).is_file(), f"missing {studio / rel}"

    publish = (studio / "components" / "publish-panel.tsx").read_text(encoding="utf-8")
    assert "forGallery" in publish
    assert "Unpublish" in publish or "unpublish" in publish
    assert "Publish to gallery" in publish

    assert (_WEB / "app" / "gallery" / "page.tsx").is_file()
    assert (_WEB / "app" / "gallery" / "[publicId]" / "page.tsx").is_file()
    gallery_feat = _WEB / "features" / "gallery"
    for rel in [
        "components/gallery-list.tsx",
        "components/gallery-detail.tsx",
        "components/gallery-card.tsx",
    ]:
        assert (gallery_feat / rel).is_file(), f"missing {gallery_feat / rel}"

    tools_ts = (_WEB / "lib" / "api" / "tools.ts").read_text(encoding="utf-8")
    assert "publishTool" in tools_ts
    assert "unpublishTool" in tools_ts
    assert "PublishGatesError" in tools_ts

    gallery_ts = (_WEB / "lib" / "api" / "gallery.ts").read_text(encoding="utf-8")
    assert "listGallery" in gallery_ts
    assert "getGalleryItem" in gallery_ts


def test_milestones_m8_subparts_documented() -> None:
    path = _ROOT / "md" / "vibeit-milestones.md"
    text = path.read_text(encoding="utf-8")
    for key in ("M8a", "M8b", "M8c", "M8d", "M8e", "M8f", "M8g"):
        assert key in text


def _run_smoke(name: str) -> None:
    proc = subprocess.run(
        [sys.executable, str(_API / "tests" / name)],
        cwd=str(_API),
        capture_output=True,
        text=True,
        check=False,
        env=os.environ.copy(),
    )
    assert proc.returncode == 0, (
        f"{name} failed:\n{proc.stdout}\n{proc.stderr}"
    )


def test_m8a_publish_metadata_smoke() -> None:
    _run_smoke("test_publish_m8a.py")


def test_m8b_publish_gates_smoke() -> None:
    _run_smoke("test_publish_gates_m8b.py")


def test_m8c_thumbnail_smoke() -> None:
    _run_smoke("test_thumbnail_m8c.py")


def test_m8d_gallery_api_smoke() -> None:
    _run_smoke("test_gallery_m8d.py")


def test_m8e_gallery_ui_smoke() -> None:
    _run_smoke("test_gallery_ui_m8e.py")


def test_m8f_unpublish_smoke() -> None:
    _run_smoke("test_unpublish_m8f.py")


if __name__ == "__main__":
    test_m8_checklist_doc_exists()
    test_no_source_download_on_tools_public_gallery()
    test_m8_api_surfaces_exist()
    test_m8_web_surfaces_exist()
    test_milestones_m8_subparts_documented()
    test_m8a_publish_metadata_smoke()
    test_m8b_publish_gates_smoke()
    test_m8c_thumbnail_smoke()
    test_m8d_gallery_api_smoke()
    test_m8e_gallery_ui_smoke()
    test_m8f_unpublish_smoke()
    print("M8 demo checklist smoke OK")
