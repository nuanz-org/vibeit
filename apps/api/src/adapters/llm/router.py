"""
Per-role model router (AM4).

Roles: plan / codegen / repair / judge / vision

Server/env may use any non-empty OpenRouter model id.
User-facing Create selection is restricted to LLM_MODELS_ALLOWED (product menu).

Request shaping (reasoning, timeouts) lives in adapters.llm.profiles.

Env (see also core.config.Settings):
  LLM_MODEL_PLAN / LLM_MODEL_CODEGEN / LLM_MODEL_REPAIR / LLM_MODEL_JUDGE / LLM_MODEL_VISION
  LLM_MODELS_ALLOWED — comma-separated OpenRouter ids for the Create model picker
  LLM_ALLOWLIST_EXTRA — merged into role candidate sets + selectable menu
  LLM_ALLOWLIST_CODEGEN — optional override of codegen candidate set
"""

from __future__ import annotations

import contextvars
import os
from typing import Any, Iterable, Literal

from adapters.llm.protocol import LLMConfigError
from adapters.llm.profiles import label_for_model

# Flash baseline — documented default / fallback.
FLASH_MODEL = "deepseek/deepseek-v4-flash"
# Back-compat alias used across the codebase.
ASAP_CODEGEN_MODEL = FLASH_MODEL

LLMRole = Literal["plan", "codegen", "repair", "judge", "vision"]
ALL_ROLES: tuple[LLMRole, ...] = ("plan", "codegen", "repair", "judge", "vision")

# Default Create menu + shootout candidates (OpenRouter ids).
_CODEGEN_CANDIDATES = frozenset(
    {
        FLASH_MODEL,
        "deepseek/deepseek-v4-pro",
        "deepseek/deepseek-chat",
        "anthropic/claude-sonnet-4.5",
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet",
        "moonshotai/kimi-k2.5",
        "moonshotai/kimi-k2",
        "google/gemini-2.5-flash",
        "google/gemini-2.5-pro",
        "google/gemini-3.6-flash",
        "openai/gpt-4.1-mini",
        "openai/gpt-4.1",
    }
)

_CHEAP_CANDIDATES = frozenset(
    {
        FLASH_MODEL,
        "deepseek/deepseek-chat",
        "google/gemini-2.5-flash",
        "google/gemini-3.6-flash",
        "openai/gpt-4.1-mini",
        "anthropic/claude-3.5-sonnet",
    }
)

_JUDGE_CANDIDATES = _CHEAP_CANDIDATES | frozenset(
    {
        "google/gemini-2.5-pro",
        "anthropic/claude-sonnet-4.5",
        "openai/gpt-4.1",
    }
)

_DEFAULT_ALLOWLISTS: dict[LLMRole, frozenset[str]] = {
    "plan": _CHEAP_CANDIDATES,
    "codegen": _CODEGEN_CANDIDATES,
    "repair": _CODEGEN_CANDIDATES,
    "judge": _JUDGE_CANDIDATES,
    "vision": _JUDGE_CANDIDATES,
}

_DEFAULT_BY_ROLE: dict[LLMRole, str] = {
    "plan": FLASH_MODEL,
    "codegen": FLASH_MODEL,
    "repair": FLASH_MODEL,
    "judge": FLASH_MODEL,
    "vision": FLASH_MODEL,
}

# Preferred Create menu order when LLM_MODELS_ALLOWED is unset.
_DEFAULT_SELECTABLE_ORDER: tuple[str, ...] = (
    FLASH_MODEL,
    "google/gemini-3.6-flash",
    "google/gemini-2.5-flash",
    "anthropic/claude-sonnet-4.5",
    "openai/gpt-4.1-mini",
    "deepseek/deepseek-v4-pro",
)

# Per-async-task overrides for eval A/B sweeps (role → model id).
_role_overrides: contextvars.ContextVar[dict[str, str] | None] = contextvars.ContextVar(
    "llm_role_overrides",
    default=None,
)


def _parse_csv_models(raw: str) -> frozenset[str]:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return frozenset(parts)


def _parse_csv_models_ordered(raw: str) -> tuple[str, ...]:
    seen: set[str] = set()
    out: list[str] = []
    for p in raw.split(","):
        mid = p.strip()
        if not mid or mid in seen:
            continue
        seen.add(mid)
        out.append(mid)
    return tuple(out)


def _extra_allowlist() -> frozenset[str]:
    return _parse_csv_models(os.getenv("LLM_ALLOWLIST_EXTRA", ""))


def allowlist_for_role(role: LLMRole) -> frozenset[str]:
    """
    Return documented candidate models for a role (advisory + menu source).

    Env role models may still use ids outside this set; user selection cannot.
    """
    extra = _extra_allowlist()
    env_key = f"LLM_ALLOWLIST_{role.upper()}"
    raw = os.getenv(env_key, "").strip()
    if raw:
        base = _parse_csv_models(raw)
    else:
        base = _DEFAULT_ALLOWLISTS[role]
    # Flash always stays as documented fallback
    return frozenset(base | extra | {FLASH_MODEL})


def all_allowed_models() -> frozenset[str]:
    """Union of documented candidate sets."""
    models: set[str] = set()
    for role in ALL_ROLES:
        models |= set(allowlist_for_role(role))
    return frozenset(models)


