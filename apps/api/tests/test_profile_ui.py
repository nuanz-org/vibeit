"""Profile workbench surfaces exist (static smoke)."""

from __future__ import annotations

from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2].parent
_WEB = _ROOT / "apps" / "web"


def test_profile_route_and_workbench() -> None:
    page = (_WEB / "app" / "profile" / "page.tsx").read_text(encoding="utf-8")
    assert "ProfileWorkbench" in page
    assert "requireSession" in page
    assert (
        _WEB / "features" / "profile" / "components" / "profile-workbench.tsx"
    ).is_file()
    assert (
        _WEB / "features" / "profile" / "components" / "profile-tool-card.tsx"
    ).is_file()


def test_profile_client_lists_owner_tools() -> None:
    api = (_WEB / "lib" / "api" / "tools.ts").read_text(encoding="utf-8")
    assert "listMyTools" in api
    assert "/api/v1/tools" in api
    hook = (
        _WEB / "features" / "profile" / "hooks" / "use-my-tools.ts"
    ).read_text(encoding="utf-8")
    assert "listMyTools" in hook
    assert "my-tools" in hook


def test_profile_filters_and_studio_open() -> None:
    workbench = (
        _WEB / "features" / "profile" / "components" / "profile-workbench.tsx"
    ).read_text(encoding="utf-8")
    assert 'id: "created"' in workbench
    assert 'id: "remixed"' in workbench
    assert "?kind=" in workbench or 'params.set("kind"' in workbench
    card = (
        _WEB / "features" / "profile" / "components" / "profile-tool-card.tsx"
    ).read_text(encoding="utf-8")
    assert "/studio/" in card
    assert "Open public" in card
    assert "hasRunnableVersion" in card


def test_header_identity_links_to_profile() -> None:
    menu = (
        _WEB / "features" / "auth" / "components" / "user-menu.tsx"
    ).read_text(encoding="utf-8")
    assert menu.count('href="/profile"') >= 2


if __name__ == "__main__":
    test_profile_route_and_workbench()
    test_profile_client_lists_owner_tools()
    test_profile_filters_and_studio_open()
    test_header_identity_links_to_profile()
    print("profile UI smoke OK")
