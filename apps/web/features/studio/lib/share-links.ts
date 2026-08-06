/**
 * Share / embed URL helpers (M7f).
 */

/** Public interactive tool path (M7e). */
export function publicToolPath(publicId: string): string {
  const id = publicId.trim();
  return `/t/${encodeURIComponent(id)}`;
}

/**
 * Absolute share URL for the current origin (browser only).
 * Falls back to path-only if window is unavailable.
 */
export function buildShareUrl(publicId: string, origin?: string): string {
  const path = publicToolPath(publicId);
  if (origin) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

/**
 * Embed iframe snippet pointing at the public tool page.
 * Sensible default size for 9:16 social-frame style tools.
 */
export function buildEmbedSnippet(
  publicId: string,
  options?: {
    origin?: string;
    width?: number;
    height?: number;
    title?: string;
  },
): string {
  const src = buildShareUrl(publicId, options?.origin);
  const width = options?.width ?? 360;
  const height = options?.height ?? 640;
  const title = (options?.title ?? "Vibeit tool").replace(/"/g, "'");
  return `<iframe src="${src}" width="${width}" height="${height}" title="${title}" frameborder="0" allow="autoplay; fullscreen" loading="lazy" style="border:0;border-radius:12px;max-width:100%;"></iframe>`;
}

/** Copy text to clipboard; returns false if unavailable. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
