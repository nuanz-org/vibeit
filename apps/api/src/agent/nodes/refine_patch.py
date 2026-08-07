"""
AM7a — Control refine patch nodes: route → param patch or code patch.
"""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.patch_parse import (
    PatchParseError,
    apply_param_updates,
    parse_code_patch,
    parse_param_patch,
    update_plan_defaults,
)
from agent.prompts.refine_code import CODE_PATCH_SYSTEM_PROMPT, code_patch_user_prompt
from agent.prompts.refine_param import PARAM_PATCH_SYSTEM_PROMPT, param_patch_user_prompt
from agent.refine_route import route_rationale, route_refine_chat
from agent.state import CreateGraphState
from core.config import get_settings


def refine_route_node(state: CreateGraphState) -> dict[str, Any]:
    """Heuristic patch-mode routing (no LLM)."""
    chat = (state.get("chat_message") or state.get("vision_text") or "").strip()
    mode = route_refine_chat(chat)
    # Allow explicit override from state (tests / evals)
    forced = state.get("patch_mode")
    if forced in ("param", "code"):
        mode = forced  # type: ignore[assignment]
    return {
        "phase": "plan",
        "patch_mode": mode,
        "patch_route_rationale": route_rationale(chat, mode),
        "chat_message": chat,
        "error_code": None,
        "error_message": None,
    }


async def refine_param_patch_node(
    state: CreateGraphState,
    *,
    llm: LLMClient,
) -> dict[str, Any]:
    """Cheap LLM: JSON param updates only. Keeps base code."""
    chat = (state.get("chat_message") or state.get("vision_text") or "").strip()
    base_code = state.get("base_code") or state.get("code") or ""
    defaults = state.get("base_default_params")
    if not isinstance(defaults, dict):
        defaults = state.get("default_params") if isinstance(state.get("default_params"), dict) else {}
    schema = state.get("base_param_schema")
    if not isinstance(schema, list):
        schema = []
    plan = state.get("plan") if isinstance(state.get("plan"), dict) else state.get("base_plan")
    if not isinstance(plan, dict):
        plan = None

    messages = [
        ChatMessage(role="system", content=PARAM_PATCH_SYSTEM_PROMPT),
        ChatMessage(
            role="user",
            content=param_patch_user_prompt(
                chat_message=chat,
                default_params=defaults,
                param_schema=schema,
                plan=plan,
            ),
        ),
    ]

    tokens = int(state.get("llm_tokens_used") or 0)
    try:
        model = resolve_model_for_role(
            "plan", configured=get_settings().llm_model_plan
        )
        completion = await llm.complete(
            messages,
            model=model,
            temperature=0.2,
            max_tokens=2_048,
        )
        tokens += completion.usage.total_tokens
        parsed = parse_param_patch(completion.text)
    except (PatchParseError, LLMError) as exc:
        return {
            "phase": "codegen",
            "patch_mode": "param",
            "error_code": "GENERATION_FAILED",
            "error_message": f"param patch failed: {exc}",
            "ready_for_finalize": False,
            "llm_tokens_used": tokens,
        }

    updates = parsed["updates"]
    merged, rejected = apply_param_updates(
        default_params=defaults,
        param_schema=schema,
        updates=updates,
    )
    if not any(k in merged and merged[k] != defaults.get(k) for k in updates):
        # No accepted changes — fall through message for repair path
        if rejected and not any(k in defaults for k in updates):
            return {
                "phase": "codegen",
                "patch_mode": "param",
                "error_code": "GENERATION_FAILED",
                "error_message": (
                    "param patch rejected all keys "
                    f"(unknown: {', '.join(rejected) or 'none'}); "
                    "request may need code patch"
                ),
                "ready_for_finalize": False,
                "llm_tokens_used": tokens,
                "param_patch": {"updates": updates, "rejected": rejected},
            }

    new_plan = update_plan_defaults(plan, merged)
    return {
        "phase": "codegen",
        "patch_mode": "param",
        "code": base_code,
        "default_params": merged,
        "base_default_params": defaults,
        "param_schema": schema,
        "plan": new_plan if new_plan is not None else plan,
        "param_patch": {
            "updates": {k: merged[k] for k in updates if k in merged and k not in rejected},
            "rejected": rejected,
            "rationale": parsed.get("rationale"),
        },
        "validate_ok": False,
        "smoke_ok": False,
        "validation_errors": [],
        "smoke_errors": [],
        "error_code": None,
        "error_message": None,
        "ready_for_finalize": False,
        "llm_tokens_used": tokens,
    }


async def refine_code_patch_node(
    state: CreateGraphState,
    *,
    llm: LLMClient,
) -> dict[str, Any]:
    """Codegen-role LLM: minimal full-module patch."""
    chat = (state.get("chat_message") or state.get("vision_text") or "").strip()
    base_code = state.get("base_code") or state.get("code") or ""
    if not base_code.strip():
        return {
            "phase": "codegen",
            "patch_mode": "code",
            "error_code": "GENERATION_FAILED",
            "error_message": "code patch requires base source",
            "ready_for_finalize": False,
        }

    plan = state.get("plan") if isinstance(state.get("plan"), dict) else state.get("base_plan")
    if not isinstance(plan, dict):
        plan = None
    defaults = state.get("base_default_params")
    if not isinstance(defaults, dict):
        defaults = None

    messages = [
        ChatMessage(role="system", content=CODE_PATCH_SYSTEM_PROMPT),
        ChatMessage(
            role="user",
            content=code_patch_user_prompt(
                chat_message=chat,
                code=base_code,
                plan=plan,
                default_params=defaults,
            ),
        ),
    ]

    tokens = int(state.get("llm_tokens_used") or 0)
    try:
        model = resolve_model_for_role(
            "codegen", configured=get_settings().llm_model_codegen
        )
        completion = await llm.complete(
            messages,
            model=model,
            temperature=0.35,
            max_tokens=80_000,
        )
        tokens += completion.usage.total_tokens
        code = parse_code_patch(completion.text)
    except (PatchParseError, LLMError) as exc:
        return {
            "phase": "codegen",
            "patch_mode": "code",
            "code": base_code,
            "error_code": "GENERATION_FAILED",
            "error_message": f"code patch failed: {exc}",
            "ready_for_finalize": False,
            "llm_tokens_used": tokens,
        }

    return {
        "phase": "codegen",
        "patch_mode": "code",
        "code": code,
        "plan": plan,
        "default_params": defaults if defaults is not None else state.get("default_params"),
        "param_schema": state.get("base_param_schema") or state.get("param_schema"),
        "validate_ok": False,
        "smoke_ok": False,
        "validation_errors": [],
        "smoke_errors": [],
        "critique": None,
        "critique_ok": False,
        "critique_score": None,
        "critique_fixes": [],
        "critique_passes": False,
        "error_code": None,
        "error_message": None,
        "ready_for_finalize": False,
        "llm_tokens_used": tokens,
    }


def refine_fallback_to_code(state: CreateGraphState) -> dict[str, Any]:
    """Mark state to re-run as code patch after failed param path."""
    return {
        "patch_mode": "code",
        "patch_route_rationale": "code_patch: fallback after param patch failure",
        "error_code": None,
        "error_message": None,
        "ready_for_finalize": False,
    }
