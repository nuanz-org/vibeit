/**
 * Capture + CORS provisional policy (M0f).
 *
 * Enough for M1c storage headers and M2a capture-with-real-asset.
 * Tighten in implementation; do not block on production-perfect CORS.
 *
 * Docs: md/contracts/capture-cors.md
 */

// ---------------------------------------------------------------------------
// Image load policy (tools / harness)
// ---------------------------------------------------------------------------

/**
 * Required on HTMLImageElement (and equivalent) when the image will be drawn
 * to a canvas that later calls `toBlob` / `toDataURL` / `captureStream`.
 *
 * canvas2d harness already sets this in `loadImage`.
 */
export const ASSET_CROSS_ORIGIN = "anonymous" as const;

/**
 * Why anonymous (not use-credentials):
 * - Export must not depend on credentialed cross-origin image requests
 * - Object storage should allow public or signed GET with CORS *, or explicit web origin
 */
export type AssetCrossOriginMode = typeof ASSET_CROSS_ORIGIN;

// ---------------------------------------------------------------------------
// Capture outputs
// ---------------------------------------------------------------------------

/** PNG capture via VibeTool.captureFrame() — preferred MIME. */
export const CAPTURE_PNG_MIME = "image/png" as const;

/**
 * Short video (M7): client MediaRecorder on canvas stream.
 * Prefer WebM; exact codec is browser-dependent.
 */
export const CAPTURE_VIDEO_MIME_PREFERRED = "video/webm" as const;

/** Suggested short-clip duration range for export MVP (seconds). */
export const CAPTURE_VIDEO_DURATION_SECONDS = {
  min: 3,
  max: 6,
  default: 4,
} as const;

/** Default FPS hint for canvas.captureStream(fps). */
export const CAPTURE_STREAM_FPS = 30 as const;

// ---------------------------------------------------------------------------
// Object storage CORS (provisional — finalize headers in M1c)
// ---------------------------------------------------------------------------

/**
 * Minimum CORS expectations for asset buckets / local storage gateway.
 * Exact header set is finalized when implementing the storage adapter (M1c).
 */
export interface StorageCorsPolicy {
  /**
   * Origins allowed to read assets from the browser (web app origin(s)).
   * Dev example: http://localhost:3000
   */
  allowedOrigins: readonly string[];
  /** Methods required for img/canvas load and optional HEAD probes. */
  allowedMethods: readonly string[];
  /** Response headers the browser may read (optional). */
  exposeHeaders?: readonly string[];
  /** Cache preflight (seconds). */
  maxAgeSeconds?: number;
  /**
   * If true, credentials mode is not used for asset GETs
   * (matches crossOrigin=anonymous).
   */
  allowCredentials: false;
}

/**
 * Default provisional policy. Replace `allowedOrigins` from env in M1c
 * (e.g. NEXT_PUBLIC web origin + BETTER_AUTH_URL host).
 */
export const PROVISIONAL_STORAGE_CORS: StorageCorsPolicy = {
  allowedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  allowedMethods: ["GET", "HEAD", "OPTIONS"],
  exposeHeaders: ["Content-Type", "Content-Length", "ETag"],
  maxAgeSeconds: 86400,
  allowCredentials: false,
};

/**
 * Suggested response headers for a storage GET (illustrative).
 * Local filesystem adapter may implement via a same-origin proxy instead.
 */
export function provisionalCorsResponseHeaders(
  requestOrigin: string | null,
  policy: StorageCorsPolicy = PROVISIONAL_STORAGE_CORS,
): Record<string, string> {
  const origin =
    requestOrigin && policy.allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : (policy.allowedOrigins[0] ?? "*");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": policy.allowedMethods.join(", "),
    "Access-Control-Max-Age": String(policy.maxAgeSeconds ?? 86400),
    // Required when ACAO is a specific origin (not *) and we vary by Origin
    Vary: "Origin",
  };

  if (policy.exposeHeaders?.length) {
    headers["Access-Control-Expose-Headers"] = policy.exposeHeaders.join(", ");
  }

  return headers;
}

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

/**
 * Known capture failure reasons (for Studio/export UX later).
 * Not HTTP status codes — product/runtime diagnostics.
 */
export type CaptureFailureReason =
  | "not_mounted"
  | "tainted_canvas"
  | "to_blob_null"
  | "no_stream"
  | "media_recorder_unsupported"
  | "unknown";

export const CAPTURE_FAILURE_MEANING: Record<CaptureFailureReason, string> = {
  not_mounted: "captureFrame/getCaptureStream called before mount",
  tainted_canvas:
    "Canvas tainted by cross-origin image without CORS — export blocked by browser",
  to_blob_null: "canvas.toBlob returned null",
  no_stream: "getCaptureStream unavailable or canvas missing",
  media_recorder_unsupported: "MediaRecorder not available in this browser (M7)",
  unknown: "Unclassified capture failure",
};

// ---------------------------------------------------------------------------
// Milestone gates (documentation as constants)
// ---------------------------------------------------------------------------

/**
 * M2a exit requirement (historical): PNG capture with a **real uploaded**
 * http(s) asset URL. Product capture also accepts user-local `blob:` assets
 * via {@link isUserLocalAssetUrl} / {@link isCaptureEligibleAssetUrl}.
 */
export const M2A_CAPTURE_REQUIRES_REAL_ASSET = true as const;

/**
 * Path markers for Vibeit upload/serve URLs (M1e raw + M1d storage).
 * Used by isRealUploadedAssetUrl for the M2a6 capture bar.
 */
export const REAL_UPLOADED_ASSET_PATH_MARKERS = [
  "/api/v1/assets/raw/",
  "/api/v1/storage/objects/",
] as const;

/**
 * True if `url` is an http(s) asset URL (server-hosted or same-origin proxy).
 * Does not include `blob:` user-local assets — see {@link isUserLocalAssetUrl}.
 */
export function isRealUploadedAssetUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  return true;
}

/**
 * User personalization media kept in the browser (LocalAssetStore → object URL).
 * Eligible for product capture; not a synthetic fixture.
 */
export function isUserLocalAssetUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return url.trim().toLowerCase().startsWith("blob:");
}

/**
 * Synthetic / non-user fixtures that must not count as “real media” for
 * product or M2a prove bars. `blob:` is **not** a fixture (user-local).
 */
export function isFixtureAssetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const t = url.trim().toLowerCase();
  return (
    t.startsWith("data:") ||
    t.startsWith("about:") ||
    t.startsWith("file:")
  );
}

/**
 * True when the URL is eligible for product PNG/video capture with media bound.
 * Accepts user-local blob URLs or http(s) uploads (not synthetic data: fixtures).
 */
export function isCaptureEligibleAssetUrl(
  url: string | null | undefined,
): boolean {
  if (!url || isFixtureAssetUrl(url)) return false;
  return isUserLocalAssetUrl(url) || isRealUploadedAssetUrl(url);
}

/**
 * True when URL is a Vibeit storage/raw serve path (stronger than generic http).
 */
export function isVibeitServedAssetUrl(url: string | null | undefined): boolean {
  if (!isRealUploadedAssetUrl(url) || isFixtureAssetUrl(url)) return false;
  try {
    const path = new URL(url!.trim()).pathname;
    return REAL_UPLOADED_ASSET_PATH_MARKERS.some((m) => path.includes(m));
  } catch {
    return false;
  }
}

/**
 * WebGL preserveDrawingBuffer — deferred to M2b / full M0 for p5/three.
 * canvas2d does not need this flag.
 */
export const WEBGL_PRESERVE_DRAWING_BUFFER_DEFERRED = true as const;
