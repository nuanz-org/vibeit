"""M3d: plan + codegen nodes (mocked LLM) + parse helpers."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.codegen_parse import extract_typescript_module
from agent.graphs.create import run_create_fixture_pipeline, run_create_llm_pipeline
from agent.plan_parse import parse_asap_plan
from agent.plan_parse import PlanParseError

_GOOD_PLAN = {
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
    "assetSlots": [
        {"id": "logo", "label": "Logo", "accept": "image/*", "required": False}
    ],
    "target": "p5",  # model mistake — must be forced to canvas2d
    "palette": ["#0b0b12", "#7c5cff"],
}

_GOOD_CODE = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#0b0b12" },
        { name: "accent", kind: "color", label: "Accent", default: "#7c5cff" },
        { name: "title", kind: "text", label: "Title", default: "Your vibe", maxLength: 48 },
      ],
      getDefaultParams: () => ({
        bg: "#0b0b12",
        accent: "#7c5cff",
        title: "Your vibe",
      }),
      getAssetSlots: () => [
        { id: "logo", label: "Logo", accept: "image/*", required: false },
      ],
      draw(c) {
        const bg = String(c.params.bg ?? "#0b0b12");
        const accent = String(c.params.accent ?? "#7c5cff");
        const title = String(c.params.title ?? "");
        c.ctx.fillStyle = bg;
        c.ctx.fillRect(0, 0, c.width, c.height);
        const pulse = 0.5 + 0.5 * Math.sin(c.time * 2);
        const r = Math.min(c.width, c.height) * (0.12 + 0.04 * pulse);
        c.ctx.fillStyle = accent;
        c.ctx.beginPath();
        c.ctx.arc(c.width * 0.5, c.height * 0.42, r, 0, Math.PI * 2);
        c.ctx.fill();
        if (c.images.logo) {
          const size = Math.min(c.width, c.height) * 0.15;
          c.ctx.drawImage(
            c.images.logo,
            c.width * 0.5 - size / 2,
            c.height * 0.42 - size / 2,
            size,
            size,
          );
        }
        c.ctx.fillStyle = "#f5f5f7";
        c.ctx.font = "600 18px system-ui, sans-serif";
        c.ctx.textAlign = "center";
        c.ctx.fillText(title, c.width * 0.5, c.height * 0.72, c.width * 0.9);
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
"""


class FakeLLM:
    """Deterministic LLM for graph tests — no network."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    @property
    def default_model(self) -> str:
        return "deepseek/deepseek-v4-flash"

    async def complete(
        self,
        messages: list[ChatMessage] | list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict | None = None,
        timeout_seconds: float | None = None,
    ) -> LLMCompletion:
        text_blob = " ".join(
            m.content if isinstance(m, ChatMessage) else str(m.get("content", ""))
            for m in messages
        )
        # Heuristic: plan vs codegen by system prompt markers
        if "Plan stage" in text_blob or "ToolPlan" in text_blob:
            self.calls.append("plan")
            return LLMCompletion(
                text=json.dumps(_GOOD_PLAN),
                model=self.default_model,
                usage=TokenUsage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
            )
        self.calls.append("codegen")
        return LLMCompletion(
            text=f"```typescript\n{_GOOD_CODE}\n```",
            model=self.default_model,
            usage=TokenUsage(prompt_tokens=40, completion_tokens=100, total_tokens=140),
        )


def test_parse_asap_plan_forces_canvas2d() -> None:
    plan = parse_asap_plan(json.dumps(_GOOD_PLAN))
    assert plan["target"] == "canvas2d"
    assert plan["concept"]
    assert isinstance(plan["params"], list) and len(plan["params"]) >= 1


def test_parse_plan_from_fenced_json() -> None:
    fenced = "Here you go:\n```json\n" + json.dumps(_GOOD_PLAN) + "\n```\n"
    plan = parse_asap_plan(fenced)
    assert plan["target"] == "canvas2d"


def test_parse_plan_rejects_empty() -> None:
    try:
        parse_asap_plan("")
        raise AssertionError("expected PlanParseError")
    except PlanParseError:
        pass


def test_extract_typescript_from_fence() -> None:
    raw = "Sure!\n```ts\n" + _GOOD_CODE + "\n```\n"
    code = extract_typescript_module(raw)
    assert "createCanvas2dTool" in code
    assert "export const createTool" in code


def test_fixture_pipeline_still_works() -> None:
    out = run_create_fixture_pipeline(vision_text="fixture")
    assert out.get("validate_ok") is True
    assert out.get("smoke_ok") is True


def test_llm_pipeline_plan_codegen_validate_smoke() -> None:
    async def _run() -> None:
        llm = FakeLLM()
        out = await run_create_llm_pipeline(
            vision_text="A purple pulsing orb with a bold title",
            llm=llm,
        )
        assert "plan" in llm.calls
        assert "codegen" in llm.calls
        assert out.get("plan") is not None
        assert out["plan"]["target"] == "canvas2d"
        assert out.get("validate_ok") is True, out.get("validation_errors")
        assert out.get("smoke_ok") is True, out.get("smoke_errors")
        assert out.get("ready_for_finalize") is True
        assert "createTool" in (out.get("code") or "")
        assert (out.get("llm_tokens_used") or 0) >= 30

    asyncio.run(_run())


if __name__ == "__main__":
    test_parse_asap_plan_forces_canvas2d()
    test_parse_plan_from_fenced_json()
    test_parse_plan_rejects_empty()
    test_extract_typescript_from_fence()
    test_fixture_pipeline_still_works()
    test_llm_pipeline_plan_codegen_validate_smoke()
    print("M3d agent plan/codegen smoke OK")
