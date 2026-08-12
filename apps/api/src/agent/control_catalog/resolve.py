"""Resolve controlInventory (selected + custom) → params + assetSlots."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from agent.control_catalog.catalog import get_entry
from agent.control_catalog.validate import validate_inventory, validate_param_schema


class ControlInventoryError(ValueError):
    """Inventory could not be resolved."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors) if errors else "control inventory error")


def _merge_options(raw: Any) -> list[dict[str, str]] | None:
    if not isinstance(raw, list) or not raw:
        return None
    out: list[dict[str, str]] = []
    for o in raw:
        if isinstance(o, str) and o.strip():
            out.append({"value": o.strip(), "label": o.strip()})
        elif isinstance(o, dict) and o.get("value") is not None:
            val = str(o["value"]).strip()
            if not val:
                continue
            label = str(o.get("label") or val).strip()
            out.append({"value": val, "label": label})
    return out or None


def _apply_overrides(
    base: dict[str, Any], overrides: dict[str, Any] | None
) -> dict[str, Any]:
    out = deepcopy(base)
    if not overrides:
        return out
    for key, value in overrides.items():
        if key in ("kind",):  # never allow changing kind away from catalog
            continue
        if key == "options":
            opts = _merge_options(value)
            if opts is not None:
                out["options"] = opts
            continue
        if key == "ui_hint":
            out["uiHint"] = value
            continue
        out[key] = value
    return out


def _normalize_resolved_param(raw: dict[str, Any]) -> dict[str, Any] | None:
    name = str(raw.get("name") or "").strip()
    kind = str(raw.get("kind") or "").strip()
    if not name or not kind:
        return None
    entry = dict(raw)
    entry["name"] = name
    entry["kind"] = kind

    if kind == "enum":
        opts = _merge_options(entry.get("options"))
        if opts:
            entry["options"] = opts
            if entry.get("default") is None and opts:
                entry["default"] = opts[0]["value"]

    if kind == "assetRef":
        slot = str(
            entry.get("assetSlotId") or entry.get("default") or name
        ).strip()
        entry["assetSlotId"] = slot
        if "default" not in entry:
            entry["default"] = slot

    if kind == "boolean" and "default" not in entry:
        entry["default"] = False

    if kind == "color" and "default" not in entry:
        entry["default"] = "#ffffff"

    if kind == "text" and "default" not in entry:
        entry["default"] = ""

    if kind == "number" and "default" not in entry:
        entry["default"] = 0

    return entry


def _ensure_asset_slot(
    slots: list[dict[str, Any]],
    slot_id: str,
    *,
    label: str | None = None,
) -> None:
    for s in slots:
        if str(s.get("id") or "") == slot_id:
            return
    slots.append(
        {
            "id": slot_id,
            "label": label or slot_id,
            "accept": "image/*",
            "required": False,
        }
    )


def _sections_from_params(params: list[dict[str, Any]]) -> list[dict[str, Any]]:
    order: list[str] = []
    groups: dict[str, list[str]] = {}
    for p in params:
        g = str(p.get("group") or "").strip()
        if not g:
            continue
        if g not in groups:
            groups[g] = []
            order.append(g)
        groups[g].append(str(p["name"]))
    sections: list[dict[str, Any]] = []
    for g in order:
        sid = g.lower().replace(" ", "-")[:64]
        sections.append({"id": sid, "label": g, "paramNames": groups[g]})
    return sections


