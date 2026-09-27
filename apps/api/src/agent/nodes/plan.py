"""Plan node — vision → ToolPlan JSON (M3d + B4 target policy + style registry lock)."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.clarify_parse import merge_forced_enums_into_plan
from agent.plan_parse import PlanParseError, parse_asap_plan
from agent.prompts.create_plan import plan_system_prompt, plan_user_prompt
from agent.style_registry import (
    StyleChoice,
    apply_style_to_plan,
    choose_styles,
    get_style,
    plan_style_block,
    style_lock_enabled,
)
from agent.target_policy import apply_vision_target_preference
from agent.state import CreateGraphState
from core.config import get_settings


def lock_plan_style(plan: dict[str, Any], choice: StyleChoice) -> dict[str, Any]:
    """
    Resolve the final look for a parsed plan and fold it in.

    Priority: user/explicit lock → the plan's valid pick → top of the shortlist.
    Styles are canvas2d recipes; other targets keep their plan untouched.
    """
    target = plan.get("target") or "canvas2d"
    if target != "canvas2d":
        out = {k: v for k, v in plan.items() if k not in ("styleId", "styleColors", "typeTreatmentId")}
        out["styleSkippedReason"] = f"style registry is canvas2d-only (target={target})"
        return out
    picked = choice.locked_id
    if not picked:
        cand = plan.get("styleId")
        entry = get_style(cand) if isinstance(cand, str) else None
        picked = cand if entry is not None and entry.get("slot") == "look" else choice.shortlist[0]
    type_id = choice.type_locked_id or plan.get("typeTreatmentId")
    rationale = plan.get("styleRationale") if picked == plan.get("styleId") else None
    return apply_style_to_plan(
        plan,
        style_id=picked,
        type_id=type_id if isinstance(type_id, str) else None,
        style_colors=plan.get("styleColors") if picked == plan.get("styleId") else None,
        rationale=rationale or choice.reason,
    )


async def plan_node(state: CreateGraphState, *, llm: LLMClient) -> dict[str, Any]:
    """
    Call LLM for plan JSON. On fixture path, synthesize a tiny plan without LLM.
    A3: inject clarify transcript + merge forcedEnums into params after parse.
    """
    if state.get("use_fixture_code"):
        return {
            "phase": "plan",
            "plan": {
                "concept": state.get("vision_text") or "fixture tool",
                "aspect": "9:16",
                "motion": "pulse",
                "params": [],
                "assetSlots": [],
                "target": "canvas2d",
                "notes": "fixture path — plan unused",
            },
            "target": "canvas2d",
        }

    vision = (state.get("vision_text") or "").strip()
    style_notes = (
        state.get("style_notes") if isinstance(state.get("style_notes"), dict) else None
    )
    clarify_result = (
        state.get("clarify_result")
        if isinstance(state.get("clarify_result"), dict)
        else None
    )
    clarify_style = clarify_result.get("styleId") if clarify_result else None
    choice = (
        choose_styles(
            vision,
            locked_id=clarify_style if isinstance(clarify_style, str) else None,
        )
        if style_lock_enabled()
        else None
    )
    base_messages = [
        ChatMessage(role="system", content=plan_system_prompt()),
        ChatMessage(
            role="user",
            content=plan_user_prompt(
                vision,
                style_notes=style_notes,
                clarify_result=clarify_result,
                style_block=plan_style_block(choice) if choice else None,
            ),
        ),
    ]
    last_err: str | None = None
    last_raw = ""
    tokens = int(state.get("llm_tokens_used") or 0)

    for attempt in range(2):  # initial + one parse retry
        try:
            if attempt == 0:
                messages = base_messages
                temperature = 0.3
            else:
                messages = [
                    *base_messages,
                    ChatMessage(role="assistant", content=last_raw),
                    ChatMessage(
                        role="user",
                        content=(
                            f"Your previous output was not valid plan JSON ({last_err}). "
                            "Reply with ONLY a valid JSON object, no fences."
                        ),
                    ),
                ]
                temperature = 0.1

            plan_model = resolve_model_for_role(
                "plan", configured=get_settings().llm_model_plan
            )
            completion = await llm.complete(
                messages, model=plan_model, temperature=temperature
            )
            last_raw = completion.text
            plan = parse_asap_plan(completion.text)
            # A3: hard-merge forced enums so axes survive plan LLM collapse
            if clarify_result:
                forced = clarify_result.get("forcedEnums")
                if isinstance(forced, list) and forced:
                    plan = merge_forced_enums_into_plan(plan, forced)
            # B4: soft-upgrade to three/p5 when enabled and vision strongly prefers it
            plan = apply_vision_target_preference(plan, vision)
            # Style registry: lock one look and merge its controls
            if choice is not None:
                plan = lock_plan_style(plan, choice)
            tokens += completion.usage.total_tokens
            tgt = plan.get("target") if isinstance(plan.get("target"), str) else "canvas2d"
            return {
                "phase": "plan",
                "plan": plan,
                "target": tgt,
                "style_id": plan.get("styleId"),
                "style_shortlist": list(choice.shortlist) if choice else [],
                "error_code": None,
                "error_message": None,
                "llm_tokens_used": tokens,
            }
        except (PlanParseError, LLMError, TypeError, KeyError) as exc:
            last_err = str(exc)
            continue

    return {
        "phase": "plan",
        "plan": None,
        "error_code": "GENERATION_FAILED",
        "error_message": f"plan failed: {last_err}",
        "ready_for_finalize": False,
        "llm_tokens_used": tokens,
    }
