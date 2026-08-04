# Capture + CORS (provisional)

**Milestone:** M0f  
**TS helpers:** `@repo/contracts` → `packages/contracts/src/capture-cors.ts`  
**Related:** [vibe-tool.md](./vibe-tool.md) · [skeletons/canvas2d.md](./skeletons/canvas2d.md) · M1c storage · M2a runtime · M7 export

**Status:** Provisional freeze for ASAP path — tighten headers/env in **M1c**; verify with real assets in **M2a**. Do not block on production-perfect CORS.

---

## Goals

1. **PNG export works** via `VibeTool.captureFrame()` on canvas2d.  
2. **Short video path is defined** (implement in M7): `getCaptureStream` + client **MediaRecorder**.  
3. **Asset loads do not taint the canvas** — `crossOrigin = "anonymous"` + storage CORS (or same-origin proxy).  
4. **M2a bar:** capture with a **real uploaded** asset, not only `data:` URL fixtures.

---

## Capture expectations (canvas2d)

| Output | Method | Notes |
|--------|--------|--------|
| **PNG** | `captureFrame()` | Prefer `image/png` `Blob` (`CAPTURE_PNG_MIME`) via `canvas.toBlob` |
| **Short video** | `getCaptureStream?()` + **client MediaRecorder** | M7; typically 3–6s WebM (`CAPTURE_VIDEO_DURATION_SECONDS`) |
| Stream FPS hint | `canvas.captureStream(30)` | `CAPTURE_STREAM_FPS` |

### Lifecycle

```text
mount → draw (with CORS-safe images) → captureFrame() / getCaptureStream()
                                              │
                                              ├─ PNG Blob → download / upload (M7)
                                              └─ MediaStream → MediaRecorder → WebM (M7)
```

Harness (M0c) already:

- Loads assets with `img.crossOrigin = "anonymous"`  
- Implements `captureFrame` → PNG blob  
- Implements `getCaptureStream` → `canvas.captureStream(30)`  

Creative fill must **not** load images with a second path that omits `crossOrigin`.

### What “export works” means

- Same-origin asset URL **or** cross-origin URL with CORS allowing the **web app origin**  
- After drawing that image, `captureFrame()` resolves to a non-empty PNG blob  
- No SecurityError from tainted canvas  

---

## Asset / CORS rules (provisional)

### 1. Tool / harness: always anonymous CORS mode

```ts
img.crossOrigin = "anonymous"; // ASSET_CROSS_ORIGIN
img.src = url;
```

| Rule | Detail |
|------|--------|
| Set `crossOrigin` **before** `src` | Otherwise the browser may not use CORS mode |
| Prefer harness `images[slotId]` | Do not re-fetch ad hoc in creative code |
| No credentialed image GETs for MVP | Matches `allowCredentials: false` on storage |

Constant: `ASSET_CROSS_ORIGIN = "anonymous"`.

### 2. Object storage must allow browser read

Object storage (or a **same-origin proxy** in front of it) must let the web origin load images for canvas use.

**Provisional policy** (`PROVISIONAL_STORAGE_CORS`):

| Setting | MVP default |
|---------|-------------|
| Allowed origins | `http://localhost:3000`, `http://127.0.0.1:3000` (+ prod web origin via env in M1c) |
| Methods | `GET`, `HEAD`, `OPTIONS` |
| Credentials | **false** (anonymous) |
| Max-Age | 86400 (illustrative) |
| Expose | `Content-Type`, `Content-Length`, `ETag` (optional) |

Illustrative response headers helper: `provisionalCorsResponseHeaders(origin)`.

**M1c responsibility:** implement real headers on the storage adapter or proxy; replace localhost origins from config.

### 3. Same-origin proxy is a valid alternative

If configuring bucket CORS is painful in local dev:

```text
Browser  →  apps/web or apps/api  /media/...  →  filesystem / S3
              (same origin or API origin with CORS)
```

Same-origin responses do not taint the canvas. Prefer this for local filesystem storage if needed.

### 4. Inspiration vs Studio assets

Same rules for **inspiration** images (Create) and **Studio** slot uploads. Any pixel drawn to the export canvas needs a CORS-safe (or same-origin) URL.

---

## Tainted canvas failure mode

If an image is drawn without CORS (or storage omits ACAO):

1. Canvas becomes **tainted**  
2. `toBlob` / `toDataURL` / reading pixels throws or returns unusable output  
3. Export fails — product should surface `tainted_canvas` (`CaptureFailureReason`)

**Common causes:**

- Forgot `crossOrigin = "anonymous"`  
- Storage missing `Access-Control-Allow-Origin` for the web origin  
- ACAO `*` combined incorrectly with credentials (we avoid credentials)  
- Hotlinking a third-party CDN that blocks CORS  

**Mitigations:**

- Always load via harness  
- Verify M1c CORS (or proxy) with a real GET from the web origin  
- M2a exit: capture with **uploaded** asset URL, not only `data:image/...`  

`data:` and blob: URLs created in-page do not taint; they are fine for unit fixtures but **do not satisfy M2a exit**.

---

## M2a exit (explicit)

| Check | Required |
|-------|----------|
| Hand-authored canvas2d tool mounts | yes |
| `captureFrame()` returns PNG | yes |
| Asset is a **real upload** (storage/proxy URL) drawn on canvas | **yes** |
| Only data-URL fixture | **not enough** for exit |

Constant: `M2A_CAPTURE_REQUIRES_REAL_ASSET = true`.

---

## Deferred (not ASAP / not canvas2d)

| Topic | When |
|-------|------|
| WebGL `preserveDrawingBuffer` | **M2b** / full M0 for p5/three |
| Full p5/three capture matrices | M2b |
| MediaRecorder UI + fallback PNG sequence | **M7** |
| Server ffmpeg / headless video farm | Out of v1 complete-loop scope |
| Live automated CORS e2e in CI | After M1c adapter exists |

`WEBGL_PRESERVE_DRAWING_BUFFER_DEFERRED = true`.

---

## Checklist for implementers

### M1c (storage)

- [ ] Serve assets with CORS for web origin **or** same-origin proxy  
- [ ] GET image from `apps/web` origin succeeds in Network tab (no CORS error)  
- [ ] Origins driven by env in prod  

### M2a (runtime host)

- [ ] Mount canvas2d tool; call `captureFrame()` after drawing an uploaded asset  
- [ ] Confirm PNG blob size &gt; 0  
- [ ] Do not claim exit with data-URL-only fixtures  

### Creative / codegen

- [ ] Do not bypass harness image loading  
- [ ] Do not set `crossOrigin` incorrectly or clear it  

---

## Import

```ts
import {
  ASSET_CROSS_ORIGIN,
  CAPTURE_PNG_MIME,
  CAPTURE_STREAM_FPS,
  CAPTURE_VIDEO_DURATION_SECONDS,
  PROVISIONAL_STORAGE_CORS,
  provisionalCorsResponseHeaders,
  M2A_CAPTURE_REQUIRES_REAL_ASSET,
  type CaptureFailureReason,
  type StorageCorsPolicy,
} from "@repo/contracts";
```

---

## Out of scope (M0f)

- Live CORS verification against a running bucket  
- MediaRecorder implementation  
- Server-side video  
- Production CDN edge rules beyond provisional defaults  
