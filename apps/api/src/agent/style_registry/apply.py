"""Fold a chosen style into the ToolPlan: styleId, style controls, palette roles."""

from __future__ import annotations

import copy
import re
from typing import Any

from agent.style_registry.registry import get_style

_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

# Plan colour params that duplicate a style colour role (dropped when the style covers the role).
_ROLE_ALIASES: dict[str, frozenset[str]] = {
    "bg": frozenset(
        {"bg", "bgcolor", "background", "backgroundcolor", "paper", "papercolor",
         "canvas", "canvascolor", "base", "basecolor", "ground"}
    ),
    "ink": frozenset(
        {"ink", "inkcolor", "text", "textcolor", "fg", "foreground",
         "foregroundcolor", "fgcolor"}
    ),
    "accent": frozenset({"accent", "accentcolor", "highlight", "highlightcolor"}),
}


def style_for_plan(
    plan: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Return (look entry, type entry) recorded on a plan, if any."""
    if not isinstance(plan, dict):
        return None, None
    look = get_style(plan.get("styleId")) if isinstance(plan.get("styleId"), str) else None
    if look is not None and look.get("slot") != "look":
        look = None
    typ = (
        get_style(plan.get("typeTreatmentId"))
        if isinstance(plan.get("typeTreatmentId"), str)
        else None
    )
    if typ is not None and typ.get("slot") != "type":
        typ = None
    return look, typ


def _control_to_param(ctrl: dict[str, Any]) -> dict[str, Any]:
    param = {k: copy.deepcopy(v) for k, v in ctrl.items() if k != "role"}
    return param


def _ensure_slot(slots: list[dict[str, Any]], slot_id: str, label: str) -> None:
    if any(str(s.get("id") or "") == slot_id for s in slots):
        return
    slots.append({"id": slot_id, "label": label, "accept": "image/*", "required": False})


def apply_style_to_plan(
    plan: dict[str, Any],
    *,
    style_id: str,
    type_id: str | None = None,
    style_colors: dict[str, Any] | None = None,
    rationale: str | None = None,
) -> dict[str, Any]:
    """
    Return a new plan locked to `style_id`.

    - adds the style's controls (and the type treatment's) as params
    - drops plan colour params that duplicate a colour role the style owns
    - lets the plan adapt style colour defaults through `style_colors`
    - rewrites paletteRoles / palette from the style colours
    """
    look = get_style(style_id)
    if look is None or look.get("slot") != "look":
        raise ValueError(f"unknown look style {style_id!r}")
    typ = get_style(type_id) if type_id else None
    if typ is not None and typ.get("slot") != "type":
        typ = None

    out = copy.deepcopy(plan)
    out["styleId"] = look["id"]
    if typ is not None:
        out["typeTreatmentId"] = typ["id"]
    else:
        out.pop("typeTreatmentId", None)
    if rationale:
        out["styleRationale"] = str(rationale)[:400]
    out.pop("styleColors", None)

    controls = list(look.get("controls") or []) + list((typ or {}).get("controls") or [])
    control_names = {str(c["name"]) for c in controls}
    covered_roles = {str(c["role"]) for c in controls if c.get("role")}
    blocked: set[str] = set()
    for role in covered_roles:
        blocked |= _ROLE_ALIASES.get(role, frozenset())

    overrides: dict[str, str] = {}
    for name, value in (style_colors or {}).items():
        if isinstance(value, str) and _HEX_RE.match(value.strip()):
            overrides[str(name)] = value.strip().lower()

    params_in = out.get("params") if isinstance(out.get("params"), list) else []
    kept: list[dict[str, Any]] = []
    plan_by_name: dict[str, dict[str, Any]] = {}
    for p in params_in:
        if not isinstance(p, dict) or not p.get("name"):
            continue
        name = str(p["name"])
        if name in control_names:
            plan_by_name[name] = p
            continue
        if p.get("kind") == "color" and name.lower() in blocked:
            continue
        kept.append(p)

    style_params: list[dict[str, Any]] = []
    for ctrl in controls:
        param = _control_to_param(ctrl)
        name = str(param["name"])
        prior = plan_by_name.get(name)
        if param.get("kind") == "color":
            if name in overrides:
                param["default"] = overrides[name]
            elif prior and isinstance(prior.get("default"), str) and _HEX_RE.match(prior["default"]):
                param["default"] = prior["default"].lower()
        elif prior and prior.get("kind") == param.get("kind") and "default" in prior:
            # Plan may tune a style knob's default within the style's range
            default = prior["default"]
            if param.get("kind") == "number" and isinstance(default, (int, float)):
                lo = param.get("min", default)
                hi = param.get("max", default)
                param["default"] = min(max(default, lo), hi)
        style_params.append(param)

    out["params"] = kept + style_params

    slots = [s for s in (out.get("assetSlots") or []) if isinstance(s, dict)]
    for param in style_params:
        if param.get("kind") == "assetRef":
            slot_id = str(param.get("assetSlotId") or param["name"])
            _ensure_slot(slots, slot_id, str(param.get("label") or slot_id))
    out["assetSlots"] = slots

    roles: dict[str, str] = {}
    for ctrl in controls:
        role = ctrl.get("role")
        if role and role not in roles:
            match = next((p for p in style_params if p["name"] == ctrl["name"]), None)
            if match and isinstance(match.get("default"), str):
                roles[str(role)] = match["default"]
    if roles:
        palette_roles = dict(out.get("paletteRoles") or {})
        palette_roles.update(roles)
        palette_roles.pop("highlight", None)
        out["paletteRoles"] = palette_roles
        out["palette"] = [palette_roles[k] for k in ("bg", "ink", "accent") if k in palette_roles]

    surface = out.get("controlSurface")
    if isinstance(surface, dict) and isinstance(surface.get("sections"), list):
        sections = [dict(s) for s in surface["sections"] if isinstance(s, dict)]
        listed = {n for s in sections for n in (s.get("paramNames") or [])}
        for param in style_params:
            name = str(param["name"])
            if name in listed:
                continue
            group = str(param.get("group") or "Style")
            target = next((s for s in sections if s.get("label") == group), None)
            if target is None:
                target = {"id": group.lower().replace(" ", "-"), "label": group, "paramNames": []}
                sections.append(target)
            target["paramNames"] = list(target.get("paramNames") or []) + [name]
        surface = dict(surface)
        surface["sections"] = sections
        out["controlSurface"] = surface

    return out
