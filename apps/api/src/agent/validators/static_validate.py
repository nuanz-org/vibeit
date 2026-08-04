"""
Static validation for generated / hand-authored tool source (M3c).

Fail closed: any forbidden pattern or missing contract surface → errors.
Aligns with VibeTool hard rules (no parent window, no eval, no free npm, etc.).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Patterns that must never appear in creative / tool iframe code.
_FORBIDDEN: list[tuple[str, re.Pattern[str]]] = [
    ("parent_window", re.compile(r"\bwindow\.parent\b")),
    ("top_window", re.compile(r"\bwindow\.top\b")),
    ("parent_bare", re.compile(r"(?<![\w.])parent\s*\.")),  # parent.foo (not wordparent.)
    ("eval", re.compile(r"\beval\s*\(")),
    ("function_ctor", re.compile(r"\bnew\s+Function\s*\(")),
    ("document_write", re.compile(r"\bdocument\.write\s*\(")),
    ("dynamic_script", re.compile(r"createElement\s*\(\s*['\"]script['\"]\s*\)")),
    ("import_scripts", re.compile(r"\bimportScripts\s*\(")),
    ("fetch_call", re.compile(r"\bfetch\s*\(")),
    ("xml_http", re.compile(r"\bXMLHttpRequest\b")),
    ("websocket", re.compile(r"\bWebSocket\b")),
    ("require_call", re.compile(r"\brequire\s*\(")),
    # Free-form package imports (allow @repo/contracts only)
    # Block bare package imports; allow @repo/* and relative ./ ../
    (
        "npm_import",
        re.compile(
            r"""from\s+['"](?!\.|@repo/)[^'"]+['"]"""
            r"""|import\s*\(\s*['"](?!\.|@repo/)[^'"]+['"]"""
        ),
    ),
]


@dataclass(frozen=True, slots=True)
class StaticValidateResult:
    ok: bool
    errors: list[str]


def _has_factory(code: str) -> bool:
    """Require a VibeTool factory surface the host can call."""
    patterns = (
        r"\bcreateSocialFrameTool\b",
        r"\bexport\s+(?:async\s+)?function\s+createTool\b",
        r"\bexport\s+const\s+createTool\b",
        r"\bcreateCanvas2dTool\s*\(",
        r"\bcreateTool\s*[:=]",
    )
    return any(re.search(p, code) for p in patterns)


def _has_draw_surface(code: str) -> bool:
    """canvas2d creative fill should define draw (or full VibeTool mount)."""
    return bool(
        re.search(r"\bdraw\s*\(", code)
        or re.search(r"\bmount\s*\(", code)
    )


def static_validate_tool_source(code: str) -> StaticValidateResult:
    """
    Validate tool TypeScript/JavaScript source string.

    Used for hand-authored fixtures (M3c) and model codegen (M3d+).
    """
    errors: list[str] = []
    text = code or ""

    if not text.strip():
        return StaticValidateResult(ok=False, errors=["code is empty"])

    if len(text) > 400_000:
        errors.append("code exceeds 400KB size limit")

    for name, pattern in _FORBIDDEN:
        if pattern.search(text):
            errors.append(f"forbidden pattern: {name}")

    # Soft: block p5/three runtime imports on ASAP path
    if re.search(r"""from\s+['"]p5['"]|from\s+['"]three['"]""", text):
        errors.append("p5/three imports not allowed on ASAP canvas2d path")

    if not _has_factory(text):
        errors.append(
            "missing tool factory — expected createTool / createSocialFrameTool / createCanvas2dTool"
        )

    if not _has_draw_surface(text):
        errors.append("missing draw() or mount() surface for canvas2d tool")

    # Target must not claim other runtimes in source comments-heavy code is ok;
    # explicit three.js WebGLRenderer is a strong signal of wrong target.
    if re.search(r"\bWebGLRenderer\b|\bTHREE\.", text):
        errors.append("three.js APIs not allowed on ASAP canvas2d path")

    return StaticValidateResult(ok=len(errors) == 0, errors=errors)
