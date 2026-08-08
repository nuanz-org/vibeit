"""
Static validation for generated / hand-authored tool source (M3c + AM6 targets).

Fail closed: any forbidden pattern or missing contract surface → errors.
Aligns with VibeTool hard rules (no parent window, no eval, no free npm, etc.).
Target-aware: p5/three APIs only when target is p5/three.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

TargetId = Literal["canvas2d", "p5", "three"]

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
        r"\bcreateP5Tool\s*\(",
        r"\bcreateThreeTool\s*\(",
        r"\bcreateTool\s*[:=]",
    )
    return any(re.search(p, code) for p in patterns)


def _has_draw_surface(code: str) -> bool:
    """Creative fill should define draw (or full VibeTool mount)."""
    return bool(
        re.search(r"\bdraw\s*\(", code)
        or re.search(r"\bmount\s*\(", code)
    )


def _infer_target(code: str, target: str | None) -> TargetId:
    if target in ("canvas2d", "p5", "three"):
        return target  # type: ignore[return-value]
    if re.search(r"createThreeTool|skeletons/three", code):
        return "three"
    if re.search(r"createP5Tool|skeletons/p5", code):
        return "p5"
    return "canvas2d"


def static_validate_tool_source(
    code: str,
    *,
    target: str | None = None,
) -> StaticValidateResult:
    """
    Validate tool TypeScript/JavaScript source string.

    `target` selects which harness APIs are allowed (AM6).
    """
    errors: list[str] = []
    text = code or ""
    tgt = _infer_target(text, target)

    if not text.strip():
        return StaticValidateResult(ok=False, errors=["code is empty"])

    if len(text) > 400_000:
        errors.append("code exceeds 400KB size limit")

    for name, pattern in _FORBIDDEN:
        if pattern.search(text):
            errors.append(f"forbidden pattern: {name}")

    # Block bare p5/three package imports (incl. subpaths) — harness skeletons only
    if re.search(
        r"""from\s+['"]p5(?:/[^'"]*)?['"]|from\s+['"]three(?:/[^'"]*)?['"]""",
        text,
    ):
        errors.append(
            "bare p5/three package imports not allowed — use @repo/contracts/skeletons/*"
        )

    # B1: product-vendored three pin is harness-only (not creative tool source)
    if re.search(r"@repo/contracts/skeletons/three-vendor", text):
        errors.append(
            "three-vendor is product-only — tool code must use "
            "@repo/contracts/skeletons/three (createThreeTool)"
        )

    # Remote CDN / esm.sh style imports (defense beyond npm_import)
    if re.search(
        r"""from\s+['"]https?://|import\s*\(\s*['"]https?://""",
        text,
    ):
        errors.append(
            "remote module URLs not allowed — three is product-vendored (no CDN/esm.sh)"
        )

    if not _has_factory(text):
        errors.append(
            "missing tool factory — expected createTool / createCanvas2dTool "
            "/ createP5Tool / createThreeTool"
        )

    if not _has_draw_surface(text):
        errors.append("missing draw() or mount() surface for tool")

    # Target-specific wrong-API checks
    if tgt == "canvas2d":
        if re.search(r"\bWebGLRenderer\b|\bTHREE\.", text):
            errors.append("three.js APIs not allowed on canvas2d path")
        if re.search(r"createP5Tool|createThreeTool", text) and not re.search(
            r"createCanvas2dTool", text
        ):
            # pure p5/three source labeled as canvas2d
            if re.search(r"createP5Tool", text):
                errors.append("createP5Tool used but target is canvas2d")
            if re.search(r"createThreeTool", text):
                errors.append("createThreeTool used but target is canvas2d")
    elif tgt == "p5":
        if re.search(r"\bWebGLRenderer\b|\bTHREE\.", text):
            errors.append("three.js APIs not allowed on p5 path")
        if not re.search(r"createP5Tool|createTool", text):
            errors.append("p5 target expected createP5Tool harness")
    elif tgt == "three":
        # three stub may use WebGL APIs; block free three npm only (already covered)
        if re.search(r"createP5Tool", text) and not re.search(
            r"createThreeTool", text
        ):
            errors.append("createP5Tool used but target is three")

    return StaticValidateResult(ok=len(errors) == 0, errors=errors)
