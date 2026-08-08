"""AM1: DesignBrief v2 parse, goldens, retriever, craft prompts."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.golden.index import GOLDEN_MANIFEST, list_goldens, load_golden_source
from agent.golden.retrieve import retrieve_goldens
from agent.graphs.create import run_create_llm_pipeline
from agent.plan_parse import PlanParseError, normalize_asap_plan, parse_asap_plan
from agent.prompts.create_codegen import CODEGEN_SYSTEM_PROMPT, codegen_user_prompt
from agent.prompts.create_plan import PLAN_SYSTEM_PROMPT
from agent.prompts.create_repair import REPAIR_SYSTEM_PROMPT
from agent.validators.static_validate import static_validate_tool_source

_LEGACY_PLAN = {
    "concept": "Purple pulsing orb with title",
    "aspect": "1:1",
    "motion": "soft pulse",
    "params": [
        {"name": "bg", "kind": "color", "label": "Background", "default": "#0b0b12"},
        {"name": "accent", "kind": "color", "label": "Accent", "default": "#7c5cff"},
        {
            "name": "title",
            "kind": "text",
            "label": "Title",
            "default": "Your vibe",
            "maxLength": 48,
        },
    ],
    "assetSlots": [],
    "target": "p5",
    "palette": ["#0b0b12", "#7c5cff"],
}

_BRIEF_V2 = {
    "concept": "Bold kinetic typography on dark field",
    "aspect": "1:1",
    "motion": "ease-out vertical breathe",
    "params": [
        {"name": "bg", "kind": "color", "default": "#0a0a0f"},
        {"name": "ink", "kind": "color", "default": "#f4f1ea"},
        {"name": "accent", "kind": "color", "default": "#ff4d6d"},
        {
            "name": "title",
            "kind": "text",
            "default": "MOTION",
            "maxLength": 24,
        },
    ],
    "assetSlots": [],
    "target": "canvas2d",
    "palette": ["#0a0a0f", "not-a-color", "#f4f1ea"],
    "composition": {
        "layers": ["bg wash", "baseline", "hero type", "caption"],
        "focalPoints": ["center headline"],
        "grid": "centered column",
    },
    "paletteRoles": {
        "bg": "#0a0a0f",
        "ink": "#f4f1ea",
        "accent": "#ff4d6d",
        "highlight": "#fff",
    },
    "motionSpec": {
        "summary": "soft vertical ease",
        "easing": "ease-out",
        "tempo": "medium",
        "loop": "seamless",
    },
    "typography": {"scale": "display + caption", "hierarchy": ["display", "label"]},
    "controlSurface": {
        "intent": "tweak type energy",
        "primaryParams": ["title", "intensity", "accent"],
    },
    "tags": ["Kinetic Type", "typography"],
}

_GOOD_CODE = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", default: "#0a0a0f" },
        { name: "ink", kind: "color", default: "#f4f1ea" },
        { name: "accent", kind: "color", default: "#ff4d6d" },
        { name: "title", kind: "text", default: "MOTION", maxLength: 24 },
      ],
      getDefaultParams: () => ({
        bg: "#0a0a0f",
        ink: "#f4f1ea",
        accent: "#ff4d6d",
        title: "MOTION",
      }),
      getAssetSlots: () => [],
      draw(c) {
        c.ctx.fillStyle = String(c.params.bg ?? "#0a0a0f");
        c.ctx.fillRect(0, 0, c.width, c.height);
        const pulse = 0.5 + 0.5 * Math.sin(c.time * 2);
        c.ctx.fillStyle = String(c.params.accent ?? "#ff4d6d");
        c.ctx.beginPath();
        c.ctx.arc(c.width * 0.5, c.height * 0.45, 40 + 10 * pulse, 0, Math.PI * 2);
        c.ctx.fill();
        c.ctx.fillStyle = String(c.params.ink ?? "#f4f1ea");
        c.ctx.font = "bold 28px system-ui";
        c.ctx.textAlign = "center";
        c.ctx.fillText(String(c.params.title ?? ""), c.width * 0.5, c.height * 0.72);
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
"""


