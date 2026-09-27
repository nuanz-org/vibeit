"""Static validate node (M3c)."""

from __future__ import annotations

from agent.state import CreateGraphState
from agent.style_registry import lint_style_for_plan
from agent.validators.static_validate import static_validate_tool_source


def validate_node(state: CreateGraphState) -> dict:
    code = state.get("code") or ""
    plan = state.get("plan") if isinstance(state.get("plan"), dict) else None
    target = None
    if plan and isinstance(plan.get("target"), str):
        target = plan["target"]
    elif state.get("target"):
        target = str(state.get("target"))
    result = static_validate_tool_source(code, target=target)
    errors = list(result.errors) + lint_style_for_plan(code, plan)
    ok = not errors
    updates: dict = {
        "phase": "validate",
        "validation_errors": errors,
        "validate_ok": ok,
        "ready_for_finalize": False,
    }
    if ok:
        updates["best_valid_code"] = code
        updates["error_code"] = None
        updates["error_message"] = None
    else:
        updates["error_code"] = "VALIDATION_FAILED"
        updates["error_message"] = "; ".join(errors[:5])
    return updates
