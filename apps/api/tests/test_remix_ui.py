"""Remix-in-Studio web surfaces exist (static smoke)."""

from __future__ import annotations

from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2].parent
_WEB = _ROOT / "apps" / "web"


def test_remix_route_exists() -> None:
    assert (_WEB / "app" / "remix" / "[publicId]" / "page.tsx").is_file()
    assert (
        _WEB / "features" / "remix" / "components" / "remix-loader.tsx"
    ).is_file()


def test_remix_entry_points() -> None:
    focus = (
        _WEB / "features" / "gallery" / "components" / "gallery-focus.tsx"
    ).read_text(encoding="utf-8")
    detail = (
        _WEB / "features" / "gallery" / "components" / "gallery-detail.tsx"
    ).read_text(encoding="utf-8")
    public_shell = (
        _WEB / "features" / "public-tool" / "components" / "public-tool-shell.tsx"
    ).read_text(encoding="utf-8")
    for src in (focus, detail, public_shell):
        assert "/remix/" in src
        assert "Remix in Studio" in src


def test_proxy_gates_remix() -> None:
    proxy = (_WEB / "proxy.ts").read_text(encoding="utf-8")
    assert "/remix/:path*" in proxy


def test_signup_preserves_next() -> None:
    signup = (
        _WEB / "features" / "auth" / "components" / "sign-up-form.tsx"
    ).read_text(encoding="utf-8")
    assert "searchParams.get(\"next\")" in signup
    login = (
        _WEB / "features" / "auth" / "components" / "sign-in-form.tsx"
    ).read_text(encoding="utf-8")
    assert "/signup?next=" in login
