"""AM5: style extract parse, soft-fail, plan/codegen conditioning, no-images path."""

from __future__ import annotations

import asyncio
import base64
import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.nodes.style_extract import style_extract_node
from agent.prompts.create_codegen import codegen_user_prompt
from agent.prompts.create_plan import plan_user_prompt
from agent.prompts.style_extract import STYLE_EXTRACT_SYSTEM_PROMPT
from agent.runner import run_create_with_repairs
from agent.style_parse import StyleParseError, parse_style_notes

# 1x1 PNG
_TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

_STYLE_JSON = {
    "summary": "Bold high-contrast kinetic poster energy",
    "mood": "bold kinetic",
    "palette": ["#0a0a0f", "#f4f1ea", "#ff4d6d"],
    "paletteRoles": {
        "bg": "#0a0a0f",
        "ink": "#f4f1ea",
        "accent": "#ff4d6d",
    },
    "compositionPatterns": ["centered hero type", "layered wash"],
    "typography": "display + caption",
    "motionHints": "slow ease-out vertical breathe",
    "doNotCopy": ["any trademark logo"],
    "tags": ["kinetic-type", "poster"],
}

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
    "paletteRoles": {"bg": "#0a0a0f", "ink": "#f4f1ea", "accent": "#ff4d6d"},
}


class StyleAwareLLM:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.last_plan_user = ""
        self.last_codegen_user = ""
        self.saw_multimodal = False

    @property
    def default_model(self) -> str:
        return "deepseek/deepseek-v4-flash"

    async def complete(self, messages, **kwargs) -> LLMCompletion:
        # Scan all messages for multimodal + text blob
        blobs: list[str] = []
        for m in messages:
            content = m.content if isinstance(m, ChatMessage) else m.get("content")
            if isinstance(content, list):
                self.saw_multimodal = True
                blobs.append(
                    " ".join(
                        str(p.get("text", "")) if isinstance(p, dict) else ""
                        for p in content
                    )
                )
            else:
                blobs.append(str(content or ""))
        joined = "\n".join(blobs)

        # Match style-extract system/user only (not plan's "inspiration images" phrase)
        if "Style Extract stage" in joined or "You are given" in joined and "inspiration image" in joined.lower():
            self.calls.append("style")
            return LLMCompletion(
                text=json.dumps(_STYLE_JSON),
                model=self.default_model,
                usage=TokenUsage(total_tokens=40),
            )

        for blob in blobs:
            if "Plan stage" in blob or "Art Director" in blob or "ToolPlan" in blob:
                self.calls.append("plan")
                # Capture user message for style conditioning assertion
                for msg in messages:
                    c = msg.content if isinstance(msg, ChatMessage) else msg.get("content")
                    if isinstance(c, str) and "Vision:" in c:
                        self.last_plan_user = c
                return LLMCompletion(
                    text=json.dumps(_PLAN),
                    model=self.default_model,
                    usage=TokenUsage(total_tokens=20),
                )
            if "Codegen" in blob or "createCanvas2dTool" in blob or "Plan JSON" in blob:
                self.calls.append("codegen")
                for msg in messages:
                    c = msg.content if isinstance(msg, ChatMessage) else msg.get("content")
                    if isinstance(c, str) and "Vision:" in c:
                        self.last_codegen_user = c
                return LLMCompletion(
                    text=_GOOD_CODE,
                    model=self.default_model,
                    usage=TokenUsage(total_tokens=50),
                )
            if "Critic stage" in blob or "Score this tool" in blob:
                self.calls.append("critique")
                return LLMCompletion(
                    text=json.dumps(
                        {
                            "overall": 4.0,
                            "scores": {
                                "composition": 4,
                                "motion": 4,
                                "palette": 4,
                                "typography": 4,
                                "params": 4,
                            },
                            "summary": "ok",
                            "fixes": [],
                        }
                    ),
                    model=self.default_model,
                    usage=TokenUsage(total_tokens=15),
                )
            if "Repair stage" in blob:
                self.calls.append("repair")
                return LLMCompletion(
                    text=_GOOD_CODE,
                    model=self.default_model,
                    usage=TokenUsage(total_tokens=30),
                )

        self.calls.append("other")
        return LLMCompletion(
            text=_GOOD_CODE,
            model=self.default_model,
            usage=TokenUsage(total_tokens=10),
        )


def test_copyright_rule_in_prompt() -> None:
    assert "NEVER copy" in STYLE_EXTRACT_SYSTEM_PROMPT or "never copy" in STYLE_EXTRACT_SYSTEM_PROMPT.lower()
    assert "doNotCopy" in STYLE_EXTRACT_SYSTEM_PROMPT or "do not" in STYLE_EXTRACT_SYSTEM_PROMPT.lower()


def test_parse_style_notes() -> None:
    notes = parse_style_notes(json.dumps(_STYLE_JSON))
    assert notes["paletteRoles"]["accent"] == "#ff4d6d"
    assert "kinetic-type" in notes["tags"]
    assert notes["mood"]


