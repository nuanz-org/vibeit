"""A5: proximity-pixel-card + kinetic-logo-2d goldens and tag retrieval."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.index import GOLDEN_MANIFEST, list_goldens, load_golden_source
from agent.golden.retrieve import retrieve_goldens
from agent.validators.compile_check import run_compile_check
from agent.validators.param_coverage import run_param_coverage
from agent.validators.static_validate import static_validate_tool_source

A5_IDS = ("proximity-pixel-card", "kinetic-logo-2d")


def _entry(gid: str):
    return next(e for e in GOLDEN_MANIFEST if e.id == gid)


def test_a5_goldens_registered() -> None:
    ids = set(list_goldens())
    assert set(A5_IDS).issubset(ids)


def test_a5_tags() -> None:
    prox = _entry("proximity-pixel-card")
    assert "interaction" in prox.tags
    assert "card" in prox.tags
    assert "pointer" in prox.tags or "proximity" in prox.tags

    logo = _entry("kinetic-logo-2d")
    assert "logo" in logo.tags
    assert "loop" in logo.tags
    assert "parametric" in logo.tags


def test_a5_static_and_compile() -> None:
    for gid in A5_IDS:
        entry = _entry(gid)
        src = load_golden_source(entry)
        static = static_validate_tool_source(src, target="canvas2d")
        assert static.ok, f"{gid}: {static.errors}"
        compiled = run_compile_check(src)
        assert compiled.ok, f"{gid} compile: {compiled.errors}"
        assert "export const createTool" in src
        assert "createCanvas2dTool" in src


def test_proximity_uses_pointer_and_cover() -> None:
    src = load_golden_source(_entry("proximity-pixel-card"))
    assert "c.pointer" in src or "pointer" in src
    assert "drawImageCover" in src
    assert "group:" in src or 'group: "' in src or "group: '" in src
    assert "photo" in src


def test_kinetic_has_three_enum_axes_and_loop() -> None:
    src = load_golden_source(_entry("kinetic-logo-2d"))
    assert "finalShape" in src
    assert "assemblyStyle" in src
    assert "cubeMaterial" in src
    assert "loopDuration" in src
    assert "hexagonRing" in src
    assert "isometricBlock" in src
    assert "stackedPyramid" in src
    assert "flyIn" in src
    assert "scattered" in src
    assert "scaleUnfold" in src
    assert "matte" in src
    assert "frostedGlass" in src
    assert "wireframe" in src
    # Normalized loop phase pattern
    assert "% loopDur" in src or "% loopDuration" in src or "loopDur" in src


def test_retrieve_proximity_by_tags() -> None:
    hits = retrieve_goldens(
        {
            "concept": "interactive proximity distortion card with photo",
            "tags": ["card", "interaction", "proximity"],
            "target": "canvas2d",
        },
        limit=2,
    )
    assert hits[0].id == "proximity-pixel-card"


def test_retrieve_kinetic_logo_by_tags() -> None:
    hits = retrieve_goldens(
        {
            "concept": "kinetic cube logo with shape assembly material enums",
            "tags": ["logo", "loop", "parametric"],
            "target": "canvas2d",
        },
        limit=2,
    )
    assert hits[0].id == "kinetic-logo-2d"


def test_param_coverage_self_schema_proximity() -> None:
    """Golden sources include all of their own schema param names."""
    src = load_golden_source(_entry("proximity-pixel-card"))
    # Minimal plan mirror of key params for coverage smoke
    plan = {
        "params": [
            {"name": "headline"},
            {"name": "caption"},
            {"name": "photo"},
            {"name": "maxPixelation"},
            {"name": "warpStrength"},
            {"name": "falloff"},
            {"name": "invertNear"},
            {"name": "bg"},
            {"name": "ink"},
            {"name": "accent"},
            {"name": "radius"},
        ]
    }
    result = run_param_coverage(src, plan)
    assert result.ok, result.errors


def test_param_coverage_self_schema_kinetic() -> None:
    src = load_golden_source(_entry("kinetic-logo-2d"))
    plan = {
        "params": [
            {"name": "finalShape"},
            {"name": "assemblyStyle"},
            {"name": "cubeMaterial"},
            {"name": "loopDuration"},
            {"name": "easingSharpness"},
            {"name": "bg"},
            {"name": "accent"},
            {"name": "ink"},
            {"name": "title"},
        ]
    }
    result = run_param_coverage(src, plan)
    assert result.ok, result.errors


if __name__ == "__main__":
    test_a5_goldens_registered()
    test_a5_tags()
    test_a5_static_and_compile()
    test_proximity_uses_pointer_and_cover()
    test_kinetic_has_three_enum_axes_and_loop()
    test_retrieve_proximity_by_tags()
    test_retrieve_kinetic_logo_by_tags()
    test_param_coverage_self_schema_proximity()
    test_param_coverage_self_schema_kinetic()
    print("test_agent_a5: all passed")
