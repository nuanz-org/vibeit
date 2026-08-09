/**
 * Prepare ToolAssets for the opaque-origin tool iframe.
 *
 * Parent-created `blob:` URLs are NOT loadable inside `sandbox="allow-scripts"`
 * (no allow-same-origin). Convert them to `data:` URLs so the frame harness
 * can loadImage successfully. http(s) URLs pass through unchanged.
 *
 * @see md/local-first-assets.md
 */

import type { AssetRef, ToolAssets } from "@repo/contracts";

function refUrl(ref: AssetRef | null | undefined): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url ?? null;
}

function isParentBlobUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith("blob:");
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  if (!res.ok) {
    throw new Error(`Failed to read local asset (${res.status})`);
  }
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("FileReader did not produce a data URL"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Returns a new assets map safe to postMessage into the runtime frame.
 * On conversion failure for a slot, that slot becomes null (frame empty).
 */
export async function resolveAssetsForFrame(
  assets: ToolAssets | undefined | null,
): Promise<ToolAssets> {
  if (!assets) return {};
  const out: ToolAssets = {};
  const entries = Object.entries(assets);

  await Promise.all(
    entries.map(async ([slotId, ref]) => {
      if (ref == null) {
        out[slotId] = null;
        return;
      }
      const url = refUrl(ref);
      if (!url) {
        out[slotId] = null;
        return;
      }
      if (!isParentBlobUrl(url)) {
        out[slotId] = typeof ref === "string" ? url : { ...ref, url };
        return;
      }
      try {
        const dataUrl = await blobUrlToDataUrl(url);
        out[slotId] =
          typeof ref === "string" ? dataUrl : { ...ref, url: dataUrl };
      } catch {
        out[slotId] = null;
      }
    }),
  );

  return out;
}