def selectable_models() -> tuple[str, ...]:
    """
    Ordered OpenRouter ids the Create UI may offer.

    LLM_MODELS_ALLOWED=comma,list — full override of the menu.
    Otherwise: default order ∩ known candidates, plus LLM_ALLOWLIST_EXTRA.
    """
    raw = os.getenv("LLM_MODELS_ALLOWED", "").strip()
    if raw:
        ordered = _parse_csv_models_ordered(raw)
        return ordered if ordered else (FLASH_MODEL,)

    extra = _extra_allowlist()
    known = all_allowed_models() | extra
    ordered: list[str] = []
    seen: set[str] = set()
    for mid in _DEFAULT_SELECTABLE_ORDER:
        if mid in known and mid not in seen:
            ordered.append(mid)
            seen.add(mid)
    for mid in sorted(known):
        if mid not in seen:
            ordered.append(mid)
            seen.add(mid)
    return tuple(ordered) if ordered else (FLASH_MODEL,)


def selectable_model_set() -> frozenset[str]:
    return frozenset(selectable_models())


def assert_selectable_model(model: str) -> str:
    """Validate a user-selected Create model against the product menu."""
    mid = (model or "").strip()
    if not mid:
        raise LLMConfigError("empty model id")
    allowed = selectable_model_set()
    if mid not in allowed:
        sample = ", ".join(sorted(allowed)[:8])
        more = "" if len(allowed) <= 8 else f" … (+{len(allowed) - 8} more)"
        raise LLMConfigError(
            f"model {mid!r} is not in LLM_MODELS_ALLOWED. "
            f"Allowed (sample): {sample}{more}."
        )
    return mid


def public_model_catalog(*, default_model: str | None = None) -> dict[str, Any]:
    """
    Wire shape for GET /api/v1/llm/models.

    {
      "models": [{"id", "label", "default"}],
      "defaultModel": "..."
    }
    """
    menu = selectable_models()
    preferred = (default_model or "").strip() or env_model_for_role("codegen")
    if preferred not in menu:
        preferred = menu[0]
    models = [
        {
            "id": mid,
            "label": label_for_model(mid),
            "default": mid == preferred,
        }
        for mid in menu
    ]
    return {"models": models, "defaultModel": preferred}


def assert_model_for_role(model: str, role: LLMRole) -> str:
    """
    Normalize a model id for a role.

    Any non-empty OpenRouter model id is accepted for server/env roles.
    """
    mid = (model or "").strip()
    if not mid:
        raise LLMConfigError(f"empty model id for role {role!r}")
    if role not in ALL_ROLES:
        raise LLMConfigError(f"unknown LLM role {role!r}")
    return mid


def assert_allowed_model(model: str) -> str:
    """
    Normalize a model id for client default / free complete().

    Any non-empty OpenRouter model id is accepted (profiles shape the request).
    """
    mid = (model or "").strip()
    if not mid:
        raise LLMConfigError("empty model id")
    return mid


def default_model_for_role(role: LLMRole) -> str:
    return _DEFAULT_BY_ROLE[role]


def env_model_for_role(role: LLMRole) -> str:
    """Read LLM_MODEL_* env (or default Flash). Does not validate."""
    key = f"LLM_MODEL_{role.upper()}"
    # Legacy aliases
    legacy = {
        "codegen": ("LLM_CODEGEN_MODEL", "LLM_DEFAULT_MODEL"),
    }
    raw = os.getenv(key, "").strip()
    if not raw and role in legacy:
        for alt in legacy[role]:
            raw = os.getenv(alt, "").strip()
            if raw:
                break
    return raw or default_model_for_role(role)


def resolve_model_for_role(
    role: LLMRole,
    *,
    configured: str | None = None,
) -> str:
    """
    Map role → OpenRouter model id.

    Priority: context overrides → configured arg → env/default.
    Any non-empty model id is accepted.
    """
    if role not in ALL_ROLES:
        raise LLMConfigError(f"unknown LLM role {role!r}")

    overrides = _role_overrides.get()
    if overrides and role in overrides and overrides[role]:
        return assert_model_for_role(overrides[role], role)

    mid = (configured or "").strip() or env_model_for_role(role)
    return assert_model_for_role(mid, role)


def set_role_overrides(overrides: dict[str, str] | None) -> contextvars.Token:
    """
    Set per-role model overrides for the current context (eval A/B + job model).

    Returns a Token for reset_role_overrides.
    """
    cleaned: dict[str, str] | None = None
    if overrides:
        cleaned = {}
        for k, v in overrides.items():
            role = k.strip().lower()
            if role not in ALL_ROLES:
                raise LLMConfigError(f"unknown role in override: {k!r}")
            cleaned[role] = assert_model_for_role(v, role)  # type: ignore[arg-type]
    return _role_overrides.set(cleaned)


def reset_role_overrides(token: contextvars.Token) -> None:
    _role_overrides.reset(token)


def validate_configured_models(
    models: dict[str, str] | None = None,
) -> dict[LLMRole, str]:
    """
    Resolve role → model map (startup). Returns resolved map.

    Raises LLMConfigError only for empty model ids or unknown roles.
    """
    resolved: dict[LLMRole, str] = {}
    src = models or {r: env_model_for_role(r) for r in ALL_ROLES}
    for role in ALL_ROLES:
        mid = src.get(role) or env_model_for_role(role)
        resolved[role] = assert_model_for_role(mid, role)
    return resolved


def parse_role_model_pairs(specs: Iterable[str]) -> dict[str, str]:
    """
    Parse CLI pairs like 'codegen=anthropic/claude-sonnet-4.5'.
    """
    out: dict[str, str] = {}
    for raw in specs:
        s = raw.strip()
        if not s:
            continue
        if "=" not in s:
            raise LLMConfigError(
                f"expected role=model, got {raw!r} "
                f"(example: codegen=deepseek/deepseek-v4-flash)"
            )
        role, model = s.split("=", 1)
        role = role.strip().lower()
        model = model.strip()
        if role not in ALL_ROLES:
            raise LLMConfigError(
                f"unknown role {role!r}; choose from {', '.join(ALL_ROLES)}"
            )
        out[role] = assert_model_for_role(model, role)  # type: ignore[arg-type]
    return out
