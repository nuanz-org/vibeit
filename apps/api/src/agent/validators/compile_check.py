"""
esbuild compile gate (AM2a).

Bundles generated TypeScript tool modules with the same config as
apps/web runtime/compile/tool-module.ts via a Node CLI.

Fail closed: missing node/esbuild/apps/web → clear error, never silent skip.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

# validators → agent → src → api → apps → repo
_REPO_ROOT = Path(__file__).resolve().parents[5]
_DEFAULT_WEB_ROOT = _REPO_ROOT / "apps" / "web"
_CLI_REL = Path("runtime") / "compile" / "cli-compile.mjs"

# Raised in B2 so product-vendored three (bundled tool ESM) fits
COMPILED_JS_MAX_CHARS = 1_500_000
_DEFAULT_TIMEOUT_S = 45.0


@dataclass(frozen=True, slots=True)
class CompileCheckResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    js: str | None = None
    mode: str = "esbuild"


def apps_web_root() -> Path:
    """Resolve apps/web (override with AIDITR_WEB_ROOT)."""
    env = os.getenv("AIDITR_WEB_ROOT", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return _DEFAULT_WEB_ROOT.resolve()


def _cli_path(web_root: Path) -> Path:
    return web_root / _CLI_REL


def _node_bin() -> str | None:
    env = os.getenv("AIDITR_NODE_BIN", "").strip()
    if env and Path(env).is_file():
        return env
    return shutil.which("node")


def run_compile_check(
    code: str,
    *,
    timeout_seconds: float | None = None,
) -> CompileCheckResult:
    """
    Compile tool TypeScript → browser ESM via esbuild (Node subprocess).

    Returns diagnostics suitable for repair prompts on failure.
    """
    text = code or ""
    if not text.strip():
        return CompileCheckResult(ok=False, errors=["compile: code is empty"])

    node = _node_bin()
    if not node:
        return CompileCheckResult(
            ok=False,
            errors=[
                "compile: node binary not found — install Node.js or set AIDITR_NODE_BIN"
            ],
        )

    web_root = apps_web_root()
    if not web_root.is_dir():
        return CompileCheckResult(
            ok=False,
            errors=[f"compile: apps/web not found at {web_root}"],
        )

    cli = _cli_path(web_root)
    if not cli.is_file():
        return CompileCheckResult(
            ok=False,
            errors=[f"compile: cli-compile.mjs missing at {cli}"],
        )

    # esbuild lives under apps/web (pnpm); cwd must be web root for resolve.
    timeout = (
        timeout_seconds
        if timeout_seconds is not None
        else float(os.getenv("AIDITR_COMPILE_TIMEOUT_SECONDS", str(_DEFAULT_TIMEOUT_S)))
    )

    try:
        proc = subprocess.run(
            [node, str(cli)],
            input=text,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(web_root),
            env={**os.environ, "NODE_NO_WARNINGS": "1"},
            check=False,
        )
    except subprocess.TimeoutExpired:
        return CompileCheckResult(
            ok=False,
            errors=[f"compile: esbuild timed out after {timeout}s"],
        )
    except OSError as exc:
        return CompileCheckResult(
            ok=False,
            errors=[f"compile: failed to spawn node: {exc}"],
        )

    raw = (proc.stdout or "").strip()
    if not raw:
        stderr = (proc.stderr or "").strip()
        return CompileCheckResult(
            ok=False,
            errors=[
                "compile: empty CLI output"
                + (f" (stderr: {stderr[:500]})" if stderr else "")
                + (f" exit={proc.returncode}" if proc.returncode else "")
            ],
        )

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return CompileCheckResult(
            ok=False,
            errors=[
                f"compile: invalid JSON from CLI: {raw[:400]}"
                + (f" stderr={(proc.stderr or '')[:200]}" if proc.stderr else "")
            ],
        )

    if not isinstance(payload, dict):
        return CompileCheckResult(
            ok=False,
            errors=["compile: CLI payload is not an object"],
        )

    if payload.get("ok") is True:
        js = payload.get("js")
        if not isinstance(js, str) or not js.strip():
            return CompileCheckResult(
                ok=False,
                errors=["compile: ok but empty js field"],
            )
        if len(js) > COMPILED_JS_MAX_CHARS:
            return CompileCheckResult(
                ok=False,
                errors=[
                    f"compile: compiled JS exceeds {COMPILED_JS_MAX_CHARS} character limit"
                ],
            )
        return CompileCheckResult(ok=True, errors=[], js=js)

    errors: list[str] = []
    err = payload.get("error")
    if isinstance(err, str) and err.strip():
        errors.append(f"compile: {err.strip()}")
    details = payload.get("details")
    if isinstance(details, list):
        for d in details:
            if isinstance(d, str) and d.strip():
                errors.append(f"compile: {d.strip()}")
    if not errors:
        errors.append("compile: esbuild failed (no details)")
    return CompileCheckResult(ok=False, errors=errors, js=None)
