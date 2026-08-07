"""M3e: repair loop, finalize success/salvage, fixture worker path."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import asyncpg

from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.llm.protocol import ChatMessage, LLMCompletion, TokenUsage
from agent.runner import run_create_with_repairs
from services.create_job import enqueue_create_job
from services.finalize_job import finalize_from_agent_state
from workers.generation import run_generation_job

_DEFAULT_URL = "postgresql://vibeit:vibeit@localhost:5432/vibeit"

_GOOD_CODE = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", default: "#111111" },
        { name: "accent", kind: "color", default: "#7c5cff" },
        { name: "title", kind: "text", default: "Hi" },
      ],
      getDefaultParams: () => ({
        bg: "#111111",
        accent: "#7c5cff",
        title: "Hi",
      }),
      getAssetSlots: () => [],
      draw(c) {
        c.ctx.fillStyle = String(c.params.bg ?? "#111111");
        c.ctx.fillRect(0, 0, c.width, c.height);
        c.ctx.fillStyle = String(c.params.accent ?? "#7c5cff");
        c.ctx.beginPath();
        c.ctx.arc(c.width * 0.5, c.height * 0.4, 36, 0, Math.PI * 2);
        c.ctx.fill();
        c.ctx.fillStyle = "#ffffff";
        c.ctx.font = "bold 20px system-ui";
        c.ctx.fillText(String(c.params.title ?? ""), 12, 28);
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
"""

_BAD_THEN_GOOD_PLAN = {
    "concept": "test",
    "aspect": "1:1",
    "motion": "still",
    "params": [
        {"name": "bg", "kind": "color", "default": "#000000"},
        {"name": "accent", "kind": "color", "default": "#7c5cff"},
        {"name": "title", "kind": "text", "default": "test"},
    ],
    "assetSlots": [],
    "target": "canvas2d",
}


class RepairThenOkLLM:
    """First codegen invalid; after repair returns good code."""

    def __init__(self) -> None:
        self.n = 0

    @property
    def default_model(self) -> str:
        return "deepseek/deepseek-v4-flash"

    async def complete(self, messages, **kwargs) -> LLMCompletion:
        self.n += 1
        blob = " ".join(
            m.content if isinstance(m, ChatMessage) else str(m.get("content", ""))
            for m in messages
        )
        if "Plan stage" in blob or "ToolPlan" in blob:
            import json

            return LLMCompletion(
                text=json.dumps(_BAD_THEN_GOOD_PLAN),
                model=self.default_model,
                usage=TokenUsage(total_tokens=10),
            )
        if "Repair stage" in blob or "Errors to fix" in blob:
            return LLMCompletion(
                text=_GOOD_CODE,
                model=self.default_model,
                usage=TokenUsage(total_tokens=50),
            )
        # first codegen — intentionally broken
        return LLMCompletion(
            text='export const createTool = () => { eval("x"); return {}; }',
            model=self.default_model,
            usage=TokenUsage(total_tokens=20),
        )


def _any_user() -> str | None:
    async def _run() -> str | None:
        try:
            conn = await asyncpg.connect(
                dsn=os.getenv("DATABASE_URL", _DEFAULT_URL)
            )
            try:
                row = await conn.fetchrow('SELECT id FROM "user" LIMIT 1')
                return str(row["id"]) if row else None
            finally:
                await conn.close()
        except Exception:
            return None

    return asyncio.run(_run())


def test_runner_repair_recovers() -> None:
    async def _run() -> None:
        llm = RepairThenOkLLM()
        state = await run_create_with_repairs(
            vision_text="purple orb",
            llm=llm,
            max_repairs=3,
            wall_time_seconds=90,
        )
        assert state.get("ready_for_finalize") is True, state
        assert state.get("smoke_ok") is True
        assert int(state.get("repair_count") or 0) >= 1

    asyncio.run(_run())


def test_runner_fixture_success() -> None:
    async def _run() -> None:
        state = await run_create_with_repairs(
            vision_text="fixture",
            llm=None,
            use_fixture_code=True,
        )
        assert state.get("ready_for_finalize") is True
        assert state.get("smoke_ok") is True

    asyncio.run(_run())


def test_worker_fixture_finalize_success() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M3e worker: no user")
        return

    async def _run() -> None:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            jobs = JobsRepository(pool)
            tools = ToolsRepository(pool)
            enq = await enqueue_create_job(
                owner_user_id=owner,
                vision_text="M3e fixture worker test",
                inspiration_asset_ids=[],
                tools=tools,
                jobs=jobs,
            )
            await run_generation_job(
                str(enq.job.id),
                pool=pool,
                use_fixture_code=True,
            )
            job = await jobs.get_job(enq.job.id)
            assert job is not None
            assert job.status == "succeeded", (job.status, job.error_message)
            ver = await tools.get_latest_tool_version(enq.tool.id)
            assert ver is not None
            assert "createSocialFrameTool" in ver.code or "createCanvas2dTool" in ver.code
            # draft not published
            tool = await tools.get_tool_by_id(enq.tool.id)
            assert tool is not None and tool.status == "draft"
        finally:
            await pool.close()

    asyncio.run(_run())


def test_finalize_salvage_on_failure() -> None:
    owner = _any_user()
    if not owner:
        print("SKIP M3e salvage: no user")
        return

    async def _run() -> None:
        url = os.getenv("DATABASE_URL", _DEFAULT_URL)
        pool = await asyncpg.create_pool(dsn=url, min_size=1, max_size=2)
        try:
            jobs = JobsRepository(pool)
            tools = ToolsRepository(pool)
            enq = await enqueue_create_job(
                owner_user_id=owner,
                vision_text="salvage test",
                inspiration_asset_ids=[],
                tools=tools,
                jobs=jobs,
            )
            await jobs.update_job_status(str(enq.job.id), status="running")
            state = {
                "vision_text": "salvage test",
                "code": "bad",
                "best_valid_code": _GOOD_CODE,
                "ready_for_finalize": False,
                "smoke_ok": False,
                "validate_ok": True,
                "error_code": "GENERATION_FAILED",
                "error_message": "smoke failed",
                "repair_count": 3,
                "plan": {
                    "concept": "x",
                    "aspect": "1:1",
                    "motion": "n",
                    "params": [],
                    "assetSlots": [],
                    "target": "canvas2d",
                },
                "llm_tokens_used": 1,
            }
            final = await finalize_from_agent_state(
                job_id=str(enq.job.id),
                state=state,  # type: ignore[arg-type]
                jobs=jobs,
                tools=tools,
            )
            assert final.status == "failed"
            assert final.error_code == "GENERATION_FAILED"
            assert "salvage_draft=true" in (final.error_message or "")
            ver = await tools.get_latest_tool_version(enq.tool.id)
            assert ver is not None
            assert "createCanvas2dTool" in ver.code
            tool = await tools.get_tool_by_id(enq.tool.id)
            assert tool is not None and tool.status == "draft"
            # failed never succeeded
            assert final.status != "succeeded"
        finally:
            await pool.close()

    asyncio.run(_run())


if __name__ == "__main__":
    test_runner_repair_recovers()
    test_runner_fixture_success()
    test_worker_fixture_finalize_success()
    test_finalize_salvage_on_failure()
    print("M3e create finalize/repair smoke OK")
