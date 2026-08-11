"""
Sequential Create runner with repair loop (M3e + AM2 gates + AM3 critic).

Used by the background worker so we can update job phase between steps.
LangGraph graph remains available for lighter unit tests.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any

from adapters.llm.protocol import LLMClient
from agent.nodes.codegen import codegen_node
from agent.nodes.critique import critique_node
from agent.nodes.ingest import ingest_node
from agent.nodes.load_fixture import load_fixture_node
from agent.nodes.plan import plan_node
from agent.nodes.refine_patch import (
    refine_code_patch_node,
    refine_fallback_to_code,
    refine_param_patch_node,
    refine_route_node,
)
from agent.nodes.repair import repair_node
from agent.nodes.sandbox_smoke import sandbox_smoke_node
from agent.nodes.style_extract import style_extract_node
from agent.nodes.validate import validate_node
from agent.state import CreateGraphState, initial_create_state, initial_refine_state

PhaseCallback = Callable[[str, CreateGraphState], Awaitable[None] | None]


async def _maybe_await(cb: PhaseCallback | None, phase: str, state: CreateGraphState) -> None:
    if cb is None:
        return
    result = cb(phase, state)
    if result is not None:
        await result  # type: ignore[misc]


def _merge(state: CreateGraphState, updates: dict[str, Any]) -> CreateGraphState:
    return {**state, **updates}  # type: ignore[return-value]


def _can_repair(state: CreateGraphState) -> bool:
    count = int(state.get("repair_count") or 0)
    max_r = int(state.get("max_repairs") or 3)
    return count < max_r


def _timed_out(started: float, wall_seconds: float) -> bool:
    return (time.monotonic() - started) >= wall_seconds


def _finalize_ok(state: CreateGraphState) -> CreateGraphState:
    return _merge(
        state,
        {
            "ready_for_finalize": True,
            "error_code": None,
            "error_message": None,
            "phase": "finalize",
        },
    )


async def run_create_with_repairs(
    *,
    vision_text: str,
    llm: LLMClient | None,
    use_fixture_code: bool = False,
    fixture_name: str = "social-frame",
    max_repairs: int = 3,
    wall_time_seconds: float = 120.0,
    job_id: str | None = None,
    tool_id: str | None = None,
    inspiration_asset_ids: list[str] | None = None,
    inspiration_images: list[dict[str, Any]] | None = None,
    plan_mode: bool = False,
    clarify_result: dict[str, Any] | None = None,
    on_phase: PhaseCallback | None = None,
) -> CreateGraphState:
    """
    Full create pipeline with bounded repair + optional critic loop (AM3)
    + optional style extract from inspiration images (AM5)
    + optional A3 clarify_result (forced enums + transcript) into plan.

    Success: ready_for_finalize=True, smoke_ok=True, validate_ok=True.
    Critic: advisory by default (AIDITR_CRITIC_ENFORCED); failure degrades to
    gates-only finalize. When enforced, overall < threshold triggers repair
    with critique fixes (counts against repair budget).
    Style extract: soft-fail — missing/failed vision never blocks Create.
    """
    started = time.monotonic()
    state = initial_create_state(
        vision_text=vision_text,
        use_fixture_code=use_fixture_code,
        fixture_name=fixture_name,
        max_repairs=max_repairs,
        job_id=job_id,
        tool_id=tool_id,
        inspiration_asset_ids=inspiration_asset_ids,
        inspiration_images=inspiration_images,
        plan_mode=plan_mode,
        clarify_result=clarify_result,
    )
    # --- ingest ---
    await _maybe_await(on_phase, "ingest", state)
    state = _merge(state, ingest_node(state))
    if state.get("error_code"):
        return state
    if _timed_out(started, wall_time_seconds):
        return _merge(
            state,
            {
                "error_code": "TIMEOUT",
                "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                "ready_for_finalize": False,
            },
        )

    # --- AM5 style extract (optional; before plan) ---
    if (
        not use_fixture_code
        and llm is not None
        and (state.get("inspiration_images") or state.get("inspiration_asset_ids"))
    ):
        await _maybe_await(on_phase, "style_extract", state)
        state = _merge(state, await style_extract_node(state, llm=llm))
        if _timed_out(started, wall_time_seconds):
            return _merge(
                state,
                {
                    "error_code": "TIMEOUT",
                    "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                    "ready_for_finalize": False,
                },
            )

    # --- plan ---
    await _maybe_await(on_phase, "plan", state)
    if use_fixture_code:
        state = _merge(state, await plan_node(state, llm=llm))  # type: ignore[arg-type]
    else:
        if llm is None:
            return _merge(
                state,
                {
                    "error_code": "INTERNAL",
                    "error_message": "LLM client required for live create",
                    "ready_for_finalize": False,
                },
            )
        state = _merge(state, await plan_node(state, llm=llm))
    if state.get("error_code"):
        return state
    if _timed_out(started, wall_time_seconds):
        return _merge(
            state,
            {
                "error_code": "TIMEOUT",
                "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                "ready_for_finalize": False,
            },
        )

    # --- codegen or fixture ---
    if use_fixture_code:
        await _maybe_await(on_phase, "codegen", state)
        state = _merge(state, load_fixture_node(state))
    else:
        await _maybe_await(on_phase, "codegen", state)
        state = _merge(state, await codegen_node(state, llm=llm))  # type: ignore[arg-type]
    if state.get("error_code"):
        return state

    # --- validate / smoke / critique / repair loop ---
    while True:
        if _timed_out(started, wall_time_seconds):
            return _merge(
                state,
                {
                    "error_code": "TIMEOUT",
                    "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                    "ready_for_finalize": False,
                    "phase": "repair",
                },
            )

        await _maybe_await(on_phase, "validate", state)
        state = _merge(state, validate_node(state))

        if not state.get("validate_ok"):
            if _can_repair(state) and llm is not None and not use_fixture_code:
                await _maybe_await(on_phase, "repair", state)
                state = _merge(state, await repair_node(state, llm=llm))
                if state.get("error_code") == "GENERATION_FAILED" and (
                    "repair budget" in (state.get("error_message") or "")
                    or "repair LLM failed" in (state.get("error_message") or "")
                ):
                    return _merge(state, {"ready_for_finalize": False})
                continue
            return _merge(
                state,
                {
                    "ready_for_finalize": False,
                    "error_code": state.get("error_code") or "VALIDATION_FAILED",
                    "error_message": state.get("error_message")
                    or "static validation failed",
                },
            )

        await _maybe_await(on_phase, "smoke", state)
        state = _merge(state, sandbox_smoke_node(state))

        if not state.get("smoke_ok"):
            if _can_repair(state) and llm is not None and not use_fixture_code:
                await _maybe_await(on_phase, "repair", state)
                state = _merge(state, await repair_node(state, llm=llm))
                continue
            return _merge(
                state,
                {
                    "ready_for_finalize": False,
                    "error_code": "GENERATION_FAILED",
                    "error_message": state.get("error_message")
                    or "sandbox smoke failed after repairs",
                },
            )

        # --- AM3 critic (after gates pass) ---
        # Fixture path: skip critic (no LLM design loop).
        if use_fixture_code or llm is None:
            return _finalize_ok(state)

        await _maybe_await(on_phase, "critique", state)
        state = _merge(state, await critique_node(state, llm=llm))

        # Judge failure → gates-only finalize (never hard-fail the job)
        if not state.get("critique_ok"):
            return _finalize_ok(state)

        passes = bool(state.get("critique_passes"))
        enforced = bool(state.get("critic_enforced"))

        if passes or not enforced:
            return _finalize_ok(state)

        # Enforced + below threshold → repair with fix list
        if _can_repair(state) and not use_fixture_code:
            await _maybe_await(on_phase, "repair", state)
            state = _merge(state, await repair_node(state, llm=llm))
            continue

        # Budget exhausted while enforced: still deliver gated tool (soft quality miss)
        return _finalize_ok(state)


# ---------------------------------------------------------------------------
# AM7 — Control refine (patch → gates → critic non-regression)
# ---------------------------------------------------------------------------

# Small epsilon so float noise does not falsely reject equal quality.
_REFINE_SCORE_EPS = 0.05


def _score_regressed(state: CreateGraphState) -> bool:
    """True when new critique score is meaningfully below base version score."""
    base = state.get("base_critique_score")
    new = state.get("critique_score")
    if base is None or new is None:
        return False
    try:
        return float(new) + _REFINE_SCORE_EPS < float(base)
    except (TypeError, ValueError):
        return False


async def run_refine_with_repairs(
    *,
    chat_message: str,
    base_code: str,
    llm: LLMClient | None,
    base_plan: dict[str, Any] | None = None,
    base_default_params: dict[str, Any] | None = None,
    base_param_schema: list[Any] | None = None,
    base_asset_slots: list[Any] | None = None,
    base_critique_score: float | None = None,
    base_version_id: str | None = None,
    target: str = "canvas2d",
    max_repairs: int = 3,
    wall_time_seconds: float = 120.0,
    job_id: str | None = None,
    tool_id: str | None = None,
    force_patch_mode: str | None = None,
    on_phase: PhaseCallback | None = None,
) -> CreateGraphState:
    """
    Control refine pipeline (AM7).

    Flow: route → param|code patch → validate → smoke → critique
    - Param-only path uses plan-role model (no full codegen).
    - Failed param path falls back once to code patch.
    - Critic score must not regress vs base_critique_score when both present.
    - On gate failure: repair (code) within budget, same as Create.
    """
    started = time.monotonic()
    state = initial_refine_state(
        chat_message=chat_message,
        base_code=base_code,
        base_plan=base_plan,
        base_default_params=base_default_params,
        base_param_schema=base_param_schema,
        base_asset_slots=base_asset_slots,
        base_critique_score=base_critique_score,
        base_version_id=base_version_id,
        target=target,
        max_repairs=max_repairs,
        job_id=job_id,
        tool_id=tool_id,
        patch_mode=force_patch_mode,
    )

    chat = (chat_message or "").strip()
    if not chat:
        return _merge(
            state,
            {
                "error_code": "VALIDATION_FAILED",
                "error_message": "chat message is required",
                "ready_for_finalize": False,
            },
        )
    if not (base_code or "").strip():
        return _merge(
            state,
            {
                "error_code": "VALIDATION_FAILED",
                "error_message": "base tool source is required",
                "ready_for_finalize": False,
            },
        )
    if llm is None:
        return _merge(
            state,
            {
                "error_code": "INTERNAL",
                "error_message": "LLM client required for refine",
                "ready_for_finalize": False,
            },
        )

    # --- route ---
    await _maybe_await(on_phase, "plan", state)
    state = _merge(state, refine_route_node(state))
    if _timed_out(started, wall_time_seconds):
        return _merge(
            state,
            {
                "error_code": "TIMEOUT",
                "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                "ready_for_finalize": False,
            },
        )

    # --- patch (param first, optional code fallback) ---
    await _maybe_await(on_phase, "codegen", state)
    mode = state.get("patch_mode") or "code"
    param_only_ok = False

    if mode == "param":
        state = _merge(state, await refine_param_patch_node(state, llm=llm))
        if state.get("error_code"):
            # Fallback to code patch once
            state = _merge(state, refine_fallback_to_code(state))
            state = _merge(state, await refine_code_patch_node(state, llm=llm))
            if state.get("error_code"):
                return state
        else:
            param_only_ok = True
            state = _merge(state, {"used_param_patch_only": True})
    else:
        state = _merge(state, await refine_code_patch_node(state, llm=llm))
        if state.get("error_code"):
            return state

    if _timed_out(started, wall_time_seconds):
        return _merge(
            state,
            {
                "error_code": "TIMEOUT",
                "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                "ready_for_finalize": False,
            },
        )

    # --- validate / smoke / critique / repair ---
    while True:
        if _timed_out(started, wall_time_seconds):
            return _merge(
                state,
                {
                    "error_code": "TIMEOUT",
                    "error_message": f"wall time exceeded ({wall_time_seconds}s)",
                    "ready_for_finalize": False,
                    "phase": "repair",
                },
            )

        await _maybe_await(on_phase, "validate", state)
        state = _merge(state, validate_node(state))

        if not state.get("validate_ok"):
            # Param-only gate failure → once try code patch if not already
            if param_only_ok and state.get("used_param_patch_only"):
                param_only_ok = False
                state = _merge(
                    state,
                    {
                        **refine_fallback_to_code(state),
                        "used_param_patch_only": False,
                    },
                )
                await _maybe_await(on_phase, "codegen", state)
                state = _merge(state, await refine_code_patch_node(state, llm=llm))
                if state.get("error_code"):
                    return state
                continue

            if _can_repair(state):
                await _maybe_await(on_phase, "repair", state)
                state = _merge(state, await repair_node(state, llm=llm))
                if state.get("error_code") == "GENERATION_FAILED" and (
                    "repair budget" in (state.get("error_message") or "")
                    or "repair LLM failed" in (state.get("error_message") or "")
                ):
                    return _merge(state, {"ready_for_finalize": False})
                continue
            return _merge(
                state,
                {
                    "ready_for_finalize": False,
                    "error_code": state.get("error_code") or "VALIDATION_FAILED",
                    "error_message": state.get("error_message")
                    or "static validation failed",
                },
            )

        await _maybe_await(on_phase, "smoke", state)
        state = _merge(state, sandbox_smoke_node(state))

        if not state.get("smoke_ok"):
            if param_only_ok and state.get("used_param_patch_only"):
                param_only_ok = False
                state = _merge(
                    state,
                    {
                        **refine_fallback_to_code(state),
                        "used_param_patch_only": False,
                    },
                )
                await _maybe_await(on_phase, "codegen", state)
                state = _merge(state, await refine_code_patch_node(state, llm=llm))
                if state.get("error_code"):
                    return state
                continue

            if _can_repair(state):
                await _maybe_await(on_phase, "repair", state)
                state = _merge(state, await repair_node(state, llm=llm))
                continue
            return _merge(
                state,
                {
                    "ready_for_finalize": False,
                    "error_code": "GENERATION_FAILED",
                    "error_message": state.get("error_message")
                    or "sandbox smoke failed after repairs",
                },
            )

        # Track best-valid for salvage
        if state.get("code"):
            state = _merge(state, {"best_valid_code": state.get("code")})

        # --- AM3 critic + AM7 non-regression ---
        await _maybe_await(on_phase, "critique", state)
        state = _merge(state, await critique_node(state, llm=llm))

        if not state.get("critique_ok"):
            # Judge unavailable → gates-only finalize (cannot compare scores)
            return _finalize_ok(state)

        if _score_regressed(state):
            base = state.get("base_critique_score")
            new = state.get("critique_score")
            if _can_repair(state) and not state.get("used_param_patch_only"):
                fixes = list(state.get("critique_fixes") or [])
                fixes.insert(
                    0,
                    f"refine non-regression: raise overall score above {base} "
                    f"(currently {new})",
                )
                state = _merge(state, {"critique_fixes": fixes})
                await _maybe_await(on_phase, "repair", state)
                state = _merge(state, await repair_node(state, llm=llm))
                continue
            # Param-only or budget exhausted: clean failure (do not land worse version)
            return _merge(
                state,
                {
                    "ready_for_finalize": False,
                    "error_code": "GENERATION_FAILED",
                    "error_message": (
                        f"refine rejected: judge score {new} < base {base} "
                        f"(non-regression)"
                    ),
                },
            )

        return _finalize_ok(state)
