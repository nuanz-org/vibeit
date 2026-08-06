/**
 * Client-side export download helpers (M7a+).
 *
 * Product rule: tool *source* is never downloadable — only rendered
 * capture outputs (PNG, later WebM / PNG-sequence).
 */

/** Sanitize a tool id / publicId / label for use in a download filename. */
export function slugifyExportBase(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "tool";
}

function timestampSlug(at: Date): string {
  return at.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/**
 * Build `{slug}-{timestamp}.png` (ISO-ish, filesystem-safe).
 * Example: `social-frame-2026-08-06T12-30-00.png`
 */
export function buildPngExportFilename(
  base: string,
  at: Date = new Date(),
): string {
  return `${slugifyExportBase(base)}-${timestampSlug(at)}.png`;
}

/**
 * Build `{slug}-{timestamp}.webm` (M7b short video export).
 */
export function buildWebmExportFilename(
  base: string,
  at: Date = new Date(),
): string {
  return `${slugifyExportBase(base)}-${timestampSlug(at)}.webm`;
}

/**
 * Build `{slug}-frames-{timestamp}.zip` (M7c PNG-sequence fallback).
 */
export function buildPngSequenceZipFilename(
  base: string,
  at: Date = new Date(),
): string {
  return `${slugifyExportBase(base)}-frames-${timestampSlug(at)}.zip`;
}

/**
 * Trigger a browser file download for a Blob.
 * Revokes the temporary object URL after a short delay so the download can start.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    throw new Error("downloadBlob requires a browser document");
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2_000);
  }
}
