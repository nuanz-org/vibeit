"""Validate control inventory + param schema shapes."""

from __future__ import annotations

from typing import Any

from agent.control_catalog.catalog import (
    PARAM_KINDS,
    PARAM_UI_HINTS,
    get_entry,
)


def validate_inventory(inventory: dict[str, Any]) -> list[str]:
    """Return human-readable errors; empty list means OK enough to resolve."""
    errors: list[str] = []
    if not isinstance(inventory, dict):
        return ["controlInventory must be an object"]

    selected = inventory.get("selected")
    if selected is None:
        selected = []
    if not isinstance(selected, list):
        errors.append("controlInventory.selected must be an array")
        selected = []

    custom = inventory.get("custom")
    if custom is None:
        custom = []
    if not isinstance(custom, list):
        errors.append("controlInventory.custom must be an array")
        custom = []

    names: set[str] = set()
    for i, item in enumerate(selected):
        if not isinstance(item, dict):
            errors.append(f"selected[{i}] must be an object")
            continue
        cid = str(item.get("catalogId") or item.get("catalog_id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not cid:
            errors.append(f"selected[{i}] missing catalogId")
        elif get_entry(cid) is None:
            errors.append(f"selected[{i}] unknown catalogId: {cid}")
        if not name:
            errors.append(f"selected[{i}] missing name")
        elif name in names:
            errors.append(f"duplicate param name: {name}")
        else:
            names.add(name)

    for i, item in enumerate(custom):
        if not isinstance(item, dict):
            errors.append(f"custom[{i}] must be an object")
            continue
        name = str(item.get("name") or "").strip()
        kind = str(item.get("kind") or "").strip()
        if not name:
            errors.append(f"custom[{i}] missing name")
        elif name in names:
            errors.append(f"duplicate param name: {name}")
        else:
            names.add(name)
        if kind not in PARAM_KINDS:
            errors.append(f"custom[{i}] invalid kind: {kind or '(empty)'}")

    skipped = inventory.get("skipped")
    if skipped is not None and not isinstance(skipped, list):
        errors.append("controlInventory.skipped must be an array when present")

    return errors


def validate_param_schema(
    params: list[Any],
    *,
    asset_slots: list[Any] | None = None,
) -> list[str]:
    """Lightweight structural checks for resolved params."""
    errors: list[str] = []
    slot_ids: set[str] = set()
    if isinstance(asset_slots, list):
        for s in asset_slots:
            if isinstance(s, dict) and s.get("id"):
                slot_ids.add(str(s["id"]))

    seen: set[str] = set()
    if not isinstance(params, list):
        return ["params must be an array"]

    for i, raw in enumerate(params):
        if not isinstance(raw, dict):
            errors.append(f"params[{i}] must be an object")
            continue
        name = str(raw.get("name") or "").strip()
        kind = str(raw.get("kind") or "").strip()
        if not name:
            errors.append(f"params[{i}] missing name")
            continue
        if name in seen:
            errors.append(f"duplicate params name: {name}")
        seen.add(name)
        if kind not in PARAM_KINDS:
            errors.append(f"params[{name}] invalid kind: {kind or '(empty)'}")
            continue

        ui = raw.get("uiHint") or raw.get("ui_hint")
        if ui is not None and str(ui).strip() and str(ui).strip() not in PARAM_UI_HINTS:
            errors.append(f"params[{name}] invalid uiHint: {ui}")

        if kind == "number":
            if "default" not in raw:
                errors.append(f"params[{name}] number missing default")
            for k in ("min", "max", "default"):
                if k in raw and raw[k] is not None and not isinstance(
                    raw[k], (int, float)
                ):
                    errors.append(f"params[{name}].{k} must be a number")
            mn, mx = raw.get("min"), raw.get("max")
            if isinstance(mn, (int, float)) and isinstance(mx, (int, float)) and mn > mx:
                errors.append(f"params[{name}] min > max")

        if kind == "enum":
            opts = raw.get("options")
            if not isinstance(opts, list) or len(opts) == 0:
                errors.append(f"params[{name}] enum needs non-empty options")
            else:
                values: list[str] = []
                for o in opts:
                    if isinstance(o, str):
                        values.append(o)
                    elif isinstance(o, dict) and o.get("value") is not None:
                        values.append(str(o["value"]))
                default = raw.get("default")
                if default is not None and values and str(default) not in values:
                    errors.append(
                        f"params[{name}] default {default!r} not in options"
                    )

        if kind in ("color", "text", "boolean") and "default" not in raw:
            # assetRef default optional
            if kind != "boolean":
                errors.append(f"params[{name}] missing default")
            elif "default" not in raw:
                errors.append(f"params[{name}] boolean missing default")

        if kind == "assetRef":
            slot = str(raw.get("assetSlotId") or raw.get("default") or name).strip()
            if slot_ids and slot not in slot_ids:
                errors.append(
                    f"params[{name}] assetSlotId {slot!r} not in assetSlots"
                )

    return errors
