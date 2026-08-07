"""
Critic node (AM3) — scores tool quality after gates pass.

Invariant: judge failure never fails the job hard. Parse/LLM errors set
critique_ok=False and leave ready_for_finalize to the runner (gates-only path).
"""

from __future__ import annotations

import os
from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.critique_parse import (
    DEFAULT_CRITIC_THRESHOLD,
    CritiqueParseError,
    parse_critique,
)
from agent.prompts.critique import CRITIQUE_SYSTEM_PROMPT, critique_user_prompt
from agent.state import CreateGraphState
from core.config import get_settings


def critic_threshold() -> float:
    raw = os.getenv("VIBEIT_CRITIC_THRESHOLD", "").strip()
    if raw:
        try:
            return float(raw)
        except ValueError:
            pass
    return DEFAULT_CRITIC_THRESHOLD


def critic_enforced() -> bool:
    """
    When false (default), scores are recorded but low scores do not block finalize.
    Set VIBEIT_CRITIC_ENFORCED=1 after human calibration (AM3d).
    """
    return os.getenv("VIBEIT_CRITIC_ENFORCED", "").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


async def critique_node(
    state: CreateGraphState,
    *,
    llm: LLMClient | None,
) -> dict[str, Any]:
    """
    Run critic after smoke_ok.

    Returns partial state updates (does not set ready_for_finalize — runner decides).
    """
    threshold = critic_threshold()
    enforced = critic_enforced()
    base: dict[str, Any] = {
        "phase": "critique",
        "critic_threshold": threshold,
        "critic_enforced": enforced,
    }

    if llm is None:
        return {
            **base,
            "critique_ok": False,
            "critique_error": "critic skipped: no LLM",
            "critique": None,
            "critique_score": None,
            "critique_fixes": [],
        }

    code = state.get("code") or ""
    if not code.strip():
        return {
            **base,
            "critique_ok": False,
            "critique_error": "critic skipped: empty code",
            "critique": None,
            "critique_score": None,
            "critique_fixes": [],
        }

    plan = state.get("plan") if isinstance(state.get("plan"), dict) else None
    messages = [
        ChatMessage(role="system", content=CRITIQUE_SYSTEM_PROMPT),
        ChatMessage(
            role="user",
            content=critique_user_prompt(
                vision_text=state.get("vision_text") or "",
                plan=plan,
                code=code,
                smoke_variance=state.get("smoke_variance"),
                screenshot_path=state.get("smoke_screenshot_path"),
            ),
        ),
    ]

    tokens = int(state.get("llm_tokens_used") or 0)
    try:
        judge_model = resolve_model_for_role(
            "judge", configured=get_settings().llm_model_judge
        )
        completion = await llm.complete(
            messages,
            model=judge_model,
            temperature=0.2,
            max_tokens=4_000,
        )
        tokens += completion.usage.total_tokens
        critique = parse_critique(completion.text)
    except (CritiqueParseError, LLMError, TypeError, ValueError, RuntimeError) as exc:
        return {
            **base,
            "critique_ok": False,
            "critique_error": f"critic failed: {exc}",
            "critique": None,
            "critique_score": None,
            "critique_fixes": [],
            "llm_tokens_used": tokens,
        }
    except Exception as exc:  # noqa: BLE001 — judge never hard-fails the job
        return {
            **base,
            "critique_ok": False,
            "critique_error": f"critic failed: {exc}",
            "critique": None,
            "critique_score": None,
            "critique_fixes": [],
            "llm_tokens_used": tokens,
        }

    overall = float(critique["overall"])
    fixes = list(critique.get("fixes") or [])
    passes = overall >= threshold

    return {
        **base,
        "critique_ok": True,
        "critique_error": None,
        "critique": critique,
        "critique_score": overall,
        "critique_fixes": fixes,
        "critique_passes": passes,
        "llm_tokens_used": tokens,
    }
