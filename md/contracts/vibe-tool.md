# VibeTool contract

**Milestone:** M0a (core-loop thin freeze)  
**TS source of truth:** `@repo/contracts` → `packages/contracts/src/vibe-tool.ts`  
**Status:** Frozen enough to implement hand-authored tools and start M0b–M2a  

---

## What is a valid VibeTool?

A **VibeTool** is any creative runtime that implements the shared interface below.  
Studio, export, share/embed, and (later) the Create agent all depend on this contract — not on freeform page code.

Targets (`canvas2d` | `p5` | `three`) differ in how they draw, but **every target implements the same lifecycle and methods**.

---

## Lifecycle

```text
createTool()  →  VibeTool instance
       │
       ▼
   mount(el, { params, assets })
       │  host attaches tool under `el`; tool starts render loop if needed
       │
       ├─► update(params)          // Studio Control: colors, numbers, text, enums
       ├─► setAssets?(assets)      // Studio Assets: logo / image slots
       │
       ├─► captureFrame()          // PNG export
       ├─► getCaptureStream?()     // short video (MediaRecorder, M7)
       │
       ▼
   dispose()                       // unmount; host may remount later
```

| Phase | Who calls | Tool responsibility |
|-------|-----------|---------------------|
| **mount** | Runtime host | Create canvas/DOM under `el`, apply initial params/assets, start animation if any |
| **update** | Control UI | Apply new params and redraw / reconfigure without full remount |
| **setAssets** | Assets UI | Load slot URLs (with CORS-safe images) and refresh |
| **capture** | Export | Snapshot current frame (PNG) or expose a stream for video |
| **dispose** | Host | Cancel rAF, remove listeners, free GPU/DOM; leave `el` empty/reusable |

Introspection methods (`getParamSchema`, `getDefaultParams`, `getAssetSlots`) may be called **before or after** mount. Prefer pure, side-effect-free implementations.

---

## Interface (summary)

```ts
interface VibeTool {
  mount(el: HTMLElement, options: MountOptions): void | Promise<void>
  update(params: ToolParams): void | Promise<void>
  setAssets?(assets: ToolAssets): void | Promise<void>
  getParamSchema(): ParamSchema
  getDefaultParams(): ToolParams
  getAssetSlots(): AssetSlots
  captureFrame(): Blob | Promise<Blob>
  getCaptureStream?(): MediaStream | Promise<MediaStream>
  dispose(): void | Promise<void>
}
```

Supporting types:

| Type | Meaning |
|------|---------|
| `ToolParams` | `Record<string, unknown>` — keys match schema field `name`s |
| `ToolAssets` | Slot id → URL / blob ref (or null when empty) |
| `MountOptions` | `{ params, assets? }` — **no brand kit** object |
| `ParamSchema` | Ordered `ParamField[]` — kinds frozen in [param-schema.md](./param-schema.md) (**M0b**) |
| `AssetSlots` | Ordered `AssetSlot[]` — see [param-schema.md](./param-schema.md) (**M0b**) |

Factory shape for skeletons/codegen:

```ts
type CreateVibeTool = () => VibeTool
```

---

## Params + assets model

Prefer **params + assets** only. Brand kit is **not** required at create or mount.

| Surface | Examples | Updated via |
|---------|----------|-------------|
| **Params** | colors, speed, intensity, labels, enums | `update(params)` |
| **Assets** | logo, background, product image | `setAssets(assets)` |

- Defaults come from `getDefaultParams()` (and later Create plan / vision).
- Empty asset slots use host placeholders until the user uploads in Studio.
- Param schema drives Control UI; asset slots drive the Assets panel.

---

## Hard rules (sandbox / host)

Enforced by the runtime host and allowlisted loaders — not by TypeScript alone:

1. **No arbitrary npm** — tools do not install or import free-form packages.
2. **No parent `window` access** — tool runs in a sandboxed iframe; no breakout to host app.
3. **No unrestricted fetch** — no open network from tool code; assets are provided as URLs by the host.
4. **Allowlisted runtime only** — host loads the target runtime (`canvas2d` browser APIs; later p5/three bundles from allowlist).
5. **One target per tool** — agent selects a single target in Plan; do not mix runtimes in one tool.
6. **Same Control + export path** — all targets plug into Studio and capture via this contract.

---

## Capture expectations (provisional; full policy in M0f)

| Output | Method | Notes |
|--------|--------|--------|
| PNG | `captureFrame()` | Prefer `image/png` `Blob` |
| Short video | `getCaptureStream?()` + client MediaRecorder | M7; optional on tool until video ships |

Images drawn from user/inspiration URLs must use CORS-safe loading (`crossOrigin = "anonymous"`) or the canvas taints and capture fails. Object-storage CORS is finalized with M1c / M2a.

**Source of truth:** [capture-cors.md](./capture-cors.md) · `@repo/contracts` capture/CORS constants (`ASSET_CROSS_ORIGIN`, `PROVISIONAL_STORAGE_CORS`, `M2A_CAPTURE_REQUIRES_REAL_ASSET`).

---

## Implementing a hand-authored tool (checklist)

1. Implement `CreateVibeTool` / `VibeTool` against `@repo/contracts`.
2. Return a non-empty `getParamSchema()` + matching `getDefaultParams()` keys.
3. Declare `getAssetSlots()` (may be `[]`).
4. On `mount`, append into `el` only (do not replace host document).
5. On `dispose`, stop loops and clear children of `el`.
6. `captureFrame()` must work after mount (even with empty assets).

M0c adds the **canvas2d skeleton** (harness vs creative fill). M2a mounts a real tool in the iframe host.

---

## Out of scope here (later milestones)

| Topic | When |
|-------|------|
| Param field kinds + examples | **M0b** ✅ [param-schema.md](./param-schema.md) |
| Target registry + canvas2d skeleton | **M0c** ✅ [targets.md](./targets.md) · [skeletons/canvas2d.md](./skeletons/canvas2d.md) |
| Plan / job DTOs | **M0d / M0e** |
| CORS / storage capture notes | **M0f** ✅ [capture-cors.md](./capture-cors.md) |
| iframe host, codegen, live LLM | **M2a / M3** |

---

## Import

```ts
import type {
  VibeTool,
  CreateVibeTool,
  ToolParams,
  ToolAssets,
  MountOptions,
  ParamSchema,
  AssetSlots,
} from "@repo/contracts";
```
