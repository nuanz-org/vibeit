"""Codegen node — plan + vision → canvas2d TypeScript module (M3d)."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from agent.codegen_parse import CodegenParseError, extract_typescript_module
from agent.prompts.create_codegen import CODEGEN_SYSTEM_PROMPT, codegen_user_prompt
from agent.state import CreateGraphState


async def codegen_node(state: CreateGraphState, *, llm: LLMClient) -> dict[str, Any]:
    """
    Call LLM for tool source. Fixture path leaves code to load_fixture node.
    """
    if state.get("use_fixture_code"):
        return {"phase": "codegen"}

    plan = state.get("plan")
    if not isinstance(plan, dict):
        return {
            "phase": "codegen",
            "code": "",
            "error_code": "GENERATION_FAILED",
            "error_message": "codegen requires a plan",
            "ready_for_finalize": False,
        }

    vision = (state.get("vision_text") or "").strip()
    messages = [
        ChatMessage(role="system", content=CODEGEN_SYSTEM_PROMPT),
        ChatMessage(
            role="user",
            content=codegen_user_prompt(vision_text=vision, plan=plan),
        ),
    ]

    try:
        completion = await llm.complete(messages, temperature=0.4, max_tokens=80_000)
        code = extract_typescript_module(completion.text)
    except (CodegenParseError, LLMError) as exc:
        return {
            "phase": "codegen",
            "code": "",
            "error_code": "GENERATION_FAILED",
            "error_message": f"codegen failed: {exc}",
            "ready_for_finalize": False,
        }

    usage = completion.usage
    return {
        "phase": "codegen",
        "code": code,
        "target": "canvas2d",
        "error_code": None,
        "error_message": None,
        "llm_tokens_used": (state.get("llm_tokens_used") or 0) + usage.total_tokens,  # type: ignore[operator]
    }
