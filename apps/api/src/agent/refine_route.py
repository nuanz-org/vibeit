"""
AM7a — route a Control refine chat message to param-patch or code-patch.

Heuristic only (no LLM). Param-only requests must not burn a full codegen call.
Ambiguous / structural → code patch (safe default).
"""

from __future__ import annotations

import re
from typing import Literal

PatchMode = Literal["param", "code"]

# Structural / creative edits that need source changes.
_STRUCTURAL = re.compile(
    r"\b("
    r"add|remove|delete|insert|replace|rewrite|redesign|rebuild|"
    r"introduce|create|new\s+(param|field|layer|title|subtitle|text)|"
    r"subtitle|caption|layout|composition|layer|layers|"
    r"particle\s+system|draw|animation\s+style|switch\s+to|"
    r"rename|restructure|overhaul"
    r")\b",
    re.IGNORECASE,
)

# Pure control-surface / numeric / color / existing text tweaks.
_PARAM_HINT = re.compile(
    r"\b("
    r"slower|faster|speed|tempo|intensity|opacity|density|count|"
    r"size|scale|amount|higher|lower|more|less|increase|decrease|"
    r"color|colour|hue|palette|background|bg|accent|tint|"
    r"tweak|adjust|set\s+the|make\s+(it\s+)?(a\s+bit\s+)?"
    r"(slower|faster|brighter|darker|bigger|smaller)|"
    r"default|param(eter)?s?"
    r")\b",
    re.IGNORECASE,
)

# Strong signal that existing text param values should change (still param if no "add").
_TEXT_VALUE = re.compile(
    r"\b(title|label|text|heading)\b.{0,40}\b(to|as|=|:)\b",
    re.IGNORECASE,
)


def route_refine_chat(message: str) -> PatchMode:
    """
    Classify chat → ``param`` (defaults only) or ``code`` (minimal module edit).

    Rules:
    - Empty → code (will fail later with clean error)
    - Structural keywords → code
    - Param hints without structural → param
    - Else → code
    """
    text = (message or "").strip()
    if not text:
        return "code"

    structural = bool(_STRUCTURAL.search(text))
    if structural:
        return "code"

    if _PARAM_HINT.search(text) or _TEXT_VALUE.search(text):
        return "param"

    return "code"


def route_rationale(message: str, mode: PatchMode) -> str:
    """Short human-readable reason for logs / evals."""
    if mode == "param":
        return "param_patch: control-surface tweak without structural keywords"
    if _STRUCTURAL.search(message or ""):
        return "code_patch: structural / creative keywords detected"
    return "code_patch: default (ambiguous or no param-only signal)"
