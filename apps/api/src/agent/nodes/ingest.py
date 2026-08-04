"""Ingest node — normalize vision text (M3c)."""

from __future__ import annotations

from agent.state import CreateGraphState


def ingest_node(state: CreateGraphState) -> dict:
    raw = (state.get("vision_text") or "").strip()
    if not raw:
        return {
            "vision_text": "",
            "phase": "ingest",
            "error_code": "VALIDATION_FAILED",
            "error_message": "vision_text is required",
            "ready_for_finalize": False,
        }
    # Collapse whitespace; cap extreme length
    vision = " ".join(raw.split())
    if len(vision) > 4000:
        vision = vision[:4000]
    return {
        "vision_text": vision,
        "phase": "ingest",
        "error_code": None,
        "error_message": None,
        "target": "canvas2d",
    }
