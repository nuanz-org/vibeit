# `apps/web/runtime` — tool runtime subsystem

First-class frontend subsystem: sandboxed tool host, target loaders, capture.
Counterpart to the backend **agent** boundary (contract-driven, allowlisted).

## Status

| Slice | Status | Notes |
|-------|--------|--------|
| **M2a1** contract | ✅ Done | `contract/` message protocol + guards + capture wire |
| **M2a2** host shell | ✅ Done | `RuntimeHost` + bridge + sandbox policy |
| **M2a3** canvas2d loader | ✅ Done | Frame adapter + esbuild bundle |
| **M2a4** reference tool | ✅ Done | `fixtures/social-frame` — full schema + motion + logo/bg slots |
| **M2a5** Studio shell | ✅ Done | `/studio/social-frame` — Control + assets + preview |
| **M2a6** real-asset capture | ✅ Done | Studio prove + API CORS checklist; M2a exit met |
| **M2b** p5/three | Deferred | Fast-follow |

## Import (parent / Studio)

```ts
import {
  RuntimeHost,
  type RuntimeHostHandle,
  captureFrameWireToBlob,
} from "@/runtime";

await host.mountTool({ title: "Hi" });
await host.updateParams({ accent: "#7c5cff" });
const frame = await host.captureFrame();
```

Frame adapter is **not** re-exported from `@/runtime` (sandbox-only).

## Frame bundle

```bash
pnpm --filter web build:runtime-frame
```

| Source | Output |
|--------|--------|
| `runtime/frame/entry.ts` | loads social-frame fixture |
| `runtime/fixtures/social-frame/` | hand-authored reference tool (M2a4) |
| `runtime/targets/canvas2d/adapter.ts` | VibeTool bridge |
| → `public/runtime-frame.js` | generated IIFE |

`dev` / `build` scripts run the frame bundle step first.

## Smoke

```bash
pnpm --filter web dev
# Product Studio (auth): http://localhost:3000/studio/social-frame
# Low-level host:       http://localhost:3000/dev/runtime-host
```

### Studio (M2a5–M2a6)

1. Sign in → open `/studio` (redirects to social-frame)
2. Live preview mounts automatically
3. Tweak params → canvas updates without remount
4. Upload logo (studio) → **real asset bound**
5. **Prove real-asset PNG** → badge **M2a capture ✓** (not data: fixtures)
6. Full checklist: [md/m2a-demo-checklist.md](../../../md/m2a-demo-checklist.md)

### Dev host

1. Status **ready** → mount → update → capture

## Protocol

See **[md/contracts/runtime-host.md](../../../md/contracts/runtime-host.md)**.

## Ownership

| Side | Owns |
|------|------|
| **Parent** | UI, params/assets state, export; `RuntimeHost` commands |
| **Iframe** | `VibeTool` only via `Canvas2dFrameAdapter` |

**Sandbox:** `allow-scripts` only (opaque origin). Frame CSP blocks `connect-src`.
