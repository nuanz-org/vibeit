/**
 * Runtime host ↔ iframe message contract (M2a1).
 *
 * Source of truth for the postMessage protocol. Implementation of the
 * sandboxed host lands in M2a2+ under `runtime/host` and `runtime/targets`.
 */

export {
  CAPTURE_FRAME_WIRE_DEFAULT_MIME,
  blobToCaptureFrameWire,
  captureFrameWireToBlob,
  isCaptureFrameWire,
} from "./capture-wire";
export type { CaptureFrameWire } from "./capture-wire";

export {
  RUNTIME_ERROR_CODES,
  RUNTIME_ERROR_CODE_MEANING,
  isRuntimeErrorCode,
} from "./errors";
export type { RuntimeErrorCode } from "./errors";

export {
  FRAME_TO_HOST_TYPES,
  HOST_TO_FRAME_TYPES,
  RUNTIME_CHANNEL,
  RUNTIME_MODULE_SOURCE_MAX_CHARS,
  RUNTIME_PROTOCOL_VERSION,
  createCaptureFrameCommand,
  createDisposeCommand,
  createErrorMessage,
  createGetIntrospectionCommand,
  createMountCommand,
  createReadyMessage,
  createResultMessage,
  createRuntimeRequestId,
  createSetAssetsCommand,
  createUpdateCommand,
} from "./messages";
export type {
  CaptureFrameCommand,
  DisposeCommand,
  ErrorMessage,
  FrameToHostMessage,
  FrameToHostType,
  GetIntrospectionCommand,
  HostToFrameMessage,
  HostToFrameType,
  MountCommand,
  ReadyMessage,
  ResultMessage,
  RuntimeMessage,
  RuntimeMessageBase,
  RuntimeMessageType,
  RuntimeRequestId,
  RuntimeResultPayload,
  SetAssetsCommand,
  ToolIntrospection,
  UpdateCommand,
} from "./messages";

export {
  isCaptureFrameResult,
  isErrorMessage,
  isFrameToHostMessage,
  isHostToFrameMessage,
  isIntrospectionResult,
  isReadyMessage,
  isResultMessage,
  isRuntimeMessage,
} from "./guards";
