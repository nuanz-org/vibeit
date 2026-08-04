/**
 * Runtime host ↔ iframe error codes (M2a1).
 *
 * Stable string codes for bridge ERROR messages and Studio diagnostics.
 * Docs: md/contracts/runtime-host.md
 */

export const RUNTIME_ERROR_CODES = {
  /** Unclassified failure. */
  UNKNOWN: "UNKNOWN",
  /** Frame is not READY (handshake incomplete). */
  NOT_READY: "NOT_READY",
  /** Command requires a mounted tool. */
  NOT_MOUNTED: "NOT_MOUNTED",
  /** Message failed channel/version/shape validation. */
  INVALID_MESSAGE: "INVALID_MESSAGE",
  /** Tool method threw or rejected. */
  TOOL_THROW: "TOOL_THROW",
  /** captureFrame failed (tainted canvas, empty blob, etc.). */
  CAPTURE_FAILED: "CAPTURE_FAILED",
  /** Command or target not supported by this frame. */
  UNSUPPORTED: "UNSUPPORTED",
  /** Tool factory / target loader failed. */
  LOAD_FAILED: "LOAD_FAILED",
} as const;

export type RuntimeErrorCode =
  (typeof RUNTIME_ERROR_CODES)[keyof typeof RUNTIME_ERROR_CODES];

export const RUNTIME_ERROR_CODE_MEANING: Record<RuntimeErrorCode, string> = {
  UNKNOWN: "Unclassified runtime bridge failure",
  NOT_READY: "Iframe has not completed READY handshake",
  NOT_MOUNTED: "No tool is mounted; call mount first",
  INVALID_MESSAGE: "postMessage failed protocol validation",
  TOOL_THROW: "VibeTool method threw or rejected",
  CAPTURE_FAILED: "captureFrame could not produce a PNG payload",
  UNSUPPORTED: "Command or capability not available in this frame",
  LOAD_FAILED: "Tool or target runtime failed to load",
};

export function isRuntimeErrorCode(value: unknown): value is RuntimeErrorCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(RUNTIME_ERROR_CODES, value)
  );
}
