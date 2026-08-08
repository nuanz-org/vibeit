# canvas2d skeleton template

**Milestone:** M0c  
**TS source of truth:** `@repo/contracts/skeletons/canvas2d` → `packages/contracts/src/skeletons/canvas2d.ts`  
**Target:** `canvas2d` only · [targets.md](../targets.md) · [vibe-tool.md](../vibe-tool.md) · [param-schema.md](../param-schema.md)

---

## Purpose

One **harness + creative fill** shape for:

1. **Hand-authored** reference tools (M2a)  
2. **Create agent codegen** (M3) — model fills creative body only  
3. Repair — fix draw logic without re-deriving lifecycle  

The host always mounts a full `VibeTool`. Creative authors never reimplement mount/capture/dispose.

---

## Split of ownership

| Layer | Owns | Does **not** own |
|-------|------|------------------|
| **Harness** (`createCanvas2dTool`) | Mount root, `<canvas>`, sizing + DPR, rAF loop, merge params, load assets (`crossOrigin = "anonymous"`), `captureFrame` / `getCaptureStream`, `dispose`, hard-rule boundary | Creative look, motion design, copy |
| **Creative fill** (`Canvas2dCreative`) | `getParamSchema` / defaults / slots, `draw`, optional `setup` / `onParams` / `onAssets` | Own rAF loop, parent window, network, npm |

```text
createCanvas2dTool(creative) → VibeTool
        │
        ├─ harness: mount / update / setAssets / capture / dispose
        └─ creative: draw(+ hooks) + schema
```

---

## Creative fill API

```ts
interface Canvas2dCreative {
  getParamSchema(): ParamSchema
  getDefaultParams(): ToolParams
  getAssetSlots(): AssetSlots
  setup?(draw: Canvas2dDrawContext): void | Promise<void>  // once
  draw(draw: Canvas2dDrawContext): void                     // every frame
  onParams?(params, draw): void
  onAssets?(assets, draw): void
  dispose?(): void
}
```

`Canvas2dDrawContext` (read-mostly; draw into `ctx`):

| Field | Meaning |
|-------|---------|
| `canvas`, `ctx` | Drawing surface (`ctx` already scaled for DPR) |
| `width`, `height` | CSS pixel size — use these for layout |
| `dpr` | Device pixel ratio applied by harness |
| `params` | Current param bag |
| `assets` | Slot id → URL/ref |
| `images` | Slot id → loaded `HTMLImageElement` or `null` |
| `time`, `delta` | Seconds since mount / since last frame |
| `pointer` | `{ x, y, isOver }` in CSS px — harness-tracked pointer (hover/touch) |

Helpers exported from the same module:

| Helper | Meaning |
|--------|---------|
| `drawImageCover(ctx, img, x, y, w, h)` | Object-fit cover draw |
| `drawImageContain(ctx, img, x, y, w, h)` | Object-fit contain draw |
| `strokeSoftGlow(ctx, path, opts)` | Neon multi-width alpha strokes (**no** `shadowBlur`) |
| `fillSoftDisc(ctx, x, y, r, color, opts?)` | Soft radial head/spark disc without blur |

### Performance craft (codegen + hand tools)

- Cap backing store with harness `maxDpr` (default **2** when `autoDpr` is on).
- Prefer **one path + `strokeSoftGlow`** for trails; never `shadowBlur` inside per-segment loops.
- Particle defaults ≤ 48 (max ≤ 100); trail samples ~40–80.
- Drive glow via alpha/width, not segment count × blur.

Do **not** start your own `requestAnimationFrame` loop or attach document-level pointer listeners — use `c.pointer` each frame.

---

## Entry points

### Factory (preferred for hand tools)

```ts
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";
import type { Canvas2dCreative } from "@repo/contracts/skeletons/canvas2d";

const creative: Canvas2dCreative = {
  getParamSchema: () => [/* ... */],
  getDefaultParams: () => ({/* ... */}),
  getAssetSlots: () => [/* ... */],
  draw(c) {
    // CREATIVE_FILL
    c.ctx.fillStyle = String(c.params.bg ?? "#000");
    c.ctx.fillRect(0, 0, c.width, c.height);
  },
};

export function createTool() {
  return createCanvas2dTool(creative, { aspect: "1:1" });
}
```

### Stub shipped in contracts

```ts
import { createTool } from "@repo/contracts/skeletons/canvas2d";

const tool = createTool(); // minimal pulse + title + logo slot
```

Copy this file into the runtime host in **M2a** if you want a local editable tool; keep harness imports from `@repo/contracts` when possible.

---

## Codegen placeholder markers

When the agent emits a tool, it should only rewrite regions between markers:

```text
// --- CREATIVE_FILL start ---
draw(c) { ... }
// --- CREATIVE_FILL end ---
```

Optionally also replace `getParamSchema` / `getDefaultParams` / `getAssetSlots` as a block when the Plan changes params. **Never** regenerate harness lifecycle methods.

---

## Forbidden patterns (tool iframe)

Documented in harness source comments; enforce in host later:

| Forbidden | Why |
|-----------|-----|
| `window.parent` / `window.top` | Breakout from sandbox |
| Arbitrary `import` / npm | Closed runtime |
| `eval`, remote `<script>`, `new Function` | Remote code |
| Free `fetch` / XHR to arbitrary URLs | Data exfil / non-determinism; assets come from host |
| Starting a second rAF loop | Fights harness clock / dispose |
| Drawing without going through harness canvas | Capture/export miss the frame |

---

## Capture notes (detail in [capture-cors.md](../capture-cors.md) — M0f ✅)

- PNG: `captureFrame()` → `canvas.toBlob("image/png")`  
- Video (M7): `getCaptureStream()` → `canvas.captureStream` + MediaRecorder  
- Images loaded by harness with `crossOrigin = "anonymous"` so the canvas is not tainted  
- **M2a exit:** capture must work with a **real uploaded** asset URL, not only `data:` fixtures  


---

## Out of scope (M0c)

- Working Studio iframe host (**M2a**)  
- Live preview chrome  
- p5 / three skeletons (**M2b**)  
- LLM prompts / Plan (**M0d / M3**)  

---

## Checklist for a valid canvas2d tool

1. Built with `createCanvas2dTool` (or equivalent harness that implements full `VibeTool`)  
2. Creative `draw` uses `width`/`height` CSS pixels  
3. Schema defaults match param names  
4. Asset slots match keys used in `images` / `assets`  
5. No forbidden patterns above  
6. `dispose` path cancels animation (harness does this)  
