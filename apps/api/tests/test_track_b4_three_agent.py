"""B4: agent target policy + three plan/codegen/repair prompts."""

from __future__ import annotations

import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.retrieve import retrieve_goldens
from agent.plan_parse import normalize_asap_plan
from agent.prompts.create_codegen import (
    CODEGEN_SYSTEM_PROMPT,
    codegen_system_prompt,
    codegen_user_prompt,
)
from agent.prompts.create_plan import PLAN_SYSTEM_PROMPT, plan_system_prompt, plan_user_prompt
from agent.prompts.create_repair import REPAIR_SYSTEM_PROMPT, repair_system_prompt
from agent.prompts.critique import CRITIQUE_SYSTEM_PROMPT
from agent.target_policy import (
    apply_vision_target_preference,
    enabled_targets,
    enabled_targets_prompt_block,
    prefer_target_for_vision,
    resolve_plan_target,
    three_enabled,
    vision_prefers_three,
)


def _clear_target_flags() -> None:
    os.environ.pop("VIBEIT_TARGET_P5_ENABLED", None)
    os.environ.pop("VIBEIT_TARGET_THREE_ENABLED", None)


def test_vision_prefers_three_signals() -> None:
    assert vision_prefers_three(
        "Kinetic cube logo with frosted glass materials and three.js orbit"
    )
    assert vision_prefers_three("Chroma cube logo WebGL depth metalness")
    assert not vision_prefers_three("kinetic type social frame flat poster")
    assert not vision_prefers_three("proximity distortion card pixel interaction")


def test_prefer_target_respects_config_gate() -> None:
    _clear_target_flags()
    vision = "kinetic cube logo with frosted glass three.js materials"
    assert prefer_target_for_vision(vision) is None
    os.environ["VIBEIT_TARGET_THREE_ENABLED"] = "1"
    try:
        assert prefer_target_for_vision(vision) == "three"
        assert three_enabled()
        assert "three" in enabled_targets()
    finally:
        _clear_target_flags()


def test_apply_vision_upgrades_canvas2d_when_three_enabled() -> None:
    _clear_target_flags()
    plan = {
        "concept": "cube",
        "aspect": "1:1",
        "motion": "spin",
        "params": [{"name": "bg", "kind": "color", "default": "#000"}],
        "assetSlots": [],
        "target": "canvas2d",
    }
    vision = "real 3d kinetic cube logo with metalness and frosted glass materials"
    # disabled → stays canvas2d
    out = apply_vision_target_preference(dict(plan), vision)
    assert out["target"] == "canvas2d"

    os.environ["VIBEIT_TARGET_THREE_ENABLED"] = "1"
    try:
        out2 = apply_vision_target_preference(dict(plan), vision)
        assert out2["target"] == "three"
        assert "targetRationale" in out2
        # already three stays three
        plan_three = {**plan, "target": "three"}
        out3 = apply_vision_target_preference(plan_three, vision)
        assert out3["target"] == "three"
    finally:
        _clear_target_flags()


def test_plan_parse_still_clamps_disabled_three() -> None:
    _clear_target_flags()
    plan = normalize_asap_plan(
        {
            "concept": "cube",
            "aspect": "1:1",
            "motion": "spin",
            "params": [
                {"name": "bg", "kind": "color", "default": "#000"},
                {"name": "accent", "kind": "color", "default": "#fff"},
                {"name": "speed", "kind": "number", "default": 1},
            ],
            "assetSlots": [],
            "target": "three",
            "targetRationale": "3d",
        }
    )
    assert plan["target"] == "canvas2d"
    assert resolve_plan_target("three") == "canvas2d"


def test_plan_prompts_include_target_policy() -> None:
    sys_p = plan_system_prompt()
    assert "Plan stage" in sys_p or "Art Director" in PLAN_SYSTEM_PROMPT
    assert "three" in sys_p.lower()
    assert "Enabled targets" in enabled_targets_prompt_block()
    user = plan_user_prompt("kinetic cube logo with materials")
    assert "Target policy" in user
    assert "Enabled targets" in user


def test_codegen_system_prompt_three_vs_canvas2d() -> None:
    c2d = codegen_system_prompt("canvas2d")
    three = codegen_system_prompt("three")
    assert "createCanvas2dTool" in c2d
    assert "createThreeTool" in three
    assert "MeshStandardMaterial" in three
    assert "three-vendor" in three or "CDN" in three
    assert "setup" in three
    # default export remains canvas2d craft
    assert "createCanvas2dTool" in CODEGEN_SYSTEM_PROMPT
    assert "c.pointer" in CODEGEN_SYSTEM_PROMPT or "pointer" in CODEGEN_SYSTEM_PROMPT


def test_codegen_user_prompt_three_checklist() -> None:
    plan = {
        "concept": "kinetic cube",
        "target": "three",
        "aspect": "1:1",
        "motion": "spin",
        "params": [
            {
                "name": "cubeMaterial",
                "kind": "enum",
                "default": "matte",
                "options": [
                    {"value": "matte", "label": "Matte"},
                    {"value": "metal", "label": "Metal"},
                    {"value": "glass", "label": "Glass"},
                ],
            },
            {"name": "speed", "kind": "number", "default": 1},
        ],
        "assetSlots": [],
    }
    user = codegen_user_prompt(vision_text="cube logo", plan=plan)
    assert "Plan target" in user and "three" in user
    assert "cubeMaterial" in user
    assert "MeshStandardMaterial" in user or "material" in user.lower()
    assert "createThreeTool" in user or "three module" in user.lower()


def test_repair_system_prompt_three() -> None:
    assert "createCanvas2dTool" in REPAIR_SYSTEM_PROMPT or "canvas2d" in REPAIR_SYSTEM_PROMPT
    three = repair_system_prompt("three")
    assert "createThreeTool" in three
    assert "MeshStandardMaterial" in three or "three" in three.lower()
    assert "param_coverage" in three


def test_critique_mentions_three() -> None:
    assert "three" in CRITIQUE_SYSTEM_PROMPT.lower()
    assert "material" in CRITIQUE_SYSTEM_PROMPT.lower()


def test_retrieve_three_depth_for_three_plan() -> None:
    hits = retrieve_goldens(
        {
            "concept": "webgl cube material metalness depth logo",
            "target": "three",
            "tags": ["three", "material", "cube"],
        },
        limit=1,
    )
    assert hits
    assert hits[0].id == "three-depth"


if __name__ == "__main__":
    test_vision_prefers_three_signals()
    test_prefer_target_respects_config_gate()
    test_apply_vision_upgrades_canvas2d_when_three_enabled()
    test_plan_parse_still_clamps_disabled_three()
    test_plan_prompts_include_target_policy()
    test_codegen_system_prompt_three_vs_canvas2d()
    test_codegen_user_prompt_three_checklist()
    test_repair_system_prompt_three()
    test_critique_mentions_three()
    test_retrieve_three_depth_for_three_plan()
    print("test_track_b4_three_agent: ok")
