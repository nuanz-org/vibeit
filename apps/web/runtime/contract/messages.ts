/**
 * Host ↔ iframe postMessage protocol (M2a1).
 *
 * Parent (Studio / host) owns Control + export.
 * Iframe owns VibeTool lifecycle only — no parent window access.
 *
 * Aligns with @repo/contracts ToolParams / ToolAssets / ParamSchema.
 * Docs: md/contracts/runtime-host.md
 */

import type { AssetSlots, ParamSchema } from "@repo/contracts";
import type { ToolAssets, ToolParams } from "@repo/contracts";

import type { CaptureFrameWire } from "./capture-wire";
import type { RuntimeErrorCode } from "./errors";

// ---------------------------------------------------------------------------
// Channel identity
// ---------------------------------------------------------------------------

/** Discriminator so host ignores unrelated window messages. */
export const RUNTIME_CHANNEL = "vibeit-runtime" as const;

/** Bump only on breaking protocol changes. */
export const RUNTIME_PROTOCOL_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Message type discriminants
// ---------------------------------------------------------------------------

/** Parent → iframe command kinds. */
export const HOST_TO_FRAME_TYPES = [
  "mount",
  "update",
  "setAssets",
  "captureFrame",
  /** M7b — record short WebM via tool getCaptureStream + MediaRecorder in-frame. */
  "recordVideo",
  "dispose",
  "getIntrospection",
] as const;

export type HostToFrameType = (typeof HOST_TO_FRAME_TYPES)[number];

/** Iframe → parent event / response kinds. */
export const FRAME_TO_HOST_TYPES = ["ready", "result", "error"] as const;

export type FrameToHostType = (typeof FRAME_TO_HOST_TYPES)[number];

export type RuntimeMessageType = HostToFrameType | FrameToHostType;

// ---------------------------------------------------------------------------
// Shared envelope
// ---------------------------------------------------------------------------

export interface RuntimeMessageBase {
  channel: typeof RUNTIME_CHANNEL;
  version: typeof RUNTIME_PROTOCOL_VERSION;
}

/**
 * Correlate command → result/error.
 * Required on all host→frame commands and matching replies.
 * Optional on unsolicited `ready` / fatal `error` events.
 */
export type RuntimeRequestId = string;

// ---------------------------------------------------------------------------
// Introspection (schema for Studio Control)
// ---------------------------------------------------------------------------

/** Param schema + defaults + asset slots from the mounted (or loaded) tool. */
export interface ToolIntrospection {
  paramSchema: ParamSchema;
  defaultParams: ToolParams;
  assetSlots: AssetSlots;
}

// ---------------------------------------------------------------------------
// Parent → iframe commands
// ---------------------------------------------------------------------------

/** Max compiled ESM length accepted on mount (enforced in adapter, not guard). */
export const RUNTIME_MODULE_SOURCE_MAX_CHARS = 500_000;

export interface MountCommand extends RuntimeMessageBase {
  type: "mount";
  requestId: RuntimeRequestId;
  /**
   * Optional fixture / version id for logging and fixture registry lookup.
   * When omitted (and no moduleSource), frame uses defaultToolId.
   */
  toolId?: string;
  /** Target runtime; ASAP path is always canvas2d. */
  target?: "canvas2d" | "p5" | "three";
  /**
   * Precompiled browser ESM module source (export createTool).
   * Frame loads via blob URL + dynamic import (requires ESM frame bundle).
   * Size limit enforced in adapter as LOAD_FAILED (not in guards — silent drop).
   */
  moduleSource?: string;
  params: ToolParams;
  assets?: ToolAssets;
}

export interface UpdateCommand extends RuntimeMessageBase {
  type: "update";
  requestId: RuntimeRequestId;
  params: ToolParams;
}

export interface SetAssetsCommand extends RuntimeMessageBase {
  type: "setAssets";
  requestId: RuntimeRequestId;
  assets: ToolAssets;
}

export interface CaptureFrameCommand extends RuntimeMessageBase {
  type: "captureFrame";
  requestId: RuntimeRequestId;
}

/**
 * M7b — record a short clip inside the frame (MediaStream cannot cross postMessage).
 * Frame uses VibeTool.getCaptureStream() + MediaRecorder → wire blob back to host.
 */
export interface RecordVideoCommand extends RuntimeMessageBase {
  type: "recordVideo";
  requestId: RuntimeRequestId;
  /** Clip length in seconds (clamped in frame to product range). */
  durationSeconds: number;
}

export interface DisposeCommand extends RuntimeMessageBase {
  type: "dispose";
  requestId: RuntimeRequestId;
}

export interface GetIntrospectionCommand extends RuntimeMessageBase {
  type: "getIntrospection";
  requestId: RuntimeRequestId;
}

export type HostToFrameMessage =
  | MountCommand
  | UpdateCommand
  | SetAssetsCommand
  | CaptureFrameCommand
  | RecordVideoCommand
  | DisposeCommand
  | GetIntrospectionCommand;

// ---------------------------------------------------------------------------
// Result payloads (iframe → parent, type: "result")
// ---------------------------------------------------------------------------

