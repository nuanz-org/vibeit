"""B2: real three harness (Scene / WebGLRenderer / PerspectiveCamera)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[3]
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.index import GOLDEN_MANIFEST, load_golden_source
from agent.validators.compile_check import COMPILED_JS_MAX_CHARS, run_compile_check
from agent.validators.sandbox_smoke import run_sandbox_smoke, run_structural_smoke
from agent.validators.static_validate import static_validate_tool_source

THREE_SKELETON = (
    _REPO / "packages" / "contracts" / "src" / "skeletons" / "three.ts"
)


def test_harness_exposes_scene_renderer_camera() -> None:
    text = THREE_SKELETON.read_text(encoding="utf-8")
    assert "scene: THREE.Scene" in text or "scene:THREE.Scene" in text
    assert "WebGLRenderer" in text
    assert "PerspectiveCamera" in text
    assert "preserveDrawingBuffer" in text
    assert "autoRender" in text
    # Product vendor, not CDN
    assert "three-vendor" in text
    assert "esm.sh" not in text or "no CDN" in text or "never" in text.lower()


def test_compile_limit_allows_three_bundle() -> None:
    assert COMPILED_JS_MAX_CHARS >= 1_500_000


def test_three_depth_uses_real_three_api() -> None:
    entry = next(e for e in GOLDEN_MANIFEST if e.id == "three-depth")
    src = load_golden_source(entry)
    assert "createThreeTool" in src
    assert "MeshStandardMaterial" in src or "BoxGeometry" in src
    assert "c.scene" in src or "c.THREE" in src or "THREE." in src
    # Must not use raw WebGL shader path from AM6 stub golden
    assert "createShader" not in src
    assert "gl.drawArrays" not in src


def test_three_depth_static_and_compile() -> None:
    entry = next(e for e in GOLDEN_MANIFEST if e.id == "three-depth")
    src = load_golden_source(entry)
    static = static_validate_tool_source(src, target="three")
    assert static.ok, static.errors
    structural = run_structural_smoke(src, target="three")
    assert structural.ok, structural.errors
    compiled = run_compile_check(src)
    assert compiled.ok, compiled.errors
    assert compiled.js is not None
    assert len(compiled.js) < COMPILED_JS_MAX_CHARS
    # Bundled product three should appear in output in some form
    assert len(compiled.js) > 50_000, "expected three.js to be bundled into tool ESM"


def test_three_depth_host_smoke() -> None:
    entry = next(e for e in GOLDEN_MANIFEST if e.id == "three-depth")
    src = load_golden_source(entry)
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
        job_id="b2-three",
    )
    assert full.ok, full.errors


def test_tool_may_import_three_namespace_from_skeleton() -> None:
    """Creative can import THREE from skeletons/three (re-export), not three-vendor."""
    src = """
import { createThreeTool, THREE } from "@repo/contracts/skeletons/three";
export const createTool = () =>
  createThreeTool({
    getParamSchema: () => [{ name: "bg", kind: "color", default: "#000" }],
    getDefaultParams: () => ({ bg: "#000" }),
    getAssetSlots: () => [],
    setup(c) {
      c.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      c.scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({ color: 0xff00ff })));
      c.camera.position.z = 3;
    },
    draw(c) {
      c.setBackground(String(c.params.bg ?? "#000"));
    },
  });
"""
    r = static_validate_tool_source(src, target="three")
    assert r.ok, r.errors
    compiled = run_compile_check(src)
    assert compiled.ok, compiled.errors


if __name__ == "__main__":
    test_harness_exposes_scene_renderer_camera()
    test_compile_limit_allows_three_bundle()
    test_three_depth_uses_real_three_api()
    test_three_depth_static_and_compile()
    test_three_depth_host_smoke()
    test_tool_may_import_three_namespace_from_skeleton()
    print("test_track_b2_three_harness: ok")
