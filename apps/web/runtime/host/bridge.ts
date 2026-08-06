/**
 * Parent-side postMessage bridge (M2a2).
 *
 * Correlates host commands with frame `result` / `error` by `requestId`.
 * Waits for `ready` before allowing commands.
 */

import type { ToolAssets, ToolParams } from "@repo/contracts";

import {
  RUNTIME_ERROR_CODES,
  createCaptureFrameCommand,
  createDisposeCommand,
  createGetIntrospectionCommand,
  createMountCommand,
  createSetAssetsCommand,
  createUpdateCommand,
  isErrorMessage,
  isFrameToHostMessage,
  isReadyMessage,
  isResultMessage,
  type CaptureFrameWire,
  type ErrorMessage,
  type HostToFrameMessage,
  type ReadyMessage,
  type RuntimeRequestId,
  type RuntimeResultPayload,
  type ToolIntrospection,
} from "../contract";
import { RuntimeBridgeError } from "./bridge-error";
import {
  RUNTIME_COMMAND_TIMEOUT_MS,
  RUNTIME_FRAME_ORIGINS,
  RUNTIME_POST_MESSAGE_TARGET_ORIGIN,
  RUNTIME_READY_TIMEOUT_MS,
} from "./sandbox";

export type RuntimeHostBridgeOptions = {
  /** iframe.contentWindow — required before send. */
  contentWindow: Window;
  /**
   * Allowed `event.origin` values for inbound messages.
   * Default includes `"null"` for opaque sandboxed frames.
   */
  allowedOrigins?: readonly string[];
  /** postMessage targetOrigin parent → frame. Default `"*"`. */
  targetOrigin?: string;
  onReady?: (message: ReadyMessage) => void;
  /** Unsolicited frame errors (no matching requestId). */
  onUnhandledError?: (message: ErrorMessage) => void;
};

type PendingEntry = {
  resolve: (payload: RuntimeResultPayload) => void;
  reject: (error: RuntimeBridgeError) => void;
  timer: ReturnType<typeof setTimeout>;
};

function isAllowedOrigin(
  origin: string,
  allowed: readonly string[],
): boolean {
  return allowed.includes(origin);
}

export class RuntimeHostBridge {
  private readonly contentWindow: Window;
  private readonly allowedOrigins: readonly string[];
  private readonly targetOrigin: string;
  private readonly onReady?: (message: ReadyMessage) => void;
  private readonly onUnhandledError?: (message: ErrorMessage) => void;

  private readonly pending = new Map<RuntimeRequestId, PendingEntry>();
  private readyMessage: ReadyMessage | null = null;
  private readyWaiters: Array<{
    resolve: (msg: ReadyMessage) => void;
    reject: (err: RuntimeBridgeError) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  private destroyed = false;
  private readonly onWindowMessage: (event: MessageEvent) => void;

  constructor(options: RuntimeHostBridgeOptions) {
    this.contentWindow = options.contentWindow;
    this.allowedOrigins = options.allowedOrigins ?? RUNTIME_FRAME_ORIGINS;
    this.targetOrigin =
      options.targetOrigin ?? RUNTIME_POST_MESSAGE_TARGET_ORIGIN;
    this.onReady = options.onReady;
    this.onUnhandledError = options.onUnhandledError;

    this.onWindowMessage = (event: MessageEvent) => {
      this.handleMessageEvent(event);
    };
    window.addEventListener("message", this.onWindowMessage);
  }

  isReady(): boolean {
    return this.readyMessage !== null && !this.destroyed;
  }

  getReadyMessage(): ReadyMessage | null {
    return this.readyMessage;
  }

  /**
   * Resolve when the frame has sent `ready` (or immediately if already ready).
   */
  waitUntilReady(
    timeoutMs: number = RUNTIME_READY_TIMEOUT_MS,
  ): Promise<ReadyMessage> {
    if (this.destroyed) {
      return Promise.reject(
        new RuntimeBridgeError(
          RUNTIME_ERROR_CODES.UNKNOWN,
          "Runtime bridge is destroyed",
        ),
      );
    }
    if (this.readyMessage) {
      return Promise.resolve(this.readyMessage);
    }

    return new Promise<ReadyMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiters = this.readyWaiters.filter((w) => w.resolve !== resolve);
        reject(RuntimeBridgeError.timeout("ready", timeoutMs));
      }, timeoutMs);

