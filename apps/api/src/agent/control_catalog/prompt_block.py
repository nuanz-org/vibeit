"""Prompt blocks that inject the control catalog into plan/codegen/repair."""

from __future__ import annotations

import json
from typing import Any

from agent.control_catalog.catalog import CONTROL_CATALOG_VERSION, active_entries


def control_catalog_prompt_block(*, compact: bool = False) -> str:
    """
    Machine-readable menu of abstract control kinds for the Plan agent.
    Adding a seed entry automatically appears here.
    """
    entries = active_entries()
    lines = [
        "--- Control Tool Catalog (abstract kinds — SELECT from these) ---",
        f"catalogVersion: {CONTROL_CATALOG_VERSION}",
        "Flow: (1) pick catalog tools you need (2) skip ones that would clutter",
        "(3) invent custom params only when no catalog kind fits",
        "(4) resolver merges selected+custom → params the user sees.",
        "",
        "Each selected item: { \"catalogId\", \"name\", \"overrides\"? }",
        "custom: full param objects with kind in color|number|text|enum|boolean|assetRef",
        "",
    ]
    for e in entries:
        if compact:
            lines.append(
                f"- {e.get('id')}: kind={e.get('kind')} uiHint={e.get('uiHint') or '—'} "
                f"| {e.get('label')}"
            )
        else:
            lines.append(f"### {e.get('id')}")
            lines.append(f"label: {e.get('label')}")
            lines.append(f"kind: {e.get('kind')}  uiHint: {e.get('uiHint') or '—'}")
            lines.append(f"whenToUse: {e.get('whenToUse')}")
            lines.append(f"whenNotToUse: {e.get('whenNotToUse')}")
            template = e.get("template")
            if isinstance(template, dict):
                # Keep template small for tokens
                slim = {
                    k: template[k]
                    for k in (
                        "kind",
                        "uiHint",
                        "default",
                        "min",
                        "max",
                        "step",
                        "maxLength",
                    )
                    if k in template
                }
                lines.append(f"template: {json.dumps(slim, ensure_ascii=False)}")
            lines.append("")
    lines.append("--- end catalog ---")
    return "\n".join(lines)


def inventory_summary_for_codegen(plan: dict[str, Any]) -> str:
    """Short note for codegen when plan has controlInventory provenance."""
    inv = plan.get("controlInventory")
    if not isinstance(inv, dict):
        return ""
    selected = inv.get("selected") if isinstance(inv.get("selected"), list) else []
    custom = inv.get("custom") if isinstance(inv.get("custom"), list) else []
    parts = [
        "Control inventory provenance (already merged into plan.params — wire all):",
        f"- catalogVersion: {inv.get('catalogVersion')}",
        f"- selected ({len(selected)}): "
        + ", ".join(
            f"{s.get('name')}←{s.get('catalogId')}"
            for s in selected
            if isinstance(s, dict)
        )[:800],
        f"- custom count: {len(custom)}",
    ]
    skipped = inv.get("skipped")
    if isinstance(skipped, list) and skipped:
        parts.append(
            "- skipped: "
            + ", ".join(
                str(s.get("catalogId"))
                for s in skipped
                if isinstance(s, dict)
            )[:400]
        )
    return "\n".join(parts) + "\n"
