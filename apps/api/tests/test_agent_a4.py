"""A4: multi-axis plan/codegen/repair prompt gates + enum wiring helpers."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.prompts.create_codegen import (
    CODEGEN_SYSTEM_PROMPT,
    _enum_axes_from_plan,
    codegen_user_prompt,
)
from agent.prompts.create_plan import PLAN_SYSTEM_PROMPT, plan_user_prompt
from agent.prompts.create_repair import REPAIR_SYSTEM_PROMPT, repair_user_prompt
from agent.prompts.critique import CRITIQUE_SYSTEM_PROMPT, critique_user_prompt
from agent.validators.param_coverage import run_param_coverage


def _multi_axis_plan() -> dict:
    return {
        "concept": "Kinetic isometric logo with shape × assembly × material",
        "aspect": "1:1",
        "motion": "seamless loop assembly",
        "target": "canvas2d",
        "tags": ["logo", "loop", "parametric"],
        "params": [
            {
                "name": "finalShape",
                "kind": "enum",
                "label": "Shape",
                "default": "hexagonRing",
                "group": "Shape",
                "uiHint": "segmented",
                "options": [
                    {"value": "hexagonRing", "label": "Hexagon"},
                    {"value": "isometricBlock", "label": "Isometric"},
                    {"value": "stackedPyramid", "label": "Pyramid"},
                ],
            },
            {
                "name": "assemblyStyle",
                "kind": "enum",
                "label": "Assembly",
                "default": "flyIn",
                "group": "Motion",
                "uiHint": "segmented",
                "options": [
                    {"value": "flyIn", "label": "Fly-in"},
                    {"value": "scattered", "label": "Scattered"},
                    {"value": "scaleUnfold", "label": "Unfold"},
                ],
            },
            {
                "name": "cubeMaterial",
                "kind": "enum",
                "label": "Material",
                "default": "matte",
                "group": "Look",
                "uiHint": "segmented",
                "options": [
                    {"value": "matte", "label": "Matte"},
                    {"value": "frostedGlass", "label": "Glass"},
                    {"value": "wireframe", "label": "Wireframe"},
                ],
            },
            {
                "name": "loopDuration",
                "kind": "number",
                "default": 4,
                "min": 1,
                "max": 12,
                "group": "Motion",
                "uiHint": "slider",
            },
            {
                "name": "bg",
                "kind": "color",
                "default": "#0b0b12",
                "group": "Look",
            },
            {
                "name": "accent",
                "kind": "color",
                "default": "#7c5cff",
                "group": "Look",
            },
        ],
        "assetSlots": [],
        "controlSurface": {
            "intent": "Switch shape, assembly, and material; tune loop",
            "primaryParams": ["finalShape", "assemblyStyle", "cubeMaterial"],
            "sections": [
                {
                    "id": "shape",
                    "label": "Shape",
                    "paramNames": ["finalShape"],
                },
                {
                    "id": "motion",
                    "label": "Motion",
                    "paramNames": ["assemblyStyle", "loopDuration"],
                },
                {
                    "id": "look",
                    "label": "Look",
                    "paramNames": ["cubeMaterial", "bg", "accent"],
                },
            ],
        },
    }


def test_plan_prompt_multi_axis_density() -> None:
    assert "6–14" in PLAN_SYSTEM_PROMPT or "6-14" in PLAN_SYSTEM_PROMPT
    assert "group" in PLAN_SYSTEM_PROMPT
    assert "uiHint" in PLAN_SYSTEM_PROMPT
    assert "FORCED ENUM" in PLAN_SYSTEM_PROMPT or "forced" in PLAN_SYSTEM_PROMPT.lower()
    assert "sections" in PLAN_SYSTEM_PROMPT


def test_plan_user_prompt_forced_enums() -> None:
    clarify = {
        "transcript": "Q: shape\nA: all options",
        "forcedEnums": [
            {
                "name": "finalShape",
                "label": "Shape",
                "options": [
                    {"value": "hexagonRing", "label": "Hex"},
                    {"value": "isometricBlock", "label": "Iso"},
                ],
                "default": "hexagonRing",
                "group": "Shape",
                "sourceQuestionId": "finalShape",
            }
        ],
        "lockedNotes": [],
    }
    user = plan_user_prompt(
        "kinetic cube logo with all three shapes",
        clarify_result=clarify,
    )
    assert "FORCED ENUM" in user
    assert "finalShape" in user
    assert "Do NOT collapse" in user


def test_codegen_prompt_enum_and_loop() -> None:
    assert "enum" in CODEGEN_SYSTEM_PROMPT.lower()
    assert "loopDuration" in CODEGEN_SYSTEM_PROMPT or "loop Dur" in CODEGEN_SYSTEM_PROMPT
    assert "c.pointer" in CODEGEN_SYSTEM_PROMPT or "pointer" in CODEGEN_SYSTEM_PROMPT
    assert "drawImageCover" in CODEGEN_SYSTEM_PROMPT
    assert "Wire every plan param" in CODEGEN_SYSTEM_PROMPT or "every plan param" in CODEGEN_SYSTEM_PROMPT.lower()


def test_codegen_user_lists_enum_checklist() -> None:
    plan = _multi_axis_plan()
    user = codegen_user_prompt(
        vision_text="kinetic logo all variants",
        plan=plan,
    )
    assert "Multi-axis enum checklist" in user
    assert "finalShape" in user
    assert "hexagonRing" in user
    assert "assemblyStyle" in user
    assert "cubeMaterial" in user
    assert "Param names that must appear" in user
    assert "loopDuration" in user


def test_codegen_user_merges_clarify_forced_enums() -> None:
    plan = {
        "concept": "logo",
        "aspect": "1:1",
        "motion": "loop",
        "target": "canvas2d",
        "params": [
            {"name": "bg", "kind": "color", "default": "#000"},
        ],
        "assetSlots": [],
    }
    clarify = {
        "forcedEnums": [
            {
                "name": "finalShape",
                "options": [
                    {"value": "a", "label": "A"},
                    {"value": "b", "label": "B"},
                ],
                "default": "a",
            }
        ],
        "transcript": "all shapes",
    }
    user = codegen_user_prompt(
        vision_text="logo",
        plan=plan,
        clarify_result=clarify,
    )
    assert "finalShape" in user
    axes = _enum_axes_from_plan(plan)
    assert axes == []  # not on plan, but still in prompt via clarify


def test_enum_axes_from_plan() -> None:
    axes = _enum_axes_from_plan(_multi_axis_plan())
    names = {a["name"] for a in axes}
    assert names == {"finalShape", "assemblyStyle", "cubeMaterial"}
    shape = next(a for a in axes if a["name"] == "finalShape")
    assert len(shape["options"]) == 3


def test_repair_preserves_multi_axis() -> None:
    assert "Multi-axis" in REPAIR_SYSTEM_PROMPT or "enum" in REPAIR_SYSTEM_PROMPT.lower()
    assert "param_coverage" in REPAIR_SYSTEM_PROMPT
    plan = _multi_axis_plan()
    user = repair_user_prompt(
        vision_text="logo",
        code="export const createTool = () => {};",
        errors=["param_coverage: plan param(s) not referenced in code: finalShape"],
        plan_json="{}",
        plan=plan,
    )
    assert "finalShape" in user
    assert "Enum axes" in user or "hexagonRing" in user


def test_critique_penalizes_ignored_enums() -> None:
    assert "enum" in CRITIQUE_SYSTEM_PROMPT.lower()
    user = critique_user_prompt(
        vision_text="logo",
        plan=_multi_axis_plan(),
        code="// stub",
    )
    assert "Enum axes" in user
    assert "finalShape" in user


def test_param_coverage_still_hard_on_multi_axis() -> None:
    plan = _multi_axis_plan()
    code = """
    import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";
    export const createTool = () => createCanvas2dTool({
      getParamSchema: () => [
        { name: "finalShape", kind: "enum", default: "hexagonRing", options: [] },
        { name: "bg", kind: "color", default: "#000" },
      ],
      getDefaultParams: () => ({ finalShape: "hexagonRing", bg: "#000" }),
      getAssetSlots: () => [],
      draw(c) {
        const s = c.params.finalShape;
        c.ctx.fillStyle = String(c.params.bg);
        c.ctx.fillRect(0,0,10,10);
        if (s === "hexagonRing") { /* ... */ }
      },
    }, { aspect: "1:1" });
    """
    # Missing assemblyStyle, cubeMaterial, loopDuration, accent
    result = run_param_coverage(code, plan)
    assert not result.ok
    assert "assemblyStyle" in result.missing
    assert "cubeMaterial" in result.missing


def test_param_coverage_ok_when_all_wired() -> None:
    plan = _multi_axis_plan()
    # Minimal reference of every name
    names = [p["name"] for p in plan["params"]]
    body = "\n".join(f'void c.params.{n};' for n in names)
    schema = ", ".join(f'{{ name: "{n}", kind: "number", default: 0 }}' for n in names)
    defaults = ", ".join(f'"{n}": 0' for n in names)
    code = f"""
    export const createTool = () => ({{
      getParamSchema: () => [{schema}],
      getDefaultParams: () => ({{{defaults}}}),
      draw(c) {{ {body} }}
    }});
    """
    result = run_param_coverage(code, plan)
    assert result.ok, result.errors


if __name__ == "__main__":
    test_plan_prompt_multi_axis_density()
    test_plan_user_prompt_forced_enums()
    test_codegen_prompt_enum_and_loop()
    test_codegen_user_lists_enum_checklist()
    test_codegen_user_merges_clarify_forced_enums()
    test_enum_axes_from_plan()
    test_repair_preserves_multi_axis()
    test_critique_penalizes_ignored_enums()
    test_param_coverage_still_hard_on_multi_axis()
    test_param_coverage_ok_when_all_wired()
    print("test_agent_a4: all passed")
