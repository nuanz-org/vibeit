"""AM3: critic parse, advisory critique, enforced repair-on-critique, corpus v2."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
_API = Path(__file__).resolve().parents[1]
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.critique_parse import CritiqueParseError, parse_critique
from agent.nodes.critique import critique_node, critic_enforced, critic_threshold
from agent.prompts.critique import CRITIQUE_SYSTEM_PROMPT, critique_user_prompt
from agent.runner import run_create_with_repairs

_PROMPTS = _API / "evals" / "create" / "prompts.json"

_GOOD_CODE = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", default: "#0a0a0f" },
        { name: "accent", kind: "color", default: "#ff4d6d" },
        { name: "title", kind: "text", default: "MOTION" },
      ],
      getDefaultParams: () => ({
        bg: "#0a0a0f",
        accent: "#ff4d6d",
        title: "MOTION",
      }),
      getAssetSlots: () => [],
      draw(c) {
        c.ctx.fillStyle = String(c.params.bg ?? "#0a0a0f");
        c.ctx.fillRect(0, 0, c.width, c.height);
        c.ctx.fillStyle = String(c.params.accent ?? "#ff4d6d");
        c.ctx.beginPath();
        c.ctx.arc(c.width * 0.5, c.height * 0.4, 40, 0, Math.PI * 2);
        c.ctx.fill();
        c.ctx.fillStyle = "#f4f1ea";
        c.ctx.font = "bold 28px system-ui";
        c.ctx.textAlign = "center";
        c.ctx.fillText(String(c.params.title ?? ""), c.width * 0.5, c.height * 0.7);
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
"""

_PLAN = {
    "concept": "kinetic type",
    "aspect": "1:1",
    "motion": "pulse",
    "params": [
        {"name": "bg", "kind": "color", "default": "#0a0a0f"},
        {"name": "accent", "kind": "color", "default": "#ff4d6d"},
        {"name": "title", "kind": "text", "default": "MOTION"},
    ],
    "assetSlots": [],
    "target": "canvas2d",
}


class CriticLLM:
    """Plan + codegen good; critic returns configurable score."""

    def __init__(self, *, overall: float = 4.0, fixes: list[str] | None = None) -> None:
        self.overall = overall
        self.fixes = fixes or []
        self.calls: list[str] = []
        self.repair_count = 0

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
                text=json.dumps(_PLAN),
                model=self.default_model,
                usage=TokenUsage(total_tokens=10),
            )
        if "Critic stage" in blob or "Score this tool" in blob:
            self.calls.append("critique")
            # After a repair, raise score so enforced loop can exit
            score = self.overall
            if self.repair_count > 0:
                score = max(score, 4.2)
            critique = {
                "overall": score,
                "scores": {
                    "composition": score,
                    "motion": score,
                    "palette": score,
                    "typography": score,
                    "params": score,
                },
                "summary": "test critique",
                "fixes": self.fixes if score < 3.5 else [],
            }
            return LLMCompletion(
                text=json.dumps(critique),
                model=self.default_model,
                usage=TokenUsage(total_tokens=20),
            )
        if "Repair stage" in blob or "Errors to fix" in blob:
            self.calls.append("repair")
            self.repair_count += 1
            return LLMCompletion(
                text=_GOOD_CODE,
                model=self.default_model,
                usage=TokenUsage(total_tokens=40),
            )
        self.calls.append("codegen")
        return LLMCompletion(
            text=_GOOD_CODE,
            model=self.default_model,
            usage=TokenUsage(total_tokens=50),
        )


def test_corpus_v2_has_40_plus_with_tiers() -> None:
    suite = json.loads(_PROMPTS.read_text(encoding="utf-8"))
    assert int(suite.get("version") or 0) >= 2
    prompts = suite["prompts"]
    assert len(prompts) >= 40, len(prompts)
    for p in prompts:
        assert p.get("id") and p.get("vision")
        assert p.get("tier") in ("easy", "medium", "hard")
        assert p.get("aspect")
        assert isinstance(p.get("tags"), list)


def test_parse_critique_ok() -> None:
    raw = """
    Here you go:
    ```json
    {
      "overall": 3.2,
      "scores": {
        "composition": 3,
        "motion": 4,
        "palette": 2,
        "typography": 3,
        "params": 4
      },
      "summary": "Thin type hierarchy",
      "fixes": ["Add caption layer", "Use params.ink for body text"]
    }
    ```
    """
    c = parse_critique(raw)
    assert c["overall"] == 3.2
    assert c["scores"]["palette"] == 2.0
    assert len(c["fixes"]) == 2


