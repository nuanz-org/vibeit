"""Clarify node — vision → questions (A3 planMode)."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.clarify_parse import ClarifyParseError, parse_clarify_response
from agent.prompts.create_clarify import CLARIFY_SYSTEM_PROMPT, clarify_user_prompt
from agent.state import CreateGraphState
from agent.style_registry import (
    STYLE_QUESTION_ID,
    choose_styles,
    style_lock_enabled,
    style_question,
)
from core.config import get_settings

_MAX_QUESTIONS = 4


def with_style_question(vision: str, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Put the curated style question first (unless the vision already names a style).

    Its option values are style ids; the answer locks the look instead of becoming an enum.
    """
    rest = [q for q in questions if q.get("id") != STYLE_QUESTION_ID]
    if not style_lock_enabled():
        return rest[:_MAX_QUESTIONS]
    choice = choose_styles(vision)
    if choice.locked_id:
        return rest[:_MAX_QUESTIONS]
    q = style_question(choice.shortlist)
    if q is None:
        return rest[:_MAX_QUESTIONS]
    return [q, *rest][:_MAX_QUESTIONS]


async def clarify_node(state: CreateGraphState, *, llm: LLMClient) -> dict[str, Any]:
    """
    Call LLM for clarify questions JSON.

    On success: clarify_payload with understanding + questions (may be empty).
    Empty questions means skip pause and continue pipeline.
    """
    vision = (state.get("vision_text") or "").strip()
    base_messages = [
        ChatMessage(role="system", content=CLARIFY_SYSTEM_PROMPT),
        ChatMessage(role="user", content=clarify_user_prompt(vision)),
    ]

    last_err: str | None = None
    last_raw = ""
    tokens = int(state.get("llm_tokens_used") or 0)

    for attempt in range(2):
        try:
            if attempt == 0:
                messages = base_messages
                temperature = 0.35
            else:
                messages = [
                    *base_messages,
                    ChatMessage(role="assistant", content=last_raw),
                    ChatMessage(
                        role="user",
                        content=(
                            f"Your previous output was not valid clarify JSON "
                            f"({last_err}). Reply with ONLY a valid JSON object."
                        ),
                    ),
                ]
                temperature = 0.1

            model = resolve_model_for_role(
                "plan", configured=get_settings().llm_model_plan
            )
            completion = await llm.complete(
                messages, model=model, temperature=temperature
            )
            last_raw = completion.text
            parsed = parse_clarify_response(completion.text)
            tokens += completion.usage.total_tokens
            questions = with_style_question(vision, list(parsed.get("questions") or []))
            return {
                "phase": "clarify",
                "clarify_payload": {
                    "understanding": parsed.get("understanding"),
                    "questions": questions,
                    **(
                        {"skipReason": parsed["skipReason"]}
                        if parsed.get("skipReason")
                        else {}
                    ),
                },
                "clarify_questions": questions,
                "error_code": None,
                "error_message": None,
                "llm_tokens_used": tokens,
            }
        except (ClarifyParseError, LLMError, TypeError, KeyError) as exc:
            last_err = str(exc)
            continue

    return {
        "phase": "clarify",
        "clarify_payload": None,
        "error_code": "GENERATION_FAILED",
        "error_message": f"clarify failed: {last_err}",
        "ready_for_finalize": False,
        "llm_tokens_used": tokens,
    }
