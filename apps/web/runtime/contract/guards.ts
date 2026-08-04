/**
 * Runtime message type guards (M2a1).
 *
 * Use on every `message` event before handling — never trust postMessage data.
 */

import type { CaptureFrameWire } from "./capture-wire";
import { isCaptureFrameWire } from "./capture-wire";
import {
  FRAME_TO_HOST_TYPES,
  HOST_TO_FRAME_TYPES,
  RUNTIME_CHANNEL,
  RUNTIME_PROTOCOL_VERSION,
  type ErrorMessage,
  type FrameToHostMessage,
  type FrameToHostType,
  type HostToFrameMessage,
  type HostToFrameType,
  type ReadyMessage,
  type ResultMessage,
  type RuntimeMessage,
  type RuntimeResultPayload,
  type ToolIntrospection,
} from "./messages";
import { isRuntimeErrorCode } from "./errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function hasEnvelope(value: Record<string, unknown>): boolean {
  return (
    value.channel === RUNTIME_CHANNEL &&
    value.version === RUNTIME_PROTOCOL_VERSION &&
    typeof value.type === "string"
  );
}

function isHostToFrameType(type: string): type is HostToFrameType {
  return (HOST_TO_FRAME_TYPES as readonly string[]).includes(type);
}

function isFrameToHostType(type: string): type is FrameToHostType {
  return (FRAME_TO_HOST_TYPES as readonly string[]).includes(type);
}

function isToolIntrospection(value: unknown): value is ToolIntrospection {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.paramSchema) &&
    isRecord(value.defaultParams) &&
    Array.isArray(value.assetSlots)
  );
}

function isRuntimeResultPayload(value: unknown): value is RuntimeResultPayload {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  switch (value.kind) {
    case "mount":
    case "introspection":
      return isToolIntrospection(value.introspection);
    case "update":
    case "setAssets":
    case "dispose":
      return true;
    case "captureFrame":
      return isCaptureFrameWire(value.frame);
    default:
      return false;
  }
}

/** True if value is any known runtime protocol message. */
export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return isHostToFrameMessage(value) || isFrameToHostMessage(value);
}

/** True if value is a parent → iframe command. */
export function isHostToFrameMessage(
  value: unknown,
): value is HostToFrameMessage {
  if (!isRecord(value) || !hasEnvelope(value)) return false;
  const type = value.type;
  if (typeof type !== "string" || !isHostToFrameType(type)) return false;
  if (typeof value.requestId !== "string" || value.requestId.length === 0) {
    return false;
  }

  switch (type) {
    case "mount":
      return isRecord(value.params);
    case "update":
      return isRecord(value.params);
    case "setAssets":
      return isRecord(value.assets);
    case "captureFrame":
    case "dispose":
    case "getIntrospection":
      return true;
    default:
      return false;
  }
}

/** True if value is an iframe → parent event or response. */
export function isFrameToHostMessage(
  value: unknown,
): value is FrameToHostMessage {
  if (!isRecord(value) || !hasEnvelope(value)) return false;
  const type = value.type;
  if (typeof type !== "string" || !isFrameToHostType(type)) return false;

  switch (type) {
    case "ready":
      return isReadyMessage(value);
    case "result":
      return isResultMessage(value);
    case "error":
      return isErrorMessage(value);
    default:
      return false;
  }
}

export function isReadyMessage(value: unknown): value is ReadyMessage {
  if (!isRecord(value) || !hasEnvelope(value)) return false;
  if (value.type !== "ready") return false;
  if (
    value.target !== "canvas2d" &&
    value.target !== "p5" &&
    value.target !== "three"
  ) {
    return false;
  }
  if (value.capabilities !== undefined && !isRecord(value.capabilities)) {
    return false;
  }
  return true;
}

export function isResultMessage(value: unknown): value is ResultMessage {
  if (!isRecord(value) || !hasEnvelope(value)) return false;
  if (value.type !== "result") return false;
  if (typeof value.requestId !== "string" || value.requestId.length === 0) {
    return false;
  }
  return isRuntimeResultPayload(value.payload);
}

export function isErrorMessage(value: unknown): value is ErrorMessage {
  if (!isRecord(value) || !hasEnvelope(value)) return false;
  if (value.type !== "error") return false;
  if (!isRuntimeErrorCode(value.code)) return false;
  if (typeof value.message !== "string") return false;
  if (
    value.requestId !== undefined &&
    (typeof value.requestId !== "string" || value.requestId.length === 0)
  ) {
    return false;
  }
  return true;
}

/**
 * Narrow a result payload by kind (for host handlers).
 */
export function isCaptureFrameResult(
  payload: RuntimeResultPayload,
): payload is { kind: "captureFrame"; frame: CaptureFrameWire } {
  return payload.kind === "captureFrame";
}

export function isIntrospectionResult(
  payload: RuntimeResultPayload,
): payload is {
  kind: "mount" | "introspection";
  introspection: ToolIntrospection;
} {
  return payload.kind === "mount" || payload.kind === "introspection";
}
