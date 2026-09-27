"""Style registry: seed, selection, plan lock, prompts, lint, clarify."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.clarify_parse import normalize_clarify_answers
from agent.critique_parse import parse_critique
from agent.golden.index import SETUP_SHELL_ID, load_setup_shell
from agent.nodes.clarify import with_style_question
from agent.nodes.codegen import codegen_node
from agent.nodes.plan import plan_node
from agent.nodes.validate import validate_node
from agent.prompts.create_codegen import codegen_user_prompt
from agent.prompts.create_repair import repair_user_prompt
from agent.state import initial_create_state
from agent.style_registry import (
    STYLE_QUESTION_ID,
    active_styles,
    apply_style_to_plan,
    choose_styles,
    explicit_style,
    get_style,
    lint_style,
    load_registry,
    shortlist_styles,
    style_lock_block,
    validate_registry,
)
from agent.validators.sandbox_smoke import run_structural_smoke

_BAKERY = (
    "make an animated instagram post for my bakery announcing our new sourdough, "
    "warm and cozy vibe"
)

_RISO_OK = """
const plate = document.createElement("canvas");
ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
ctx.globalCompositeOperation = 'multiply';
ctx.drawImage(plate, dx, dy);
"""


class PlanLLM:
    """Returns a fixed plan JSON; records the prompts it saw."""

    def __init__(self, plan: dict) -> None:
        self.plan = plan
        self.prompts: list[str] = []

    @property
    def default_model(self) -> str:
        return "fake/plan"

    async def complete(self, messages, **_kw) -> LLMCompletion:
        blob = "\n".join(m.content if isinstance(m, ChatMessage) else str(m["content"]) for m in messages)
        self.prompts.append(blob)
        text = json.dumps(self.plan) if "Plan stage" in blob else "export const createTool = () => 1;"
        return LLMCompletion(text=text, model="fake", usage=TokenUsage(total_tokens=10))


def _base_plan(**extra) -> dict:
    plan = {
        "concept": "Sourdough launch post",
        "aspect": "4:5",
        "motion": "gentle",
        "params": [
            {"name": "bg", "kind": "color", "default": "#0b0b12"},
            {"name": "accent", "kind": "color", "default": "#7c5cff"},
            {"name": "headline", "kind": "text", "default": "Fresh sourdough"},
        ],
        "assetSlots": [],
        "target": "canvas2d",
    }
    plan.update(extra)
    return plan


# --- seed ---------------------------------------------------------------


def test_seed_is_valid_and_complete() -> None:
    data = load_registry()
    assert validate_registry(data) == []
    entries = data["entries"]
    assert len(entries) == 48
    assert len(active_styles("look")) == 43
    assert len(active_styles("type")) == 5
    assert sum(e["tier"] == "core" for e in entries if e["slot"] == "look") == 12


def test_every_look_is_fully_specified() -> None:
    for s in active_styles("look"):
        spec = s["spec"]
        assert len(spec["recipe"]) >= 2, s["id"]
        assert len(spec["must"]) >= 2, s["id"]
        assert len(spec["never"]) >= 2, s["id"]
        assert spec["palette"]["rule"] and spec["palette"]["defaults"], s["id"]
        assert len(s["controls"]) >= 2, s["id"]
        for c in s["controls"]:
            if c["kind"] == "color":
                assert str(c["default"]).startswith("#") and len(c["default"]) == 7, (s["id"], c)


def test_validate_registry_reports_problems() -> None:
    bad = json.loads(json.dumps(load_registry()))
    bad["entries"][0]["conflicts"] = ["look.does-not-exist"]
    bad["entries"][1]["lint"]["forbid"] = ["noSuchRule"]
    problems = validate_registry(bad)
    assert any("does-not-exist" in p for p in problems)
    assert any("noSuchRule" in p for p in problems)


# --- selection -----------------------------------------------------------


def test_explicit_mentions_lock_a_style() -> None:
    assert explicit_style("a risograph poster for jazz night") == "look.risograph"
    assert explicit_style("launch banner in pixel art") == "look.pixel-art"
    assert explicit_style("kinetic typography intro", slot="type") == "type.kinetic"
    assert explicit_style("a poster for my bakery") is None


def test_shortlist_matches_subject_and_avoids_mismatches() -> None:
    bakery = shortlist_styles(_BAKERY)
    assert "look.risograph" in bakery and "look.paper-cut" in bakery
    assert "look.neon-sign" not in bakery and "look.acid-graphics" not in bakery
    growth = shortlist_styles("show how my coffee shop grew from 2019 to 2025, 3 stores to 14")
    assert growth[0] == "look.editorial-chart"
    assert len(set(shortlist_styles("anything at all"))) == 6


def test_choose_prefers_user_lock_over_mention() -> None:
    c = choose_styles("a risograph poster", locked_id="look.swiss")
    assert c.locked_id == "look.swiss"
    assert choose_styles("a risograph poster").locked_id == "look.risograph"
    assert choose_styles(_BAKERY).locked_id is None


# --- plan lock -----------------------------------------------------------


def test_apply_style_merges_controls_and_drops_duplicate_colours() -> None:
    plan = apply_style_to_plan(
        _base_plan(),
        style_id="look.risograph",
        type_id="type.kinetic",
        style_colors={"ink2Color": "#FF48B0", "notAControl": "zzz"},
    )
    names = [p["name"] for p in plan["params"]]
    assert "bg" not in names and "accent" not in names  # covered by paper / ink2
    assert "headline" in names
    for n in ("paperColor", "ink1Color", "ink2Color", "misregistration", "grainAmount", "boilFps", "beatInterval"):
        assert n in names, n
    by = {p["name"]: p for p in plan["params"]}
    assert by["ink2Color"]["default"] == "#ff48b0"
    assert "role" not in by["paperColor"]
    assert plan["styleId"] == "look.risograph"
    assert plan["typeTreatmentId"] == "type.kinetic"
    assert plan["paletteRoles"]["bg"] == "#f2ebe5"


def test_apply_style_adds_image_slot_for_photo_styles() -> None:
    plan = apply_style_to_plan(_base_plan(), style_id="look.duotone")
    assert any(s["id"] == "photo" for s in plan["assetSlots"])
    assert any(p["name"] == "photo" and p["kind"] == "assetRef" for p in plan["params"])


def test_plan_node_uses_llm_pick_from_shortlist() -> None:
    llm = PlanLLM(_base_plan(styleId="look.paper-cut", styleRationale="soft layered warmth"))
    out = asyncio.run(plan_node(initial_create_state(vision_text=_BAKERY), llm=llm))
    assert out["plan"]["styleId"] == "look.paper-cut"
    assert out["style_id"] == "look.paper-cut"
    assert "VISUAL STYLE — choose exactly ONE" in llm.prompts[0]
    assert "look.risograph" in llm.prompts[0]


def test_plan_node_falls_back_when_pick_is_invalid() -> None:
    llm = PlanLLM(_base_plan(styleId="look.made-up"))
    out = asyncio.run(plan_node(initial_create_state(vision_text=_BAKERY), llm=llm))
    assert out["plan"]["styleId"] == shortlist_styles(_BAKERY)[0]


def test_explicit_mention_beats_llm_pick() -> None:
    llm = PlanLLM(_base_plan(styleId="look.paper-cut"))
    state = initial_create_state(vision_text="a risograph poster for my bakery")
    out = asyncio.run(plan_node(state, llm=llm))
    assert out["plan"]["styleId"] == "look.risograph"
    assert "LOCKED: Risograph" in llm.prompts[0]


def test_clarify_style_answer_locks_style() -> None:
    llm = PlanLLM(_base_plan(styleId="look.paper-cut"))
    state = initial_create_state(
        vision_text=_BAKERY,
        clarify_result={"styleId": "look.letterpress", "transcript": "", "forcedEnums": []},
    )
    out = asyncio.run(plan_node(state, llm=llm))
    assert out["plan"]["styleId"] == "look.letterpress"


def test_style_lock_switch_off_keeps_legacy_plan() -> None:
    os.environ["AIDITR_STYLE_LOCK"] = "0"
    try:
        llm = PlanLLM(_base_plan(styleId="look.paper-cut"))
        out = asyncio.run(plan_node(initial_create_state(vision_text=_BAKERY), llm=llm))
        assert "styleId" not in out["plan"] or out["plan"].get("styleId") == "look.paper-cut"
        assert not any(p["name"] == "paperColor" for p in out["plan"]["params"])
        assert "VISUAL STYLE" not in llm.prompts[0]
    finally:
        os.environ.pop("AIDITR_STYLE_LOCK", None)


# --- prompts -------------------------------------------------------------


def test_style_lock_block_has_recipe_rules_and_freedom() -> None:
    text = style_lock_block(get_style("look.risograph"), get_style("type.kinetic"))
    for needle in ("STYLE LOCK: Risograph", "Recipe", "MUST:", "NEVER:", "YOU MAY ADAPT",
                   "misregistration", "multiply", "Type treatment: Kinetic type", "Font stacks"):
        assert needle in text, needle
    compact = style_lock_block(get_style("look.risograph"), compact=True)
    assert "Recipe" not in compact and "NEVER:" in compact


def test_codegen_prompt_carries_lock_and_structure_only_reference() -> None:
    plan = apply_style_to_plan(_base_plan(), style_id="look.swiss")
    lock = style_lock_block(get_style("look.swiss"))
    text = codegen_user_prompt(
        vision_text="poster",
        plan=plan,
        exemplars=[{"id": SETUP_SHELL_ID, "description": "shell", "source": "// shell"}],
        style_lock=lock,
    )
    assert "STYLE LOCK: Swiss" in text
    assert "API and structure only" in text
    assert "implement the STYLE LOCK recipe exactly" in text


def test_codegen_node_uses_setup_shell_not_tag_goldens() -> None:
    plan = apply_style_to_plan(_base_plan(tags=["neon", "glow"]), style_id="look.editorial")
    llm = PlanLLM(plan)
    state = initial_create_state(vision_text="launch post")
    state["plan"] = plan
    out = asyncio.run(codegen_node(state, llm=llm))
    assert out["golden_ids"] == [SETUP_SHELL_ID]
    assert "STYLE LOCK: Editorial magazine" in llm.prompts[0]


def test_neon_sign_uses_its_named_golden() -> None:
    plan = apply_style_to_plan(_base_plan(), style_id="look.neon-sign")
    llm = PlanLLM(plan)
    state = initial_create_state(vision_text="bar sign")
    state["plan"] = plan
    out = asyncio.run(codegen_node(state, llm=llm))
    assert out["golden_ids"] == ["neon-trail"]


def test_repair_prompt_keeps_style_lock() -> None:
    text = repair_user_prompt(
        vision_text="x",
        code="// code",
        errors=["style: no gradients"],
        style_lock=style_lock_block(get_style("look.risograph"), compact=True),
    )
    assert "STYLE LOCK: Risograph" in text


def test_critique_parse_keeps_style_adherence_outside_mean() -> None:
    crit = parse_critique(json.dumps({
        "scores": {"composition": 4, "motion": 4, "palette": 4, "typography": 4, "params": 4},
        "styleAdherence": 2,
        "fixes": [],
    }))
    assert crit["overall"] == 4.0
    assert crit["styleAdherence"] == 2.0


# --- lint ----------------------------------------------------------------


def test_lint_rejects_forbidden_and_missing_techniques() -> None:
    riso = get_style("look.risograph")
    bad = "const g = ctx.createLinearGradient(0,0,1,1); ctx.shadowBlur = 12;"
    errs = lint_style(bad, riso)
    assert all(e.startswith("style: ") for e in errs)
    assert any("gradients" in e for e in errs)
    assert any("blur" in e for e in errs)
    assert any("multiply" in e for e in errs)
    assert lint_style(_RISO_OK, riso) == []


def test_lint_ignores_comments_and_zero_blur() -> None:
    riso = get_style("look.risograph")
    code = _RISO_OK + "\n// never createLinearGradient here\n/* shadowBlur = 20 */\nctx.shadowBlur = 0;\n"
    assert lint_style(code, riso) == []


def test_pixel_art_requires_crisp_scaling() -> None:
    pix = get_style("look.pixel-art")
    assert any("imageSmoothingEnabled" in e for e in lint_style("ctx.drawImage(buf,0,0,w,h);", pix))
    assert lint_style("ctx.imageSmoothingEnabled = false; ctx.drawImage(buf,0,0,w,h);", pix) == []


def test_validate_node_reports_style_errors() -> None:
    plan = apply_style_to_plan(_base_plan(), style_id="look.risograph")
    state = initial_create_state(vision_text="x", code=load_setup_shell())
    state["plan"] = plan
    out = validate_node(state)
    assert out["validate_ok"] is False
    assert any(e.startswith("style: ") and "multiply" in e for e in out["validation_errors"])


# --- clarify -------------------------------------------------------------


def test_clarify_adds_style_question_first() -> None:
    llm_qs = [{"id": f"q{i}", "prompt": "?", "options": []} for i in range(4)]
    qs = with_style_question(_BAKERY, llm_qs)
    assert len(qs) == 4
    assert qs[0]["id"] == STYLE_QUESTION_ID
    assert qs[0]["allowAllOptions"] is False and qs[0]["multiSelect"] is False
    assert all(get_style(o["value"]) for o in qs[0]["options"])
    assert with_style_question("a risograph poster", [])[:1] == []


def test_style_answer_becomes_style_id_not_enum() -> None:
    question = with_style_question(_BAKERY, [])[0]
    pick = question["options"][1]["value"]
    result = normalize_clarify_answers(questions=[question], answers={STYLE_QUESTION_ID: pick})
    assert result["styleId"] == pick
    assert result["forcedEnums"] == []
    assert any("Visual style" in n for n in result["lockedNotes"])


# --- setup shell ---------------------------------------------------------


def test_setup_shell_passes_structural_smoke() -> None:
    res = run_structural_smoke(load_setup_shell(), target="canvas2d")
    assert res.ok, res.errors


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in tests:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"{len(tests)} passed")
