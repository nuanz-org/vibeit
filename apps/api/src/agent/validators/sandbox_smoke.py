"""
Sandbox smoke gate (M3c structural + AM2 real gates).

Pipeline (fail closed, ordered):
  1. structural  — cheap regex contract pre-filter (M3c)
  2. compile     — esbuild bundle (AM2a)
  3. param_coverage — plan param names appear in source (AM2c)
  4. host        — Playwright + runtime-frame (AM2b)

Structural alone is available via `run_structural_smoke` for unit tests.
Production node uses `run_sandbox_smoke` (full gates).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal

from agent.validators.compile_check import CompileCheckResult, run_compile_check
from agent.validators.host_smoke import HostSmokeResult, run_host_smoke
from agent.validators.param_coverage import ParamCoverageResult, run_param_coverage
from agent.validators.static_validate import static_validate_tool_source

SmokeStage = Literal["structural", "compile", "param_coverage", "host"]
DEFAULT_STAGES: tuple[SmokeStage, ...] = (
    "structural",
    "compile",
    "param_coverage",
    "host",
)


@dataclass(frozen=True, slots=True)
class SandboxSmokeResult:
    ok: bool
    errors: list[str]
    mode: str = "structural"  # structural | full | host | compile
    compiled_js: str | None = None
    screenshot_path: str | None = None
    variance: float | None = None
    stages_run: tuple[str, ...] = field(default_factory=tuple)


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
    required = (r"\bmount\s*\(", r"\bcaptureFrame\s*\(", r"\bdispose\s*\(")
    return all(re.search(p, code) for p in required)


def _draw_body_nontrivial(code: str) -> bool:
    """Ensure draw isn't an empty stub."""
    m = re.search(
        r"draw\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}",
        code,
    )
    if not m:
        return len(code) > 400 and "createCanvas2dTool" in code
    body = m.group(1).strip()
    body = re.sub(r"//.*?$", "", body, flags=re.M)
    body = re.sub(r"/\*[\s\S]*?\*/", "", body)
    body = body.strip()
    if not body or body in ("{}",):
        return False
    return len(body) >= 20


def run_structural_smoke(code: str) -> SandboxSmokeResult:
    """
    Structural sandbox smoke (M3c) — cheap pre-filter.

    Runs static validate first, then export/harness/draw checks.
    """
    errors: list[str] = []
    static = static_validate_tool_source(code)
    if not static.ok:
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

    if re.search(r"\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b", code):
        errors.append("smoke: network APIs forbidden in tool sandbox")

    return SandboxSmokeResult(
        ok=len(errors) == 0,
        errors=errors,
        mode="structural",
        stages_run=("structural",),
    )


def run_sandbox_smoke(
    code: str,
    *,
    plan: dict[str, Any] | None = None,
    job_id: str | None = None,
    stages: tuple[SmokeStage, ...] | None = None,
) -> SandboxSmokeResult:
    """
    Full smoke entry used by the graph node (AM2).

    Stages default to structural → compile → param_coverage → host.
    Pass stages=("structural",) for M3c-style unit tests without Playwright.
    """
    ordered = stages if stages is not None else DEFAULT_STAGES
    all_errors: list[str] = []
    compiled_js: str | None = None
    screenshot_path: str | None = None
    variance: float | None = None
    ran: list[str] = []

    if "structural" in ordered:
        ran.append("structural")
        structural = run_structural_smoke(code)
        if not structural.ok:
            return SandboxSmokeResult(
                ok=False,
                errors=list(structural.errors),
                mode="structural",
                stages_run=tuple(ran),
            )

    if "compile" in ordered:
        ran.append("compile")
        compile_result: CompileCheckResult = run_compile_check(code)
        if not compile_result.ok:
            return SandboxSmokeResult(
                ok=False,
                errors=list(compile_result.errors),
                mode="compile",
                stages_run=tuple(ran),
            )
        compiled_js = compile_result.js

    if "param_coverage" in ordered:
        ran.append("param_coverage")
        cov: ParamCoverageResult = run_param_coverage(code, plan)
        if not cov.ok:
            return SandboxSmokeResult(
                ok=False,
                errors=list(cov.errors),
                mode="param_coverage",
                compiled_js=compiled_js,
                stages_run=tuple(ran),
            )

    if "host" in ordered:
        ran.append("host")
        if not compiled_js:
            # Host requires compile; if compile stage was skipped, compile now.
            compile_result = run_compile_check(code)
            if not compile_result.ok:
                return SandboxSmokeResult(
                    ok=False,
                    errors=list(compile_result.errors),
                    mode="compile",
                    stages_run=tuple(ran),
                )
            compiled_js = compile_result.js

        host: HostSmokeResult = run_host_smoke(
            compiled_js or "",
            job_id=job_id,
        )
        screenshot_path = host.screenshot_path
        variance = host.variance
        if not host.ok:
            return SandboxSmokeResult(
                ok=False,
                errors=list(host.errors),
                mode="host",
                compiled_js=compiled_js,
                screenshot_path=screenshot_path,
                variance=variance,
                stages_run=tuple(ran),
            )

    mode = "full" if set(ordered) >= {"structural", "compile", "host"} else "+".join(ran)
    return SandboxSmokeResult(
        ok=len(all_errors) == 0,
        errors=all_errors,
        mode=mode,
        compiled_js=compiled_js,
        screenshot_path=screenshot_path,
        variance=variance,
        stages_run=tuple(ran),
    )
