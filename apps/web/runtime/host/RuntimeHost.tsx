"use client";

/**
 * Sandboxed iframe host React component (M2a2).
 *
 * Mounts /runtime-frame.html with isolation sandbox, wires RuntimeHostBridge,
 * exposes imperative API via ref for Studio / smoke pages.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { ToolAssets, ToolParams } from "@repo/contracts";

import type {
  CaptureFrameWire,
  ErrorMessage,
  HostToFrameMessage,
  ReadyMessage,
  RuntimeResultPayload,
  ToolIntrospection,
} from "../contract";
import { RuntimeHostBridge } from "./bridge";
import { RuntimeBridgeError } from "./bridge-error";
import {
  RUNTIME_FRAME_PATH,
  RUNTIME_IFRAME_SANDBOX,
  type RuntimeHostStatus,
} from "./sandbox";

export type RuntimeHostHandle = {
  /** Wait until frame posts `ready`. */
  waitUntilReady: (timeoutMs?: number) => Promise<ReadyMessage>;
  /** Send a protocol command (waits for ready). */
  send: (
    command: HostToFrameMessage,
    timeoutMs?: number,
  ) => Promise<RuntimeResultPayload>;
  /** High-level tool lifecycle (M2a3+). */
  mountTool: (
    params: ToolParams,
    assets?: ToolAssets,
    options?: {
      toolId?: string;
      target?: "canvas2d" | "p5" | "three";
      /** Precompiled ESM module source for generated tools. */
      moduleSource?: string;
      timeoutMs?: number;
    },
  ) => Promise<ToolIntrospection>;
  updateParams: (params: ToolParams, timeoutMs?: number) => Promise<void>;
  setAssets: (assets: ToolAssets, timeoutMs?: number) => Promise<void>;
  captureFrame: (timeoutMs?: number) => Promise<CaptureFrameWire>;
  getIntrospection: (timeoutMs?: number) => Promise<ToolIntrospection>;
  /** dispose command convenience. */
  disposeTool: (timeoutMs?: number) => Promise<void>;
  isReady: () => boolean;
  getReadyMessage: () => ReadyMessage | null;
  getStatus: () => RuntimeHostStatus;
  /** iframe element if mounted. */
  getIframe: () => HTMLIFrameElement | null;
};

export type RuntimeHostProps = {
  className?: string;
  style?: CSSProperties;
  /** Override frame document path (default RUNTIME_FRAME_PATH). */
  frameSrc?: string;
  title?: string;
  onReady?: (message: ReadyMessage) => void;
  onStatusChange?: (status: RuntimeHostStatus) => void;
  onUnhandledError?: (message: ErrorMessage) => void;
  onBridgeError?: (error: RuntimeBridgeError) => void;
};

export const RuntimeHost = forwardRef<RuntimeHostHandle, RuntimeHostProps>(
  function RuntimeHost(
    {
      className,
      style,
      frameSrc = RUNTIME_FRAME_PATH,
      title = "Vibeit tool runtime",
      onReady,
      onStatusChange,
      onUnhandledError,
      onBridgeError,
    },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const bridgeRef = useRef<RuntimeHostBridge | null>(null);
    const [status, setStatus] = useState<RuntimeHostStatus>("idle");

    const updateStatus = useCallback(
      (next: RuntimeHostStatus) => {
        setStatus(next);
        onStatusChange?.(next);
      },
      [onStatusChange],
    );

    const destroyBridge = useCallback(() => {
      bridgeRef.current?.destroy();
      bridgeRef.current = null;
    }, []);

    const attachBridge = useCallback(() => {
      const iframe = iframeRef.current;
      const contentWindow = iframe?.contentWindow;
      if (!contentWindow) {
        updateStatus("error");
        onBridgeError?.(
          new RuntimeBridgeError(
            "UNKNOWN",
            "iframe contentWindow is not available",
          ),
        );
        return;
      }

      destroyBridge();

      const bridge = new RuntimeHostBridge({
        contentWindow,
        onReady: (message) => {
          updateStatus("ready");
          onReady?.(message);
        },
        onUnhandledError,
      });
      bridgeRef.current = bridge;

      bridge.waitUntilReady().catch((err) => {
        if (bridgeRef.current !== bridge) return;
        updateStatus("error");
        if (err instanceof RuntimeBridgeError) {
          onBridgeError?.(err);
        } else {
          onBridgeError?.(
            new RuntimeBridgeError(
              "NOT_READY",
              err instanceof Error ? err.message : "Ready wait failed",
              { cause: err },
            ),
          );
        }
      });
    }, [
      destroyBridge,
      onBridgeError,
      onReady,
      onUnhandledError,
      updateStatus,
    ]);

    useEffect(() => {
      updateStatus("loading");
      return () => {
        destroyBridge();
        updateStatus("destroyed");
      };
    }, [destroyBridge, frameSrc, updateStatus]);

    const requireBridge = useCallback((): RuntimeHostBridge => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        throw new RuntimeBridgeError(
          "NOT_READY",
          "Runtime host bridge is not attached yet",
        );
      }
      return bridge;
    }, []);

    useImperativeHandle(
      ref,
      (): RuntimeHostHandle => ({
        waitUntilReady: (timeoutMs) => requireBridge().waitUntilReady(timeoutMs),
        send: (command, timeoutMs) => requireBridge().send(command, timeoutMs),
        mountTool: (params, assets, options) =>
          requireBridge().mountTool(params, assets, options),
        updateParams: (params, timeoutMs) =>
          requireBridge().updateParams(params, timeoutMs),
        setAssets: (assets, timeoutMs) =>
          requireBridge().setAssets(assets, timeoutMs),
        captureFrame: (timeoutMs) => requireBridge().captureFrame(timeoutMs),
        getIntrospection: (timeoutMs) =>
          requireBridge().getIntrospection(timeoutMs),
        disposeTool: (timeoutMs) => requireBridge().disposeTool(timeoutMs),
        isReady: () => bridgeRef.current?.isReady() ?? false,
        getReadyMessage: () => bridgeRef.current?.getReadyMessage() ?? null,
        getStatus: () => status,
        getIframe: () => iframeRef.current,
      }),
      [requireBridge, status],
    );

    return (
      <iframe
        ref={iframeRef}
        className={className}
        style={{
          border: "none",
          display: "block",
          width: "100%",
          height: "100%",
          ...style,
        }}
        title={title}
        src={frameSrc}
        sandbox={RUNTIME_IFRAME_SANDBOX}
        // Isolation: do not allow referrer leakage into tool assets by default
        referrerPolicy="no-referrer"
        onLoad={() => {
          updateStatus("loading");
          attachBridge();
        }}
      />
    );
  },
);
