# Export browser support (M7c)

**Related:** [capture-cors.md](./contracts/capture-cors.md) · M7a PNG · M7b WebM · M7c PNG-sequence  
**Product rule:** Exports are **client-side only** (no server Playwright/ffmpeg farm in M7).

---

## What ships

| Output | How | Default duration |
|--------|-----|------------------|
| **PNG** | `captureFrame()` → download | single frame |
| **WebM video** | In-frame `getCaptureStream()` + **MediaRecorder** | **4s** (range 3–6s) |
| **PNG sequence (fallback)** | Repeated `captureFrame` @ **4 fps** → **ZIP** of `frame-000.png`… | same 3–6s window |

Constants (source of truth):

- `@repo/contracts`: `CAPTURE_VIDEO_DURATION_SECONDS`, `CAPTURE_VIDEO_MIME_PREFERRED`, `CAPTURE_STREAM_FPS`
- Studio: `PNG_SEQUENCE_FPS = 4` in `apps/web/features/studio/lib/export-png-sequence.ts`

---

## Browser matrix (MVP)

| Browser | PNG | WebM (MediaRecorder) | PNG sequence ZIP |
|---------|-----|----------------------|------------------|
| **Chromium** (Chrome, Edge, Arc, …) | ✅ | ✅ Preferred path | ✅ Manual or auto fallback |
| **Firefox** | ✅ | ⚠️ Often works (VP8/WebM); codec variance | ✅ |
| **Safari** (desktop/iOS) | ✅ | ❌ Often missing / non-WebM | ✅ **Use this as motion export** |
| Other / embedded | ✅ | ❓ Treat as unsupported | ✅ |

### MediaRecorder notes

- Prefer MIME candidates: `video/webm`, `video/webm;codecs=vp9`, `video/webm;codecs=vp8`.
- Recording runs **inside the sandboxed iframe** (MediaStream cannot cross `postMessage`).
- Host timeout ≈ clip duration + **12s** buffer for encode + base64 wire.
- **MP4 / ffmpeg** is **not** in M7 DoD (optional later).

### When Studio falls back to PNG sequence

1. `MediaRecorder` is not available in the browser, or  
2. In-frame `recordVideo` fails (`RECORD_FAILED`, empty blob, unsupported stream, timeout, …)

UI shows a short message: WebM unavailable → sequence ZIP downloaded instead.

Users can always click **Download PNG sequence** explicitly.

---

## CORS / tainted canvas

Same rules as M2a/M0f:

- Assets must load with `crossOrigin = "anonymous"` and storage CORS allowing the web origin.
- A **tainted** canvas breaks both PNG and video (and every frame of a sequence).
- Prefer real `http(s)` studio assets over `data:` fixtures for capture validation.

See [capture-cors.md](./contracts/capture-cors.md).

---

## Manual smoke (once per machine)

### Chromium

1. Open `/studio/social-frame` (or a generated tool) → wait for **live**.  
2. **Download PNG** → file saves.  
3. **Download video (4s)** → `.webm` saves; countdown works.  
4. Optionally force sequence: **Download PNG sequence** → `.zip` with `frames/frame-*.png`.

### Non-Chromium (Safari or Firefox)

1. Same Studio path.  
2. **Download PNG** works.  
3. **Download video** either produces WebM (Firefox) or auto-falls back to PNG sequence ZIP.  
4. Confirm ZIP opens and contains multiple PNGs.

---

## Out of scope (not M7c)

- Perfect cross-browser video codecs  
- Server-side MP4 / ffmpeg  
- Audio tracks  
- Gallery / public share (M7d–M7f / M8)