class FakeLLM:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.last_codegen_user = ""

    @property
    def default_model(self) -> str:
        return "deepseek/deepseek-v4-flash"

    async def complete(self, messages, **kwargs) -> LLMCompletion:
        blob = " ".join(
            m.content if isinstance(m, ChatMessage) else str(m.get("content", ""))
            for m in messages
        )
        if "Plan stage" in blob or "ToolPlan" in blob or "Art Director" in blob:
            self.calls.append("plan")
            return LLMCompletion(
                text=json.dumps(_BRIEF_V2),
                model=self.default_model,
                usage=TokenUsage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
            )
        self.calls.append("codegen")
        # Capture user prompt for exemplar injection assertion
        for m in messages:
            content = m.content if isinstance(m, ChatMessage) else str(m.get("content", ""))
            if "Plan JSON" in content or "Exemplar" in content:
                self.last_codegen_user = content
        return LLMCompletion(
            text=f"```typescript\n{_GOOD_CODE}\n```",
            model=self.default_model,
            usage=TokenUsage(prompt_tokens=40, completion_tokens=100, total_tokens=140),
        )


def test_legacy_plan_still_parses() -> None:
    plan = parse_asap_plan(json.dumps(_LEGACY_PLAN))
    assert plan["target"] == "canvas2d"
    assert len(plan["params"]) >= 3
    assert "composition" not in plan


def test_design_brief_v2_fields() -> None:
    plan = normalize_asap_plan(_BRIEF_V2)
    assert plan["target"] == "canvas2d"
    assert plan["composition"]["layers"]
    assert plan["paletteRoles"]["accent"] == "#ff4d6d"
    assert plan["paletteRoles"]["highlight"] == "#ffffff"  # #fff expanded
    assert plan["motionSpec"]["easing"] == "ease-out"
    assert plan["typography"]["scale"]
    assert "title" in plan["controlSurface"]["primaryParams"]
    assert "kinetic-type" in plan["tags"]
    # invalid hex dropped from flat palette
    assert "not-a-color" not in plan.get("palette", [])
    assert all(c.startswith("#") for c in plan["palette"])


def test_pads_to_three_params() -> None:
    thin = {
        "concept": "one param tool",
        "aspect": "1:1",
        "motion": "still",
        "params": [{"name": "bg", "kind": "color", "default": "#000000"}],
        "assetSlots": [],
        "target": "canvas2d",
    }
    plan = normalize_asap_plan(thin)
    assert len(plan["params"]) >= 3


def test_palette_roles_seed_flat_palette() -> None:
    data = {
        "concept": "roles only",
        "aspect": "1:1",
        "motion": "soft",
        "params": [],
        "assetSlots": [],
        "target": "canvas2d",
        "paletteRoles": {"bg": "#111111", "accent": "#abcdef"},
    }
    plan = normalize_asap_plan(data)
    assert plan["palette"][0] == "#111111"
    assert "#abcdef" in plan["palette"]


def test_param_group_ui_hint_and_control_sections() -> None:
    data = {
        "concept": "Proximity pixel card",
        "aspect": "1:1",
        "motion": "pointer distance pixelation",
        "params": [
            {
                "name": "maxPixelation",
                "kind": "number",
                "label": "Max Pixelation",
                "default": 40,
                "min": 2,
                "max": 80,
                "group": "Interaction & Distortion",
                "uiHint": "slider",
            },
            {
                "name": "finalShape",
                "kind": "enum",
                "default": "hexagon",
                "group": "Logo Form",
                "uiHint": "segmented",
                "options": [
                    {"value": "hexagon", "label": "Hexagon Ring"},
                    {"value": "isometric", "label": "Isometric Block"},
                ],
            },
            {
                "name": "bg",
                "kind": "color",
                "default": "#0b0b12",
                "group": "Environment",
                "uiHint": "not-a-hint",
            },
        ],
        "assetSlots": [],
        "target": "canvas2d",
        "controlSurface": {
            "intent": "playable multi-axis card",
            "primaryParams": ["maxPixelation", "finalShape"],
            "sections": [
                {
                    "id": "interaction",
                    "label": "Interaction & Distortion",
                    "paramNames": ["maxPixelation"],
                },
                {
                    "id": "logo",
                    "label": "Logo Form",
                    "paramNames": ["finalShape"],
                },
                {"id": "empty", "label": "Empty", "paramNames": []},
            ],
        },
    }
    plan = normalize_asap_plan(data)
    by_name = {p["name"]: p for p in plan["params"]}
    assert by_name["maxPixelation"]["group"] == "Interaction & Distortion"
    assert by_name["maxPixelation"]["uiHint"] == "slider"
    assert by_name["finalShape"]["uiHint"] == "segmented"
    assert "uiHint" not in by_name["bg"]
    sections = plan["controlSurface"]["sections"]
    assert len(sections) == 2
    assert sections[0]["id"] == "interaction"
    assert sections[0]["paramNames"] == ["maxPixelation"]


