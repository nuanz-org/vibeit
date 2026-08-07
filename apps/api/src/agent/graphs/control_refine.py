"""
AM7 — LangGraph Control refine graph (optional / tests).

Production path uses sequential runner.run_refine_with_repairs (same nodes)
so phase callbacks can update job rows between steps.
"""

from __future__ import annotations

import asyncio
from typing import Any

from langgraph.graph import END, START, StateGraph

from adapters.llm.protocol import LLMClient
from agent.nodes.refine_patch import (
    refine_code_patch_node,
    refine_param_patch_node,
    refine_route_node,
)
from agent.nodes.sandbox_smoke import sandbox_smoke_node
from agent.nodes.validate import validate_node
from agent.state import CreateGraphState, initial_refine_state


def _after_route(state: CreateGraphState) -> str:
    if state.get("error_code"):
        return "end"
    mode = state.get("patch_mode") or "code"
    return "param" if mode == "param" else "code"


def _after_patch(state: CreateGraphState) -> str:
    if state.get("error_code"):
        return "end"
    return "validate"


def _after_validate(state: CreateGraphState) -> str:
    if not state.get("validate_ok"):
        return "end"
    return "smoke"


def build_control_refine_graph(*, llm: LLMClient | None = None):
    """Compile a linear refine graph (route → patch → validate → smoke)."""

    async def _param(state: CreateGraphState) -> dict[str, Any]:
        if llm is None:
            return {
                "phase": "codegen",
                "error_code": "INTERNAL",
                "error_message": "LLM required for param patch",
                "ready_for_finalize": False,
            }
        return await refine_param_patch_node(state, llm=llm)

    async def _code(state: CreateGraphState) -> dict[str, Any]:
        if llm is None:
            return {
                "phase": "codegen",
                "error_code": "INTERNAL",
                "error_message": "LLM required for code patch",
                "ready_for_finalize": False,
            }
        return await refine_code_patch_node(state, llm=llm)

    graph = StateGraph(CreateGraphState)
    graph.add_node("route", refine_route_node)
    graph.add_node("param_patch", _param)
    graph.add_node("code_patch", _code)
    graph.add_node("validate", validate_node)
    graph.add_node("smoke", sandbox_smoke_node)

    graph.add_edge(START, "route")
    graph.add_conditional_edges(
        "route",
        _after_route,
        {"param": "param_patch", "code": "code_patch", "end": END},
    )
    graph.add_conditional_edges(
        "param_patch",
        _after_patch,
        {"validate": "validate", "end": END},
    )
    graph.add_conditional_edges(
        "code_patch",
        _after_patch,
        {"validate": "validate", "end": END},
    )
    graph.add_conditional_edges(
        "validate",
        _after_validate,
        {"smoke": "smoke", "end": END},
    )
    graph.add_edge("smoke", END)
    return graph.compile()


async def run_control_refine_graph(
    *,
    chat_message: str,
    base_code: str,
    llm: LLMClient,
    base_plan: dict[str, Any] | None = None,
    base_default_params: dict[str, Any] | None = None,
    base_param_schema: list[Any] | None = None,
) -> CreateGraphState:
    """ainvoke the light refine graph (no repair / critic — use runner for full)."""
    graph = build_control_refine_graph(llm=llm)
    state = initial_refine_state(
        chat_message=chat_message,
        base_code=base_code,
        base_plan=base_plan,
        base_default_params=base_default_params,
        base_param_schema=base_param_schema,
    )
    result = await graph.ainvoke(state)
    return result  # type: ignore[return-value]


def run_control_refine_sync(
    *,
    chat_message: str,
    base_code: str,
    llm: LLMClient,
    base_plan: dict[str, Any] | None = None,
    base_default_params: dict[str, Any] | None = None,
    base_param_schema: list[Any] | None = None,
) -> CreateGraphState:
    return asyncio.run(
        run_control_refine_graph(
            chat_message=chat_message,
            base_code=base_code,
            llm=llm,
            base_plan=base_plan,
            base_default_params=base_default_params,
            base_param_schema=base_param_schema,
        )
    )
