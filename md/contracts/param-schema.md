# Param schema + asset slots

**Milestone:** M0b (core-loop thin freeze)  
**TS source of truth:** `@repo/contracts` → `packages/contracts/src/param-schema.ts`  
**Example fixture:** `@repo/contracts` → `examples/canvas2d-social-frame` · `md/contracts/examples/canvas2d-social-frame.json`  
**Related:** [vibe-tool.md](./vibe-tool.md) (lifecycle) · M0c (canvas2d skeleton)

---

## Goals

1. **Schema-driven Control UI** — Studio builds controls from `getParamSchema()`, not hand-wired forms per tool.
2. **Clear defaults for codegen** — Create agent emits params that match this shape.
3. **Params ≠ assets** — colors/numbers/text live in params; images live in named **asset slots**. No brand kit object at create/mount.

---

## Param field kinds (MVP)

| Kind | Purpose | Example keys | Control widget (Studio A6) |
|------|---------|--------------|----------------|
| `color` | Palette overrides | `bg`, `fg`, `accent` | Color picker |
| `number` | Speed, intensity, scale | `speed`, `intensity` | Slider (`min` / `max` / `step`) |
| `text` | Labels, headlines | `title` | Text field (`maxLength?`) |
| `enum` | Discrete modes | `layout`, `motionPreset` | **Segmented** if ≤4 options or `uiHint: "segmented"`; else select |
| `boolean` | Simple toggles | `showGrid` | Switch |
| `assetRef` | Points at a named asset slot | `logoSlot` | Focus / deep-link to Assets panel (may sit inside a `group`) |

**Sections:** when any param sets `group`, Studio renders **collapsible sections** ordered by first appearance of each group title. Fields without `group` land in **Params**. With no groups, legacy buckets **Colors / Params / Linked slots** remain. `uiHint: "hidden"` omits the field from the panel.

Closed set: do not invent new kinds on the ASAP path without updating this contract.

---

## Param field JSON shape

Common:

| Field | Required | Notes |
|-------|----------|--------|
| `name` | yes | Stable key; matches `ToolParams` |
| `kind` | yes | One of the kinds above |
| `label` | no | UI label; default to `name` |
| `description` | no | Help text |
| `default` | yes\* | Required for all kinds except `assetRef` (optional there) |
| `group` | no | Section title for Studio Control (e.g. `"Distortion Effect"`) |
| `uiHint` | no | `"slider"` \| `"segmented"` \| `"select"` \| `"switch"` \| `"hidden"` |

Per kind:

| Kind | Extra fields | `default` type |
|------|--------------|----------------|
| `color` | — | string (`#rrggbb` preferred) |
| `number` | `min?`, `max?`, `step?` | number |
| `text` | `maxLength?`, `placeholder?` | string |
| `enum` | `options[]` (`value`, `label?`) — non-empty; default ∈ options | string |
| `boolean` | — | boolean |
| `assetRef` | **`assetSlotId`** (must match an `AssetSlot.id`) | string? (usually the slot id) |

Example entries:

```json
{
  "name": "speed",
  "kind": "number",
  "label": "Motion speed",
  "default": 1,
  "min": 0,
  "max": 3,
  "step": 0.05,
  "group": "Motion"
}
```

```json
{
  "name": "motionPreset",
  "kind": "enum",
  "label": "Motion",
  "default": "pulse",
  "group": "Motion",
  "uiHint": "segmented",
  "options": [
    { "value": "pulse", "label": "Pulse" },
    { "value": "drift", "label": "Drift" },
    { "value": "none", "label": "Still" }
  ]
}
```

```json
{ "name": "logoSlot", "kind": "assetRef", "label": "Logo", "assetSlotId": "logo", "default": "logo" }
```

`getParamSchema()` returns an **ordered** array (`ParamSchema`). Order = Control UI order.

---

## Asset slot shape

Assets are **not** param values. Uploads bind via `setAssets({ [slotId]: url })` / mount `assets`.

| Field | Required | Notes |
|-------|----------|--------|
| `id` | yes | Stable; keys `ToolAssets` |
| `label` | no | Assets panel label |
| `description` | no | Help text |
| `accept` | no | File picker MIME filter; default **`image/*`** |
| `required` | no | Soft requirement for export/publish UX |
| `aspectHint` | no | UI placeholder/crop hint: `1:1`, `16:9`, `9:16`, … |

```json
{
  "id": "logo",
  "label": "Logo",
  "accept": "image/*",
  "required": false,
  "aspectHint": "1:1"
}
```

`getAssetSlots()` returns an **ordered** array (`AssetSlots`). May be empty `[]`.

### Separation rules

| Concern | Where |
|---------|--------|
| Color, speed, text, mode, toggles | **Params** (`update`) |
| Logo / photo / texture binary | **Asset slots** (`setAssets`) |
| “Use logo” control that only points at a slot | Optional **`assetRef` param** (UI affordance only) |
| Brand kit / fonts package | **Out of scope** (later) |

---

## Control mapping (Studio)

| Schema | UI behavior |
|--------|-------------|
| `getParamSchema()` | Renders one control per field in array order |
| `getDefaultParams()` | Initial param state (must include a value for every non-optional default) |
| `getAssetSlots()` | Renders upload tiles in Assets panel |
| Empty asset slot | Show **generated placeholder** (color block / lettermark) until user uploads |
| User upload | Host stores object URL / CDN URL → `setAssets({ [id]: url })` |
| `assetRef` param | Does not hold image bytes; focuses or labels the linked slot |
| Param change | Host calls `tool.update(nextParams)` (full bag or merge — host chooses; tool should apply safely) |

No real Studio UI in M0b — this mapping is the contract for **M5** (and fixtures in **M2a**).

---

## Example: canvas2d social frame

Full fixture: [`examples/canvas2d-social-frame.json`](./examples/canvas2d-social-frame.json)

| Surface | Contents |
|---------|----------|
| Params | `bg`, `accent` (color) · `title` (text) · `speed` (number) · `motionPreset` (enum) · `showGrid` (boolean) · `logoSlot` (assetRef) |
| Asset slots | `logo` (1:1) · `background` (9:16) |
| Defaults | See JSON `defaultParams` |

TypeScript export:

```ts
import {
  socialFrameParamSchema,
  socialFrameAssetSlots,
  socialFrameDefaultParams,
  socialFrameExample,
} from "@repo/contracts/examples/canvas2d-social-frame";
```

---

## Authoring checklist

1. Every `ParamField.name` has a matching key in `getDefaultParams()` (except optional `assetRef` default).
2. Every `assetRef.assetSlotId` exists in `getAssetSlots()`.
3. Enum `default` is one of `options[].value`.
4. Numbers document `min` / `max` / `step` when a slider is intended.
5. Do not put image URLs in params — use slots + `ToolAssets`.
6. Do not add a nested `brandKit` object on mount.

---

## Out of scope (M0b)

- Real Studio Control / Assets UI  
- Upload pipeline / object storage binding  
- Fonts or full brand kit  
- Runtime validation library (types + docs only)

---

## Import

```ts
import type {
  ParamField,
  ParamFieldKind,
  ParamSchema,
  AssetSlot,
  AssetSlots,
  ColorParamField,
  NumberParamField,
  TextParamField,
  EnumParamField,
  BooleanParamField,
  AssetRefParamField,
} from "@repo/contracts";
```
