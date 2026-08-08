"""B1: product-vendored three pin (no CDN) — design freeze checks."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[3]
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.index import GOLDEN_MANIFEST, load_golden_source
from agent.validators.compile_check import run_compile_check
from agent.validators.static_validate import static_validate_tool_source

# Keep in sync with packages/contracts package.json + three-vendor.ts
THREE_PIN = "0.185.1"
CONTRACTS_PKG = _REPO / "packages" / "contracts" / "package.json"
VENDOR_TS = (
    _REPO / "packages" / "contracts" / "src" / "skeletons" / "three-vendor.ts"
)
THREE_SKELETON = (
    _REPO / "packages" / "contracts" / "src" / "skeletons" / "three.ts"
)


def test_contracts_pins_exact_three_version() -> None:
    pkg = json.loads(CONTRACTS_PKG.read_text(encoding="utf-8"))
    dep = pkg.get("dependencies", {}).get("three")
    assert dep == THREE_PIN, f"expected exact pin {THREE_PIN!r}, got {dep!r}"
    # No caret/tilde on the pin (design freeze)
    assert not str(dep).startswith(("^", "~", ">="))


def test_vendor_module_exports_matching_pin() -> None:
    text = VENDOR_TS.read_text(encoding="utf-8")
    m = re.search(r'THREE_VIBEIT_PIN\s*=\s*"([^"]+)"', text)
    assert m, "THREE_VIBEIT_PIN missing from three-vendor.ts"
    assert m.group(1) == THREE_PIN
    assert 'from "three"' in text or "from 'three'" in text
    # No import/require of CDN hosts (comments may mention them as forbidden)
    assert not re.search(
        r"""from\s+['"]https?://|import\s*\(\s*['"]https?://""",
        text,
    )


def test_harness_imports_vendor_not_bare_three() -> None:
    """B2 harness uses product vendor path; never bare npm 'three' in skeleton surface."""
    text = THREE_SKELETON.read_text(encoding="utf-8")
    assert re.search(r"""from\s+['"]\./three-vendor['"]""", text)
    assert not re.search(r"""from\s+['"]three['"]""", text)
    # Creative re-export surface present
    assert "export { THREE" in text or "export {THREE" in text


def test_static_blocks_bare_three_and_cdn() -> None:
    bare = """
import * as THREE from "three";
export const createTool = () => ({ mount() {}, update() {}, dispose() {},
  getParamSchema: () => [], getDefaultParams: () => ({}), getAssetSlots: () => [],
  captureFrame: async () => new Blob(), draw() {} });
"""
    r = static_validate_tool_source(bare, target="three")
    assert not r.ok
    assert any("bare p5/three" in e for e in r.errors)

    subpath = bare.replace('"three"', '"three/addons/controls/OrbitControls.js"')
    r2 = static_validate_tool_source(subpath, target="three")
    assert not r2.ok

    cdn = """
import * as THREE from "https://esm.sh/three@0.185.1";
export const createTool = () => ({ mount() {}, update() {}, dispose() {},
  getParamSchema: () => [], getDefaultParams: () => ({}), getAssetSlots: () => [],
  captureFrame: async () => new Blob(), draw() {} });
"""
    r3 = static_validate_tool_source(cdn, target="three")
    assert not r3.ok
    joined = " ".join(r3.errors)
    assert "remote module" in joined or "npm_import" in joined


def test_static_blocks_three_vendor_from_tool_source() -> None:
    src = """
import { THREE } from "@repo/contracts/skeletons/three-vendor";
import { createThreeTool } from "@repo/contracts/skeletons/three";
export const createTool = () =>
  createThreeTool({
    getParamSchema: () => [],
    getDefaultParams: () => ({}),
    getAssetSlots: () => [],
    draw(c) { c.clear(0, 0, 0, 1); void THREE; },
  });
"""
    r = static_validate_tool_source(src, target="three")
    assert not r.ok
    assert any("three-vendor is product-only" in e for e in r.errors)


def test_three_depth_golden_still_compiles() -> None:
    entry = next(e for e in GOLDEN_MANIFEST if e.id == "three-depth")
    src = load_golden_source(entry)
    static = static_validate_tool_source(src, target="three")
    assert static.ok, static.errors
    compiled = run_compile_check(src)
    assert compiled.ok, compiled.errors


def test_vendor_pin_resolves_via_node() -> None:
    """Installed three package version matches pin (pnpm install required)."""
    three_pkg = _REPO / "packages" / "contracts" / "node_modules" / "three" / "package.json"
    assert three_pkg.is_file(), "three not installed under packages/contracts"
    ver = json.loads(three_pkg.read_text(encoding="utf-8"))["version"]
    assert ver == THREE_PIN


def test_contracts_tsc_accepts_vendor_module() -> None:
    result = subprocess.run(
        ["pnpm", "exec", "tsc", "--noEmit"],
        cwd=_REPO / "packages" / "contracts",
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr


if __name__ == "__main__":
    test_contracts_pins_exact_three_version()
    test_vendor_module_exports_matching_pin()
    test_harness_imports_vendor_not_bare_three()
    test_static_blocks_bare_three_and_cdn()
    test_static_blocks_three_vendor_from_tool_source()
    test_three_depth_golden_still_compiles()
    test_vendor_pin_resolves_via_node()
    test_contracts_tsc_accepts_vendor_module()
    print("test_track_b1_three_vendor: ok")
