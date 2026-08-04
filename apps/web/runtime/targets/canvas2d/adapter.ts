/**
 * In-frame canvas2d VibeTool adapter (M2a3).
 *
 * Maps host postMessage commands → VibeTool lifecycle.
 * Runs only inside the sandboxed runtime frame (bundled entry).
 */

import type { CreateVibeTool, ToolAssets, ToolParams, VibeTool } from "@repo/contracts";

import {
  RUNTIME_ERROR_CODES,
  blobToCaptureFrameWire,
  createErrorMessage,
  createReadyMessage,
  createResultMessage,
  isHostToFrameMessage,
  type HostToFrameMessage,
  type RuntimeResultPayload,
  type ToolIntrospection,
} from "../../contract";

export type Canvas2dFrameAdapterOptions = {
  /** Mount root element inside the frame document. */
  root: HTMLElement;
  /**
   * Factory for the tool currently loaded in this frame.
   * M2a3/M2a4: fixed reference tool. M3+: host may later select among fixtures.
   */
  createTool: CreateVibeTool;
  /** postMessage targetOrigin for parent replies (opaque frame → `"*"`). */
  parentOrigin?: string;
  /** Target id advertised in READY (always canvas2d for this adapter). */
  target?: "canvas2d";
};

function readIntrospection(tool: VibeTool): ToolIntrospection {
  return {
    paramSchema: tool.getParamSchema(),
    defaultParams: tool.getDefaultParams(),
    assetSlots: tool.getAssetSlots(),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Unknown tool error";
}

/**
 * Frame-side controller: READY pulse + command handling for one canvas2d tool factory.
 */
export class Canvas2dFrameAdapter {
  private readonly root: HTMLElement;
  private readonly createTool: CreateVibeTool;
  private readonly parentOrigin: string;
  private readonly target: "canvas2d";

  private tool: VibeTool | null = null;
  private hostSeen = false;
  private readyTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private readonly onWindowMessage: (event: MessageEvent) => void;

  constructor(options: Canvas2dFrameAdapterOptions) {
    this.root = options.root;
    this.createTool = options.createTool;
    this.parentOrigin = options.parentOrigin ?? "*";
    this.target = options.target ?? "canvas2d";
    this.onWindowMessage = (event) => {
      void this.handleMessageEvent(event);
    };
  }

  /** Register listeners and start READY pulse. */
  start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener("message", this.onWindowMessage);
    this.startReadyPulse();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener("message", this.onWindowMessage);
    this.clearReadyPulse();
    void this.safeDisposeTool();
  }

  private postToParent(message: unknown): void {
    try {
      parent.postMessage(message, this.parentOrigin);
    } catch {
      /* parent gone / isolation */
    }
  }

  private sendReady(): void {
    this.postToParent(
      createReadyMessage({
        target: this.target,
        capabilities: {
          captureFrame: true,
          setAssets: true,
          getCaptureStream: true,
        },
      }),
    );
  }

  private startReadyPulse(): void {
    this.sendReady();
    let attempts = 0;
    this.readyTimer = setInterval(() => {
      if (this.hostSeen) {
        this.clearReadyPulse();
        return;
      }
      attempts += 1;
      this.sendReady();
      if (attempts >= 40) {
        this.clearReadyPulse();
      }
    }, 250);
  }

  private clearReadyPulse(): void {
    if (this.readyTimer != null) {
      clearInterval(this.readyTimer);
      this.readyTimer = null;
    }
  }

  private async handleMessageEvent(event: MessageEvent): Promise<void> {
    if (event.source !== parent) return;
    if (!isHostToFrameMessage(event.data)) return;

    this.hostSeen = true;
    this.clearReadyPulse();

    const command = event.data;
    try {
      const payload = await this.handleCommand(command);
      this.postToParent(
        createResultMessage({
          requestId: command.requestId,
          payload,
        }),
      );
    } catch (err) {
      const code =
        err instanceof FrameAdapterError
          ? err.code
          : RUNTIME_ERROR_CODES.TOOL_THROW;
      this.postToParent(
        createErrorMessage({
          requestId: command.requestId,
          code,
          message: errorMessage(err),
          details:
            err instanceof FrameAdapterError
              ? err.details
              : { command: command.type },
        }),
      );
    }
  }

  private async handleCommand(
    command: HostToFrameMessage,
  ): Promise<RuntimeResultPayload> {
    switch (command.type) {
      case "mount":
        return this.mount(command.params, command.assets);
      case "update":
        return this.update(command.params);
      case "setAssets":
        return this.setAssets(command.assets);
      case "captureFrame":
        return this.captureFrame();
      case "dispose":
        return this.dispose();
      case "getIntrospection":
        return this.getIntrospection();
      default: {
        const _exhaustive: never = command;
        void _exhaustive;
        throw new FrameAdapterError(
          RUNTIME_ERROR_CODES.UNSUPPORTED,
          "Unknown command",
        );
      }
    }
  }

  private async mount(
    params: ToolParams,
    assets?: ToolAssets,
  ): Promise<RuntimeResultPayload> {
    await this.safeDisposeTool();

    let tool: VibeTool;
    try {
      tool = this.createTool();
    } catch (err) {
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.LOAD_FAILED,
        `createTool failed: ${errorMessage(err)}`,
        { cause: err },
      );
    }

    this.tool = tool;
    try {
      await Promise.resolve(
        tool.mount(this.root, {
          params,
          assets,
        }),
      );
    } catch (err) {
      this.tool = null;
      try {
        await Promise.resolve(tool.dispose());
      } catch {
        /* ignore */
      }
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.TOOL_THROW,
        `mount failed: ${errorMessage(err)}`,
        { cause: err },
      );
    }

    return {
      kind: "mount",
      introspection: readIntrospection(tool),
    };
  }

  private async update(params: ToolParams): Promise<RuntimeResultPayload> {
    const tool = this.requireMounted();
    try {
      await Promise.resolve(tool.update(params));
    } catch (err) {
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.TOOL_THROW,
        `update failed: ${errorMessage(err)}`,
        { cause: err },
      );
    }
    return { kind: "update" };
  }

  private async setAssets(assets: ToolAssets): Promise<RuntimeResultPayload> {
    const tool = this.requireMounted();
    if (typeof tool.setAssets !== "function") {
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.UNSUPPORTED,
        "Tool does not implement setAssets",
      );
    }
    try {
      await Promise.resolve(tool.setAssets(assets));
    } catch (err) {
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.TOOL_THROW,
        `setAssets failed: ${errorMessage(err)}`,
        { cause: err },
      );
    }
    return { kind: "setAssets" };
  }

  private async captureFrame(): Promise<RuntimeResultPayload> {
    const tool = this.requireMounted();
    try {
      const blob = await Promise.resolve(tool.captureFrame());
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new FrameAdapterError(
          RUNTIME_ERROR_CODES.CAPTURE_FAILED,
          "captureFrame returned empty or non-Blob result",
        );
      }
      const frame = await blobToCaptureFrameWire(blob);
      return { kind: "captureFrame", frame };
    } catch (err) {
      if (err instanceof FrameAdapterError) throw err;
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.CAPTURE_FAILED,
        `captureFrame failed: ${errorMessage(err)}`,
        { cause: err },
      );
    }
  }

  private async dispose(): Promise<RuntimeResultPayload> {
    await this.safeDisposeTool();
    return { kind: "dispose" };
  }

  private getIntrospection(): RuntimeResultPayload {
    const tool = this.tool;
    if (!tool) {
      // Allow introspection from a fresh factory without leaving a mounted instance.
      const probe = this.createTool();
      try {
        return {
          kind: "introspection",
          introspection: readIntrospection(probe),
        };
      } finally {
        try {
          void probe.dispose();
        } catch {
          /* ignore */
        }
      }
    }
    return {
      kind: "introspection",
      introspection: readIntrospection(tool),
    };
  }

  private requireMounted(): VibeTool {
    if (!this.tool) {
      throw new FrameAdapterError(
        RUNTIME_ERROR_CODES.NOT_MOUNTED,
        "No tool is mounted; call mount first",
      );
    }
    return this.tool;
  }

  private async safeDisposeTool(): Promise<void> {
    const tool = this.tool;
    this.tool = null;
    if (!tool) {
      this.root.replaceChildren();
      return;
    }
    try {
      await Promise.resolve(tool.dispose());
    } catch {
      this.root.replaceChildren();
    }
  }
}

export class FrameAdapterError extends Error {
  readonly code: (typeof RUNTIME_ERROR_CODES)[keyof typeof RUNTIME_ERROR_CODES];
  readonly details?: unknown;

  constructor(
    code: (typeof RUNTIME_ERROR_CODES)[keyof typeof RUNTIME_ERROR_CODES],
    message: string,
    options?: { cause?: unknown; details?: unknown },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "FrameAdapterError";
    this.code = code;
    this.details = options?.details;
  }
}

/** Bootstrap helper used by the frame entry bundle. */
export function startCanvas2dFrameAdapter(
  options: Canvas2dFrameAdapterOptions,
): Canvas2dFrameAdapter {
  const adapter = new Canvas2dFrameAdapter(options);
  adapter.start();
  return adapter;
}
