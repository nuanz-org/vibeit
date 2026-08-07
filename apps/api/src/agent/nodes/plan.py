"""Plan node — vision → ToolPlan JSON (M3d). Forces target=canvas2d."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.plan_parse import PlanParseError, parse_asap_plan
from agent.prompts.create_plan import PLAN_SYSTEM_PROMPT, plan_user_prompt
from agent.state import CreateGraphState
from core.config import get_settings


async def plan_node(state: CreateGraphState, *, llm: LLMClient) -> dict[str, Any]:
    """
    Call LLM for plan JSON. On fixture path, synthesize a tiny plan without LLM.
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
    base_messages = [
        ChatMessage(role="system", content=PLAN_SYSTEM_PROMPT),
        ChatMessage(role="user", content=plan_user_prompt(vision)),
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
            tokens += completion.usage.total_tokens
            return {
                "phase": "plan",
                "plan": plan,
                "target": "canvas2d",
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
