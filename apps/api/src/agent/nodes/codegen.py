"""Codegen node — plan + vision + golden exemplars → canvas2d module (M3d + AM1)."""

from __future__ import annotations

from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from core.config import get_settings
from agent.codegen_parse import CodegenParseError, extract_typescript_module
from agent.golden.index import (
    SETUP_SHELL_DESCRIPTION,
    SETUP_SHELL_ID,
    golden_by_id,
    load_golden_source,
    load_setup_shell,
)
from agent.golden.retrieve import retrieve_goldens
from agent.prompts.create_codegen import codegen_system_prompt, codegen_user_prompt
from agent.state import CreateGraphState
from agent.style_registry import style_for_plan, style_lock_block


def style_exemplars(look: dict[str, Any], typ: dict[str, Any] | None) -> list[dict[str, Any]]:
    """
    Reference code for a locked style: goldens the style names, else the neutral setup shell.

    Tag-matched goldens are skipped on purpose — their own look (mostly dark / glow)
    fights the STYLE LOCK.
    """
    def _load(ids: list[Any]) -> list[dict[str, Any]]:
        found: list[dict[str, Any]] = []
        for gid in ids:
            entry = golden_by_id(str(gid))
            if entry is None:
                continue
            try:
                found.append({"id": entry.id, "description": entry.description, "source": load_golden_source(entry)})
            except OSError:
                continue
        return found

    out = _load(list(look.get("goldens") or []))
    if not out:
        try:
            out.append({"id": SETUP_SHELL_ID, "description": SETUP_SHELL_DESCRIPTION, "source": load_setup_shell()})
        except OSError:
            pass
    out += _load(list((typ or {}).get("goldens") or []))
    return out[:2]


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

    look, typ = style_for_plan(plan)
    style_lock = style_lock_block(look, typ) if look else None

    exemplars: list[dict[str, Any]] = []
    if look is not None:
        exemplars = style_exemplars(look, typ)
    else:
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

    clarify_result = (
        state.get("clarify_result")
        if isinstance(state.get("clarify_result"), dict)
        else None
    )
    plan_target = "canvas2d"
    if isinstance(plan.get("target"), str) and plan["target"].strip():
        plan_target = plan["target"].strip()
    messages = [
        ChatMessage(role="system", content=codegen_system_prompt(plan_target)),
        ChatMessage(
            role="user",
            content=codegen_user_prompt(
                vision_text=vision,
                plan=plan,
                exemplars=exemplars or None,
                style_notes=state.get("style_notes")
                if isinstance(state.get("style_notes"), dict)
                else None,
                clarify_result=clarify_result,
                style_lock=style_lock,
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
