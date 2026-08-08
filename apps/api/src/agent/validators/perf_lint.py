"""
Soft performance lint for generated canvas draw code.

High-confidence anti-patterns only (shadowBlur / filter inside loops).
Surfaced as static validation errors with `perf:` prefix so repair can fix them.
"""

from __future__ import annotations

import re


def _loop_bodies(code: str) -> list[str]:
    """Extract simple for/while block bodies via brace matching."""
    bodies: list[str] = []
    for m in re.finditer(r"\b(?:for|while)\s*\([^)]*\)\s*\{", code):
        start = m.end() - 1  # '{'
        depth = 0
        i = start
        n = len(code)
        while i < n:
            ch = code[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    bodies.append(code[start : i + 1])
                    break
            i += 1
    return bodies


def lint_draw_performance(code: str) -> list[str]:
    """
    Return human-readable perf issues (empty if clean).

    Does not ban single shadowBlur outside loops (posters/stills OK).
    """
    text = code or ""
    if not text.strip():
        return []

    errors: list[str] = []
    for body in _loop_bodies(text):
        if re.search(r"\.shadowBlur\s*=", body):
            errors.append(
                "perf: shadowBlur assigned inside a for/while loop — "
                "use one Path2D + multi-width alpha (strokeSoftGlow) instead"
            )
            break
        if re.search(r"\.filter\s*=", body):
            errors.append(
                "perf: ctx.filter assigned inside a for/while loop — "
                "apply filter once outside the loop or use soft multi-width glow"
            )
            break

    # High step count + shadowBlur in same module is a strong lag signal
    if re.search(r"\.shadowBlur\s*=", text) and re.search(
        r"\b(?:trailSteps|staticSteps|steps)\s*=\s*(?:1[0-9]{2,}|[2-9][0-9]{2,})\b",
        text,
    ):
        msg = (
            "perf: high trail/static step count together with shadowBlur — "
            "prefer ≤80 samples and strokeSoftGlow (no per-segment blur)"
        )
        if msg not in errors and not any(e.startswith("perf: shadowBlur") for e in errors):
            errors.append(msg)

    return errors