      this.readyWaiters.push({ resolve, reject, timer });
    });
  }

  /**
   * Send a protocol command and wait for matching `result` or `error`.
   * Waits for ready first.
   */
  async send(
    command: HostToFrameMessage,
    timeoutMs: number = RUNTIME_COMMAND_TIMEOUT_MS,
  ): Promise<RuntimeResultPayload> {
    if (this.destroyed) {
      throw new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.UNKNOWN,
        "Runtime bridge is destroyed",
        { requestId: command.requestId },
      );
    }

    await this.waitUntilReady();

    return new Promise<RuntimeResultPayload>((resolve, reject) => {
      if (this.pending.has(command.requestId)) {
        reject(
          new RuntimeBridgeError(
            RUNTIME_ERROR_CODES.INVALID_MESSAGE,
            `Duplicate in-flight requestId: ${command.requestId}`,
            { requestId: command.requestId },
          ),
        );
        return;
      }

      const timer = setTimeout(() => {
        this.pending.delete(command.requestId);
        reject(
          RuntimeBridgeError.timeout("command", timeoutMs, command.requestId),
        );
      }, timeoutMs);

      this.pending.set(command.requestId, { resolve, reject, timer });

      try {
        this.contentWindow.postMessage(command, this.targetOrigin);
      } catch (cause) {
        clearTimeout(timer);
        this.pending.delete(command.requestId);
        reject(
          new RuntimeBridgeError(
            RUNTIME_ERROR_CODES.UNKNOWN,
            "Failed to postMessage to runtime frame",
            { requestId: command.requestId, cause },
          ),
        );
      }
    });
  }

  /** Convenience: send dispose and ignore payload shape. */
  async disposeTool(
    timeoutMs: number = RUNTIME_COMMAND_TIMEOUT_MS,
  ): Promise<void> {
    await this.send(createDisposeCommand(), timeoutMs);
  }

  /** Mount (or remount) the frame tool with params/assets. */
  async mountTool(
    params: ToolParams,
    assets?: ToolAssets,
    options?: {
      toolId?: string;
      target?: "canvas2d" | "p5" | "three";
      /** Precompiled ESM module source for generated tools. */
      moduleSource?: string;
      timeoutMs?: number;
    },
  ): Promise<ToolIntrospection> {
    const payload = await this.send(
      createMountCommand({
        params,
        assets,
        toolId: options?.toolId,
        target: options?.target ?? "canvas2d",
        moduleSource: options?.moduleSource,
      }),
      options?.timeoutMs,
    );
    if (payload.kind !== "mount") {
      throw new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.INVALID_MESSAGE,
        `Expected mount result, got kind=${payload.kind}`,
      );
    }
    return payload.introspection;
  }

  async updateParams(
    params: ToolParams,
    timeoutMs?: number,
  ): Promise<void> {
    const payload = await this.send(createUpdateCommand({ params }), timeoutMs);
    if (payload.kind !== "update") {
      throw new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.INVALID_MESSAGE,
        `Expected update result, got kind=${payload.kind}`,
      );
    }
  }

  async setAssets(assets: ToolAssets, timeoutMs?: number): Promise<void> {
    const payload = await this.send(
      createSetAssetsCommand({ assets }),
      timeoutMs,
    );
    if (payload.kind !== "setAssets") {
      throw new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.INVALID_MESSAGE,
        `Expected setAssets result, got kind=${payload.kind}`,
      );
    }
  }

  async captureFrame(timeoutMs?: number): Promise<CaptureFrameWire> {
    const payload = await this.send(createCaptureFrameCommand(), timeoutMs);
    if (payload.kind !== "captureFrame") {
      throw new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.INVALID_MESSAGE,
        `Expected captureFrame result, got kind=${payload.kind}`,
      );
    }
    return payload.frame;
  }

  async getIntrospection(timeoutMs?: number): Promise<ToolIntrospection> {
    const payload = await this.send(
      createGetIntrospectionCommand(),
      timeoutMs,
    );
    if (payload.kind !== "introspection" && payload.kind !== "mount") {
      throw new RuntimeBridgeError(
        RUNTIME_ERROR_CODES.INVALID_MESSAGE,
        `Expected introspection result, got kind=${payload.kind}`,
      );
    }
    return payload.introspection;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener("message", this.onWindowMessage);

    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(
        new RuntimeBridgeError(
          RUNTIME_ERROR_CODES.UNKNOWN,
          "Runtime bridge destroyed while waiting for ready",
        ),
      );
    }
    this.readyWaiters = [];

    for (const [requestId, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(
        new RuntimeBridgeError(
          RUNTIME_ERROR_CODES.UNKNOWN,
          "Runtime bridge destroyed while command in flight",
          { requestId },
        ),
      );
    }
    this.pending.clear();
    this.readyMessage = null;
  }

  private handleMessageEvent(event: MessageEvent): void {
    if (this.destroyed) return;
    if (event.source !== this.contentWindow) return;
    if (!isAllowedOrigin(event.origin, this.allowedOrigins)) return;
    if (!isFrameToHostMessage(event.data)) return;

    const message = event.data;

    if (isReadyMessage(message)) {
      this.handleReady(message);
      return;
    }

    if (isResultMessage(message)) {
      const entry = this.pending.get(message.requestId);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(message.requestId);
      entry.resolve(message.payload);
      return;
    }

    if (isErrorMessage(message)) {
      if (message.requestId && this.pending.has(message.requestId)) {
        const entry = this.pending.get(message.requestId)!;
        clearTimeout(entry.timer);
        this.pending.delete(message.requestId);
        entry.reject(
          RuntimeBridgeError.fromFrameError({
            code: message.code,
            message: message.message,
            requestId: message.requestId,
            details: message.details,
          }),
        );
        return;
      }
      this.onUnhandledError?.(message);
    }
  }

  private handleReady(message: ReadyMessage): void {
    const first = this.readyMessage === null;
    this.readyMessage = message;
    if (first) {
      this.onReady?.(message);
    }
    const waiters = this.readyWaiters;
    this.readyWaiters = [];
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    }
  }
}