def test_parse_critique_clamps_and_means() -> None:
    c = parse_critique(
        json.dumps(
            {
                "scores": {
                    "composition": 10,
                    "motion": 0,
                    "palette": 3,
                    "typography": 3,
                    "params": 3,
                },
                "fixes": [],
            }
        )
    )
    assert c["scores"]["composition"] == 5.0
    assert c["scores"]["motion"] == 1.0
    assert 1.0 <= c["overall"] <= 5.0


def test_parse_critique_empty_fails() -> None:
    try:
        parse_critique("")
        raise AssertionError("expected CritiqueParseError")
    except CritiqueParseError:
        pass


def test_critique_prompt_includes_brief() -> None:
    assert "composition" in CRITIQUE_SYSTEM_PROMPT
    user = critique_user_prompt(
        vision_text="kinetic type",
        plan=_PLAN,
        code=_GOOD_CODE,
        smoke_variance=42.0,
        screenshot_path="/tmp/x.png",
    )
    assert "kinetic type" in user
    assert "DesignBrief" in user or "plan" in user.lower()
    assert "42" in user


def test_critique_node_parse() -> None:
    async def _run() -> None:
        llm = CriticLLM(overall=3.8)
        state = {
            "vision_text": "test",
            "plan": _PLAN,
            "code": _GOOD_CODE,
            "smoke_variance": 10.0,
            "llm_tokens_used": 0,
        }
        out = await critique_node(state, llm=llm)  # type: ignore[arg-type]
        assert out["critique_ok"] is True
        assert out["critique_score"] == 3.8
        assert out["critique_passes"] is True

    asyncio.run(_run())


def test_critique_node_failure_soft() -> None:
    class BoomLLM:
        @property
        def default_model(self) -> str:
            return "deepseek/deepseek-v4-flash"

        async def complete(self, messages, **kwargs):
            raise RuntimeError("upstream down")

    async def _run() -> None:
        out = await critique_node(
            {"vision_text": "x", "code": _GOOD_CODE, "llm_tokens_used": 0},
            llm=BoomLLM(),  # type: ignore[arg-type]
        )
        assert out["critique_ok"] is False
        assert "critic failed" in (out.get("critique_error") or "")

    asyncio.run(_run())


def test_runner_advisory_low_score_still_finalizes() -> None:
    """Default: critic not enforced → low score still finalizes after gates."""
    async def _run() -> None:
        os.environ.pop("VIBEIT_CRITIC_ENFORCED", None)
        llm = CriticLLM(
            overall=2.0,
            fixes=["Add secondary layer", "Improve type hierarchy"],
        )
        state = await run_create_with_repairs(
            vision_text="Bold kinetic typography",
            llm=llm,  # type: ignore[arg-type]
            max_repairs=3,
            wall_time_seconds=120,
            job_id="am3-advisory",
        )
        assert state.get("ready_for_finalize") is True, state.get("error_message")
        assert state.get("smoke_ok") is True
        assert state.get("critique_ok") is True
        assert float(state.get("critique_score") or 0) < 3.5
        assert "critique" in llm.calls
        # Advisory: should not have spent repairs on critique alone
        assert int(state.get("repair_count") or 0) == 0

    asyncio.run(_run())


def test_runner_enforced_low_score_triggers_repair() -> None:
    async def _run() -> None:
        os.environ["VIBEIT_CRITIC_ENFORCED"] = "1"
        try:
            llm = CriticLLM(
                overall=2.5,
                fixes=["Layer the scene with caption", "Wire title to params"],
            )
            state = await run_create_with_repairs(
                vision_text="Bold kinetic typography",
                llm=llm,  # type: ignore[arg-type]
                max_repairs=3,
                wall_time_seconds=180,
                job_id="am3-enforced",
            )
            assert state.get("ready_for_finalize") is True, state.get("error_message")
            assert "repair" in llm.calls
            assert int(state.get("repair_count") or 0) >= 1
            # After repair mock raises score
            assert float(state.get("critique_score") or 0) >= 3.5
        finally:
            os.environ.pop("VIBEIT_CRITIC_ENFORCED", None)

    asyncio.run(_run())


def test_critic_threshold_env() -> None:
    os.environ["VIBEIT_CRITIC_THRESHOLD"] = "4.0"
    try:
        assert critic_threshold() == 4.0
    finally:
        os.environ.pop("VIBEIT_CRITIC_THRESHOLD", None)
    assert critic_enforced() is False or os.getenv("VIBEIT_CRITIC_ENFORCED")


if __name__ == "__main__":
    test_corpus_v2_has_40_plus_with_tiers()
    test_parse_critique_ok()
    test_parse_critique_clamps_and_means()
    test_parse_critique_empty_fails()
    test_critique_prompt_includes_brief()
    test_critique_node_parse()
    test_critique_node_failure_soft()
    test_runner_advisory_low_score_still_finalizes()
    test_runner_enforced_low_score_triggers_repair()
    test_critic_threshold_env()
    print("AM3 critic / corpus OK")
