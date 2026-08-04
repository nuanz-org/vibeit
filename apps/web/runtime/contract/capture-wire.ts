/**
 * Wire format for PNG capture over postMessage (M2a1).
 *
 * Blobs are not JSON-serializable. The iframe converts
 * VibeTool.captureFrame() → CaptureFrameWire for the host.
 * Host can rebuild a Blob via captureFrameWireToBlob().
 *
 * Docs: md/contracts/runtime-host.md
 */

import { CAPTURE_PNG_MIME } from "@repo/contracts";

/** Serializable PNG (or image) frame for host/export. */
export interface CaptureFrameWire {
  /** MIME type; prefer image/png (CAPTURE_PNG_MIME). */
  mimeType: string;
  /**
   * Raw base64 payload **without** a `data:` URL prefix.
   * Prefer this over data URLs to keep messages smaller and unambiguous.
   */
  base64: string;
  /** Optional byte length of the decoded binary (debug / guards). */
  byteLength?: number;
}

export const CAPTURE_FRAME_WIRE_DEFAULT_MIME = CAPTURE_PNG_MIME;

/**
 * Convert a wire payload back to a Blob for download / further processing.
 * Browser-only (uses atob + Uint8Array).
 */
export function captureFrameWireToBlob(wire: CaptureFrameWire): Blob {
  const binary = atob(wire.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], {
    type: wire.mimeType || CAPTURE_FRAME_WIRE_DEFAULT_MIME,
  });
}

/**
 * Encode a Blob as CaptureFrameWire (async FileReader path).
 * Browser-only.
 */
export async function blobToCaptureFrameWire(
  blob: Blob,
): Promise<CaptureFrameWire> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    mimeType: blob.type || CAPTURE_FRAME_WIRE_DEFAULT_MIME,
    base64: btoa(binary),
    byteLength: bytes.byteLength,
  };
}

export function isCaptureFrameWire(value: unknown): value is CaptureFrameWire {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.mimeType !== "string" || v.mimeType.length === 0) return false;
  if (typeof v.base64 !== "string" || v.base64.length === 0) return false;
  if (v.byteLength !== undefined && typeof v.byteLength !== "number") {
    return false;
  }
  return true;
}
