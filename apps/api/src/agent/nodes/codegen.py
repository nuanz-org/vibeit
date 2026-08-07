"""Codegen node — plan + vision + golden exemplars → canvas2d module (M3d + AM1)."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from core.config import get_settings
from agent.codegen_parse import CodegenParseError, extract_typescript_module
from agent.golden.retrieve import retrieve_goldens
from agent.prompts.create_codegen import CODEGEN_SYSTEM_PROMPT, codegen_user_prompt
from agent.state import CreateGraphState


async def codegen_node(state: CreateGraphState, *, llm: LLMClient) -> dict[str, Any]:
    """
    Call LLM for tool source. Fixture path leaves code to load_fixture node.
    Injects 1–2 golden exemplars from the plan tags (AM1 boilerplate retrieve).
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

    exemplars: list[dict[str, Any]] = []
    try:
        retrieved = retrieve_goldens(plan, limit=2)
        exemplars = [
            {
                "id": g.id,
                "description": g.description,
                "source": g.source,
            }
            for g in retrieved
        ]
    except OSError:
        # Goldens missing on disk should not hard-fail codegen
        exemplars = []

    messages = [
        ChatMessage(role="system", content=CODEGEN_SYSTEM_PROMPT),
        ChatMessage(
            role="user",
            content=codegen_user_prompt(
                vision_text=vision,
                plan=plan,
                exemplars=exemplars or None,
                style_notes=state.get("style_notes")
                if isinstance(state.get("style_notes"), dict)
                else None,
            ),
        ),
    ]

    try:
        codegen_model = resolve_model_for_role(
            "codegen", configured=get_settings().llm_model_codegen
        )
        completion = await llm.complete(
            messages,
            model=codegen_model,
            temperature=0.4,
            max_tokens=80_000,
        )
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
    tgt = "canvas2d"
    if isinstance(plan, dict) and isinstance(plan.get("target"), str):
        tgt = plan["target"]
    return {
        "phase": "codegen",
        "code": code,
        "target": tgt,
        "error_code": None,
        "error_message": None,
        "llm_tokens_used": (state.get("llm_tokens_used") or 0) + usage.total_tokens,  # type: ignore[operator]
        "golden_ids": [e["id"] for e in exemplars],
    }
