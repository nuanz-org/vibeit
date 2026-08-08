"""Plan node — vision → ToolPlan JSON (M3d + B4 target policy)."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.clarify_parse import merge_forced_enums_into_plan
from agent.plan_parse import PlanParseError, parse_asap_plan
from agent.prompts.create_plan import plan_system_prompt, plan_user_prompt
from agent.target_policy import apply_vision_target_preference
from agent.state import CreateGraphState
from core.config import get_settings


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
    base_messages = [
        ChatMessage(role="system", content=plan_system_prompt()),
        ChatMessage(
            role="user",
            content=plan_user_prompt(
                vision,
                style_notes=style_notes,
                clarify_result=clarify_result,
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
            tokens += completion.usage.total_tokens
            tgt = plan.get("target") if isinstance(plan.get("target"), str) else "canvas2d"
            return {
                "phase": "plan",
                "plan": plan,
                "target": tgt,
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
