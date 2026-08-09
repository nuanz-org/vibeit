/**
 * Prefer same-origin asset paths so browser loads go through Next rewrites
 * (`/api/v1/*` → FastAPI) instead of hard-coded :8000 origins.
 */
export function normalizePublicAssetUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const parsed = new URL(trimmed, origin);
    if (parsed.pathname.startsWith("/api/v1/")) {
      return parsed.pathname + parsed.search;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
