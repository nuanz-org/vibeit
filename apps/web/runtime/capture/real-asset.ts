/**
 * Real uploaded asset helpers for M2a6 capture exit.
 *
 * M2A_CAPTURE_REQUIRES_REAL_ASSET: PNG capture must succeed with a storage
 * (or same-origin proxy) URL — not only data: / blob: fixtures.
 */

import {
  M2A_CAPTURE_REQUIRES_REAL_ASSET,
  isFixtureAssetUrl,
  isRealUploadedAssetUrl,
  isVibeitServedAssetUrl,
  type ToolAssets,
} from "@repo/contracts";

import type { CaptureFrameWire } from "../contract/capture-wire";

/** True when M2a exit still requires a non-fixture asset URL. */
export const CAPTURE_REQUIRES_REAL_ASSET = M2A_CAPTURE_REQUIRES_REAL_ASSET;

export {
  isFixtureAssetUrl,
  isRealUploadedAssetUrl,
  isVibeitServedAssetUrl,
} from "@repo/contracts";

export function assetRefToUrl(
  ref: string | { url: string } | null | undefined,
): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url ?? null;
}

/**
 * First real uploaded URL among current tool assets, if any.
 * Prefers Vibeit `/assets/raw` / storage paths when present.
 */
export function findRealUploadedAsset(
  assets: ToolAssets,
): { slotId: string; url: string } | null {
  let generic: { slotId: string; url: string } | null = null;

  for (const [slotId, ref] of Object.entries(assets)) {
    const url = assetRefToUrl(ref);
    if (!url || isFixtureAssetUrl(url) || !isRealUploadedAssetUrl(url)) {
      continue;
    }
    if (isVibeitServedAssetUrl(url)) {
      return { slotId, url };
    }
    if (!generic) generic = { slotId, url };
  }
  return generic;
}

export function hasRealUploadedAsset(assets: ToolAssets): boolean {
  return findRealUploadedAsset(assets) != null;
}

export type RealAssetCaptureGate =
  | { ok: true; slotId: string; url: string }
  | { ok: false; reason: string };

/**
 * Gate for "prove M2a capture" — requires at least one real upload URL bound.
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
        "Upload a studio image (http storage URL) first — data: / blob: fixtures do not satisfy M2a exit",
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
