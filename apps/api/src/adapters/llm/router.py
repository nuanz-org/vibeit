"""
Model router (M3b) — ASAP path is a single model only.

deepseek/deepseek-v4-flash for all Create codegen / plan / repair calls.
Vision / alternate models are deferred to M4.
"""

from __future__ import annotations

from typing import Literal

from adapters.llm.openrouter import ASAP_CODEGEN_MODEL, assert_allowed_model

LLMRole = Literal["codegen", "plan", "repair"]


def resolve_model_for_role(role: LLMRole, *, configured_default: str | None = None) -> str:
    """
    Map agent role → OpenRouter model id.

    All roles resolve to deepseek/deepseek-v4-flash on the ASAP path.
    """
    _ = role  # reserved for multi-model routing later (M4+)
    default = configured_default or ASAP_CODEGEN_MODEL
    return assert_allowed_model(default)
