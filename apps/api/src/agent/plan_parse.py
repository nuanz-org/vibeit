"""
Parse / normalize ToolPlan JSON from LLM output (M3d).

Forces target=canvas2d on ASAP path.
"""

from __future__ import annotations

import json
import re
from typing import Any

ASAP_TARGET = "canvas2d"
_PARAM_KINDS = frozenset(
    {"color", "number", "text", "enum", "boolean", "assetRef"}
)


class PlanParseError(ValueError):
    pass


def extract_json_object(text: str) -> dict[str, Any]:
    """Pull first JSON object from raw model text (strips fences if present)."""
    raw = (text or "").strip()
    if not raw:
        raise PlanParseError("empty plan response")

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if fence:
        raw = fence.group(1).strip()

    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Fallback: first {...} span
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        try:
            data = json.loads(raw[start : end + 1])
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError as exc:
            raise PlanParseError(f"invalid plan JSON: {exc}") from exc

    raise PlanParseError("no JSON object found in plan response")


def normalize_asap_plan(data: dict[str, Any]) -> dict[str, Any]:
    """
    Validate required fields and force target=canvas2d.
    """
    concept = str(data.get("concept") or "").strip()
    if not concept:
        raise PlanParseError("plan.concept is required")

    aspect = str(data.get("aspect") or "1:1").strip() or "1:1"
    motion = str(data.get("motion") or "subtle motion").strip()

    params = data.get("params")
    if not isinstance(params, list) or len(params) == 0:
        # Provide a minimal default param set so codegen still has something
        params = [
            {
                "name": "bg",
                "kind": "color",
                "label": "Background",
                "default": "#0b0b12",
            },
            {
                "name": "accent",
                "kind": "color",
                "label": "Accent",
                "default": "#7c5cff",
            },
            {
                "name": "title",
                "kind": "text",
                "label": "Title",
                "default": concept[:48],
                "maxLength": 48,
            },
        ]
    else:
        cleaned_params: list[dict[str, Any]] = []
        for p in params:
            if not isinstance(p, dict):
                continue
            name = str(p.get("name") or "").strip()
            kind = str(p.get("kind") or "").strip()
            if not name or kind not in _PARAM_KINDS:
                continue
            cleaned_params.append(p)
        params = cleaned_params or [
            {
                "name": "bg",
                "kind": "color",
                "label": "Background",
                "default": "#111111",
            }
        ]

    slots = data.get("assetSlots")
    if not isinstance(slots, list):
        slots = []
    cleaned_slots: list[dict[str, Any]] = []
    for s in slots:
        if not isinstance(s, dict):
            continue
        sid = str(s.get("id") or "").strip()
        if not sid:
            continue
        cleaned_slots.append(s)

    palette = data.get("palette")
    if palette is not None and not isinstance(palette, list):
        palette = None

    notes = data.get("notes")
    if notes is not None:
        notes = str(notes)

    # Force ASAP target regardless of model output
    plan: dict[str, Any] = {
        "concept": concept,
        "aspect": aspect,
        "motion": motion,
        "params": params,
        "assetSlots": cleaned_slots,
        "target": ASAP_TARGET,
    }
    if palette is not None:
        plan["palette"] = [str(x) for x in palette][:12]
    if notes:
        plan["notes"] = notes
    return plan


def parse_asap_plan(text: str) -> dict[str, Any]:
    return normalize_asap_plan(extract_json_object(text))
