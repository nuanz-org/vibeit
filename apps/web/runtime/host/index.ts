/**
 * Sandboxed iframe host (M2a2).
 *
 * - RuntimeHost — React iframe + bridge wiring
 * - RuntimeHostBridge — postMessage correlation (also usable without React)
 * - sandbox policy constants
 */

export { RuntimeHostBridge } from "./bridge";
export type { RuntimeHostBridgeOptions } from "./bridge";
export { RuntimeBridgeError } from "./bridge-error";
export { resolveAssetsForFrame } from "./resolve-assets-for-frame";
export { RuntimeHost } from "./RuntimeHost";
export type { RuntimeHostHandle, RuntimeHostProps } from "./RuntimeHost";
export {
  RUNTIME_COMMAND_TIMEOUT_MS,
  RUNTIME_FRAME_CSP,
  RUNTIME_FRAME_ORIGINS,
  RUNTIME_FRAME_PATH,
  RUNTIME_IFRAME_SANDBOX,
  RUNTIME_POST_MESSAGE_TARGET_ORIGIN,
  RUNTIME_READY_TIMEOUT_MS,
  RUNTIME_RECORD_VIDEO_TIMEOUT_BUFFER_MS,
} from "./sandbox";
export type { RuntimeHostStatus } from "./sandbox";
