"""
M7 demo checklist (M7g) — automated parts.

Manual export / share path: md/m7-demo-checklist.md
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


def test_m7_checklist_doc_exists() -> None:
    path = _ROOT / "md" / "m7-demo-checklist.md"
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    assert "M7" in text
    assert "PNG" in text
    assert "WebM" in text or "video" in text.lower()
    assert "sequence" in text.lower() or "fallback" in text.lower()
    assert "/t/" in text or "publicId" in text
    assert "embed" in text.lower()
    assert "Make public" in text or "make public" in text.lower()
    assert "download" in text.lower()


def test_export_browser_support_doc_exists() -> None:
    path = _ROOT / "md" / "export-browser-support.md"
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    assert "MediaRecorder" in text
    assert "WebM" in text
    assert "Chromium" in text or "Chrome" in text
    assert "PNG" in text
    assert "fallback" in text.lower() or "sequence" in text.lower()


def test_no_source_download_on_tools_or_public() -> None:
    """Product rule: no tool source download route (Studio or public)."""
    tools_py = (_API / "src" / "api" / "v1" / "tools.py").read_text(encoding="utf-8")
    public_py = (_API / "src" / "api" / "v1" / "public_tools.py").read_text(
        encoding="utf-8",
    )
    assert "/download" not in tools_py
    assert "/download" not in public_py
    assert "Content-Disposition" not in tools_py
    assert "Content-Disposition" not in public_py

    access = (_ROOT / "md" / "access-rules.md").read_text(encoding="utf-8")
    assert "Source download" in access or "source download" in access.lower()


def test_public_tool_service_and_routes_exist() -> None:
    assert (_API / "src" / "services" / "public_tool.py").is_file()
    assert (_API / "src" / "api" / "v1" / "public_tools.py").is_file()
    tools_py = (_API / "src" / "api" / "v1" / "tools.py").read_text(encoding="utf-8")
    assert "/publish" in tools_py
    public_py = (_API / "src" / "api" / "v1" / "public_tools.py").read_text(
        encoding="utf-8",
    )
    assert "public/tools" in public_py or "publicId" in public_py or "{public_id}" in public_py


def test_studio_export_and_share_surfaces_exist() -> None:
    studio = _ROOT / "apps" / "web" / "features" / "studio"
    for rel in [
        "components/export-panel.tsx",
        "components/share-panel.tsx",
        "components/studio-shell.tsx",
        "hooks/use-studio-runtime.ts",
        "lib/export-download.ts",
        "lib/export-png-sequence.ts",
        "lib/zip-store.ts",
        "lib/share-links.ts",
    ]:
        path = studio / rel
        assert path.is_file(), f"missing {path}"

    export_panel = (studio / "components" / "export-panel.tsx").read_text(
        encoding="utf-8",
    )
    assert "Download PNG" in export_panel
    assert "video" in export_panel.lower() or "WebM" in export_panel
    assert "sequence" in export_panel.lower()

    share = (studio / "components" / "share-panel.tsx").read_text(encoding="utf-8")
    assert "Make public" in share or "make public" in share.lower()
    assert "embed" in share.lower()
    assert "Share URL" in share or "share" in share.lower()


def test_public_page_and_compile_public_exist() -> None:
    page = _ROOT / "apps" / "web" / "app" / "t" / "[publicId]" / "page.tsx"
    assert page.is_file(), f"missing {page}"
    compile_public = (
        _ROOT / "apps" / "web" / "app" / "api" / "runtime" / "compile-public" / "route.ts"
    )
    assert compile_public.is_file(), f"missing {compile_public}"
    public_feat = _ROOT / "apps" / "web" / "features" / "public-tool"
    for rel in [
        "components/public-tool-loader.tsx",
        "components/public-tool-shell.tsx",
        "hooks/use-public-tool-runtime.ts",
    ]:
        assert (public_feat / rel).is_file(), f"missing {public_feat / rel}"

    # Public compile must not take arbitrary client source
    compile_text = compile_public.read_text(encoding="utf-8")
    assert "publicId" in compile_text
    assert "public/tools" in compile_text


def test_record_video_runtime_path_exists() -> None:
    """M7b in-frame recordVideo plumbing still present."""
    messages = (
        _ROOT / "apps" / "web" / "runtime" / "contract" / "messages.ts"
    ).read_text(encoding="utf-8")
    assert "recordVideo" in messages
    record = (
        _ROOT / "apps" / "web" / "runtime" / "capture" / "record-video.ts"
    )
    assert record.is_file()
    frame_js = _ROOT / "apps" / "web" / "public" / "runtime-frame.js"
    assert frame_js.is_file()
    # Bundled frame should include record path after M7b rebuild
    frame_text = frame_js.read_text(encoding="utf-8")
    assert "recordVideo" in frame_text or "MediaRecorder" in frame_text


def test_m7d_public_tools_smoke() -> None:
    """Re-run M7d public API smoke as checklist gate."""
    proc = subprocess.run(
        [sys.executable, str(_API / "tests" / "test_public_tools_m7d.py")],
        cwd=str(_API),
        capture_output=True,
        text=True,
        check=False,
        env=os.environ.copy(),
    )
    assert proc.returncode == 0, (
        f"test_public_tools_m7d failed:\n{proc.stdout}\n{proc.stderr}"
    )


def test_milestones_m7_subparts_documented() -> None:
    path = _ROOT / "md" / "aiditr-milestones.md"
    text = path.read_text(encoding="utf-8")
    for key in ("M7a", "M7b", "M7c", "M7d", "M7e", "M7f", "M7g"):
        assert key in text
    # Subparts should be marked done when M7g ships
    assert "M7a" in text and "Done" in text


if __name__ == "__main__":
    test_m7_checklist_doc_exists()
    test_export_browser_support_doc_exists()
    test_no_source_download_on_tools_or_public()
    test_public_tool_service_and_routes_exist()
    test_studio_export_and_share_surfaces_exist()
    test_public_page_and_compile_public_exist()
    test_record_video_runtime_path_exists()
    test_m7d_public_tools_smoke()
    test_milestones_m7_subparts_documented()
    print("M7 demo checklist smoke OK")
