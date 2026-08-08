"""B3: Frame + Studio/public mount honor tool_versions.target (incl. three)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[3]
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.index import GOLDEN_MANIFEST, load_golden_source
from agent.validators.compile_check import run_compile_check
from agent.validators.sandbox_smoke import run_sandbox_smoke

WEB = _REPO / "apps" / "web"
RESOLVE_TS = WEB / "features" / "studio" / "lib" / "resolve-runtime-target.ts"
STUDIO_RUNTIME = WEB / "features" / "studio" / "hooks" / "use-studio-runtime.ts"
STUDIO_LOADER = WEB / "features" / "studio" / "components" / "studio-tool-loader.tsx"
PUBLIC_RUNTIME = WEB / "features" / "public-tool" / "hooks" / "use-public-tool-runtime.ts"
ADAPTER = WEB / "runtime" / "targets" / "canvas2d" / "adapter.ts"
FIXTURES = WEB / "features" / "studio" / "fixtures.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_resolve_runtime_target_module_exists() -> None:
    text = _read(RESOLVE_TS)
    assert "export function resolveRuntimeTarget" in text
    assert "isTargetId" in text
    assert 'return "canvas2d"' in text
    assert "three" in text


def test_studio_runtime_mounts_resolved_target_not_hardcoded_canvas2d() -> None:
    text = _read(STUDIO_RUNTIME)
    assert "resolveRuntimeTarget" in text
    # Must not hardcode mount target exclusively as canvas2d
    mount_blocks = re.findall(
        r"host\.mountTool\([\s\S]*?\{[\s\S]*?\}[\s\S]*?\)",
        text,
    )
    assert mount_blocks, "expected mountTool calls"
    for block in mount_blocks:
        # shorthand `target,` or `target: …`
        assert re.search(r"\btarget\s*[,:}]", block), block[:200]
        assert not re.search(r"""target\s*:\s*["']canvas2d["']""", block), (
            "Studio mount still hardcodes canvas2d:\n" + block[:300]
        )
    assert text.count("resolveRuntimeTarget(opts.target)") >= 2


def test_studio_loader_uses_version_target() -> None:
    text = _read(STUDIO_LOADER)
    assert "resolveRuntimeTarget" in text
    assert "version?.target" in text or "version.target" in text
    assert re.search(r"target:\s*runtimeTarget", text)


def test_public_runtime_mounts_resolved_target() -> None:
    text = _read(PUBLIC_RUNTIME)
    assert "resolveRuntimeTarget" in text
    assert not re.search(
        r"""mountTool\([\s\S]*?target\s*:\s*["']canvas2d["']""",
        text,
    )


def test_fixture_meta_allows_multi_target() -> None:
    text = _read(FIXTURES)
    assert "TargetId" in text
    assert 'target: "canvas2d"' in text  # social-frame still canvas2d


def test_frame_adapter_accepts_three_mount_target() -> None:
    text = _read(ADAPTER)
    assert "TargetId" in text
    assert 'command.target === "three"' in text or 'target === "three"' in text
    assert "this.target = mountTarget" in text


def test_three_depth_still_host_smokes_with_target_three() -> None:
    """End-to-end: compile + host smoke with plan.target three (B2 harness + B3 path)."""
    entry = next(e for e in GOLDEN_MANIFEST if e.id == "three-depth")
    src = load_golden_source(entry)
    compiled = run_compile_check(src)
    assert compiled.ok, compiled.errors
    full = run_sandbox_smoke(
        src,
        plan={
            "params": [
                {"name": "bg"},
                {"name": "accent"},
                {"name": "ink"},
                {"name": "speed"},
                {"name": "intensity"},
            ],
            "target": "three",
        },
        job_id="b3-three-mount",
    )
    assert full.ok, full.errors


if __name__ == "__main__":
    test_resolve_runtime_target_module_exists()
    test_studio_runtime_mounts_resolved_target_not_hardcoded_canvas2d()
    test_studio_loader_uses_version_target()
    test_public_runtime_mounts_resolved_target()
    test_fixture_meta_allows_multi_target()
    test_frame_adapter_accepts_three_mount_target()
    test_three_depth_still_host_smokes_with_target_three()
    print("test_track_b3_three_mount: ok")
