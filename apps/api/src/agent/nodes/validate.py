"""Static validate node (M3c)."""

from __future__ import annotations

from agent.state import CreateGraphState
from agent.validators.static_validate import static_validate_tool_source


def validate_node(state: CreateGraphState) -> dict:
    code = state.get("code") or ""
    result = static_validate_tool_source(code)
    updates: dict = {
        "phase": "validate",
        "validation_errors": result.errors,
        "validate_ok": result.ok,
        "ready_for_finalize": False,
    }
    if result.ok:
        updates["best_valid_code"] = code
        updates["error_code"] = None
        updates["error_message"] = None
    else:
        updates["error_code"] = "VALIDATION_FAILED"
        updates["error_message"] = "; ".join(result.errors[:5])
    return updates
