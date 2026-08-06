/**
 * Sandbox / isolation policy for the tool iframe (M2a2).
 *
 * Docs: md/contracts/runtime-host.md
 */

/**
 * iframe `sandbox` tokens for M2a.
 *
 * - `allow-scripts` — tool + bridge JS must run
 * - **no** `allow-same-origin` — frame gets an opaque origin so it cannot
 *   read parent cookies/DOM even when `src` is same-site
 * - **no** `allow-popups` / `allow-top-navigation` / `allow-forms`
 *
 * Trade-off: parent posts to the frame with `targetOrigin: "*"` and accepts
 * inbound `event.origin === "null"` (opaque). See `RUNTIME_FRAME_ORIGINS`.
 */
export const RUNTIME_IFRAME_SANDBOX = "allow-scripts" as const;

/**
 * Path to the static bootstrap document under `apps/web/public/`.
 * Served at the web origin; isolation comes from sandbox, not a separate host.
 */
export const RUNTIME_FRAME_PATH = "/runtime-frame.html" as const;

/**
 * Origins allowed for inbound postMessage from the frame.
 * Opaque sandboxed frames report origin as the string `"null"`.
 */
export const RUNTIME_FRAME_ORIGINS = ["null"] as const;

/**
 * targetOrigin when parent → frame with opaque sandbox (no allow-same-origin).
 * Prefer tightening only if sandbox policy changes.
 */
export const RUNTIME_POST_MESSAGE_TARGET_ORIGIN = "*" as const;

/** Default wait for `ready` after iframe loads. */
export const RUNTIME_READY_TIMEOUT_MS = 10_000;

/** Default wait for a command `result` / `error`. */
export const RUNTIME_COMMAND_TIMEOUT_MS = 15_000;

/**
 * Extra host wait after video duration for MediaRecorder flush + base64 wire (M7b).
 * Total timeout ≈ durationMs + this buffer.
 */
export const RUNTIME_RECORD_VIDEO_TIMEOUT_BUFFER_MS = 12_000;

/**
 * CSP applied inside the frame document (meta tag).
 * Intentionally tight: scripts only self; no connect/fetch; images for assets.
 */
export const RUNTIME_FRAME_CSP = [
  "default-src 'none'",
  // blob: — dynamic import of compiled tool modules (frame-local blob URLs)
  "script-src 'self' blob:",
  "style-src 'unsafe-inline'",
  // User/storage asset URLs (local + https) + data/blob fixtures
  "img-src http: https: blob: data:",
  "media-src blob:",
  "font-src 'none'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

export type RuntimeHostStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "destroyed";
