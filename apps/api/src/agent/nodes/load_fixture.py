"""Load fixture tool source into graph state (M3c — no LLM)."""

from __future__ import annotations

from agent.fixtures import FixtureNotFoundError, load_fixture_source
from agent.state import CreateGraphState


def load_fixture_node(state: CreateGraphState) -> dict:
    if not state.get("use_fixture_code"):
        # Passthrough when real codegen (M3d) already set code
        return {"phase": "codegen"}

    name = state.get("fixture_name") or "social-frame"
    try:
        code = load_fixture_source(name)
    except FixtureNotFoundError as exc:
        return {
            "code": "",
            "phase": "codegen",
            "error_code": "INTERNAL",
            "error_message": str(exc),
            "ready_for_finalize": False,
        }
    return {
        "code": code,
        "target": "canvas2d",
        "phase": "codegen",
        "error_code": None,
        "error_message": None,
    }
