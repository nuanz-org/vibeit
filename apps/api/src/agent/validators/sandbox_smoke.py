"""
Sandbox smoke gate (M3c).

Decision (M3c first green): **structural contract smoke** in Python — deeper than
static validate, still fail-closed, no Playwright dependency.

What it checks beyond static_validate:
- Factory is *exported* (export const/function createTool / createSocialFrameTool)
- createCanvas2dTool harness usage OR full VibeTool method set
- No residual forbidden network after validate
- Non-trivial creative body (not empty draw)

Real iframe host smoke (Playwright + runtime-frame) is a later upgrade and can
replace `run_structural_smoke` without changing graph node wiring.

Cannot mark ready if smoke fails (enforced by graph / finalize in M3e).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from agent.validators.static_validate import static_validate_tool_source


@dataclass(frozen=True, slots=True)
class SandboxSmokeResult:
    ok: bool
    errors: list[str]
    mode: str = "structural"  # structural | host (future)


def _has_exported_factory(code: str) -> bool:
    return bool(
        re.search(
            r"export\s+(const|function|async\s+function)\s+"
            r"(createTool|createSocialFrameTool)\b",
            code,
        )
        or re.search(
            r"export\s*\{[^}]*\b(createTool|createSocialFrameTool)\b[^}]*\}",
            code,
        )
    )


def _has_harness_or_vibetool(code: str) -> bool:
    if re.search(r"\bcreateCanvas2dTool\s*\(", code):
        return True
    # Full VibeTool surface
    required = (r"\bmount\s*\(", r"\bcaptureFrame\s*\(", r"\bdispose\s*\(")
    return all(re.search(p, code) for p in required)


def _draw_body_nontrivial(code: str) -> bool:
    """Ensure draw isn't an empty stub."""
    m = re.search(
        r"draw\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}",
        code,
    )
    if not m:
        # creative may use method shorthand draw(c) { ... } already matched loosely
        # Accept if createCanvas2dTool present and file is substantial
        return len(code) > 400 and "createCanvas2dTool" in code
    body = m.group(1).strip()
    # Strip comments
    body = re.sub(r"//.*?$", "", body, flags=re.M)
    body = re.sub(r"/\*[\s\S]*?\*/", "", body)
    body = body.strip()
    if not body or body in ("{}",):
        return False
    return len(body) >= 20


def run_structural_smoke(code: str) -> SandboxSmokeResult:
    """
    Structural sandbox smoke (M3c).

    Runs static validate first, then export/harness/draw checks.
    """
    errors: list[str] = []
    static = static_validate_tool_source(code)
    if not static.ok:
        # Smoke still reports static failures so one gate can be used alone
        errors.extend(f"static:{e}" for e in static.errors)

    if not _has_exported_factory(code):
        errors.append(
            "smoke: factory must be exported (export const/function createTool "
            "or createSocialFrameTool)"
        )

    if not _has_harness_or_vibetool(code):
        errors.append(
            "smoke: expected createCanvas2dTool(...) or full VibeTool "
            "mount/captureFrame/dispose"
        )

    if not _draw_body_nontrivial(code):
        errors.append("smoke: draw body missing or too trivial")

    # Double-check hard rules (network) even if static was bypassed
    if re.search(r"\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b", code):
        errors.append("smoke: network APIs forbidden in tool sandbox")

    return SandboxSmokeResult(ok=len(errors) == 0, errors=errors, mode="structural")


def run_sandbox_smoke(code: str) -> SandboxSmokeResult:
    """Entry point used by the graph node — swap implementation later for host smoke."""
    return run_structural_smoke(code)
