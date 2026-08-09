import type { AssetSlots, ToolAssets, ToolParams } from "@repo/contracts";
import {
  isRealUploadedAssetUrl,
  isUserLocalAssetUrl,
} from "@repo/contracts";

/** Convert API draft_assets bag → runtime ToolAssets (drop nulls / non-http). */
export function draftAssetsToToolAssets(
  draft: Record<string, string | null> | undefined | null,
): ToolAssets {
  const out: ToolAssets = {};
  if (!draft) return out;
  for (const [slotId, url] of Object.entries(draft)) {
    if (typeof url !== "string" || !url.trim()) continue;
    const trimmed = url.trim();
    // Server drafts only hydrate remote http(s) assets (local lives in IDB).
    if (isRealUploadedAssetUrl(trimmed) && !isUserLocalAssetUrl(trimmed)) {
      out[slotId] = trimmed;
    }
  }
  return out;
}

/**
 * Build full-replace draft_assets bag from live runtime assets + known slots.
 * Empty slots are explicit null so the server clears them.
 * Local blob: URLs are never sent to the API (local-first assets).
 */
export function toolAssetsToDraftBag(
  assets: ToolAssets,
  slots: AssetSlots,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const slot of slots) {
    out[slot.id] = draftSafeAssetUrl(assets[slot.id]);
  }
  for (const [slotId, ref] of Object.entries(assets)) {
    if (!(slotId in out)) {
      out[slotId] = draftSafeAssetUrl(ref);
    }
  }
  return out;
}

export function assetUrl(ref: ToolAssets[string]): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url ?? null;
}

/**
 * URL safe to persist on the server draft bag.
 * blob:/data:/local-only → null (bindings live in ProjectAssetMap).
 */
export function draftSafeAssetUrl(ref: ToolAssets[string]): string | null {
  const url = assetUrl(ref);
  if (!url) return null;
  if (isUserLocalAssetUrl(url)) return null;
  if (!isRealUploadedAssetUrl(url)) return null;
  return url;
}

/** JSON-safe param bag for PATCH draftParams. */
export function paramsToDraftBag(params: ToolParams): Record<string, unknown> {
  return { ...params };
}

/** Stable snapshot for dirty detection. */
export function draftSnapshot(
  params: ToolParams,
  assets: ToolAssets,
  slots: AssetSlots,
): string {
  return JSON.stringify({
    params: paramsToDraftBag(params),
    assets: toolAssetsToDraftBag(assets, slots),
  });
}
