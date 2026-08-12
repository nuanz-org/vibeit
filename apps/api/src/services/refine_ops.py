"""
Deterministic capability ops for Studio refine.

Ops (v1):
- update_param_meta  — min/max/step/label/default/group on existing params + code sync
- update_param_value — draft (and optional default) value within bounds
"""

from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


class RefineOpError(ValueError):
    """Invalid or unapplicable capability op."""


_META_KEYS = frozenset({"min", "max", "step", "label", "default", "group", "description"})


def _schema_index(schema: list[Any], name: str) -> int:
    for i, item in enumerate(schema):
        if isinstance(item, dict) and str(item.get("name")) == name:
            return i
    raise RefineOpError(f"unknown param: {name}")


def _as_schema_list(schema: list[Any] | None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not isinstance(schema, list):
        return out
    for item in schema:
        if isinstance(item, dict) and item.get("name") is not None:
            out.append(dict(item))
    return out


def sync_param_bounds_in_code(
    code: str,
    *,
    name: str,
    updates: dict[str, Any],
) -> tuple[str, bool]:
    """
    Patch getParamSchema object for `name` so min/max/step/default/label match updates.

    Returns (new_code, changed).
    """
    if not code or not name or not updates:
        return code or "", False

    # Match a param object that includes name: "itemSpacing" (single- or double-quoted)
    pattern = re.compile(
        rf"("
        rf"\{{[^{{}}]*?"
        rf"""name:\s*["']{re.escape(name)}["']"""
        rf"[^{{}}]*?"
        rf"\}}"
        rf")",
        re.DOTALL,
    )
    match = pattern.search(code)
    if not match:
        return code, False

    block = match.group(1)
    new_block = block
    changed = False

    for key in ("min", "max", "step", "default"):
        if key not in updates:
            continue
        val = updates[key]
        if isinstance(val, bool):
            lit = "true" if val else "false"
        elif isinstance(val, (int, float)) and not isinstance(val, bool):
            lit = str(int(val)) if isinstance(val, float) and val == int(val) else str(val)
        elif isinstance(val, str):
            lit = json_string_literal(val)
        else:
            continue
        key_re = re.compile(rf"({key}\s*:\s*)([^,\n}}]+)")
        if key_re.search(new_block):
            new_block2, n = key_re.subn(rf"\g<1>{lit}", new_block, count=1)
            if n and new_block2 != new_block:
                new_block = new_block2
                changed = True
        else:
            # Insert before closing brace
            new_block = re.sub(
                r"(\n?)(\s*)\}$",
                rf",\n\2  {key}: {lit}\n\2}}",
                new_block,
                count=1,
            )
            changed = True

    if "label" in updates and isinstance(updates["label"], str):
        lit = json_string_literal(updates["label"])
        lab_re = re.compile(r'(label\s*:\s*)(["\'][^"\']*["\'])')
        if lab_re.search(new_block):
            new_block2, n = lab_re.subn(rf"\g<1>{lit}", new_block, count=1)
            if n and new_block2 != new_block:
                new_block = new_block2
                changed = True

    # Also patch getDefaultParams() entry: name: value
    if "default" in updates:
        code_after_block = code
        if changed:
            code_after_block = code[: match.start(1)] + new_block + code[match.end(1) :]
        else:
            code_after_block = code
        def_re = re.compile(
            rf"({re.escape(name)}\s*:\s*)([^,\n}}]+)",
        )
        # Only replace within getDefaultParams block if possible
        gdp = re.search(
            r"getDefaultParams\s*:\s*\(\s*\)\s*=>\s*\(([\s\S]*?)\)\s*,",
            code_after_block,
        )
        if not gdp:
            gdp = re.search(
                r"getDefaultParams\s*:\s*\(\s*\)\s*=>\s*\{([\s\S]*?return\s*\{[\s\S]*?\})[\s\S]*?\}",
                code_after_block,
            )
        if gdp and "default" in updates:
            val = updates["default"]
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                lit = str(int(val)) if isinstance(val, float) and val == int(val) else str(val)
            elif isinstance(val, str):
                lit = json_string_literal(val)
            elif isinstance(val, bool):
                lit = "true" if val else "false"
            else:
                lit = None
            if lit is not None:
                segment = gdp.group(0)
                segment2, n = def_re.subn(rf"\g<1>{lit}", segment, count=1)
                if n and segment2 != segment:
                    code_after_block = code_after_block.replace(segment, segment2, 1)
                    changed = True
        return code_after_block, changed

    if not changed:
        return code, False
    return code[: match.start(1)] + new_block + code[match.end(1) :], True


def json_string_literal(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def apply_update_param_meta(
    *,
    param_schema: list[Any] | None,
    default_params: dict[str, Any] | None,
    code: str,
    op: dict[str, Any],
) -> dict[str, Any]:
    """
    Apply update_param_meta op.

    Returns { param_schema, default_params, code, changed, applied }
    """
    name = str(op.get("name") or "").strip()
    if not name:
        raise RefineOpError("update_param_meta requires name")

    schema = _as_schema_list(param_schema)
    defaults = dict(default_params or {})
    idx = _schema_index(schema, name)
    entry = dict(schema[idx])
    applied: dict[str, Any] = {"op": "update_param_meta", "name": name}
    field_updates: dict[str, Any] = {}

    for key in _META_KEYS:
        if key in op and op[key] is not None:
            entry[key] = op[key]
            field_updates[key] = op[key]
            applied[key] = op[key]

    if not field_updates:
        raise RefineOpError("update_param_meta requires at least one of min/max/step/label/default/group")

    # Coerce numeric meta
    for k in ("min", "max", "step", "default"):
        if k in field_updates and isinstance(field_updates[k], str):
            try:
                num = float(field_updates[k])
                if num == int(num):
                    num = int(num)
                entry[k] = num
                field_updates[k] = num
                applied[k] = num
            except ValueError:
                pass

    schema[idx] = entry
    if "default" in field_updates:
        defaults[name] = field_updates["default"]

    new_code, code_changed = sync_param_bounds_in_code(
        code,
        name=name,
        updates=field_updates,
    )

    prior = None
    if isinstance(param_schema, list):
        for item in param_schema:
            if isinstance(item, dict) and str(item.get("name")) == name:
                prior = item
                break
    schema_changed = prior != entry
    defaults_changed = "default" in field_updates and (
        (default_params or {}).get(name) != field_updates["default"]
    )
    changed = schema_changed or defaults_changed or code_changed

    return {
        "param_schema": schema,
        "default_params": defaults,
        "code": new_code,
        "changed": changed,
        "applied": applied,
    }


def apply_update_param_value(
    *,
    draft_params: dict[str, Any] | None,
    param_schema: list[Any] | None,
    default_params: dict[str, Any] | None,
    op: dict[str, Any],
    also_default: bool = False,
) -> dict[str, Any]:
    """
    Apply update_param_value. Validates against schema min/max when present.

    Returns { draft_params, default_params, changed, applied }
    """
    name = str(op.get("name") or "").strip()
    if not name:
        raise RefineOpError("update_param_value requires name")
    if "value" not in op:
        raise RefineOpError("update_param_value requires value")

    schema = _as_schema_list(param_schema)
    try:
        idx = _schema_index(schema, name)
    except RefineOpError:
        # Allow values for keys present only in defaults
        if name not in (default_params or {}) and name not in (draft_params or {}):
            raise
        entry: dict[str, Any] = {"name": name}
    else:
        entry = schema[idx]

    value = op["value"]
    kind = entry.get("kind")
    if kind == "number" or isinstance(value, (int, float)):
        try:
            num = float(value)
            if num == int(num):
                num = int(num)
            value = num
        except (TypeError, ValueError) as exc:
            raise RefineOpError(f"param {name} expects a number") from exc
        if entry.get("min") is not None and value < entry["min"]:
            raise RefineOpError(
                f"param {name} value {value} below min {entry['min']}"
            )
        if entry.get("max") is not None and value > entry["max"]:
            raise RefineOpError(
                f"param {name} value {value} above max {entry['max']}; "
                "raise max with update_param_meta first"
            )

    draft = dict(draft_params or {})
    defaults = dict(default_params or {})
    changed = draft.get(name) != value
    draft[name] = value
    if also_default or op.get("alsoDefault") or op.get("also_default"):
        if defaults.get(name) != value:
            changed = True
        defaults[name] = value

    return {
        "draft_params": draft,
        "default_params": defaults,
        "changed": changed or name not in (draft_params or {}),
        "applied": {"op": "update_param_value", "name": name, "value": value},
    }


def _entry_by_name(schema: list[dict[str, Any]], name: str) -> dict[str, Any] | None:
    for item in schema:
        if str(item.get("name")) == name:
            return item
    return None


def _coerce_number(value: Any) -> float | int | None:
    try:
        num = float(value)
        if num == int(num):
            return int(num)
        return num
    except (TypeError, ValueError):
        return None


def normalize_ops_brik_style(
    ops: list[Any],
    *,
    param_schema: list[Any] | None,
) -> list[dict[str, Any]]:
    """
    Brik product pattern: expand controller ranges before setting values.

    If a value op exceeds current max (or min), inject update_param_meta first
    so the slider can reach that value — same as set_controls_schema range edit.
    """
    schema = _as_schema_list(param_schema)
    # Track planned max/min from meta ops already in the plan
    planned_max: dict[str, float | int] = {}
    planned_min: dict[str, float | int] = {}
    for raw in ops:
        if not isinstance(raw, dict):
            continue
        if str(raw.get("op") or "") != "update_param_meta":
            continue
        name = str(raw.get("name") or "").strip()
        if not name:
            continue
        if raw.get("max") is not None:
            n = _coerce_number(raw["max"])
            if n is not None:
                planned_max[name] = n
        if raw.get("min") is not None:
            n = _coerce_number(raw["min"])
            if n is not None:
                planned_min[name] = n

    out: list[dict[str, Any]] = []
    for raw in ops:
        if not isinstance(raw, dict):
            continue
        kind = str(raw.get("op") or "").strip()
        if kind != "update_param_value":
            out.append(dict(raw))
            if kind == "update_param_meta":
                name = str(raw.get("name") or "").strip()
                if name and raw.get("max") is not None:
                    n = _coerce_number(raw["max"])
                    if n is not None:
                        planned_max[name] = n
                if name and raw.get("min") is not None:
                    n = _coerce_number(raw["min"])
                    if n is not None:
                        planned_min[name] = n
            continue

        name = str(raw.get("name") or "").strip()
        value = _coerce_number(raw.get("value"))
        if not name or value is None:
            out.append(dict(raw))
            continue

        entry = _entry_by_name(schema, name) or {}
        cur_max = planned_max.get(name, entry.get("max"))
        cur_min = planned_min.get(name, entry.get("min"))
        meta: dict[str, Any] = {"op": "update_param_meta", "name": name}

        if cur_max is not None:
            mx = _coerce_number(cur_max)
            if mx is not None and value > mx:
                meta["max"] = value
                planned_max[name] = value
        if cur_min is not None:
            mn = _coerce_number(cur_min)
            if mn is not None and value < mn:
                meta["min"] = value
                planned_min[name] = value

        if len(meta) > 2:
            out.append(meta)
        out.append(dict(raw))

    return out


def build_brik_style_explain(
    *,
    ops_applied: list[Any],
    param_schema: list[Any] | None,
    fallback: str | None = None,
) -> str:
    """
    User-facing message like Brik:
    "I've expanded the **Gallery Arc** control limit so you can push … up to 3000."
    """
    schema = _as_schema_list(param_schema)
    labels = {
        str(p.get("name")): str(p.get("label") or p.get("name"))
        for p in schema
        if p.get("name") is not None
    }
    range_bits: list[str] = []
    value_bits: list[str] = []

    for op in ops_applied:
        if not isinstance(op, dict):
            continue
        kind = str(op.get("op") or "")
        name = str(op.get("name") or "")
        label = labels.get(name, name) or name
        if kind == "update_param_meta":
            parts: list[str] = []
            if op.get("max") is not None:
                parts.append(f"up to {op['max']}")
            if op.get("min") is not None:
                parts.append(f"down to {op['min']}")
            if parts:
                range_bits.append(
                    f"**{label}** control limit so you can push it {' and '.join(parts)}"
                )
            elif op.get("label"):
                range_bits.append(f"**{label}** label/metadata")
        elif kind == "update_param_value":
            value_bits.append(f"**{label}** to `{op.get('value')}`")
        elif kind == "patch_code":
            value_bits.append("code structure")

    if range_bits and not value_bits:
        # Brik default: expand range, invite user to drag slider
        primary = range_bits[0]
        extra = ""
        if len(range_bits) > 1:
            extra = " Also updated: " + "; ".join(range_bits[1:]) + "."
        return (
            f"I've expanded the {primary}.{extra}\n\n"
            "Adjust the control in the panel to dial it in. "
            "Tell me what's working and what isn't and we'll keep iterating."
        )
    if range_bits and value_bits:
        return (
            f"I've expanded the {range_bits[0]}, and set "
            f"{', '.join(value_bits)}.\n\n"
            "Tweak further in Controls if you want — tell me what's working."
        )
    if value_bits:
        return (
            f"Updated {', '.join(value_bits)}.\n\n"
            "Say if you want a wider slider range or more changes."
        )
    text = (fallback or "").strip()
    if text and text.lower() not in (
        "applied controller updates.",
        "refine applied — new version ready.",
    ):
        return text
    return "Applied controller updates. Tell me what to change next."


def apply_capability_ops(
    *,
    ops: list[Any],
    code: str,
    param_schema: list[Any] | None,
    default_params: dict[str, Any] | None,
    draft_params: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Apply ops in Brik order: normalize ranges → meta → values → patch_code.

    Returns state bag for finalize.
    """
    if not isinstance(ops, list) or not ops:
        raise RefineOpError("ops list is empty")

    ops = normalize_ops_brik_style(ops, param_schema=param_schema)

    meta_ops: list[dict[str, Any]] = []
    value_ops: list[dict[str, Any]] = []
    patch_ops: list[dict[str, Any]] = []
    for raw in ops:
        if not isinstance(raw, dict):
            continue
        kind = str(raw.get("op") or "").strip()
        if kind == "update_param_meta":
            meta_ops.append(raw)
        elif kind == "update_param_value":
            value_ops.append(raw)
        elif kind == "patch_code":
            patch_ops.append(raw)
        elif kind in ("explain", ""):
            continue
        else:
            raise RefineOpError(f"unsupported op: {kind}")

    schema = _as_schema_list(param_schema)
    defaults = dict(default_params or {})
    draft = dict(draft_params or {})
    current_code = code or ""
    applied: list[dict[str, Any]] = []
    any_changed = False
    needs_version = False
    patch_instructions: list[str] = []

    for op in meta_ops:
        result = apply_update_param_meta(
            param_schema=schema,
            default_params=defaults,
            code=current_code,
            op=op,
        )
        schema = result["param_schema"]
        defaults = result["default_params"]
        current_code = result["code"]
        applied.append(result["applied"])
        if result["changed"]:
            any_changed = True
            needs_version = True

    for op in value_ops:
        result = apply_update_param_value(
            draft_params=draft,
            param_schema=schema,
            default_params=defaults,
            op=op,
        )
        draft = result["draft_params"]
        defaults = result["default_params"]
        applied.append(result["applied"])
        if result["changed"]:
            any_changed = True
            # Value-only: draft update; version only if default also changed
            if op.get("alsoDefault") or op.get("also_default"):
                needs_version = True

    for op in patch_ops:
        instr = str(op.get("instruction") or op.get("message") or "").strip()
        if instr:
            patch_instructions.append(instr)
            any_changed = True
            needs_version = True
            applied.append({"op": "patch_code", "instruction": instr})

    if not any_changed:
        raise RefineOpError("no effective changes from ops")

    explain = build_brik_style_explain(
        ops_applied=applied,
        param_schema=schema,
    )

    return {
        "code": current_code,
        "param_schema": schema,
        "default_params": defaults,
        "draft_params": draft,
        "ops_applied": applied,
        "needs_version": needs_version or bool(patch_instructions),
        "patch_instructions": patch_instructions,
        "changed": any_changed,
        "explain": explain,
    }


def parse_capability_plan(text: str) -> dict[str, Any]:
    """Parse LLM JSON { ops, explain }."""
    from agent.patch_parse import PatchParseError, extract_json_object

    try:
        data = extract_json_object(text)
    except PatchParseError as exc:
        raise RefineOpError(str(exc)) from exc

    ops = data.get("ops")
    if ops is None and any(k in data for k in ("op", "name")):
        ops = [data]
    if not isinstance(ops, list):
        raise RefineOpError("capability plan must include ops array")
    explain = data.get("explain")
    if not isinstance(explain, str) or not explain.strip():
        explain = "Applied controller updates."
    return {"ops": ops, "explain": explain.strip()}
