/**
 * Capture helpers (M2a6 / M7).
 *
 * Wire encode/decode: contract CaptureFrameWire.
 * Real-asset gate: M2a exit (not data: fixtures).
 * Short video (M7b): record-video (in-frame MediaRecorder).
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

export {
  RECORD_VIDEO_DEFAULT_SECONDS,
  RECORD_VIDEO_MIME_CANDIDATES,
  RECORD_VIDEO_STREAM_FPS,
  clampRecordDurationSeconds,
  isMediaRecorderSupported,
  pickRecordVideoMimeType,
  recordMediaStreamToBlob,
} from "./record-video";
export type { RecordMediaStreamOptions } from "./record-video";