def test_goldens_exist_and_pass_static() -> None:
    ids = list_goldens()
    # AM1 canvas2d goldens remain; AM6 adds p5/three
    assert {"kinetic-type", "particle-field", "gradient-poster"}.issubset(set(ids))
    assert len(GOLDEN_MANIFEST) >= 3
    for entry in GOLDEN_MANIFEST:
        if entry.target != "canvas2d":
            continue
        source = load_golden_source(entry)
        result = static_validate_tool_source(source, target="canvas2d")
        assert result.ok, f"{entry.id}: {result.errors}"
        assert "createCanvas2dTool" in source
        assert "export const createTool" in source


def test_retrieve_matches_tags() -> None:
    type_hits = retrieve_goldens({"tags": ["kinetic-type"], "concept": "bold type"}, limit=2)
    assert type_hits[0].id == "kinetic-type"

    particle_hits = retrieve_goldens(
        {"concept": "soft floating particles orbiting center", "tags": []},
        limit=2,
    )
    assert particle_hits[0].id == "particle-field"

    poster_hits = retrieve_goldens(
        {"concept": "minimal gradient poster wash", "tags": ["gradient"]},
        limit=1,
    )
    assert poster_hits[0].id == "gradient-poster"

    # always at least one
    fallback = retrieve_goldens({"concept": "zzzz unknown xyz"}, limit=2)
    assert len(fallback) == 2


def test_codegen_prompt_includes_craft_and_exemplars() -> None:
    assert "Layer the scene" in CODEGEN_SYSTEM_PROMPT
    assert "preserve" in REPAIR_SYSTEM_PROMPT.lower() or "Preserve" in REPAIR_SYSTEM_PROMPT
    assert "Art Director" in PLAN_SYSTEM_PROMPT or "Plan stage" in PLAN_SYSTEM_PROMPT

    exemplars = [
        {
            "id": "kinetic-type",
            "description": "test",
            "source": "export const createTool = () => {};",
        }
    ]
    user = codegen_user_prompt(
        vision_text="kinetic type",
        plan={"concept": "x", "target": "canvas2d"},
        exemplars=exemplars,
    )
    assert "Exemplar" in user
    assert "kinetic-type" in user


def test_llm_pipeline_injects_goldens() -> None:
    async def _run() -> None:
        llm = FakeLLM()
        out = await run_create_llm_pipeline(
            vision_text="Bold kinetic typography that scales with intensity",
            llm=llm,
        )
        assert "plan" in llm.calls
        assert "codegen" in llm.calls
        assert out.get("plan") is not None
        assert out["plan"]["target"] == "canvas2d"
        assert out["plan"].get("composition")
        assert out.get("validate_ok") is True, out.get("validation_errors")
        assert out.get("smoke_ok") is True, out.get("smoke_errors")
        assert out.get("ready_for_finalize") is True
        # exemplars wired into codegen user prompt
        assert "Exemplar" in llm.last_codegen_user or "golden" in llm.last_codegen_user.lower()
        assert out.get("golden_ids")

    asyncio.run(_run())


def test_parse_rejects_empty() -> None:
    try:
        parse_asap_plan("")
        raise AssertionError("expected PlanParseError")
    except PlanParseError:
        pass


if __name__ == "__main__":
    test_legacy_plan_still_parses()
    test_design_brief_v2_fields()
    test_pads_to_three_params()
    test_palette_roles_seed_flat_palette()
    test_goldens_exist_and_pass_static()
    test_retrieve_matches_tags()
    test_codegen_prompt_includes_craft_and_exemplars()
    test_llm_pipeline_injects_goldens()
    test_parse_rejects_empty()
    print("AM1 agent craft floor smoke OK")
