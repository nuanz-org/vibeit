"use client";

import { useCallback, useRef, useState } from "react";

import type {
  AssetSlots,
  ParamSchema,
  ToolAssets,
  ToolParams,
} from "@repo/contracts";

import {
  RuntimeCompileError,
  compileToolSource,
} from "@/lib/api/runtime-compile";
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

import { draftAssetsToToolAssets } from "../lib/draft-assets";

function formatErr(err: unknown): string {
  if (err instanceof RuntimeBridgeError) {
    return `${err.code}: ${err.message}`;
  }
  if (err instanceof RuntimeCompileError) {
    const detail =
      err.details && err.details.length > 0
        ? ` (${err.details.join("; ")})`
        : "";
    return `Compile failed: ${err.message}${detail}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown runtime error";
}

/** Simple stable hash for compile cache keys. */
function hashSource(source: string): string {
  let h = 0;
  for (let i = 0; i < source.length; i += 1) {
    h = (Math.imul(31, h) + source.charCodeAt(i)) | 0;
  }
  return `${source.length}:${h}`;
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

export type UseStudioRuntimeOptions = {
  runtimeToolId: string;
  /**
   * Generated TypeScript from tool_versions.code.
   * When non-empty, compile + mount as moduleSource (no fixture silent fallback).
   * Read on READY via hydrateOptsRef so new versions recompile without stale closure.
   */
  sourceCode?: string | null;
  /**
   * M5d: generation baseline from tool_versions.default_params.
   * Merged over host introspection defaults for Reset + hydrate base.
   */
  versionDefaultParams?: ToolParams | null;
  /** M5d: owner draft params from GET tool (overlay). */
  initialDraftParams?: ToolParams | null;
  /** M5d: owner draft asset bindings from GET tool. */
  initialDraftAssets?: Record<string, string | null> | null;
  /**
   * M5e: prefer API paramSchema for Control UI when non-empty.
   */
  versionParamSchema?: ParamSchema | null;
  /** M5e: prefer API assetSlots for Assets panel when non-empty. */
  versionAssetSlots?: AssetSlots | null;
};

/**
 * Local Studio runtime state + host orchestration (not TanStack Query).
 * Live params/assets stay in React state → RuntimeHost commands.
 */
export function useStudioRuntime(options: UseStudioRuntimeOptions) {
  const hostRef = useRef<RuntimeHostHandle>(null);
  const captureUrlRef = useRef<string | null>(null);
  const assetsRef = useRef<ToolAssets>({});
  const hydrateOptsRef = useRef(options);
  hydrateOptsRef.current = options;

  /** Cache compiled ESM by source hash (avoid recompile on remount). */
  const compileCacheRef = useRef<{ key: string; js: string } | null>(null);

  const [status, setStatus] = useState<RuntimeHostStatus>("idle");
  const [ready, setReady] = useState<ReadyMessage | null>(null);
  const [mounted, setMounted] = useState(false);
  /** True after first mount + draft overlay applied (M5d persist gate). */
  const [hydrated, setHydrated] = useState(false);
  const [params, setParams] = useState<ToolParams>({});
  /** Snapshot of defaults from last mount introspection (M5a Reset). */
  const [defaultParams, setDefaultParams] = useState<ToolParams>({});
  const [assets, setAssetsState] = useState<ToolAssets>({});
  const [paramSchema, setParamSchema] = useState<ParamSchema>([]);
  const [assetSlots, setAssetSlots] = useState<AssetSlots>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<LastCaptureInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [m2aCaptureProved, setM2aCaptureProved] = useState(false);

  const resolveModuleSource = useCallback(async (): Promise<
    string | undefined
  > => {
    const source = hydrateOptsRef.current.sourceCode?.trim() ?? "";
    if (!source) return undefined;

    const key = hashSource(source);
    const cached = compileCacheRef.current;
    if (cached && cached.key === key) {
      return cached.js;
    }

    const js = await compileToolSource(source);
    compileCacheRef.current = { key, js };
    return js;
  }, []);

  const onStatusChange = useCallback((s: RuntimeHostStatus) => {
    setStatus(s);
  }, []);

  const onReady = useCallback(async (message: ReadyMessage) => {
    setReady(message);
    setError(null);
    setBusy(true);
    setHydrated(false);
    try {
      const host = hostRef.current;
      if (!host) return;

      const opts = hydrateOptsRef.current;
      // sourceCode via ref — onReady deps only need stable runtimeToolId identity
      // but regenerated versions update hydrateOptsRef every render.
      const moduleSource = await resolveModuleSource();

      const intro = await host.mountTool({}, undefined, {
        toolId: opts.runtimeToolId,
        target: "canvas2d",
        moduleSource,
      });

      // M5e: prefer version metadata for Control labels when present
      const controlSchema =
        opts.versionParamSchema && opts.versionParamSchema.length > 0
          ? opts.versionParamSchema
          : intro.paramSchema;
      const controlSlots =
        opts.versionAssetSlots && opts.versionAssetSlots.length > 0
          ? opts.versionAssetSlots
          : intro.assetSlots;
      setParamSchema(controlSchema);
      setAssetSlots(controlSlots);

      const versionDefaults = opts.versionDefaultParams ?? {};
      const baseline: ToolParams = {
        ...intro.defaultParams,
        ...versionDefaults,
      };
      for (const field of controlSchema) {
        if (
          field.kind !== "assetRef" &&
          baseline[field.name] === undefined &&
          "default" in field
        ) {
          baseline[field.name] = field.default;
        }
      }
      setDefaultParams(baseline);

      const draftParams = opts.initialDraftParams ?? {};
      const hydratedParams: ToolParams = {
        ...baseline,
        ...draftParams,
      };
      setParams(hydratedParams);

      const hydratedAssets = draftAssetsToToolAssets(
        opts.initialDraftAssets ?? undefined,
      );
      assetsRef.current = hydratedAssets;
      setAssetsState(hydratedAssets);

      await host.updateParams(hydratedParams);
      if (Object.keys(hydratedAssets).length > 0) {
        await host.setAssets(hydratedAssets);
        await waitForPaintFrames();
      }

      setMounted(true);
      setHydrated(true);
    } catch (err) {
      setError(formatErr(err));
      setMounted(false);
      setHydrated(false);
    } finally {
      setBusy(false);
    }
  }, [resolveModuleSource]);

  const onBridgeError = useCallback((err: RuntimeBridgeError) => {
    setError(`${err.code}: ${err.message}`);
  }, []);

  const applyParams = useCallback((next: ToolParams) => {
    setError(null);
    setParams(next);
    const host = hostRef.current;
    if (host?.isReady()) {
      void host.updateParams(next).catch((err) => {
        setError(formatErr(err));
      });
    }
  }, []);

  const setParam = useCallback((name: string, value: unknown) => {
    setParams((prev) => {
      const next = { ...prev, [name]: value };
      setError(null);
      const host = hostRef.current;
      if (host?.isReady()) {
        void host.updateParams(next).catch((err) => {
          setError(formatErr(err));
        });
      }
      return next;
    });
  }, []);

  /** M5a: restore getDefaultParams() bag and push to host (live, no remount). */
  const resetParams = useCallback(() => {
    applyParams({ ...defaultParams });
  }, [applyParams, defaultParams]);

  const setAsset = useCallback(async (slotId: string, url: string | null) => {
    setError(null);
    const next: ToolAssets = { ...assetsRef.current };
    if (url == null) {
      delete next[slotId];
    } else {
      next[slotId] = url;
    }
    assetsRef.current = next;
    setAssetsState({ ...next });

    const host = hostRef.current;
    if (!host?.isReady()) return;

    setBusy(true);
    try {
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
      const opts = hydrateOptsRef.current;
      const moduleSource = await resolveModuleSource();
      const intro = await host.mountTool(params, assetsRef.current, {
        toolId: opts.runtimeToolId,
        target: "canvas2d",
        moduleSource,
      });
      const controlSchema =
        opts.versionParamSchema && opts.versionParamSchema.length > 0
          ? opts.versionParamSchema
          : intro.paramSchema;
      const controlSlots =
        opts.versionAssetSlots && opts.versionAssetSlots.length > 0
          ? opts.versionAssetSlots
          : intro.assetSlots;
      setParamSchema(controlSchema);
      setAssetSlots(controlSlots);
      const versionDefaults = opts.versionDefaultParams ?? {};
      setDefaultParams({
        ...intro.defaultParams,
        ...versionDefaults,
      });
      setMounted(true);
      setHydrated(true);
      await waitForPaintFrames();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }, [params, resolveModuleSource]);

  return {
    hostRef,
    status,
    ready,
    mounted,
    hydrated,
    params,
    defaultParams,
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
    applyParams,
    resetParams,
    setAsset,
    capturePng,
    proveRealAssetCapture,
    remount,
  };
}
