"""Style lint: reject code that breaks the locked style's hard rules."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

from agent.style_registry.apply import style_for_plan
from agent.style_registry.registry import load_registry

_BLOCK_COMMENT = re.compile(r"/\*[\s\S]*?\*/")
_LINE_COMMENT = re.compile(r"(?<![:\"'`])//[^\n]*")


@lru_cache(maxsize=64)
def _compiled(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.M)


def _strip_comments(code: str) -> str:
    return _LINE_COMMENT.sub("", _BLOCK_COMMENT.sub("", code or ""))


def lint_style(code: str, style: dict[str, Any] | None) -> list[str]:
    """Return `style:`-prefixed errors for forbidden / missing patterns."""
    if not style or not (code or "").strip():
        return []
    rules = load_registry().get("lintRules") or {}
    lint = style.get("lint") or {}
    text = _strip_comments(code)
    name = str(style.get("name") or style.get("id"))
    errors: list[str] = []
    for rule_id in lint.get("forbid") or []:
        rule = rules.get(rule_id)
        if rule and _compiled(str(rule["pattern"])).search(text):
            errors.append("style: " + str(rule["message"]).replace("{name}", name))
    for rule_id in lint.get("require") or []:
        rule = rules.get(rule_id)
        if rule and not _compiled(str(rule["pattern"])).search(text):
            errors.append("style: " + str(rule["message"]).replace("{name}", name))
    return errors


def lint_style_for_plan(code: str, plan: dict[str, Any] | None) -> list[str]:
    look, _typ = style_for_plan(plan)
    return lint_style(code, look)
