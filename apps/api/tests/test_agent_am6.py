"""AM6: multi-target goldens, target policy, p5/three validate + compile + smoke."""

from __future__ import annotations

import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.index import GOLDEN_MANIFEST, list_goldens, load_golden_source
from agent.golden.retrieve import retrieve_goldens
from agent.plan_parse import normalize_asap_plan
from agent.target_policy import (
    enabled_targets,
    is_target_enabled,
    resolve_plan_target,
)
from agent.validators.compile_check import run_compile_check
from agent.validators.sandbox_smoke import run_sandbox_smoke, run_structural_smoke
from agent.validators.static_validate import static_validate_tool_source


def test_goldens_include_p5_and_three() -> None:
    ids = set(list_goldens())
    assert "p5-orbit" in ids
    assert "three-depth" in ids
    assert "kinetic-type" in ids
    by_target = {}
    for e in GOLDEN_MANIFEST:
        by_target.setdefault(e.target, []).append(e.id)
    assert "p5" in by_target
    assert "three" in by_target
    assert "canvas2d" in by_target


def test_goldens_pass_static_for_their_target() -> None:
    for entry in GOLDEN_MANIFEST:
        src = load_golden_source(entry)
        result = static_validate_tool_source(src, target=entry.target)
        assert result.ok, f"{entry.id}: {result.errors}"


def test_goldens_compile() -> None:
    for entry in GOLDEN_MANIFEST:
        if entry.target not in ("canvas2d", "p5", "three"):
            continue
        src = load_golden_source(entry)
        result = run_compile_check(src)
        assert result.ok, f"{entry.id} compile: {result.errors}"


def test_retrieve_filters_by_target() -> None:
    p5_hits = retrieve_goldens(
        {"concept": "orbit sketch particles", "target": "p5", "tags": ["p5"]},
        limit=2,
    )
    assert p5_hits
    assert all(
        next(e for e in GOLDEN_MANIFEST if e.id == g.id).target == "p5"
        for g in p5_hits
    )

    three_hits = retrieve_goldens(
        {"concept": "webgl depth material", "target": "three", "tags": ["three"]},
        limit=1,
    )
    assert three_hits[0].id == "three-depth"


def test_target_policy_defaults_canvas2d_only() -> None:
    os.environ.pop("AIDITR_TARGET_P5_ENABLED", None)
    os.environ.pop("AIDITR_TARGET_THREE_ENABLED", None)
    assert enabled_targets() == frozenset({"canvas2d"})
    assert resolve_plan_target("p5") == "canvas2d"
    assert resolve_plan_target("three") == "canvas2d"
    assert resolve_plan_target("canvas2d") == "canvas2d"


def test_target_policy_enables_p5() -> None:
    os.environ["AIDITR_TARGET_P5_ENABLED"] = "1"
    try:
        assert is_target_enabled("p5")
        assert resolve_plan_target("p5") == "p5"
        # three still off
        assert resolve_plan_target("three") == "canvas2d"
    finally:
        os.environ.pop("AIDITR_TARGET_P5_ENABLED", None)


def test_plan_parse_respects_enabled_target() -> None:
    os.environ["AIDITR_TARGET_P5_ENABLED"] = "1"
    try:
        plan = normalize_asap_plan(
            {
                "concept": "orbit sketch",
                "aspect": "1:1",
                "motion": "orbit",
                "params": [
                    {"name": "bg", "kind": "color", "default": "#000"},
                    {"name": "accent", "kind": "color", "default": "#fff"},
                    {"name": "speed", "kind": "number", "default": 1},
                ],
                "assetSlots": [],
                "target": "p5",
                "targetRationale": "sketch particle feel",
            }
        )
        assert plan["target"] == "p5"
        assert "sketch" in plan.get("targetRationale", "")
    finally:
        os.environ.pop("AIDITR_TARGET_P5_ENABLED", None)


def test_plan_parse_forces_canvas2d_when_disabled() -> None:
    os.environ.pop("AIDITR_TARGET_P5_ENABLED", None)
    plan = normalize_asap_plan(
        {
            "concept": "orbit",
            "aspect": "1:1",
            "motion": "x",
            "params": [
                {"name": "bg", "kind": "color", "default": "#000"},
                {"name": "a", "kind": "color", "default": "#fff"},
                {"name": "b", "kind": "number", "default": 1},
            ],
            "target": "p5",
        }
    )
    assert plan["target"] == "canvas2d"


def test_p5_golden_structural_and_host_smoke() -> None:
    src = load_golden_source(next(e for e in GOLDEN_MANIFEST if e.id == "p5-orbit"))
    structural = run_structural_smoke(src, target="p5")
    assert structural.ok, structural.errors
    full = run_sandbox_smoke(
        src,
        plan={"params": [{"name": "bg"}, {"name": "accent"}, {"name": "ink"}, {"name": "speed"}, {"name": "title"}], "target": "p5"},
        job_id="am6-p5",
    )
    assert full.ok, full.errors
    assert full.screenshot_path


def test_three_golden_structural_and_host_smoke() -> None:
    src = load_golden_source(next(e for e in GOLDEN_MANIFEST if e.id == "three-depth"))
    structural = run_structural_smoke(src, target="three")
    assert structural.ok, structural.errors
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
        job_id="am6-three",
    )
    assert full.ok, full.errors


def test_canvas2d_rejects_three_apis() -> None:
    bad = """
export const createTool = () => {
  const THREE = { WebGLRenderer: 1 };
  return {
    mount() {},
    update() {},
    captureFrame() { return new Blob(); },
    dispose() {},
    getParamSchema() { return []; },
    getDefaultParams() { return {}; },
    getAssetSlots() { return []; },
  };
};
"""
    result = static_validate_tool_source(bad, target="canvas2d")
    assert not result.ok


if __name__ == "__main__":
    test_goldens_include_p5_and_three()
    test_goldens_pass_static_for_their_target()
    test_goldens_compile()
    test_retrieve_filters_by_target()
    test_target_policy_defaults_canvas2d_only()
    test_target_policy_enables_p5()
    test_plan_parse_respects_enabled_target()
    test_plan_parse_forces_canvas2d_when_disabled()
    test_p5_golden_structural_and_host_smoke()
    test_three_golden_structural_and_host_smoke()
    test_canvas2d_rejects_three_apis()
    print("AM6 multi-target OK")
