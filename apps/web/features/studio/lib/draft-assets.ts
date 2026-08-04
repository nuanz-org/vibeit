import type { AssetSlots, ToolAssets, ToolParams } from "@repo/contracts";

/** Convert API draft_assets bag → runtime ToolAssets (drop nulls). */
export function draftAssetsToToolAssets(
  draft: Record<string, string | null> | undefined | null,
): ToolAssets {
  const out: ToolAssets = {};
  if (!draft) return out;
  for (const [slotId, url] of Object.entries(draft)) {
    if (typeof url === "string" && url.trim()) {
      out[slotId] = url.trim();
    }
  }
  return out;
}

/**
 * Build full-replace draft_assets bag from live runtime assets + known slots.
 * Empty slots are explicit null so the server clears them.
 */
export function toolAssetsToDraftBag(
  assets: ToolAssets,
  slots: AssetSlots,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const slot of slots) {
    out[slot.id] = assetUrl(assets[slot.id]);
  }
  for (const [slotId, ref] of Object.entries(assets)) {
    if (!(slotId in out)) {
      out[slotId] = assetUrl(ref);
    }
  }
  return out;
}

export function assetUrl(ref: ToolAssets[string]): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url ?? null;
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
