# three skeleton + product vendor (Track B)

**TS source of truth:**  
- Harness (**B2 real three**): `@repo/contracts/skeletons/three` → `packages/contracts/src/skeletons/three.ts`  
- Vendor pin (B1): `@repo/contracts/skeletons/three-vendor` → `packages/contracts/src/skeletons/three-vendor.ts`  
**Status track:** [md/brik-class-controls-track.md](../../brik-class-controls-track.md) · **B1–B5 done**
**Related:** [targets.md](../targets.md) · [runtime-host.md](../runtime-host.md) · [canvas2d.md](./canvas2d.md)

---

## B1 design freeze (locked)

| Decision | Choice |
|----------|--------|
| Supply | **npm** package `three`, exact pin **`0.185.1`** on `@repo/contracts` |
| Not allowed | esm.sh, unpkg, jsdelivr, skypack, raw GitHub, or any remote script/module URL |
| Lockfile | pnpm workspace lock (`pnpm-lock.yaml`) is the install source of truth |
| Product import path | `@repo/contracts/skeletons/three-vendor` (exports `THREE`, `THREE_VIBEIT_PIN`) |
| Tool / agent import path | **Only** `@repo/contracts/skeletons/three` (`createThreeTool`, re-exported `THREE`) |
| Bare `from "three"` in tool source | **Forbidden** (static allowlist + compile allowlist) |
| `three/addons/*` in tool source | **Forbidden** — future OrbitControls re-export from harness only |
| CSP | Unchanged: `script-src 'self' blob:`; `connect-src 'none'` — remote three cannot load |
| Sandbox | Still iframe `allow-scripts` only (no OS container) |
| Config gate | `VIBEIT_TARGET_THREE_ENABLED` remains default **off** until B5 |

---

## B2 harness (real three)

### Ownership

| Layer | Owns |
|-------|------|
| **Harness** (`createThreeTool`) | `Scene`, `WebGLRenderer` (`preserveDrawingBuffer`), `PerspectiveCamera`, resize/DPR, rAF, auto-`render`, capture, dispose |
| **Creative fill** | `setup` (meshes/lights), `draw` (animate), param schema |

### `ThreeDrawContext`

| Field | Meaning |
|-------|---------|
| `THREE` | Product-vendored three namespace (same pin) |
| `scene` | Shared `THREE.Scene` |
| `camera` | `THREE.PerspectiveCamera` |
| `renderer` | `THREE.WebGLRenderer` |
| `gl` | Underlying WebGL context (escape hatch) |
| `width` / `height` / `dpr` | CSS size + pixel ratio |
| `params` / `assets` / `time` / `delta` | Same as canvas2d harness |
| `setBackground(color)` | Hex string or RGB floats → scene + clear color |
| `render()` | Manual render (usually unnecessary) |

### Options

```ts
createThreeTool(creative, {
  aspect: "1:1",
  autoDpr: true,
  fov: 45,
  autoRender: true, // harness renders after each draw
})
```

### Creative pattern

```ts
import { createThreeTool, THREE } from "@repo/contracts/skeletons/three";

export const createTool = () =>
  createThreeTool({
    getParamSchema: () => [ /* … */ ],
    getDefaultParams: () => ({ /* … */ }),
    getAssetSlots: () => [],
    setup(c) {
      c.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      c.scene.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: "#7c5cff" }),
        ),
      );
      c.camera.position.set(1.6, 1.2, 2.2);
      c.camera.lookAt(0, 0, 0);
    },
    draw(c) {
      c.setBackground(String(c.params.bg ?? "#0a0a12"));
      // animate meshes; harness auto-renders
    },
  }, { aspect: "1:1", autoDpr: true });
```

### Compile / delivery (B2 choice)

| Item | Value |
|------|--------|
| Delivery | **Bundle** product three into tool ESM via esbuild (same as canvas2d harness imports) |
| Minify | `minify: true` on tool compile |
| `COMPILED_JS_MAX_CHARS` | **1_500_000** (was 500_000) |
| `RUNTIME_MODULE_SOURCE_MAX_CHARS` | **1_500_000** |
| CSP | Unchanged — three rides in `blob:` module or stays inside bundled self |

Frame-preload + external remains a future optimization if postMessage cost becomes an issue.

---

## Who imports what

```text
Agent / golden tool source
  └─ import { createThreeTool, THREE } from "@repo/contracts/skeletons/three"
        │
        └─ harness imports:
              import { THREE, … } from "./three-vendor"
                    └─ npm "three"@0.185.1
```

| Consumer | Allowed imports |
|----------|-----------------|
| Creative / codegen tool TS | `@repo/contracts/skeletons/three` only (incl. re-exported `THREE`) |
| Product harness | `./three-vendor` + three APIs |
| Frame CSP scripts | `'self'` + `blob:` |

---

## CSP

Frame meta + `RUNTIME_FRAME_CSP` (`apps/web/runtime/host/sandbox.ts`):

- `script-src 'self' blob:` — no remote three  
- `connect-src 'none'` — no fetch of modules  
- Vendored three enters only by **bundle**, never by network  

Keep `runtime-frame.html` meta in sync with `sandbox.ts`.

---

## B3 Studio / public mount

| Surface | Behavior |
|---------|----------|
| Studio generated tools | `resolveRuntimeTarget(version.target)` → `mountTool({ target, moduleSource })` |
| Public `/t/[publicId]` | Same target from published version |
| Frame adapter | Accepts mount `target` `canvas2d` \| `p5` \| `three`; blob-imports moduleSource |
| Fixtures | Still default READY/`social-frame` = canvas2d |

Helper: `apps/web/features/studio/lib/resolve-runtime-target.ts`

## B4 agent policy (when `VIBEIT_TARGET_THREE_ENABLED=1`)

| Piece | Behavior |
|-------|----------|
| Plan prompts | Enabled-target block; prefer three for materials / cube logos / WebGL |
| Soft-upgrade | If model stayed on canvas2d but vision strongly wants 3D → force three |
| Codegen | `codegen_system_prompt("three")` — setup/draw + MeshStandardMaterial craft |
| Repair | three-specific fix prompt |
| Goldens | `three-depth` retrieved for three plans (material/cube/logo tags) |

## B5 eval gates

```bash
cd apps/api && uv run python scripts/eval_three.py
```

Offline suite (CI-safe): policy, vendor pin, harness, three-depth smoke, allowlist, B4 prompts, B3 mount, corpus.  
**Exit 0** → safe to set `VIBEIT_TARGET_THREE_ENABLED=1`. Product default stays **off**.

Corpus: `apps/api/evals/create/three/prompts.json` · README: `evals/create/three/README.md`

## Optional follow-ups

1. Optional OrbitControls via product re-export (not bare addons import)  
2. Richer multi-axis three golden (kinetic cube) if live craft needs it  
3. Committed live LLM shootout for three corpus

---

## Verification

**B1**

- `packages/contracts` depends on `"three": "0.185.1"` (exact)  
- `THREE_VIBEIT_PIN === "0.185.1"`  
- Static/compile allowlist rejects bare `"three"` and remote URLs  

**B2**

- `createThreeTool` builds Scene / WebGLRenderer / PerspectiveCamera  
- Golden `three-depth` uses MeshStandardMaterial + lights (no raw shader stub)  
- `uv run python tests/test_track_b2_three_harness.py`  
- `packages/contracts` `tsc --noEmit`  
