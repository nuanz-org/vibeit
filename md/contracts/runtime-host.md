# Runtime host ↔ iframe protocol

**Milestone:** M2a1 contract · M2a2 host · **M2a3 canvas2d adapter**  
**TS source of truth:** `apps/web/runtime/contract/` · host: `apps/web/runtime/host/`  
**Frame bootstrap:** `apps/web/public/runtime-frame.html` + generated `runtime-frame.js`  
**Frame source:** `apps/web/runtime/frame/entry.ts` + `targets/canvas2d/adapter.ts`  
**Related:** [vibe-tool.md](./vibe-tool.md) · [capture-cors.md](./capture-cors.md) · [skeletons/canvas2d.md](./skeletons/canvas2d.md)  
**Status:** **M2a complete** — protocol + host + adapter + social-frame + Studio + real-asset capture (M2a6). Next: M3.  

---

## Why

Studio, embed, and export must talk to a **sandboxed** tool without sharing a JS heap.

- Parent never imports creative tool modules into the app bundle for execution.
- Tool code never reaches `window.parent` app state.
- One message protocol maps to `VibeTool` methods for every target.

---

## Ownership

| Side | Role |
|------|------|
| **Host (parent)** | Studio / public / embed shell; Control state; sends commands; handles PNG download |
| **Frame (iframe)** | Loads allowlisted target + tool factory; implements lifecycle; replies with results |

```text
Studio / host                     Sandboxed iframe
     │                                   │
     │  ─────────────────────────────►   │  mount | update | setAssets
     │                                   │  captureFrame | dispose
     │                                   │  getIntrospection
     │   ◄─────────────────────────────  │  ready | result | error
     │                                   │
```

---

## Envelope

Every message is a plain object:

| Field | Value |
|-------|--------|
| `channel` | `"vibeit-runtime"` (`RUNTIME_CHANNEL`) |
| `version` | `1` (`RUNTIME_PROTOCOL_VERSION`) |
| `type` | Discriminant (see below) |
| `requestId` | Required on commands + matching `result` / command-scoped `error` |

Ignore any `message` event where `channel` / `version` do not match.

---

## Message types

### Parent → iframe (`HostToFrameMessage`)

| `type` | Payload | Maps to VibeTool |
|--------|---------|------------------|
| `mount` | `params`, optional `assets`, `toolId?`, `target?` | `mount(el, { params, assets })` then introspection |
| `update` | `params` | `update(params)` |
| `setAssets` | `assets` | `setAssets?(assets)` |
| `captureFrame` | — | `captureFrame()` → wire PNG |
| `dispose` | — | `dispose()` |
| `getIntrospection` | — | `getParamSchema` / `getDefaultParams` / `getAssetSlots` |

### Iframe → parent (`FrameToHostMessage`)

| `type` | When |
|--------|------|
| `ready` | Frame bootstrap complete; safe to send commands. Includes `target` + `capabilities`. |
| `result` | Successful reply to a command (`requestId` + `payload`). |
| `error` | Failure (`code` + `message`; `requestId` if command-scoped). |

### Result payloads (`RuntimeResultPayload`)

| `kind` | Fields |
|--------|--------|
| `mount` | `introspection` |
| `update` | — |
| `setAssets` | — |
| `captureFrame` | `frame: CaptureFrameWire` |
| `dispose` | — |
| `introspection` | `introspection` |

**Introspection** = `{ paramSchema, defaultParams, assetSlots }` — drives Studio Control without reading tool source.

---

## Capture over the wire

`Blob` is not JSON-serializable. Frame converts:

```text
VibeTool.captureFrame() → Blob → CaptureFrameWire { mimeType, base64, byteLength? }
```

Host rebuilds a `Blob` with `captureFrameWireToBlob(frame)` for download / M7 upload.

- Prefer `mimeType: "image/png"` (`CAPTURE_PNG_MIME`).
- Base64 is **raw** (no `data:image/png;base64,` prefix).
- Real-asset capture bar remains M2a6 (`M2A_CAPTURE_REQUIRES_REAL_ASSET`).

---

## Error codes