def test_parse_style_notes_clamps_hex() -> None:
    notes = parse_style_notes(
        json.dumps(
            {
                "paletteRoles": {"bg": "#abc", "ink": "nope", "accent": "#ff4d6d"},
                "palette": ["#112233", "bad"],
            }
        )
    )
    assert notes["paletteRoles"]["bg"] == "#aabbcc"
    assert "ink" not in notes["paletteRoles"]
    assert "#112233" in notes["palette"]


def test_parse_style_empty_fails() -> None:
    try:
        parse_style_notes("")
        raise AssertionError("expected StyleParseError")
    except StyleParseError:
        pass


def test_plan_prompt_includes_style() -> None:
    user = plan_user_prompt("kinetic type", style_notes=_STYLE_JSON)
    assert "Style notes" in user
    assert "INTERPRET" in user or "interpret" in user.lower()
    assert "#ff4d6d" in user


def test_codegen_prompt_includes_style() -> None:
    user = codegen_user_prompt(
        vision_text="x",
        plan=_PLAN,
        style_notes=_STYLE_JSON,
    )
    assert "Style notes" in user
    assert "never recreate" in user.lower() or "never" in user.lower()


def test_style_extract_node_ok() -> None:
    async def _run() -> None:
        llm = StyleAwareLLM()
        images = [
            {
                "asset_id": "a1",
                "content_type": "image/png",
                "base64": _TINY_PNG_B64,
            }
        ]
        out = await style_extract_node(
            {
                "vision_text": "bold type",
                "inspiration_images": images,
                "llm_tokens_used": 0,
            },
            llm=llm,  # type: ignore[arg-type]
        )
        assert out["style_extract_ok"] is True
        assert out["style_notes"]["mood"]
        assert llm.saw_multimodal is True

    asyncio.run(_run())


def test_style_extract_no_images_skips() -> None:
    async def _run() -> None:
        out = await style_extract_node(
            {"vision_text": "x", "inspiration_images": [], "llm_tokens_used": 0},
            llm=StyleAwareLLM(),  # type: ignore[arg-type]
        )
        assert out["style_extract_ok"] is False
        assert out["style_notes"] is None

    asyncio.run(_run())


def test_style_extract_llm_failure_soft() -> None:
    class Boom:
        @property
        def default_model(self) -> str:
            return "deepseek/deepseek-v4-flash"

        async def complete(self, messages, **kwargs):
            raise RuntimeError("vision down")

    async def _run() -> None:
        out = await style_extract_node(
            {
                "vision_text": "x",
                "inspiration_images": [
                    {"content_type": "image/png", "base64": _TINY_PNG_B64}
                ],
                "llm_tokens_used": 0,
            },
            llm=Boom(),  # type: ignore[arg-type]
        )
        assert out["style_extract_ok"] is False
        assert "failed" in (out.get("style_extract_error") or "").lower()

    asyncio.run(_run())


def test_runner_with_inspiration_conditions_plan() -> None:
    async def _run() -> None:
        llm = StyleAwareLLM()
        state = await run_create_with_repairs(
            vision_text="Bold kinetic typography poster",
            llm=llm,  # type: ignore[arg-type]
            max_repairs=2,
            wall_time_seconds=180,
            job_id="am5-styled",
            inspiration_images=[
                {
                    "asset_id": "img1",
                    "content_type": "image/png",
                    "base64": _TINY_PNG_B64,
                }
            ],
        )
        assert state.get("ready_for_finalize") is True, state.get("error_message")
        assert "style" in llm.calls
        assert state.get("style_extract_ok") is True
        assert state.get("style_notes")
        assert "Style notes" in llm.last_plan_user
        assert "Style notes" in llm.last_codegen_user

    asyncio.run(_run())


def test_runner_without_images_unchanged() -> None:
    async def _run() -> None:
        llm = StyleAwareLLM()
        state = await run_create_with_repairs(
            vision_text="Bold kinetic typography",
            llm=llm,  # type: ignore[arg-type]
            max_repairs=2,
            wall_time_seconds=180,
            job_id="am5-plain",
        )
        assert state.get("ready_for_finalize") is True, state.get("error_message")
        assert "style" not in llm.calls
        assert not state.get("style_extract_ok")

    asyncio.run(_run())


def test_tiny_png_decodes() -> None:
    raw = base64.b64decode(_TINY_PNG_B64)
    assert raw[:8] == b"\x89PNG\r\n\x1a\n"


if __name__ == "__main__":
    test_copyright_rule_in_prompt()
    test_parse_style_notes()
    test_parse_style_notes_clamps_hex()
    test_parse_style_empty_fails()
    test_plan_prompt_includes_style()
    test_codegen_prompt_includes_style()
    test_style_extract_node_ok()
    test_style_extract_no_images_skips()
    test_style_extract_llm_failure_soft()
    test_runner_with_inspiration_conditions_plan()
    test_runner_without_images_unchanged()
    test_tiny_png_decodes()
    print("AM5 style conditioning OK")
