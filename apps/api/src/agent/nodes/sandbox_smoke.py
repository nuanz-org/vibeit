"""Sandbox smoke node (M3c structural + AM2 compile/host gates)."""

from __future__ import annotations

from agent.state import CreateGraphState
from agent.validators.sandbox_smoke import run_sandbox_smoke


def sandbox_smoke_node(state: CreateGraphState) -> dict:
    # Fail closed if static validate already failed
    if state.get("validate_ok") is False:
        return {
            "phase": "smoke",
            "smoke_ok": False,
            "smoke_errors": ["skipped: static validate failed"],
            "ready_for_finalize": False,
        }

    code = state.get("code") or ""
    plan = state.get("plan") if isinstance(state.get("plan"), dict) else None
    job_id = state.get("job_id")
    job_id_s = str(job_id) if job_id else None

    result = run_sandbox_smoke(code, plan=plan, job_id=job_id_s)

    # Phase label: smoke:host when host stage ran; else smoke / smoke:compile
    if "host" in result.stages_run:
        phase = "smoke:host"
    elif "compile" in result.stages_run:
        phase = "smoke:compile"
    else:
        phase = "smoke"

    updates: dict = {
        "phase": phase,
        "smoke_errors": result.errors,
        "smoke_ok": result.ok,
        "ready_for_finalize": result.ok,
        "smoke_mode": result.mode,
        "compiled_js": result.compiled_js,
        "smoke_screenshot_path": result.screenshot_path,
        "smoke_variance": result.variance,
    }
    if result.ok:
        updates["error_code"] = None
        updates["error_message"] = None
    else:
        updates["error_code"] = "VALIDATION_FAILED"
        updates["error_message"] = "; ".join(result.errors[:5])
    return updates
