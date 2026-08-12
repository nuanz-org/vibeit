"""
Capability-agent refine node: context → ops plan → deterministic apply.
"""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.nodes.refine_patch import refine_code_patch_node
from agent.prompts.refine_capability import (
    CAPABILITY_SYSTEM_PROMPT,
    capability_user_prompt,
)
from agent.state import CreateGraphState
from core.config import get_settings
from services.refine_ops import (
    RefineOpError,
    apply_capability_ops,
    build_brik_style_explain,
    parse_capability_plan,
)


async def refine_capability_node(
    state: CreateGraphState,
    *,
    llm: LLMClient,
) -> dict[str, Any]:
    """
    Primary refine path: structured controller/value ops (+ optional code patch).
    """
    pack = state.get("refine_context")
    if not isinstance(pack, dict):
        pack = {
            "userMessage": state.get("chat_message") or state.get("vision_text") or "",
            "paramSchema": state.get("base_param_schema") or [],
            "defaultParams": state.get("base_default_params") or {},
            "draftParams": state.get("draft_params") or {},
            "effectiveParams": state.get("base_default_params") or {},
            "paramNames": [],
            "chatHistory": [],
            "code": state.get("base_code") or state.get("code") or "",
        }

    base_code = state.get("base_code") or state.get("code") or pack.get("code") or ""
    schema = pack.get("paramSchema") or state.get("base_param_schema") or []
    defaults = pack.get("defaultParams") or state.get("base_default_params") or {}
    draft = pack.get("draftParams") or state.get("draft_params") or {}
    if not isinstance(defaults, dict):
        defaults = {}
    if not isinstance(draft, dict):
        draft = {}

    messages = [
        ChatMessage(role="system", content=CAPABILITY_SYSTEM_PROMPT),
        ChatMessage(role="user", content=capability_user_prompt(context_pack=pack)),
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
            max_tokens=4_096,
        )
        tokens += completion.usage.total_tokens
        plan = parse_capability_plan(completion.text)
    except (RefineOpError, LLMError) as exc:
        return {
            "phase": "codegen",
            "patch_mode": "capability",
            "error_code": "GENERATION_FAILED",
            "error_message": f"capability plan failed: {exc}",
            "ready_for_finalize": False,
            "llm_tokens_used": tokens,
        }

    ops = plan["ops"]
    explain = plan["explain"]
    if not ops:
        return {
            "phase": "codegen",
            "patch_mode": "capability",
            "error_code": "GENERATION_FAILED",
            "error_message": explain or "no ops to apply",
            "explain": explain,
            "ready_for_finalize": False,
            "llm_tokens_used": tokens,
        }

    try:
        applied = apply_capability_ops(
            ops=ops,
            code=str(base_code),
            param_schema=schema if isinstance(schema, list) else [],
            default_params=defaults,
            draft_params=draft,
        )
    except RefineOpError as exc:
        return {
            "phase": "codegen",
            "patch_mode": "capability",
            "error_code": "GENERATION_FAILED",
            "error_message": f"capability apply failed: {exc}",
            "explain": explain,
            "ready_for_finalize": False,
            "llm_tokens_used": tokens,
        }

    # Prefer Brik-style explain from applied ops; keep LLM text as soft fallback
    explain = build_brik_style_explain(
        ops_applied=list(applied.get("ops_applied") or []),
        param_schema=applied.get("param_schema"),
        fallback=explain or applied.get("explain"),
    )

    code = applied["code"]
    # Optional structural patch
    patch_instructions = applied.get("patch_instructions") or []
    if patch_instructions:
        instr = "\n".join(patch_instructions)
        patch_state = {
            **state,
            "chat_message": instr,
            "base_code": code,
            "code": code,
            "base_default_params": applied["default_params"],
            "base_param_schema": applied["param_schema"],
            "llm_tokens_used": tokens,
        }
        patch_out = await refine_code_patch_node(patch_state, llm=llm)
        tokens = int(patch_out.get("llm_tokens_used") or tokens)
        if patch_out.get("error_code"):
            return {
                **patch_out,
                "explain": explain,
                "ops_applied": applied.get("ops_applied"),
                "draft_params_patch": applied.get("draft_params"),
            }
        code = patch_out.get("code") or code
        # Keep schema/defaults from meta ops (authoritative for bounds)
        applied["needs_version"] = True

    # Pure draft-only: still finalize success path with flags
    return {
        "phase": "codegen",
        "patch_mode": "capability",
        "code": code,
        "param_schema": applied["param_schema"],
        "default_params": applied["default_params"],
        "draft_params_patch": applied["draft_params"],
        "ops_applied": applied["ops_applied"],
        "explain": explain,
        "needs_version": bool(applied.get("needs_version")),
        "capability_changed": bool(applied.get("changed")),
        "base_code": base_code,
        "plan": state.get("plan") or state.get("base_plan"),
        "asset_slots": state.get("base_asset_slots") or state.get("asset_slots"),
        "validate_ok": False,
        "smoke_ok": False,
        "validation_errors": [],
        "smoke_errors": [],
        "error_code": None,
        "error_message": None,
        "ready_for_finalize": False,
        "llm_tokens_used": tokens,
        "used_param_patch_only": not bool(patch_instructions)
        and not bool(applied.get("needs_version")),
    }
