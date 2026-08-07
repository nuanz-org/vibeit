"""Repair node — LLM fixes code after validate/smoke failure (M3e)."""

from __future__ import annotations

import json
from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from agent.codegen_parse import CodegenParseError, extract_typescript_module
from agent.prompts.create_repair import REPAIR_SYSTEM_PROMPT, repair_user_prompt
from agent.state import CreateGraphState


async def repair_node(state: CreateGraphState, *, llm: LLMClient) -> dict[str, Any]:
    code = state.get("code") or ""
    errors = list(state.get("validation_errors") or []) + list(
        state.get("smoke_errors") or []
    )
    # AM3: critic-guided repairs inject ordered design fixes
    for fix in state.get("critique_fixes") or []:
        if isinstance(fix, str) and fix.strip():
            errors.append(f"critique: {fix.strip()}")
    if state.get("critique_ok") and state.get("critique_score") is not None:
        score = state.get("critique_score")
        thr = state.get("critic_threshold")
        if thr is not None and score is not None and float(score) < float(thr):
            errors.append(
                f"critique: overall score {score} < threshold {thr} — raise design quality"
            )
    if not errors:
        errors = [state.get("error_message") or "validation or smoke failed"]

    count = int(state.get("repair_count") or 0) + 1
    max_r = int(state.get("max_repairs") or 3)
    if count > max_r:
        return {
            "phase": "repair",
            "repair_count": count,
            "error_code": "GENERATION_FAILED",
            "error_message": f"repair budget exhausted (N={max_r})",
            "ready_for_finalize": False,
        }

    plan = state.get("plan")
    plan_json = json.dumps(plan, indent=2) if isinstance(plan, dict) else None
    messages = [
        ChatMessage(role="system", content=REPAIR_SYSTEM_PROMPT),
        ChatMessage(
            role="user",
            content=repair_user_prompt(
                vision_text=state.get("vision_text") or "",
                code=code,
                errors=errors,
                plan_json=plan_json,
            ),
        ),
    ]

    tokens = int(state.get("llm_tokens_used") or 0)
    try:
        completion = await llm.complete(messages, temperature=0.25, max_tokens=80_000)
        fixed = extract_typescript_module(completion.text)
        tokens += completion.usage.total_tokens
    except (CodegenParseError, LLMError) as exc:
        return {
            "phase": "repair",
            "repair_count": count,
            "error_code": "GENERATION_FAILED",
            "error_message": f"repair LLM failed: {exc}",
            "ready_for_finalize": False,
            "llm_tokens_used": tokens,
        }

    return {
        "phase": "repair",
        "code": fixed,
        "repair_count": count,
        "validate_ok": False,
        "smoke_ok": False,
        "validation_errors": [],
        "smoke_errors": [],
        # Reset critic so re-score happens after next smoke
        "critique": None,
        "critique_ok": False,
        "critique_score": None,
        "critique_fixes": [],
        "critique_passes": False,
        "critique_error": None,
        "error_code": None,
        "error_message": None,
        "ready_for_finalize": False,
        "llm_tokens_used": tokens,
    }