| Code | Meaning |
|------|---------|
| `UNKNOWN` | Unclassified |
| `NOT_READY` | Handshake incomplete |
| `NOT_MOUNTED` | Command needs mount first |
| `INVALID_MESSAGE` | Failed protocol validation |
| `TOOL_THROW` | VibeTool method threw/rejected |
| `CAPTURE_FAILED` | PNG encode / tainted canvas / empty |
| `UNSUPPORTED` | Command/capability missing |
| `LOAD_FAILED` | Tool or target failed to load |

Constants: `RUNTIME_ERROR_CODES` in `runtime/contract/errors.ts`.

---

## Factories & guards

| Helper | Use |
|--------|-----|
| `createMountCommand` / `createUpdateCommand` / … | Host builds commands with envelope + `requestId` |
| `createReadyMessage` / `createResultMessage` / `createErrorMessage` | Frame replies |
| `createRuntimeRequestId` | UUID (or fallback) |
| `isRuntimeMessage` / `isHostToFrameMessage` / `isFrameToHostMessage` | Validate before handle |
| `isReadyMessage` / `isResultMessage` / `isErrorMessage` | Narrow replies |

**Rule:** never trust `event.data` without a guard.

---

## Lifecycle (happy path)

```text
1. Host creates iframe (M2a2) → frame loads bootstrap + canvas2d loader (M2a3)
2. Frame → ready { target: "canvas2d", capabilities }
3. Host → mount { requestId, params, assets? }
4. Frame → result { requestId, payload: { kind: "mount", introspection } }
5. Host → update / setAssets as user edits Control
6. Host → captureFrame → result { kind: "captureFrame", frame }
7. Host → dispose (navigate away / remount)
```

---

## Hard rules (unchanged from VibeTool)

1. No arbitrary npm in the tool iframe.  
2. No parent `window` access / breakout.  
3. No unrestricted fetch — assets are URLs supplied by the host.  
4. Allowlisted target runtime only (`canvas2d` on ASAP path).  
5. One target per tool.  

Sandbox attrs + CSP are enforced by the **M2a2 host** (see below), not by TypeScript alone.

---

## M2a2 — Sandboxed host shell

### What shipped

| Piece | Path |
|-------|------|
| React host | `RuntimeHost` — `apps/web/runtime/host/RuntimeHost.tsx` |
| Bridge | `RuntimeHostBridge` — requestId correlation, ready wait, timeouts |
| Policy | `RUNTIME_IFRAME_SANDBOX`, CSP string, origins — `host/sandbox.ts` |
| Frame document | `/runtime-frame.html` + `/runtime-frame.js` (public) |
| Smoke page | `/dev/runtime-host` |

### Isolation policy

| Control | Value | Why |
|---------|--------|-----|
| `sandbox` | `allow-scripts` only | Scripts run; **no** `allow-same-origin` → opaque origin; no parent cookie/DOM access |
| Frame CSP | `default-src 'none'`; `script-src 'self' blob:`; `connect-src 'none'`; `img-src http: https: blob: data:` | Block fetch/XHR; allow asset images + blob tool modules. **Track B1–B3:** real three is product-vendored via npm (`three@0.185.1` on `@repo/contracts`) and enters the frame only by **bundled tool ESM** (`blob:`). Studio/public pass `mount.target` from `tool_versions.target` (`canvas2d` \| `p5` \| `three`). Never CDN / esm.sh. See [skeletons/three.md](./skeletons/three.md). |
| Inbound origin | `"null"` | Opaque sandboxed frames report this origin string |
| Parent → frame `targetOrigin` | `"*"` | Required when frame origin is opaque |
| Ready race | Frame **pulses** `ready` every 250ms until first host command | Parent often attaches listener on `load` after first ready |

### Frame behavior

| Phase | Behavior |
|-------|----------|
| Load | Bundle starts `Canvas2dFrameAdapter`; pulses `ready` (`target: canvas2d`, capture/setAssets true) |
| `mount` | Resolve factory: `moduleSource` (blob import) → `toolId` fixture registry → `defaultToolId`; then `createTool()` → mount → introspection |
| `update` / `setAssets` | Forward to mounted tool |
| `captureFrame` | `captureFrame()` → `CaptureFrameWire` (base64 PNG) |
| `dispose` | Tool dispose + clear `#root` (blob URL revoked on remount/stop) |
| `getIntrospection` | Mounted tool → else last `activeFactory` → else default fixture (never a stale fixed factory after generated load) |
| Errors | `NOT_MOUNTED` / `TOOL_THROW` / `CAPTURE_FAILED` / `LOAD_FAILED` |

