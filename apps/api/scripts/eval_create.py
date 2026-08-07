#!/usr/bin/env python3
"""
Create agent eval runner (M3h).

Default: deterministic mock LLM (CI-safe) measuring first-pass vs after-repair rates.
Optional live: EVAL_LIVE=1 + OPENROUTER_API_KEY uses deepseek/deepseek-v4-flash.

Usage (from apps/api):
  uv run python scripts/eval_create.py
  EVAL_LIVE=1 uv run python scripts/eval_create.py
  uv run python scripts/eval_create.py --json

Gates (defaults from prompts.json):
  first-pass ≥ 70%  OR  after-repair ≥ 90%
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

_API_ROOT = Path(__file__).resolve().parents[1]
_SRC = _API_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.openrouter import ASAP_CODEGEN_MODEL, OpenRouterLLMClient
from adapters.llm.protocol import ChatMessage, LLMClient, LLMCompletion, TokenUsage
from agent.runner import run_create_with_repairs

_PROMPTS_PATH = _API_ROOT / "evals" / "create" / "prompts.json"

# Good canvas2d module used by the mock LLM (passes validate + smoke).
_GOOD_CODE = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#0b0b12" },
        { name: "accent", kind: "color", label: "Accent", default: "#7c5cff" },
        { name: "title", kind: "text", label: "Title", default: "Your vibe", maxLength: 48 },
        { name: "speed", kind: "number", label: "Speed", default: 1, min: 0, max: 3, step: 0.05 },
      ],
      getDefaultParams: () => ({
        bg: "#0b0b12",
        accent: "#7c5cff",
        title: "Your vibe",
        speed: 1,
      }),
      getAssetSlots: () => [
        { id: "logo", label: "Logo", accept: "image/*", required: false },
      ],
      draw(c) {
        const bg = String(c.params.bg ?? "#0b0b12");
        const accent = String(c.params.accent ?? "#7c5cff");
        const title = String(c.params.title ?? "");
        const speed = Number(c.params.speed ?? 1);
        c.ctx.fillStyle = bg;
        c.ctx.fillRect(0, 0, c.width, c.height);
        const pulse = 0.5 + 0.5 * Math.sin(c.time * speed * 2);
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

_BAD_CODE = 'export const createTool = () => { eval("x"); return {}; };'

# Two prompts intentionally fail first codegen so repair path is exercised in mock mode.
_MOCK_FIRST_PASS_FAIL_IDS = frozenset({"neon-grid", "soft-particles"})


class EvalMockLLM:
    """
    Deterministic mock for offline eval.

    - Plan: always valid ASAP plan with target forced later by parser.
    - Codegen: good code by default; selected ids fail once then repair to good.
    """

    def __init__(self, prompt_id: str) -> None:
        self.prompt_id = prompt_id
        self.codegen_calls = 0

    @property
    def default_model(self) -> str:
        return ASAP_CODEGEN_MODEL

    async def complete(
        self,
        messages: list[ChatMessage] | list[dict[str, str]],
        **kwargs: object,
    ) -> LLMCompletion:
        blob = " ".join(
            m.content if isinstance(m, ChatMessage) else str(m.get("content", ""))
            for m in messages
        )
        if "Plan stage" in blob or "ToolPlan" in blob:
            plan = {
                "concept": self.prompt_id,
                "aspect": "9:16" if "9:16" in blob or "story" in self.prompt_id else "1:1",
                "motion": "pulse",
                "params": [
                    {"name": "bg", "kind": "color", "default": "#0b0b12"},
                    {"name": "accent", "kind": "color", "default": "#7c5cff"},
                    {"name": "title", "kind": "text", "default": "Your vibe"},
                    {
                        "name": "speed",
                        "kind": "number",
                        "default": 1,
                        "min": 0,
                        "max": 3,
                        "step": 0.05,
                    },
                ],
                "assetSlots": [
                    {"id": "logo", "label": "Logo", "accept": "image/*", "required": False}
                ],
                "target": "canvas2d",
            }
            return LLMCompletion(
                text=json.dumps(plan),
                model=self.default_model,
                usage=TokenUsage(total_tokens=25),
            )

        # AM3 critic
        if "Critic stage" in blob or "Score this tool" in blob:
            # Deterministic mid-high score so mock path finalizes under advisory critic
            critique = {
                "overall": 4.0,
                "scores": {
                    "composition": 4,
                    "motion": 4,
                    "palette": 4,
                    "typography": 4,
                    "params": 4,
                },
                "summary": f"mock critique for {self.prompt_id}",
                "fixes": [],
            }
            return LLMCompletion(
                text=json.dumps(critique),
                model=self.default_model,
                usage=TokenUsage(total_tokens=30),
            )

        # Repair or second codegen
        if "Repair stage" in blob or "Errors to fix" in blob:
            return LLMCompletion(
                text=_GOOD_CODE,
                model=self.default_model,
                usage=TokenUsage(total_tokens=80),
            )

        self.codegen_calls += 1
        if (
            self.prompt_id in _MOCK_FIRST_PASS_FAIL_IDS
            and self.codegen_calls == 1
        ):
            return LLMCompletion(
                text=_BAD_CODE,
                model=self.default_model,
                usage=TokenUsage(total_tokens=20),
            )
        return LLMCompletion(
            text=_GOOD_CODE,
            model=self.default_model,
            usage=TokenUsage(total_tokens=60),
        )


@dataclass
class PromptResult:
    id: str
    vision: str
    success: bool
    first_pass: bool
    repair_count: int
    error: str | None = None
    # AM3 quality
    tier: str | None = None
    critique_score: float | None = None
    critique_ok: bool | None = None
    screenshot_path: str | None = None
    smoke_variance: float | None = None


@dataclass
class EvalSummary:
    mode: str
    total: int
    success: int
    first_pass: int
    first_pass_rate: float
    after_repair_rate: float
    gate_first_pass: float
    gate_after_repair: float
    gates_passed: bool
    results: list[PromptResult]
    mean_judge_score: float | None = None
    scored_count: int = 0
    corpus_version: int | None = None


def load_suite(path: Path = _PROMPTS_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


async def eval_one(
    *,
    prompt: dict,
    llm: LLMClient,
    max_repairs: int,
    wall_time: float,
) -> PromptResult:
    pid = str(prompt["id"])
    vision = str(prompt["vision"])
    tier = str(prompt["tier"]) if prompt.get("tier") else None
    try:
        state = await run_create_with_repairs(
            vision_text=vision,
            llm=llm,
            max_repairs=max_repairs,
            wall_time_seconds=wall_time,
            job_id=f"eval-{pid}",
        )
        ok = bool(
            state.get("ready_for_finalize")
            and state.get("smoke_ok")
            and state.get("validate_ok")
        )
        repairs = int(state.get("repair_count") or 0)
        score = state.get("critique_score")
        return PromptResult(
            id=pid,
            vision=vision,
            success=ok,
            first_pass=ok and repairs == 0,
            repair_count=repairs,
            error=None if ok else (state.get("error_message") or "failed"),
            tier=tier,
            critique_score=float(score) if score is not None else None,
            critique_ok=bool(state.get("critique_ok"))
            if state.get("critique_ok") is not None
            else None,
            screenshot_path=state.get("smoke_screenshot_path"),
            smoke_variance=state.get("smoke_variance"),
        )
    except Exception as exc:  # noqa: BLE001
        return PromptResult(
            id=pid,
            vision=vision,
            success=False,
            first_pass=False,
            repair_count=0,
            error=str(exc),
            tier=tier,
        )


async def run_eval(
    *,
    live: bool,
    max_repairs: int = 3,
    wall_time: float = 150.0,
    limit: int | None = None,
) -> EvalSummary:
    suite = load_suite()
    gates = suite.get("gates") or {}
    gate_fp = float(gates.get("minFirstPassRate", 0.7))
    gate_ar = float(gates.get("minAfterRepairRate", 0.9))
    prompts: list[dict] = list(suite["prompts"])
    if limit is not None and limit > 0:
        prompts = prompts[:limit]

    results: list[PromptResult] = []
    for p in prompts:
        if live:
            key = os.getenv("OPENROUTER_API_KEY", "").strip()
            if not key:
                raise SystemExit("EVAL_LIVE=1 requires OPENROUTER_API_KEY")
            llm: LLMClient = OpenRouterLLMClient(
                api_key=key,
                default_model=ASAP_CODEGEN_MODEL,
            )
        else:
            llm = EvalMockLLM(str(p["id"]))

        results.append(
            await eval_one(
                prompt=p,
                llm=llm,
                max_repairs=max_repairs,
                wall_time=wall_time,
            )
        )

    total = len(results)
    success = sum(1 for r in results if r.success)
    first_pass = sum(1 for r in results if r.first_pass)
    fp_rate = first_pass / total if total else 0.0
    ar_rate = success / total if total else 0.0
    gates_ok = fp_rate >= gate_fp or ar_rate >= gate_ar

    scored = [r.critique_score for r in results if r.critique_score is not None]
    mean_score = sum(scored) / len(scored) if scored else None

    return EvalSummary(
        mode="live" if live else "mock",
        total=total,
        success=success,
        first_pass=first_pass,
        first_pass_rate=fp_rate,
        after_repair_rate=ar_rate,
        gate_first_pass=gate_fp,
        gate_after_repair=gate_ar,
        gates_passed=gates_ok,
        results=results,
        mean_judge_score=mean_score,
        scored_count=len(scored),
        corpus_version=int(suite.get("version") or 1),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Create eval runner (M3h + AM3 quality)")
    parser.add_argument(
        "--live",
        action="store_true",
        default=os.getenv("EVAL_LIVE", "").lower() in ("1", "true", "yes"),
        help="Use OpenRouter live model (requires OPENROUTER_API_KEY)",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON summary")
    parser.add_argument("--max-repairs", type=int, default=3)
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only run first N prompts (smoke subset)",
    )
    args = parser.parse_args()

    summary = asyncio.run(
        run_eval(
            live=args.live,
            max_repairs=args.max_repairs,
            limit=args.limit,
        )
    )

    if args.json:
        print(
            json.dumps(
                {
                    **{
                        k: v
                        for k, v in asdict(summary).items()
                        if k != "results"
                    },
                    "results": [asdict(r) for r in summary.results],
                },
                indent=2,
            )
        )
    else:
        print(
            f"Create eval ({summary.mode}) — {summary.total} prompts "
            f"(corpus v{summary.corpus_version or '?'})"
        )
        print(
            f"  first-pass:    {summary.first_pass}/{summary.total} "
            f"({summary.first_pass_rate:.0%})  gate≥{summary.gate_first_pass:.0%}"
        )
        print(
            f"  after-repair:  {summary.success}/{summary.total} "
            f"({summary.after_repair_rate:.0%})  gate≥{summary.gate_after_repair:.0%}"
        )
        if summary.mean_judge_score is not None:
            print(
                f"  mean judge:    {summary.mean_judge_score:.2f} "
                f"({summary.scored_count} scored)"
            )
        print(f"  gates:         {'PASS' if summary.gates_passed else 'FAIL'}")
        for r in summary.results:
            mark = "✓" if r.success else "✗"
            fp = "1st" if r.first_pass else f"r{r.repair_count}"
            score = (
                f"  j={r.critique_score:.1f}"
                if r.critique_score is not None
                else ""
            )
            tier = f" [{r.tier}]" if r.tier else ""
            err = f"  {r.error}" if r.error and not r.success else ""
            print(f"  {mark} {r.id:22} {fp}{score}{tier}{err}")

    return 0 if summary.gates_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