def resolve_control_inventory(
    inventory: dict[str, Any],
    *,
    existing_slots: list[dict[str, Any]] | None = None,
    strict: bool = True,
) -> dict[str, Any]:
    """
    Materialize inventory into params + assetSlots + optional controlSurface sections.

    Returns:
      {
        "params": [...],
        "assetSlots": [...],
        "controlInventory": normalized inventory,
        "sections": [...] | None,
      }
    """
    inv_errors = validate_inventory(inventory)
    if inv_errors and strict:
        raise ControlInventoryError(inv_errors)

    selected_raw = inventory.get("selected") if isinstance(inventory, dict) else None
    custom_raw = inventory.get("custom") if isinstance(inventory, dict) else None
    selected_raw = selected_raw if isinstance(selected_raw, list) else []
    custom_raw = custom_raw if isinstance(custom_raw, list) else []

    params: list[dict[str, Any]] = []
    slots: list[dict[str, Any]] = [
        dict(s) for s in (existing_slots or []) if isinstance(s, dict)
    ]
    normalized_selected: list[dict[str, Any]] = []
    soft_errors: list[str] = list(inv_errors) if not strict else []

    for item in selected_raw:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("catalogId") or item.get("catalog_id") or "").strip()
        name = str(item.get("name") or "").strip()
        entry = get_entry(cid)
        if not entry or not name:
            if not strict:
                soft_errors.append(f"skip invalid selection {cid}/{name}")
            continue
        template = entry.get("template") if isinstance(entry.get("template"), dict) else {}
        base: dict[str, Any] = {
            **deepcopy(template),
            "kind": entry.get("kind") or template.get("kind"),
            "name": name,
        }
        if entry.get("uiHint") and "uiHint" not in base:
            base["uiHint"] = entry["uiHint"]
        if not base.get("label"):
            base["label"] = name

        overrides = item.get("overrides")
        if not isinstance(overrides, dict):
            overrides = None
        merged = _apply_overrides(base, overrides)
        merged["name"] = name
        merged["kind"] = entry.get("kind") or merged.get("kind")

        resolved = _normalize_resolved_param(merged)
        if resolved is None:
            continue

        if entry.get("requiresAssetSlot") or resolved.get("kind") == "assetRef":
            slot_id = str(
                resolved.get("assetSlotId") or resolved.get("default") or name
            )
            resolved["assetSlotId"] = slot_id
            resolved["default"] = resolved.get("default") or slot_id
            _ensure_asset_slot(
                slots,
                slot_id,
                label=str(resolved.get("label") or slot_id),
            )

        params.append(resolved)
        normalized_selected.append(
            {
                "catalogId": cid,
                "name": name,
                **({"overrides": overrides} if overrides else {}),
            }
        )

    normalized_custom: list[dict[str, Any]] = []
    for item in custom_raw:
        if not isinstance(item, dict):
            continue
        resolved = _normalize_resolved_param(dict(item))
        if resolved is None:
            continue
        if resolved.get("kind") == "assetRef":
            slot_id = str(
                resolved.get("assetSlotId") or resolved.get("default") or resolved["name"]
            )
            resolved["assetSlotId"] = slot_id
            _ensure_asset_slot(
                slots,
                slot_id,
                label=str(resolved.get("label") or slot_id),
            )
        params.append(resolved)
        normalized_custom.append(resolved)

    schema_errors = validate_param_schema(params, asset_slots=slots)
    if schema_errors and strict:
        raise ControlInventoryError(schema_errors)

    skipped_raw = inventory.get("skipped") if isinstance(inventory, dict) else None
    skipped: list[dict[str, str]] = []
    if isinstance(skipped_raw, list):
        for s in skipped_raw:
            if not isinstance(s, dict):
                continue
            cid = str(s.get("catalogId") or s.get("catalog_id") or "").strip()
            reason = str(s.get("reason") or "").strip()
            if cid:
                skipped.append({"catalogId": cid, "reason": reason or "skipped"})

    catalog_version = (
        str(inventory.get("catalogVersion") or inventory.get("catalog_version") or "1")
        if isinstance(inventory, dict)
        else "1"
    )

    control_inventory: dict[str, Any] = {
        "catalogVersion": catalog_version,
        "selected": normalized_selected,
        "custom": normalized_custom,
    }
    if skipped:
        control_inventory["skipped"] = skipped

    sections = _sections_from_params(params)

    return {
        "params": params,
        "assetSlots": slots,
        "controlInventory": control_inventory,
        "sections": sections or None,
        "errors": soft_errors + (schema_errors if not strict else []),
    }
