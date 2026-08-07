"""AM7: Control refine — route, param/code patch, non-regression, runner."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.golden.index import GOLDEN_MANIFEST, load_golden_source
from agent.nodes.refine_patch import refine_route_node
from agent.patch_parse import (
    apply_param_updates,
    parse_param_patch,
    update_plan_defaults,
)
from agent.prompts.refine_code import CODE_PATCH_SYSTEM_PROMPT
from agent.prompts.refine_param import PARAM_PATCH_SYSTEM_PROMPT
from agent.refine_route import route_refine_chat
from agent.runner import run_refine_with_repairs
from agent.state import initial_refine_state

_PARTICLE = load_golden_source(
    next(e for e in GOLDEN_MANIFEST if e.id == "particle-field")
)

_PLAN = {
    "concept": "particle field",
    "aspect": "1:1",
    "motion": "orbit",
    "params": [
        {"name": "bg", "kind": "color", "default": "#07070c"},
        {"name": "accent", "kind": "color", "default": "#6ee7ff"},
        {"name": "core", "kind": "color", "default": "#a78bfa"},
        {"name": "title", "kind": "text", "default": "field"},
        {"name": "count", "kind": "number", "default": 48},
        {"name": "speed", "kind": "number", "default": 0.8},
    ],
    "assetSlots": [],
    "target": "canvas2d",
}

_DEFAULTS = {
    "bg": "#07070c",
    "accent": "#6ee7ff",
    "core": "#a78bfa",
    "title": "field",
    "count": 48,
    "speed": 0.8,
}


def test_route_param_only_speed() -> None:
    assert route_refine_chat("make particles slower") == "param"
    assert route_refine_chat("increase opacity a bit") == "param"
    assert route_refine_chat("change the accent color to red") == "param"


def test_route_code_for_structural() -> None:
    assert route_refine_chat("add a subtitle") == "code"
    assert (
        route_refine_chat("make particles slower and add a subtitle") == "code"
    )
    assert route_refine_chat("rewrite the layout") == "code"
    assert route_refine_chat("something creative and vague") == "code"


def test_parse_param_patch_shapes() -> None:
    nested = parse_param_patch('{"updates": {"speed": 0.2}, "rationale": "slower"}')
    assert nested["updates"]["speed"] == 0.2
    flat = parse_param_patch('{"speed": 0.15, "count": 20}')
    assert flat["updates"]["count"] == 20


def test_apply_param_updates_rejects_unknown() -> None:
    merged, rejected = apply_param_updates(
        default_params=_DEFAULTS,
        param_schema=_PLAN["params"],
        updates={"speed": 0.2, "ghost": 1},
    )
    assert merged["speed"] == 0.2
    assert "ghost" in rejected
    assert "ghost" not in merged


def test_update_plan_defaults() -> None:
    plan = update_plan_defaults(_PLAN, {**_DEFAULTS, "speed": 0.1})
    assert plan is not None
    speed = next(p for p in plan["params"] if p["name"] == "speed")
    assert speed["default"] == 0.1


def test_refine_route_node() -> None:
    state = initial_refine_state(
        chat_message="make it slower",
        base_code=_PARTICLE,
        base_default_params=_DEFAULTS,
        base_param_schema=_PLAN["params"],
        base_plan=_PLAN,
    )
    out = refine_route_node(state)
    assert out["patch_mode"] == "param"


def test_prompts_mention_minimal_patch() -> None:
    assert "MINIMAL" in CODE_PATCH_SYSTEM_PROMPT or "minimal" in CODE_PATCH_SYSTEM_PROMPT
    assert "JSON" in PARAM_PATCH_SYSTEM_PROMPT


class _ParamOnlyLLM:
    """Simulates plan-role param JSON; fails if codegen-style full module requested incorrectly."""

    def __init__(self) -> None:
        self.roles: list[str] = []
        self.models: list[str] = []

    @property
    def default_model(self) -> str:
        return "deepseek/deepseek-v4-flash"

    async def complete(self, messages, **kwargs) -> LLMCompletion:
        model = kwargs.get("model") or self.default_model
        self.models.append(model)
        joined = "\n".join(
            str(m.content if isinstance(m, ChatMessage) else m.get("content"))
            for m in messages
        )
        if "Param-patch" in joined or "defaultParams" in joined:
            self.roles.append("param")
            text = json.dumps({"updates": {"speed": 0.25}, "rationale": "slower"})
        elif "Critic" in joined or "quality judge" in joined.lower() or (
            "overall" in joined and "composition" in joined
        ):
            self.roles.append("critique")
            text = json.dumps(
                {
                    "overall": 4.0,
                    "scores": {
                        "composition": 4,
                        "motion": 4,
                        "palette": 4,
                        "typography": 3,
                        "params": 4,
                    },
                    "summary": "ok",
                    "fixes": [],
                }
            )
        else:
            self.roles.append("other")
            # Return valid particle source if repair/codegen asked
            text = _PARTICLE
        return LLMCompletion(
            text=text,
            model=model,
            usage=TokenUsage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
        )


class _CodePatchLLM:
    def __init__(self, *, base_score: float = 4.0, new_score: float = 4.2) -> None:
        self.base_score = base_score
        self.new_score = new_score
        self.saw_code_patch = False
        self.calls = 0

    @property
    def default_model(self) -> str:
        return "deepseek/deepseek-v4-flash"

    async def complete(self, messages, **kwargs) -> LLMCompletion:
        self.calls += 1
        model = kwargs.get("model") or self.default_model
        joined = "\n".join(
            str(m.content if isinstance(m, ChatMessage) else m.get("content"))
            for m in messages
        )
        if "Code-patch" in joined or "minimal patch" in joined.lower():
            self.saw_code_patch = True
            # Slightly modified title default
            text = _PARTICLE.replace('default: "field"', 'default: "orbit"').replace(
                'title: "field"', 'title: "orbit"'
            )
        elif "Critic" in joined or "quality judge" in joined.lower() or (
            "overall" in joined and "composition" in joined
        ):
            text = json.dumps(
                {
                    "overall": self.new_score,
                    "scores": {
                        "composition": 4,
                        "motion": 4,
                        "palette": 4,
                        "typography": 4,
                        "params": 4,
                    },
                    "summary": "fine",
                    "fixes": ["tighten type"],
                }
            )
        else:
            text = _PARTICLE
        return LLMCompletion(
            text=text,
            model=model,
            usage=TokenUsage(prompt_tokens=10, completion_tokens=50, total_tokens=60),
        )


class _RegressingLLM(_CodePatchLLM):
    """Always returns lower critique score to force non-regression failure."""

    def __init__(self) -> None:
        super().__init__(base_score=4.5, new_score=2.0)


def test_refine_param_path_no_codegen_role() -> None:
    llm = _ParamOnlyLLM()
    state = asyncio.run(
        run_refine_with_repairs(
            chat_message="make the particles slower",
            base_code=_PARTICLE,
            llm=llm,
            base_plan=_PLAN,
            base_default_params=_DEFAULTS,
            base_param_schema=_PLAN["params"],
            base_critique_score=None,  # skip non-regression
            max_repairs=1,
            wall_time_seconds=180.0,
        )
    )
    assert state.get("used_param_patch_only") is True
    assert state.get("patch_mode") == "param"
    assert "param" in llm.roles
    defaults = state.get("default_params") or {}
    assert defaults.get("speed") == 0.25
    # Same code source
    assert (state.get("code") or "").strip() == _PARTICLE.strip()
    assert state.get("ready_for_finalize") is True
    assert state.get("smoke_ok") is True


def test_refine_code_path_for_subtitle_request() -> None:
    llm = _CodePatchLLM(new_score=4.2)
    state = asyncio.run(
        run_refine_with_repairs(
            chat_message="make particles slower and add a subtitle",
            base_code=_PARTICLE,
            llm=llm,
            base_plan=_PLAN,
            base_default_params=_DEFAULTS,
            base_param_schema=_PLAN["params"],
            base_critique_score=4.0,
            max_repairs=1,
            wall_time_seconds=180.0,
        )
    )
    assert state.get("patch_mode") == "code"
    assert llm.saw_code_patch
    assert state.get("ready_for_finalize") is True
    assert state.get("smoke_ok") is True
    assert "orbit" in (state.get("code") or "")


def test_refine_non_regression_rejects_lower_score() -> None:
    llm = _RegressingLLM()
    state = asyncio.run(
        run_refine_with_repairs(
            chat_message="rewrite the layout completely",
            base_code=_PARTICLE,
            llm=llm,
            base_plan=_PLAN,
            base_default_params=_DEFAULTS,
            base_param_schema=_PLAN["params"],
            base_critique_score=4.5,
            max_repairs=0,  # no repair room
            wall_time_seconds=180.0,
        )
    )
    assert state.get("ready_for_finalize") is not True
    assert "non-regression" in (state.get("error_message") or "").lower()


def test_empty_chat_fails_clean() -> None:
    state = asyncio.run(
        run_refine_with_repairs(
            chat_message="  ",
            base_code=_PARTICLE,
            llm=_ParamOnlyLLM(),
        )
    )
    assert state.get("error_code") == "VALIDATION_FAILED"
