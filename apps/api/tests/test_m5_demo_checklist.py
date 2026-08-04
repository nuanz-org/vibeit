"""
M5 demo checklist (M5f) — automated parts.

Manual Studio Control path: md/m5-demo-checklist.md
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_API = Path(__file__).resolve().parents[1]
_ROOT = _API.parents[1]
_SRC = _API / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))


def test_m5_checklist_doc_exists() -> None:
    path = _ROOT / "md" / "m5-demo-checklist.md"
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    assert "M5" in text
    assert "draft" in text.lower()
    assert "View source" in text or "view source" in text.lower()
    assert "download" in text.lower()
    assert "reload" in text.lower()
    assert "LangGraph" in text or "langgraph" in text.lower()
    assert "social-frame" in text
    assert "PATCH" in text or "draft" in text


def test_migration_003_draft_state_exists() -> None:
    path = _API / "migrations" / "003_tool_draft_state.sql"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "draft_params" in text
    assert "draft_assets" in text


def test_no_source_download_endpoint() -> None:
    """Product rule: no tool source download route."""
    tools_py = (_API / "src" / "api" / "v1" / "tools.py").read_text(encoding="utf-8")
    assert "download" not in tools_py.lower() or "no download" in tools_py.lower()
    # No dedicated download path registered under tools router
    assert "/download" not in tools_py
    assert "Content-Disposition" not in tools_py

    # Access rules still forbid source download
    access = (_ROOT / "md" / "access-rules.md").read_text(encoding="utf-8")
    assert "Source download" in access or "source download" in access.lower()
    assert "Never" in access or "never" in access.lower()


def test_view_source_panel_is_view_only() -> None:
    panel = (
        _ROOT
        / "apps"
        / "web"
        / "features"
        / "studio"
        / "components"
        / "view-source-panel.tsx"
    )
    assert panel.is_file()
    text = panel.read_text(encoding="utf-8")
    assert "no download" in text.lower() or "View only" in text
    assert "download=" not in text.replace('data-download="false"', "")
    assert "createObjectURL" not in text
    assert "Content-Disposition" not in text


def test_studio_control_surfaces_exist() -> None:
    studio = _ROOT / "apps" / "web" / "features" / "studio"
    for rel in [
        "components/param-controls.tsx",
        "components/asset-slots-panel.tsx",
        "components/empty-slots-banner.tsx",
        "components/studio-shell.tsx",
        "components/studio-tool-loader.tsx",
        "hooks/use-studio-runtime.ts",
        "hooks/use-studio-draft-persist.ts",
        "lib/draft-assets.ts",
        "lib/version-metadata.ts",
    ]:
        path = studio / rel
        assert path.is_file(), f"missing {path}"


def test_m5c_draft_smoke() -> None:
    """Re-run M5c draft API smoke as checklist gate."""
    proc = subprocess.run(
        [sys.executable, str(_API / "tests" / "test_tools_m5c.py")],
        cwd=str(_API),
        capture_output=True,
        text=True,
        check=False,
        env=os.environ.copy(),
    )
    assert proc.returncode == 0, f"test_tools_m5c failed:\n{proc.stdout}\n{proc.stderr}"


def test_milestones_m5_subparts_documented() -> None:
    path = _ROOT / "md" / "vibeit-milestones.md"
    text = path.read_text(encoding="utf-8")
    for key in ("M5a", "M5b", "M5c", "M5d", "M5e", "M5f"):
        assert key in text
    assert "draft_params" in text or "draftParams" in text


if __name__ == "__main__":
    test_m5_checklist_doc_exists()
    test_migration_003_draft_state_exists()
    test_no_source_download_endpoint()
    test_view_source_panel_is_view_only()
    test_studio_control_surfaces_exist()
    test_m5c_draft_smoke()
    test_milestones_m5_subparts_documented()
    print("M5 demo checklist automated OK")