export type RuntimeResultPayload =
  | { kind: "mount"; introspection: ToolIntrospection }
  | { kind: "update" }
  | { kind: "setAssets" }
  | { kind: "captureFrame"; frame: CaptureFrameWire }
  /** M7b — WebM (or browser-chosen) video; same wire shape as PNG frames. */
  | { kind: "recordVideo"; video: CaptureFrameWire }
  | { kind: "dispose" }
  | { kind: "introspection"; introspection: ToolIntrospection };

// ---------------------------------------------------------------------------
// Iframe → parent messages
// ---------------------------------------------------------------------------

/**
 * Frame finished bootstrap and can accept commands.
 * Sent once after tool factory + bridge listeners are registered.
 */
export interface ReadyMessage extends RuntimeMessageBase {
  type: "ready";
  /** Target this frame is prepared to run (canvas2d for M2a). */
  target: "canvas2d" | "p5" | "three";
  /** Optional capability flags for progressive features. */
  capabilities?: {
    captureFrame?: boolean;
    getCaptureStream?: boolean;
    /** M7b — in-frame MediaRecorder short clip. */
    recordVideo?: boolean;
    setAssets?: boolean;
  };
}

export interface ResultMessage extends RuntimeMessageBase {
  type: "result";
  requestId: RuntimeRequestId;
  payload: RuntimeResultPayload;
}

export interface ErrorMessage extends RuntimeMessageBase {
  type: "error";
  /** Present when the error is a response to a command. */
  requestId?: RuntimeRequestId;
  code: RuntimeErrorCode;
  message: string;
  /** Optional non-sensitive debug detail (no secrets). */
  details?: unknown;
}

export type FrameToHostMessage = ReadyMessage | ResultMessage | ErrorMessage;

export type RuntimeMessage = HostToFrameMessage | FrameToHostMessage;

// ---------------------------------------------------------------------------
// Factories (keep envelopes consistent)
// ---------------------------------------------------------------------------

function envelope(): RuntimeMessageBase {
  return {
    channel: RUNTIME_CHANNEL,
    version: RUNTIME_PROTOCOL_VERSION,
  };
}

/** Create a unique request id for one host command. */
export function createRuntimeRequestId(): RuntimeRequestId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createMountCommand(
  input: Omit<MountCommand, "channel" | "version" | "type" | "requestId"> & {
    requestId?: RuntimeRequestId;
  },
): MountCommand {
  return {
    ...envelope(),
    type: "mount",
    requestId: input.requestId ?? createRuntimeRequestId(),
    toolId: input.toolId,
    target: input.target ?? "canvas2d",
    // Explicit field list — do not drop moduleSource (would silently no-op delivery)
    moduleSource: input.moduleSource,
    params: input.params,
    assets: input.assets,
  };
}

export function createUpdateCommand(
  input: Omit<UpdateCommand, "channel" | "version" | "type" | "requestId"> & {
    requestId?: RuntimeRequestId;
  },
): UpdateCommand {
  return {
    ...envelope(),
    type: "update",
    requestId: input.requestId ?? createRuntimeRequestId(),
    params: input.params,
  };
}

export function createSetAssetsCommand(
  input: Omit<SetAssetsCommand, "channel" | "version" | "type" | "requestId"> & {
    requestId?: RuntimeRequestId;
  },
): SetAssetsCommand {
  return {
    ...envelope(),
    type: "setAssets",
    requestId: input.requestId ?? createRuntimeRequestId(),
    assets: input.assets,
  };
}

export function createCaptureFrameCommand(
  input?: { requestId?: RuntimeRequestId },
): CaptureFrameCommand {
  return {
    ...envelope(),
    type: "captureFrame",
    requestId: input?.requestId ?? createRuntimeRequestId(),
  };
}

export function createRecordVideoCommand(
  input: {
    durationSeconds: number;
    requestId?: RuntimeRequestId;
  },
): RecordVideoCommand {
  return {
    ...envelope(),
    type: "recordVideo",
    requestId: input.requestId ?? createRuntimeRequestId(),
    durationSeconds: input.durationSeconds,
  };
}

export function createDisposeCommand(
  input?: { requestId?: RuntimeRequestId },
): DisposeCommand {
  return {
    ...envelope(),
    type: "dispose",
    requestId: input?.requestId ?? createRuntimeRequestId(),
  };
}

export function createGetIntrospectionCommand(
  input?: { requestId?: RuntimeRequestId },
): GetIntrospectionCommand {
  return {
    ...envelope(),
    type: "getIntrospection",
    requestId: input?.requestId ?? createRuntimeRequestId(),
  };
}

export function createReadyMessage(
  input: Omit<ReadyMessage, "channel" | "version" | "type">,
): ReadyMessage {
  return {
    ...envelope(),
    type: "ready",
    target: input.target,
    capabilities: input.capabilities ?? {
      captureFrame: true,
      setAssets: true,
      getCaptureStream: false,
      recordVideo: false,
    },
  };
}

export function createResultMessage(
  input: Omit<ResultMessage, "channel" | "version" | "type">,
): ResultMessage {
  return {
    ...envelope(),
    type: "result",
    requestId: input.requestId,
    payload: input.payload,
  };
}

export function createErrorMessage(
  input: Omit<ErrorMessage, "channel" | "version" | "type">,
): ErrorMessage {
  return {
    ...envelope(),
    type: "error",
    requestId: input.requestId,
    code: input.code,
    message: input.message,
    details: input.details,
  };
}
