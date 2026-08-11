/**
 * Capture-eligible media helpers (M2a6 / local-first).
 *
 * Eligible: user-local blob: (IndexedDB) or http(s) uploads.
 * Not eligible: synthetic data: fixtures.
 */

import {
  M2A_CAPTURE_REQUIRES_REAL_ASSET,
  isCaptureEligibleAssetUrl,
  isRealUploadedAssetUrl,
  isUserLocalAssetUrl,
  isAiditrServedAssetUrl,
  type ToolAssets,
} from "@repo/contracts";

import type { CaptureFrameWire } from "../contract/capture-wire";

/** True when M2a exit still requires a non-fixture asset URL. */
export const CAPTURE_REQUIRES_REAL_ASSET = M2A_CAPTURE_REQUIRES_REAL_ASSET;

export {
  isCaptureEligibleAssetUrl,
  isFixtureAssetUrl,
  isRealUploadedAssetUrl,
  isUserLocalAssetUrl,
  isAiditrServedAssetUrl,
} from "@repo/contracts";

export function assetRefToUrl(
  ref: string | { url: string } | null | undefined,
): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url ?? null;
}

/**
 * First capture-eligible asset among current tool assets.
 * Prefers user-local blob, then Aiditr raw/storage URLs, then other http(s).
 */
export function findRealUploadedAsset(
  assets: ToolAssets,
): { slotId: string; url: string } | null {
  let local: { slotId: string; url: string } | null = null;
  let aiditr: { slotId: string; url: string } | null = null;
  let generic: { slotId: string; url: string } | null = null;

  for (const [slotId, ref] of Object.entries(assets)) {
    const url = assetRefToUrl(ref);
    if (!url || !isCaptureEligibleAssetUrl(url)) {
      continue;
    }
    if (isUserLocalAssetUrl(url)) {
      if (!local) local = { slotId, url };
      continue;
    }
    if (isAiditrServedAssetUrl(url)) {
      if (!aiditr) aiditr = { slotId, url };
      continue;
    }
    if (isRealUploadedAssetUrl(url) && !generic) {
      generic = { slotId, url };
    }
  }
  return local ?? aiditr ?? generic;
}

export function hasRealUploadedAsset(assets: ToolAssets): boolean {
  return findRealUploadedAsset(assets) != null;
}

export type RealAssetCaptureGate =
  | { ok: true; slotId: string; url: string }
  | { ok: false; reason: string };

/**
 * Gate for product / prove capture — needs at least one eligible media bind
 * (user-local blob: or http(s) upload). Synthetic data: fixtures do not count.
 */
export function gateRealAssetCapture(assets: ToolAssets): RealAssetCaptureGate {
  if (!CAPTURE_REQUIRES_REAL_ASSET) {
    const any = Object.entries(assets).find(([, ref]) => assetRefToUrl(ref));
    if (any) {
      const url = assetRefToUrl(any[1])!;
      return { ok: true, slotId: any[0], url };
    }
    return { ok: false, reason: "No assets bound" };
  }

  const found = findRealUploadedAsset(assets);
  if (!found) {
    return {
      ok: false,
      reason:
        "Add a photo in Assets first (stays on this device). Synthetic data: fixtures do not count.",
    };
  }
  return { ok: true, slotId: found.slotId, url: found.url };
}

/**
 * Minimal PNG integrity check on a CaptureFrameWire payload.
 */
export function assertCaptureFrameLooksLikePng(frame: CaptureFrameWire): void {
  if (!frame.base64 || frame.base64.length < 32) {
    throw new Error("Capture payload too small to be a PNG");
  }
  const mime = (frame.mimeType || "").toLowerCase();
  if (mime && !mime.includes("png") && !mime.includes("image")) {
    throw new Error(`Unexpected capture mimeType: ${frame.mimeType}`);
  }
  const head = frame.base64.slice(0, 8);
  if (!head.startsWith("iVBOR") && !mime.includes("png")) {
    if (frame.byteLength != null && frame.byteLength < 8) {
      throw new Error("Capture byteLength too small");
    }
  }
}

/** Wait two animation frames so the tool draws loaded assets before capture. */
export function waitForPaintFrames(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "undefined") {
      setTimeout(resolve, 32);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
