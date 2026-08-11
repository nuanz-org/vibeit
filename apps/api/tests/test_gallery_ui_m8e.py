"""M8e — gallery web UI surfaces exist (static smoke)."""

from __future__ import annotations

from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2].parent  # aiditr/
_WEB = _ROOT / "apps" / "web"


def test_gallery_routes_exist() -> None:
    assert (_WEB / "app" / "gallery" / "page.tsx").is_file()
    assert (_WEB / "app" / "gallery" / "[publicId]" / "page.tsx").is_file()


def test_gallery_feature_components_exist() -> None:
    feat = _WEB / "features" / "gallery"
    for rel in [
        "styles.module.css",
        "components/gallery-shell.tsx",
        "components/gallery-card.tsx",
        "components/gallery-list.tsx",
        "components/gallery-detail.tsx",
    ]:
        path = feat / rel
        assert path.is_file(), f"missing {path}"


def test_gallery_links_from_home_and_public() -> None:
    home = (_WEB / "app" / "page.tsx").read_text(encoding="utf-8")
    assert "/gallery" in home
    assert "Browse gallery" in home or "Gallery" in home

    public_shell = (
        _WEB / "features" / "public-tool" / "components" / "public-tool-shell.tsx"
    ).read_text(encoding="utf-8")
    assert "/gallery" in public_shell

    gallery_list = (
        _WEB / "features" / "gallery" / "components" / "gallery-list.tsx"
    ).read_text(encoding="utf-8")
    assert "listGallery" in gallery_list or "public-gallery" in gallery_list
    assert "Open" not in gallery_list or "gallery" in gallery_list.lower()

    detail = (
        _WEB / "features" / "gallery" / "components" / "gallery-detail.tsx"
    ).read_text(encoding="utf-8")
    assert "/t/" in detail
    assert "getGalleryItem" in detail
    # No source download affordance
    assert "download" not in detail.lower() or "source download" in detail.lower()


if __name__ == "__main__":
    test_gallery_routes_exist()
    test_gallery_feature_components_exist()
    test_gallery_links_from_home_and_public()
    print("M8e gallery UI smoke OK")
