"""
AM7a — parse Control refine patch outputs (param JSON or full TS module).
"""

from __future__ import annotations

import json
import re
from typing import Any

from agent.codegen_parse import CodegenParseError, extract_typescript_module


class PatchParseError(ValueError):
    pass


def extract_json_object(text: str) -> dict[str, Any]:
    """Strip fences / prose and parse a single JSON object."""
    raw = (text or "").strip()
    if not raw:
        raise PatchParseError("empty patch response")

    fence = re.search(
        r"```(?:json)?\s*([\s\S]*?)```",
        raw,
        re.IGNORECASE,
    )
    if fence:
        raw = fence.group(1).strip()

    # Slice first {...} if model added prose
    if not raw.startswith("{"):
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            raw = raw[start : end + 1]
        else:
            raise PatchParseError("no JSON object in patch response")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PatchParseError(f"invalid JSON patch: {exc}") from exc

    if not isinstance(data, dict):
        raise PatchParseError("patch JSON must be an object")
    return data


def parse_param_patch(text: str) -> dict[str, Any]:
    """
    Parse param-patch LLM output.

    Expected shape::
        {
          "updates": { "speed": 0.3, "title": "..." },
          "rationale": "optional"
        }

    Also accepts flat ``{ "speed": 0.3 }`` as updates.
    """
    data = extract_json_object(text)
    if "updates" in data:
        updates = data.get("updates")
        if not isinstance(updates, dict):
            raise PatchParseError("param patch 'updates' must be an object")
        return {
            "updates": updates,
            "rationale": data.get("rationale")
            if isinstance(data.get("rationale"), str)
            else None,
        }

    # Flat map of param → value (no nested keys reserved)
    reserved = {"mode", "rationale", "schemaAdds", "schema_adds"}
    updates = {k: v for k, v in data.items() if k not in reserved}
    if not updates:
        raise PatchParseError("param patch has no updates")
    return {
        "updates": updates,
        "rationale": data.get("rationale")
        if isinstance(data.get("rationale"), str)
        else None,
    }


def parse_code_patch(text: str) -> str:
    """Full TypeScript module from code-patch LLM."""
    try:
        return extract_typescript_module(text)
    except CodegenParseError as exc:
        raise PatchParseError(str(exc)) from exc


def apply_param_updates(
    *,
    default_params: dict[str, Any],
    param_schema: list[Any] | None,
    updates: dict[str, Any],
) -> tuple[dict[str, Any], list[str]]:
    """
    Merge updates into default_params for known param names only.

    Returns (new_defaults, list of rejected keys).
    """
    known: set[str] = set()
    if isinstance(default_params, dict):
        known.update(str(k) for k in default_params.keys())
    if isinstance(param_schema, list):
        for item in param_schema:
            if isinstance(item, dict) and item.get("name") is not None:
                known.add(str(item["name"]))

    merged = dict(default_params or {})
    rejected: list[str] = []
    for key, value in (updates or {}).items():
        name = str(key)
        if known and name not in known:
            rejected.append(name)
            continue
        merged[name] = value
    return merged, rejected


def update_plan_defaults(
    plan: dict[str, Any] | None,
    default_params: dict[str, Any],
) -> dict[str, Any] | None:
    """Copy new defaults into plan.params[].default when plan present."""
    if not isinstance(plan, dict):
        return plan
    out = dict(plan)
    params = out.get("params")
    if not isinstance(params, list):
        return out
    new_params: list[Any] = []
    for p in params:
        if not isinstance(p, dict) or p.get("name") is None:
            new_params.append(p)
            continue
        name = str(p["name"])
        if name in default_params:
            item = dict(p)
            item["default"] = default_params[name]
            new_params.append(item)
        else:
            new_params.append(p)
    out["params"] = new_params
    return out
