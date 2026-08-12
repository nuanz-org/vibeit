"""
Parse / normalize ToolPlan JSON from LLM output (M3d + AM1 DesignBrief v2 + AM6 targets).

Default target=canvas2d. p5 / three only when config-gated (AM6 target_policy).
Backward compatible: legacy plans without DesignBrief fields still parse.
"""

from __future__ import annotations

import json
import re
from typing import Any

from agent.control_catalog.catalog import PARAM_UI_HINTS as _CATALOG_UI_HINTS
from agent.control_catalog.resolve import (
    ControlInventoryError,
    resolve_control_inventory,
)
from agent.target_policy import ASAP_TARGET, resolve_plan_target

_PARAM_KINDS = frozenset(
    {"color", "number", "text", "enum", "boolean", "assetRef"}
)
_PARAM_UI_HINTS = frozenset(
    {
        "slider",
        "segmented",
        "select",
        "switch",
        "hidden",
        "playPause",
        "textarea",
        "presetGrid",
    }
) | _CATALOG_UI_HINTS
_HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


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


def _normalize_hex(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not _HEX_RE.match(s):
        return None
    if len(s) == 4:  # #rgb → #rrggbb
        r, g, b = s[1], s[2], s[3]
        s = f"#{r}{r}{g}{g}{b}{b}"
    return s.lower()


def _normalize_string_list(value: Any, *, limit: int = 12) -> list[str] | None:
    if not isinstance(value, list):
        return None
    out: list[str] = []
    for item in value:
        s = str(item).strip()
        if s:
            out.append(s)
        if len(out) >= limit:
            break
    return out or None


def _default_params(concept: str) -> list[dict[str, Any]]:
    return [
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
            "default": (concept[:48] or "Your vibe"),
            "maxLength": 48,
        },
    ]


def _ensure_min_params(
    params: list[dict[str, Any]], concept: str, *, minimum: int = 3
) -> list[dict[str, Any]]:
    """Art Director gate: ≥3 params (pad with defaults if model under-specifies)."""
    if len(params) >= minimum:
        return params
    existing = {str(p.get("name") or "") for p in params}
    for pad in _default_params(concept):
        if len(params) >= minimum:
            break
        name = str(pad.get("name") or "")
        if name and name not in existing:
            params.append(pad)
            existing.add(name)
    return params


def _normalize_composition(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, Any] = {}
    layers = _normalize_string_list(raw.get("layers"), limit=8)
    if layers:
        out["layers"] = layers
    focal = _normalize_string_list(raw.get("focalPoints"), limit=6)
    if focal:
        out["focalPoints"] = focal
    grid = raw.get("grid")
    if grid is not None and str(grid).strip():
        out["grid"] = str(grid).strip()
    return out or None


def _normalize_palette_roles(raw: Any) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, str] = {}
    for key in ("bg", "ink", "accent", "highlight"):
        hx = _normalize_hex(raw.get(key))
        if hx:
            out[key] = hx
    return out or None


def _normalize_motion_spec(raw: Any) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, str] = {}
    for key in ("summary", "easing", "tempo", "loop"):
        val = raw.get(key)
        if val is not None and str(val).strip():
            out[key] = str(val).strip()
    return out or None


def _normalize_typography(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, Any] = {}
    scale = raw.get("scale")
    if scale is not None and str(scale).strip():
        out["scale"] = str(scale).strip()
    hierarchy = _normalize_string_list(raw.get("hierarchy"), limit=6)
    if hierarchy:
        out["hierarchy"] = hierarchy
    return out or None


