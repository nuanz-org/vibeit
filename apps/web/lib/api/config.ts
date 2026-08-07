/**
 * Base URL for FastAPI (`/api/v1/...`).
 *
 * Priority:
 * 1. `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_API_URL` when set to an absolute URL
 * 2. Browser default: same-origin `""` so requests hit Next rewrites → FastAPI
 *    (avoids cross-origin CORS / cookie issues in local dev)
 * 3. Server (SSR / Route Handlers): `API_INTERNAL_URL` or `http://127.0.0.1:8000`
 *
 * Session cookies use `credentials: "include"`. Same-origin keeps Better Auth
 * cookies on :3000 without relying on cross-port CORS.
 */
export function getApiBaseUrl(): string {
  const configured = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  // Explicit absolute API (cross-origin). Requires API CORS allowlist.
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured;
  }

  // same-origin / empty → relative /api/v1 on the web origin
  if (typeof window === "undefined") {
    return (
      process.env.API_INTERNAL_URL?.replace(/\/$/, "") ||
      "http://127.0.0.1:8000"
    );
  }
  return "";
}