**Delivery:** Parent compiles version TS via `POST /api/runtime/compile` (session required) and passes ESM on mount as `moduleSource`. Frame must be built **`--format=esm`** and loaded with `<script type="module">` so dynamic `import(blobUrl)` is native. CSP: `script-src 'self' blob:`.

### Build the frame bundle

```bash
pnpm --filter web build:runtime-frame
# also runs automatically before web dev / build
# MUST remain --format=esm (IIFE rewrites dynamic import(blobUrl))
```

Source: `runtime/frame/entry.ts` → fixture registry + `defaultToolId: fixture:social-frame`.  
Schema: `@repo/contracts/examples/canvas2d-social-frame` (M0b).  
Output: `public/runtime-frame.js` (ESM; do not hand-edit; commit after rebuild).

### Parent API sketch

```ts
import { RuntimeHost, captureFrameWireToBlob } from "@/runtime";
import { useRef } from "react";
import type { RuntimeHostHandle } from "@/runtime";

const ref = useRef<RuntimeHostHandle>(null);
// <RuntimeHost ref={ref} onReady={...} />
await ref.current.waitUntilReady();
const intro = await ref.current.mountTool({ title: "Hello", accent: "#7c5cff" });
await ref.current.updateParams({ title: "Updated" });
const frame = await ref.current.captureFrame();
const blob = captureFrameWireToBlob(frame);
await ref.current.disposeTool();
```

Parent **never** imports creative draw code for execution — only messages.

---

## M2a4 — Social-frame reference tool

| Item | Detail |
|------|--------|
| Path | `apps/web/runtime/fixtures/social-frame/tool.ts` |
| Factory | `createSocialFrameTool` |
| Aspect | `9:16` |
| Params | bg, accent, title, speed, motionPreset, showGrid, logoSlot (M0b schema) |
| Assets | `logo`, `background` — drawn via harness `images[slotId]` only |
| Motion | `pulse` · `drift` · `none` |
| Capture | Full contract via harness `captureFrame` / `getCaptureStream` |

---

## M2a5 — Minimal Studio shell

| Item | Detail |
|------|--------|
| Routes | `/studio` → `/studio/social-frame`; auth-gated |
| Feature | `apps/web/features/studio/` |
| Preview | `RuntimeHost` + auto-mount fixture on READY |
| Control | Schema-driven params (`ParamControls`) |
| Assets | Upload via `POST /api/v1/assets` kind=`studio` |
| State | Local React state only (not TanStack Query) |
| Source | View-only stub (no download) |
| M3 target | Redirect to `/studio/:toolId` when generation succeeds |

---

## M2a6 — Real-asset capture exit

| Item | Detail |
|------|--------|
| Checklist | [m2a-demo-checklist.md](../m2a-demo-checklist.md) |
| Helpers | `isRealUploadedAssetUrl` (`@repo/contracts`) · `gateRealAssetCapture` (`runtime/capture`) |
| Harness | `mount` / `setAssets` **await** image load before resolve |
| Studio | **Prove real-asset PNG** requires http upload URL; rejects data:/blob: |
| API | Upload + `GET /assets/raw` CORS anonymous (no credentials) |

---

## Out of scope (remaining)

| Topic | When |
|-------|------|
| Full Control polish / chat | **M5** / **M6** |
| MediaRecorder video / share | **M7** |
| p5 / three loaders | **M2b** |
| Create agent | **M3** |

---

## Import paths

```ts
import {
  RUNTIME_CHANNEL,
  RUNTIME_PROTOCOL_VERSION,
  createMountCommand,
  createCaptureFrameCommand,
  isFrameToHostMessage,
  captureFrameWireToBlob,
  RUNTIME_ERROR_CODES,
  RuntimeHost,
  RuntimeHostBridge,
  RUNTIME_IFRAME_SANDBOX,
  RUNTIME_FRAME_PATH,
} from "@/runtime";
```

Package contracts (`@repo/contracts`) remain the source of truth for **VibeTool** and param schema types. `runtime/contract` is the **host bridge protocol**; `runtime/host` is the **sandbox host implementation**.