def _normalize_param_entry(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Keep known param fields; strip invalid group / uiHint."""
    name = str(raw.get("name") or "").strip()
    kind = str(raw.get("kind") or "").strip()
    if not name or kind not in _PARAM_KINDS:
        return None
    entry = dict(raw)
    entry["name"] = name
    entry["kind"] = kind

    group = raw.get("group")
    if group is not None and str(group).strip():
        entry["group"] = str(group).strip()[:80]
    else:
        entry.pop("group", None)

    ui_hint = raw.get("uiHint") or raw.get("ui_hint")
    if ui_hint is not None and str(ui_hint).strip() in _PARAM_UI_HINTS:
        entry["uiHint"] = str(ui_hint).strip()
    else:
        entry.pop("uiHint", None)
        entry.pop("ui_hint", None)

    return entry


def _normalize_control_sections(raw: Any) -> list[dict[str, Any]] | None:
    if not isinstance(raw, list):
        return None
    sections: list[dict[str, Any]] = []
    for item in raw[:12]:
        if not isinstance(item, dict):
            continue
        sid = str(item.get("id") or "").strip()
        label = str(item.get("label") or sid).strip()
        names = _normalize_string_list(item.get("paramNames"), limit=16)
        if not sid or not label or not names:
            continue
        sections.append(
            {
                "id": sid[:64],
                "label": label[:80],
                "paramNames": names,
            }
        )
    return sections or None


def _normalize_control_surface(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, Any] = {}
    intent = raw.get("intent")
    if intent is not None and str(intent).strip():
        out["intent"] = str(intent).strip()
    primary = _normalize_string_list(raw.get("primaryParams"), limit=8)
    if primary:
        out["primaryParams"] = primary
    sections = _normalize_control_sections(raw.get("sections"))
    if sections:
        out["sections"] = sections
    return out or None


def _maybe_resolve_control_inventory(
    data: dict[str, Any],
    *,
    concept: str,
) -> tuple[list[dict[str, Any]] | None, list[dict[str, Any]] | None, dict[str, Any] | None, list[dict[str, Any]] | None]:
    """
    If controlInventory is present and non-empty, resolve to params/slots.
    Returns (params, slots, inventory, sections) or (None, None, None, None) for legacy.
    """
    inv = data.get("controlInventory") or data.get("control_inventory")
    if not isinstance(inv, dict):
        return None, None, None, None
    selected = inv.get("selected")
    custom = inv.get("custom")
    has_selected = isinstance(selected, list) and len(selected) > 0
    has_custom = isinstance(custom, list) and len(custom) > 0
    if not has_selected and not has_custom:
        return None, None, None, None

    existing_slots = data.get("assetSlots")
    if not isinstance(existing_slots, list):
        existing_slots = []

    try:
        resolved = resolve_control_inventory(
            inv,
            existing_slots=[s for s in existing_slots if isinstance(s, dict)],
            strict=True,
        )
    except ControlInventoryError as exc:
        # Soft path: if inventory is broken but classic params exist, fall back
        classic = data.get("params")
        if isinstance(classic, list) and classic:
            return None, None, None, None
        raise PlanParseError(f"controlInventory: {exc}") from exc

    params = resolved["params"]
    if not params:
        params = _default_params(concept)
    else:
        params = _ensure_min_params(params, concept, minimum=3)

    return (
        params,
        list(resolved.get("assetSlots") or []),
        resolved.get("controlInventory"),
        resolved.get("sections"),
    )


def normalize_asap_plan(data: dict[str, Any]) -> dict[str, Any]:
    """
    Validate required fields; resolve target via AM6 policy (default canvas2d).
    Accepts DesignBrief v2 optional fields; drops invalid ones.
    When controlInventory is present, it is the authority for params.
    """
    concept = str(data.get("concept") or "").strip()
    if not concept:
        raise PlanParseError("plan.concept is required")

    aspect = str(data.get("aspect") or "1:1").strip() or "1:1"
    motion = str(data.get("motion") or "subtle motion").strip()

    inv_params, inv_slots, inv_norm, inv_sections = _maybe_resolve_control_inventory(
        data, concept=concept
    )

    if inv_params is not None:
        params = inv_params
        cleaned_slots = inv_slots or []
    else:
        params = data.get("params")
        if not isinstance(params, list) or len(params) == 0:
            params = _default_params(concept)
        else:
            cleaned_params: list[dict[str, Any]] = []
            for p in params:
                if not isinstance(p, dict):
                    continue
                entry = _normalize_param_entry(p)
                if entry is not None:
                    cleaned_params.append(entry)
            params = cleaned_params or _default_params(concept)

        params = _ensure_min_params(params, concept, minimum=3)

        slots = data.get("assetSlots")
        if not isinstance(slots, list):
            slots = []
        cleaned_slots = []
        for s in slots:
            if not isinstance(s, dict):
                continue
            sid = str(s.get("id") or "").strip()
            if not sid:
                continue
            cleaned_slots.append(s)

    palette_raw = data.get("palette")
    palette: list[str] | None = None
    if isinstance(palette_raw, list):
        palette = []
        for x in palette_raw[:12]:
            hx = _normalize_hex(x)
            if hx:
                palette.append(hx)
        if not palette:
            palette = None

    notes = data.get("notes")
    if notes is not None:
        notes = str(notes)

    # AM6: honor model target only when config-enabled; else canvas2d
    target = resolve_plan_target(data.get("target"))
    plan: dict[str, Any] = {
        "concept": concept,
        "aspect": aspect,
        "motion": motion,
        "params": params,
        "assetSlots": cleaned_slots,
        "target": target,
    }
    rationale = data.get("targetRationale") or data.get("target_rationale")
    if rationale is not None and str(rationale).strip():
        plan["targetRationale"] = str(rationale).strip()[:400]
    if palette is not None:
        plan["palette"] = palette
    if notes:
        plan["notes"] = notes

    composition = _normalize_composition(data.get("composition"))
    if composition:
        plan["composition"] = composition

    palette_roles = _normalize_palette_roles(data.get("paletteRoles"))
    if palette_roles:
        plan["paletteRoles"] = palette_roles
        # Seed flat palette from roles when model only sent roles
        if "palette" not in plan:
            ordered = [
                palette_roles[k]
                for k in ("bg", "ink", "accent", "highlight")
                if k in palette_roles
            ]
            if ordered:
                plan["palette"] = ordered

    motion_spec = _normalize_motion_spec(data.get("motionSpec"))
    if motion_spec:
        plan["motionSpec"] = motion_spec
        # Prefer structured summary when free-text motion is weak
        if motion_spec.get("summary") and (
            not motion or motion == "subtle motion"
        ):
            plan["motion"] = motion_spec["summary"]

    typography = _normalize_typography(data.get("typography"))
    if typography:
        plan["typography"] = typography

    control = _normalize_control_surface(data.get("controlSurface"))
    if control:
        if inv_sections and not control.get("sections"):
            control = dict(control)
            control["sections"] = inv_sections
        plan["controlSurface"] = control
    elif inv_sections:
        plan["controlSurface"] = {
            "intent": "Catalog + custom control inventory",
            "sections": inv_sections,
            "primaryParams": [p["name"] for p in params[:5] if p.get("name")],
        }

    if inv_norm:
        plan["controlInventory"] = inv_norm

    tags = _normalize_string_list(data.get("tags"), limit=12)
    if tags:
        plan["tags"] = [t.lower().replace(" ", "-") for t in tags]

    return plan


def parse_asap_plan(text: str) -> dict[str, Any]:
    return normalize_asap_plan(extract_json_object(text))
