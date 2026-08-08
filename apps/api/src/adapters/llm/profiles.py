"""
Per-model OpenRouter request profiles.

Maps OpenRouter model ids → request knobs (especially `reasoning`).
Used by OpenRouterLLMClient so DeepSeek can disable thinking while
Gemini 3.x (mandatory reasoning) enables it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class ModelProfile:
    """Request-shaping profile for one OpenRouter model id."""

    model_id: str
    label: str
    # None → omit `reasoning` from the payload entirely.
    # dict → send as payload["reasoning"] (e.g. {"effort":"none"} or {"enabled": True}).
    reasoning: dict[str, Any] | None
    # Optional override of client default timeout for this model.
    timeout_seconds: float | None = None


# Explicit profiles for models we ship in the Create menu / defaults.
_PROFILES: dict[str, ModelProfile] = {
    "deepseek/deepseek-v4-flash": ModelProfile(
        model_id="deepseek/deepseek-v4-flash",
        label="DeepSeek V4 Flash",
        # Without this, Flash often burns max_tokens on reasoning and returns empty content.
        reasoning={"effort": "none"},
    ),
    "deepseek/deepseek-v4-pro": ModelProfile(
        model_id="deepseek/deepseek-v4-pro",
        label="DeepSeek V4 Pro",
        reasoning={"effort": "none"},
    ),
    "deepseek/deepseek-chat": ModelProfile(
        model_id="deepseek/deepseek-chat",
        label="DeepSeek Chat",
        reasoning={"effort": "none"},
    ),
    "google/gemini-3.6-flash": ModelProfile(
        model_id="google/gemini-3.6-flash",
        label="Gemini 3.6 Flash",
        # Mandatory-reasoning models reject effort:"none".
        reasoning={"enabled": True},
        timeout_seconds=120.0,
    ),
    "google/gemini-2.5-flash": ModelProfile(
        model_id="google/gemini-2.5-flash",
        label="Gemini 2.5 Flash",
        reasoning=None,
    ),
    "google/gemini-2.5-pro": ModelProfile(
        model_id="google/gemini-2.5-pro",
        label="Gemini 2.5 Pro",
        reasoning=None,
        timeout_seconds=120.0,
    ),
    "anthropic/claude-sonnet-4.5": ModelProfile(
        model_id="anthropic/claude-sonnet-4.5",
        label="Claude Sonnet 4.5",
        reasoning=None,
    ),
    "anthropic/claude-sonnet-4": ModelProfile(
        model_id="anthropic/claude-sonnet-4",
        label="Claude Sonnet 4",
        reasoning=None,
    ),
    "anthropic/claude-3.5-sonnet": ModelProfile(
        model_id="anthropic/claude-3.5-sonnet",
        label="Claude 3.5 Sonnet",
        reasoning=None,
    ),
    "anthropic/claude-sonnet-5": ModelProfile(
        model_id="anthropic/claude-sonnet-5",
        label="Claude Sonnet 5",
        reasoning={"enabled": True},
        timeout_seconds=120.0,
    ),
    "openai/gpt-4.1": ModelProfile(
        model_id="openai/gpt-4.1",
        label="GPT-4.1",
        reasoning=None,
    ),
    "openai/gpt-4.1-mini": ModelProfile(
        model_id="openai/gpt-4.1-mini",
        label="GPT-4.1 Mini",
        reasoning=None,
    ),
    "openai/gpt-5.6-luna-pro": ModelProfile(
        model_id="openai/gpt-5.6-luna-pro",
        label="GPT-5.6 Luna Pro",
        reasoning={"enabled": True},
        timeout_seconds=120.0,
    ),
    "moonshotai/kimi-k2.5": ModelProfile(
        model_id="moonshotai/kimi-k2.5",
        label="Kimi K2.5",
        reasoning=None,
    ),
    "moonshotai/kimi-k2": ModelProfile(
        model_id="moonshotai/kimi-k2",
        label="Kimi K2",
        reasoning=None,
    ),
    "moonshotai/kimi-k3": ModelProfile(
        model_id="moonshotai/kimi-k3",
        label="Kimi K3",
        reasoning={"enabled": True},
        timeout_seconds=120.0,
    ),
    "meta/muse-spark-1.2": ModelProfile(
        model_id="meta/muse-spark-1.2",
        label="Muse Spark 1.2",
        reasoning={"effort": "medium"},
        timeout_seconds=120.0,
    ),
    "x-ai/grok-4.5": ModelProfile(
        model_id="x-ai/grok-4.5",
        label="Grok 4.5",
        reasoning={"enabled": True},
        timeout_seconds=120.0,
    ),
    "z-ai/glm-5.2": ModelProfile(
        model_id="z-ai/glm-5.2",
        label="GLM 5.2",
        reasoning={"enabled": True},
        timeout_seconds=120.0,
    ),
    "openrouter/fusion": ModelProfile(
        model_id="openrouter/fusion",
        label="OpenRouter",
        # Fusion router: omit reasoning; upstream models shape their own.
        reasoning=None,
    ),
}


def _heuristic_profile(model_id: str) -> ModelProfile:
    """
    Best-effort profile when the model is not in the explicit table.

    Family rules (OpenRouter as of 2026):
    - DeepSeek V4-class: prefer effort none (avoid empty content).
    - Gemini 3.x: reasoning mandatory → enabled true, never none.
    - Everything else: omit reasoning (safer than wrong knobs).
    """
    mid = model_id.strip()
    lower = mid.lower()
    label = mid.split("/", 1)[-1].replace("-", " ").title() if mid else mid

    if lower.startswith("deepseek/"):
        return ModelProfile(
            model_id=mid,
            label=label,
            reasoning={"effort": "none"},
        )
    if "gemini-3" in lower or lower.startswith("google/gemini-3"):
        return ModelProfile(
            model_id=mid,
            label=label,
            reasoning={"enabled": True},
            timeout_seconds=120.0,
        )
    return ModelProfile(model_id=mid, label=label, reasoning=None)


def profile_for_model(model_id: str) -> ModelProfile:
    """Resolve request profile for an OpenRouter model id."""
    mid = (model_id or "").strip()
    if not mid:
        return ModelProfile(model_id="", label="(empty)", reasoning=None)
    known = _PROFILES.get(mid)
    if known is not None:
        return known
    return _heuristic_profile(mid)


def reasoning_payload_for_model(model_id: str) -> dict[str, Any] | None:
    """
    Value for OpenRouter `reasoning` field, or None to omit the field.

    Example Gemini:
      {"enabled": true}
    Example DeepSeek Flash:
      {"effort": "none"}
    """
    return profile_for_model(model_id).reasoning


def label_for_model(model_id: str) -> str:
    return profile_for_model(model_id).label
