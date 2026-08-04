"""Sandbox smoke node (M3c — structural smoke)."""

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
    result = run_sandbox_smoke(code)
    updates: dict = {
        "phase": "smoke",
        "smoke_errors": result.errors,
        "smoke_ok": result.ok,
        "ready_for_finalize": result.ok,
    }
    if result.ok:
        updates["error_code"] = None
        updates["error_message"] = None
    else:
        updates["error_code"] = "VALIDATION_FAILED"
        updates["error_message"] = "; ".join(result.errors[:5])
    return updates
