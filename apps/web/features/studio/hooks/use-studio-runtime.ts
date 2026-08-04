"use client";

import { useCallback, useRef, useState } from "react";

import type {
  AssetSlots,
  ParamSchema,
  ToolAssets,
  ToolParams,
} from "@repo/contracts";

import {
  RuntimeBridgeError,
  assertCaptureFrameLooksLikePng,
  captureFrameWireToBlob,
  gateRealAssetCapture,
  hasRealUploadedAsset,
  waitForPaintFrames,
  type ReadyMessage,
  type RuntimeHostHandle,
  type RuntimeHostStatus,
} from "@/runtime";

function formatErr(err: unknown): string {
  if (err instanceof RuntimeBridgeError) {
    return `${err.code}: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown runtime error";
}

export type LastCaptureInfo = {
  /** Object URL for preview. */
  previewUrl: string;
  /** Whether a real uploaded (http storage) asset was bound at capture time. */
  usedRealAsset: boolean;
  /** Slot that supplied the real asset, if any. */
  realAssetSlotId?: string;
  /** Real asset URL (truncated for display). */
  realAssetUrl?: string;
  /** Captured at ISO time. */
  at: string;
  byteLength?: number;
};

/**
 * Local Studio runtime state + host orchestration (not TanStack Query).
 * Live params/assets stay in React state → RuntimeHost commands.
 */
export function useStudioRuntime(options: { runtimeToolId: string }) {
  const hostRef = useRef<RuntimeHostHandle>(null);
  const captureUrlRef = useRef<string | null>(null);
  const assetsRef = useRef<ToolAssets>({});

  const [status, setStatus] = useState<RuntimeHostStatus>("idle");
  const [ready, setReady] = useState<ReadyMessage | null>(null);
  const [mounted, setMounted] = useState(false);
  const [params, setParams] = useState<ToolParams>({});
  const [assets, setAssetsState] = useState<ToolAssets>({});
  const [paramSchema, setParamSchema] = useState<ParamSchema>([]);
  const [assetSlots, setAssetSlots] = useState<AssetSlots>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<LastCaptureInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [m2aCaptureProved, setM2aCaptureProved] = useState(false);

  const onStatusChange = useCallback((s: RuntimeHostStatus) => {
    setStatus(s);
  }, []);

  const onReady = useCallback(
    async (message: ReadyMessage) => {
      setReady(message);
      setError(null);
      setBusy(true);
      try {
        const host = hostRef.current;
        if (!host) return;
        const intro = await host.mountTool(
          {},
          undefined,
          { toolId: options.runtimeToolId, target: "canvas2d" },
        );
        setParamSchema(intro.paramSchema);
        setAssetSlots(intro.assetSlots);
        setParams({ ...intro.defaultParams });
        assetsRef.current = {};
        setAssetsState({});
        setMounted(true);
      } catch (err) {
        setError(formatErr(err));
        setMounted(false);
      } finally {
        setBusy(false);
      }
    },
    [options.runtimeToolId],
  );

  const onBridgeError = useCallback((err: RuntimeBridgeError) => {
    setError(`${err.code}: ${err.message}`);
  }, []);

  const setParam = useCallback((name: string, value: unknown) => {
    setError(null);
    setParams((prev) => {
      const next = { ...prev, [name]: value };
      const host = hostRef.current;
      if (host?.isReady()) {
        void host.updateParams(next).catch((err) => {
          setError(formatErr(err));
        });
      }
      return next;
    });
  }, []);

  const setAsset = useCallback(async (slotId: string, url: string | null) => {
    setError(null);
    const next: ToolAssets = { ...assetsRef.current, [slotId]: url };
    assetsRef.current = next;
    setAssetsState(next);

    const host = hostRef.current;
    if (!host?.isReady()) return;

    setBusy(true);
    try {
      // Adapter awaits harness setAssets → images loaded before return (M2a6).
      await host.setAssets({ [slotId]: url });
      await waitForPaintFrames();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const applyCaptureResult = useCallback(
    (blob: Blob, info: Omit<LastCaptureInfo, "previewUrl">) => {
      if (captureUrlRef.current) {
        URL.revokeObjectURL(captureUrlRef.current);
      }
      const previewUrl = URL.createObjectURL(blob);
      captureUrlRef.current = previewUrl;
      setLastCapture({ ...info, previewUrl });
    },
    [],
  );

  /** Capture current frame (works with or without real assets). */
  const capturePng = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const host = hostRef.current;
      if (!host) throw new Error("Host not ready");
      await waitForPaintFrames();
      const frame = await host.captureFrame();
      assertCaptureFrameLooksLikePng(frame);
      const blob = captureFrameWireToBlob(frame);
      const real = gateRealAssetCapture(assetsRef.current);
      applyCaptureResult(blob, {
        usedRealAsset: real.ok,
        realAssetSlotId: real.ok ? real.slotId : undefined,
        realAssetUrl: real.ok ? real.url : undefined,
        at: new Date().toISOString(),
        byteLength: frame.byteLength ?? blob.size,
      });
      if (real.ok) {
        setM2aCaptureProved(true);
      }
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }, [applyCaptureResult]);

  /**
   * M2a6 exit path: require real uploaded asset URL, settle paint, capture PNG.
   * Fails clearly if only data:/blob: fixtures are bound.
   */
  const proveRealAssetCapture = useCallback(async () => {
    setError(null);
    const gate = gateRealAssetCapture(assetsRef.current);
    if (!gate.ok) {
      setError(gate.reason);
      return;
    }

    setBusy(true);
    try {
      const host = hostRef.current;
      if (!host) throw new Error("Host not ready");

      // Re-apply real asset so load is fresh and await completes.
      await host.setAssets({ [gate.slotId]: gate.url });
      await waitForPaintFrames();

      const frame = await host.captureFrame();
      assertCaptureFrameLooksLikePng(frame);
      const blob = captureFrameWireToBlob(frame);
      if (blob.size < 32) {
        throw new Error("PNG blob empty — possible tainted canvas");
      }

      applyCaptureResult(blob, {
        usedRealAsset: true,
        realAssetSlotId: gate.slotId,
        realAssetUrl: gate.url,
        at: new Date().toISOString(),
        byteLength: frame.byteLength ?? blob.size,
      });
      setM2aCaptureProved(true);
    } catch (err) {
      const msg = formatErr(err);
      // Surface tainted-canvas style failures clearly
      if (/taint|security|cross-origin|CAPTURE_FAILED/i.test(msg)) {
        setError(
          `${msg} — check storage CORS + crossOrigin=anonymous (M0f/M2a6)`,
        );
      } else {
        setError(msg);
      }
      setM2aCaptureProved(false);
    } finally {
      setBusy(false);
    }
  }, [applyCaptureResult]);

  const remount = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const host = hostRef.current;
      if (!host) return;
      const intro = await host.mountTool(params, assetsRef.current, {
        toolId: options.runtimeToolId,
        target: "canvas2d",
      });
      setParamSchema(intro.paramSchema);
      setAssetSlots(intro.assetSlots);
      setMounted(true);
      await waitForPaintFrames();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }, [options.runtimeToolId, params]);

  return {
    hostRef,
    status,
    ready,
    mounted,
    params,
    assets,
    paramSchema,
    assetSlots,
    error,
    lastCapture,
    capturePreviewUrl: lastCapture?.previewUrl ?? null,
    busy,
    m2aCaptureProved,
    hasRealAsset: hasRealUploadedAsset(assets),
    onStatusChange,
    onReady,
    onBridgeError,
    setParam,
    setAsset,
    capturePng,
    proveRealAssetCapture,
    remount,
  };
}
