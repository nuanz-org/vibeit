"""
LangGraph Create pipeline (M3c–M3d).

Paths:
  fixture: ingest → plan(noop) → load_fixture → validate → smoke → END
  live:    ingest → plan(LLM) → codegen(LLM) → validate → smoke → END

Model: deepseek/deepseek-v4-flash only (via LLMClient).
"""

from __future__ import annotations

import asyncio
from typing import Any

from langgraph.graph import END, START, StateGraph

from adapters.llm.protocol import LLMClient
from agent.nodes.codegen import codegen_node
from agent.nodes.ingest import ingest_node
from agent.nodes.load_fixture import load_fixture_node
from agent.nodes.plan import plan_node
from agent.nodes.sandbox_smoke import sandbox_smoke_node
from agent.nodes.validate import validate_node
from agent.state import CreateGraphState, initial_create_state


def _after_ingest(state: CreateGraphState) -> str:
    if state.get("error_code"):
        return "end"
    return "plan"


def _after_plan(state: CreateGraphState) -> str:
    if state.get("error_code"):
        return "end"
    if state.get("use_fixture_code"):
        return "load_fixture"
    return "codegen"


def _after_codegen_or_fixture(state: CreateGraphState) -> str:
    if state.get("error_code"):
        return "end"
    return "validate"


def _after_validate(state: CreateGraphState) -> str:
    if not state.get("validate_ok"):
        return "end"
    return "smoke"


def build_create_graph(*, llm: LLMClient | None = None):
    """
    Compile the Create StateGraph (async plan/codegen nodes).

    `llm` is required for the live plan/codegen path. Fixture path does not call it.
    """

    async def _plan(state: CreateGraphState) -> dict[str, Any]:
        if state.get("use_fixture_code"):
            # No LLM needed
            return await plan_node(state, llm=llm)  # type: ignore[arg-type]
        if llm is None:
            return {
                "phase": "plan",
                "error_code": "INTERNAL",
                "error_message": "LLM client not configured for plan node",
                "ready_for_finalize": False,
            }
        return await plan_node(state, llm=llm)

    async def _codegen(state: CreateGraphState) -> dict[str, Any]:
        if state.get("use_fixture_code"):
            return await codegen_node(state, llm=llm)  # type: ignore[arg-type]
        if llm is None:
            return {
                "phase": "codegen",
                "error_code": "INTERNAL",
                "error_message": "LLM client not configured for codegen node",
                "ready_for_finalize": False,
            }
        return await codegen_node(state, llm=llm)

    graph = StateGraph(CreateGraphState)

    graph.add_node("ingest", ingest_node)
    graph.add_node("plan", _plan)
    graph.add_node("codegen", _codegen)
    graph.add_node("load_fixture", load_fixture_node)
    graph.add_node("validate", validate_node)
    graph.add_node("smoke", sandbox_smoke_node)

    graph.add_edge(START, "ingest")
    graph.add_conditional_edges(
        "ingest",
        _after_ingest,
        {"plan": "plan", "end": END},
    )
    graph.add_conditional_edges(
        "plan",
        _after_plan,
        {"codegen": "codegen", "load_fixture": "load_fixture", "end": END},
    )
    graph.add_conditional_edges(
        "codegen",
        _after_codegen_or_fixture,
        {"validate": "validate", "end": END},
    )
    graph.add_conditional_edges(
        "load_fixture",
        _after_codegen_or_fixture,
        {"validate": "validate", "end": END},
    )
    graph.add_conditional_edges(
        "validate",
        _after_validate,
        {"smoke": "smoke", "end": END},
    )
    graph.add_edge("smoke", END)

    return graph.compile()


_GRAPH_CACHE: dict[int, Any] = {}


def get_create_graph(*, llm: LLMClient | None = None):
    """Cached compiled graph keyed by llm identity (None for fixture-only)."""
    key = id(llm) if llm is not None else 0
    if key not in _GRAPH_CACHE:
        _GRAPH_CACHE[key] = build_create_graph(llm=llm)
    return _GRAPH_CACHE[key]


def _ainvoke_sync(graph: Any, state: CreateGraphState) -> CreateGraphState:
    """Run async graph from sync tests/scripts."""
    return asyncio.run(graph.ainvoke(state))  # type: ignore[return-value]


def run_create_fixture_pipeline(
    *,
    vision_text: str = "fixture social-frame",
    fixture_name: str = "social-frame",
    code: str | None = None,
) -> CreateGraphState:
    """
    Fixture path (no LLM).

    If `code` is provided, run ingest → validate → smoke on that source only.
    """
    if code is not None:
        return _invoke_injected_code(vision_text=vision_text, code=code)

    graph = get_create_graph(llm=None)
    state = initial_create_state(
        vision_text=vision_text,
        use_fixture_code=True,
        fixture_name=fixture_name,
    )
    return _ainvoke_sync(graph, state)


def _invoke_injected_code(*, vision_text: str, code: str) -> CreateGraphState:
    """ingest → validate → smoke for pre-baked code (tests)."""
    state: CreateGraphState = initial_create_state(
        vision_text=vision_text,
        code=code,
        use_fixture_code=False,
    )
    state = {**state, **ingest_node(state)}
    if state.get("error_code"):
        return state
    state = {**state, "code": code, **validate_node(state)}
    if not state.get("validate_ok"):
        return state
    state = {**state, **sandbox_smoke_node(state)}
    return state


async def run_create_llm_pipeline(
    *,
    vision_text: str,
    llm: LLMClient,
    max_repairs: int = 3,
    job_id: str | None = None,
    tool_id: str | None = None,
) -> CreateGraphState:
    """Live ASAP path: plan + codegen via LLM, then validate + smoke."""
    graph = get_create_graph(llm=llm)
    state = initial_create_state(
        vision_text=vision_text,
        use_fixture_code=False,
        max_repairs=max_repairs,
        job_id=job_id,
        tool_id=tool_id,
    )
    result = await graph.ainvoke(state)
    return result  # type: ignore[return-value]


def run_create_pipeline(
    state: CreateGraphState,
    *,
    llm: LLMClient | None = None,
) -> CreateGraphState:
    """Sync entry — uses asyncio.run(ainvoke)."""
    return _ainvoke_sync(get_create_graph(llm=llm), state)
