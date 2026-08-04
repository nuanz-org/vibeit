/**
 * Capture helpers (M2a6 / M7).
 *
 * Wire encode/decode: contract CaptureFrameWire.
 * Real-asset gate: M2a exit (not data: fixtures).
 */

export {
  CAPTURE_FRAME_WIRE_DEFAULT_MIME,
  blobToCaptureFrameWire,
  captureFrameWireToBlob,
  isCaptureFrameWire,
} from "../contract/capture-wire";
export type { CaptureFrameWire } from "../contract/capture-wire";

export {
  CAPTURE_REQUIRES_REAL_ASSET,
  assertCaptureFrameLooksLikePng,
  assetRefToUrl,
  findRealUploadedAsset,
  gateRealAssetCapture,
  hasRealUploadedAsset,
  isFixtureAssetUrl,
  isRealUploadedAssetUrl,
  waitForPaintFrames,
} from "./real-asset";
export type { RealAssetCaptureGate } from "./real-asset";
