# Control Tool Catalog

**Status:** Active (v1)  
**Seed source of truth:** `packages/contracts/src/control-catalog.seed.json`  
**Python mirror:** `apps/api/src/agent/control_catalog/control-catalog.seed.json`  
**TS types:** `packages/contracts/src/control-catalog.ts`  
**Related:** [plan-json.md](./plan-json.md) · [param-schema.md](./param-schema.md)

---

## Purpose

Give the Plan agent a **versioned menu of abstract control kinds**. The model:

1. **Selects** catalog tools needed for the vision  
2. **Skips** tools that would clutter a minimal brief (optional, with reason)  
3. **Invents custom** params when no catalog kind fits  
4. Resolver **merges** selected + custom → `ToolPlan.params` (what Studio and codegen use)

`ToolPlan` remains the runtime contract. Catalog ids are **plan-time provenance** only (`controlInventory`).

```text
Control Catalog ──► controlInventory ──► resolve ──► params / assetSlots
                                              │
                                              ▼
                                    ToolPlan (canonical)
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                      Codegen              Studio               Repair
```

---

## How to add a new control tool (extend later)

1. Add an entry to **both** seed JSON files (keep them identical):
   - `packages/contracts/src/control-catalog.seed.json`
   - `apps/api/src/agent/control_catalog/control-catalog.seed.json`
2. Set `id` (stable, dotted), `kind` (must be an existing `ParamFieldKind`), optional `uiHint`, `whenToUse` / `whenNotToUse`, `template`, `status: "active"`.
3. If you introduce a **new uiHint**, also update:
   - `ParamUiHint` in `param-schema.ts`
   - Python `PARAM_UI_HINTS` in `catalog.py`
   - Studio soft-fallback in `param-controls.tsx` / `group-params.ts`
4. No LangGraph node changes required — the next plan prompt injects the catalog automatically.

Optional later: recipe packs that expand to N params (v2) — not in v1.

---

## Catalog entry shape

| Field | Required | Notes |
|-------|----------|--------|
| `id` | yes | e.g. `number.slider` |
| `version` | yes | Entry revision |
| `kind` | yes | `color` \| `number` \| `text` \| `enum` \| `boolean` \| `assetRef` |
| `uiHint` | no | Widget preference |
| `label` | yes | Agent menu name |
| `whenToUse` / `whenNotToUse` | yes | Selection guidance |
| `template` | yes | Default partial param fields |
| `requiresAssetSlot` | no | Auto-create asset slot on resolve |
| `status` | yes | `active` \| `experimental` \| `deprecated` |

### v1 seed ids

`number.slider`, `number.unitInterval`, `boolean.switch`, `boolean.playPause`, `color.hex`, `text.single`, `text.textarea`, `enum.segmented`, `enum.select`, `enum.presetGrid`, `assetRef.image`

---

## `controlInventory` on ToolPlan

```json
{
  "controlInventory": {
    "catalogVersion": "1",
    "selected": [
      {
        "catalogId": "text.single",
        "name": "titleText",
        "overrides": { "default": "HELLO", "group": "Text" }
      }
    ],
    "skipped": [
      { "catalogId": "assetRef.image", "reason": "no photo in vision" }
    ],
    "custom": [
      {
        "name": "kerningPairs",
        "kind": "text",
        "uiHint": "textarea",
        "default": "",
        "group": "Spacing"
      }
    ]
  }
}
```

When `selected` or `custom` is non-empty, **inventory is the authority** for `params` (raw `params` from the model are ignored after successful resolve).

Legacy plans that only emit `params` still parse (all treated as free-form).

---

## Agent helpers (node-level tools)

| Helper | Role |
|--------|------|
| `control_catalog_prompt_block()` | Inject menu into plan system prompt |
| `resolve_control_inventory()` | selected + custom → params / slots |
| `validate_inventory()` | unknown ids, collisions |
| `validate_param_schema()` | structural param checks |
| `inventory_summary_for_codegen()` | Short provenance for codegen/repair |

---

## Density policy

| Vision class | Param band |
|--------------|------------|
| Simple still / minimal emblem | 3–10 |
| Interactive / designer toy | 8–40 when needed |

Completeness for **this** vision beats a fixed 72-knob template.
