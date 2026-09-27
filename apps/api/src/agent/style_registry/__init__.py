"""Style registry — locked visual styles the Create agent must follow."""

from agent.style_registry.apply import apply_style_to_plan, style_for_plan
from agent.style_registry.lint import lint_style, lint_style_for_plan
from agent.style_registry.prompt_block import (
    STYLE_QUESTION_ID,
    plan_style_block,
    style_lock_block,
    style_question,
)
from agent.style_registry.registry import (
    StyleRegistryError,
    active_styles,
    get_style,
    load_registry,
    registry_version,
    style_ids,
    style_lock_enabled,
    validate_registry,
)
from agent.style_registry.select import (
    StyleChoice,
    choose_styles,
    explicit_style,
    shortlist_styles,
)

__all__ = [
    "STYLE_QUESTION_ID",
    "StyleChoice",
    "StyleRegistryError",
    "active_styles",
    "apply_style_to_plan",
    "choose_styles",
    "explicit_style",
    "get_style",
    "lint_style",
    "lint_style_for_plan",
    "load_registry",
    "plan_style_block",
    "registry_version",
    "shortlist_styles",
    "style_for_plan",
    "style_ids",
    "style_lock_block",
    "style_lock_enabled",
    "style_question",
    "validate_registry",
]
