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
  RECORD_VIDEO_DEFAULT_SECONDS,
  assertCaptureFrameLooksLikePng,
  captureFrameWireToBlob,
  clampRecordDurationSeconds,
  gateRealAssetCapture,
  hasRealUploadedAsset,
  isMediaRecorderSupported,
  waitForPaintFrames,
  type ReadyMessage,
  type RuntimeHostHandle,
  type RuntimeHostStatus,
} from "@/runtime";

import { draftAssetsToToolAssets } from "../lib/draft-assets";
import {
  buildPngExportFilename,
  buildPngSequenceZipFilename,
  buildWebmExportFilename,
  downloadBlob,
} from "../lib/export-download";
import {
  PNG_SEQUENCE_FPS,
  capturePngSequence,
  packPngSequenceZip,
} from "../lib/export-png-sequence";

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
  /** M7b — seconds remaining while recording video (null when idle). */
  const [recordSecondsLeft, setRecordSecondsLeft] = useState<number | null>(
    null,
  );
  const [lastVideoExport, setLastVideoExport] = useState<{
    at: string;
    byteLength: number;
    durationSeconds: number;
    mimeType: string;
  } | null>(null);
  /** M7c — PNG sequence progress (null when idle). */
  const [sequenceProgress, setSequenceProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [lastSequenceExport, setLastSequenceExport] = useState<{
    at: string;
    frameCount: number;
    byteLength: number;
    usedAsVideoFallback: boolean;
  } | null>(null);

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

  /**
   * M8c — captureFrame → PNG blob → upload kind=thumb for gallery.
   * Also updates the in-Studio capture preview. Returns uploaded asset id + url.
   */
  const captureAndUploadThumbnail = useCallback(
    async (toolId: string) => {
      setError(null);
      setBusy(true);
      try {
        const host = hostRef.current;
        if (!host?.isReady()) {
          throw new Error("Host not ready — wait until the tool is live");
        }
        if (!toolId.trim()) {
          throw new Error("Tool id required to save a gallery thumbnail");
        }
        await waitForPaintFrames();
        const frame = await host.captureFrame();
        assertCaptureFrameLooksLikePng(frame);
        const blob = captureFrameWireToBlob(frame);
        if (blob.size < 32) {
          throw new Error("PNG blob empty — possible tainted canvas");
        }

        const at = new Date();
        const real = gateRealAssetCapture(assetsRef.current);
        applyCaptureResult(blob, {
          usedRealAsset: real.ok,
          realAssetSlotId: real.ok ? real.slotId : undefined,
          realAssetUrl: real.ok ? real.url : undefined,
          at: at.toISOString(),
          byteLength: frame.byteLength ?? blob.size,
        });
        if (real.ok) {
          setM2aCaptureProved(true);
        }

        const { uploadThumbnailBlob } = await import("../lib/upload-thumbnail");
        const asset = await uploadThumbnailBlob(blob, {
          toolId: toolId.trim(),
          filename: `thumb-${toolId.trim().slice(0, 8)}-${at.getTime()}.png`,
        });
        return {
          assetId: asset.id,
          url: asset.url,
          byteLength: asset.byteSize,
        };
      } catch (err) {
        const msg = formatErr(err);
        if (/taint|security|cross-origin|CAPTURE_FAILED/i.test(msg)) {
          setError(
            `${msg} — check storage CORS + crossOrigin=anonymous (M0f/M2a6)`,
          );
        } else {
          setError(msg);
        }
        throw err instanceof Error ? err : new Error(msg);
      } finally {
        setBusy(false);
      }
    },
    [applyCaptureResult],
  );

  /**
   * M7a — product PNG export: captureFrame → PNG blob → browser download.
   * Also updates the in-Studio capture preview (same path as capturePng).
   *
   * @param filenameBase slug source (tool id, publicId, or fixture id)
   */
  const downloadPng = useCallback(
    async (filenameBase: string) => {
      setError(null);
      setBusy(true);
      try {
        const host = hostRef.current;
        if (!host?.isReady()) {
          throw new Error("Host not ready — wait until the tool is live");
        }
        await waitForPaintFrames();
        const frame = await host.captureFrame();
        assertCaptureFrameLooksLikePng(frame);
        const blob = captureFrameWireToBlob(frame);
        if (blob.size < 32) {
          throw new Error("PNG blob empty — possible tainted canvas");
        }

        const at = new Date();
        const real = gateRealAssetCapture(assetsRef.current);
        applyCaptureResult(blob, {
          usedRealAsset: real.ok,
          realAssetSlotId: real.ok ? real.slotId : undefined,
          realAssetUrl: real.ok ? real.url : undefined,
          at: at.toISOString(),
          byteLength: frame.byteLength ?? blob.size,
        });
        if (real.ok) {
          setM2aCaptureProved(true);
        }

        const filename = buildPngExportFilename(filenameBase, at);
        downloadBlob(blob, filename);
      } catch (err) {
        const msg = formatErr(err);
        if (/taint|security|cross-origin|CAPTURE_FAILED/i.test(msg)) {
          setError(
            `${msg} — check storage CORS + crossOrigin=anonymous (M0f/M2a6)`,
          );
        } else {
          setError(msg);
        }
      } finally {
        setBusy(false);
      }
    },
    [applyCaptureResult],
  );

  const captureOnePngBlob = useCallback(async (): Promise<Blob> => {
    const host = hostRef.current;
    if (!host?.isReady()) {
      throw new Error("Host not ready — wait until the tool is live");
    }
    await waitForPaintFrames();
    const frame = await host.captureFrame();
    assertCaptureFrameLooksLikePng(frame);
    const blob = captureFrameWireToBlob(frame);
    if (blob.size < 32) {
      throw new Error("PNG blob empty — possible tainted canvas");
    }
    return blob;
  }, []);

  /**
   * M7c — sample PNG frames over ~durationSeconds, download as ZIP.
   * Also used as automatic fallback when WebM/MediaRecorder fails.
   */
  const downloadPngSequence = useCallback(
    async (
      filenameBase: string,
      durationSeconds: number = RECORD_VIDEO_DEFAULT_SECONDS,
      opts?: { usedAsVideoFallback?: boolean },
    ) => {
      setError(null);
      setBusy(true);
      setSequenceProgress({ done: 0, total: 0 });
      try {
        const seconds = clampRecordDurationSeconds(durationSeconds);
        const frames = await capturePngSequence({
          captureFrame: captureOnePngBlob,
          durationSeconds: seconds,
          fps: PNG_SEQUENCE_FPS,
          onProgress: (done, total) => setSequenceProgress({ done, total }),
        });

        // Preview last frame
        const last = frames[frames.length - 1]!;
        const real = gateRealAssetCapture(assetsRef.current);
        applyCaptureResult(last, {
          usedRealAsset: real.ok,
          realAssetSlotId: real.ok ? real.slotId : undefined,
          realAssetUrl: real.ok ? real.url : undefined,
          at: new Date().toISOString(),
          byteLength: last.size,
        });

        const zip = await packPngSequenceZip(frames);
        const at = new Date();
        setLastSequenceExport({
          at: at.toISOString(),
          frameCount: frames.length,
          byteLength: zip.size,
          usedAsVideoFallback: Boolean(opts?.usedAsVideoFallback),
        });
        downloadBlob(zip, buildPngSequenceZipFilename(filenameBase, at));

        if (opts?.usedAsVideoFallback) {
          setError(
            `WebM unavailable — downloaded PNG sequence (${frames.length} frames) instead. See export browser notes.`,
          );
        }
      } catch (err) {
        const msg = formatErr(err);
        if (/taint|security|cross-origin|CAPTURE_FAILED/i.test(msg)) {
          setError(
            `${msg} — check storage CORS + crossOrigin=anonymous (M0f/M2a6)`,
          );
        } else {
          setError(msg);
        }
      } finally {
        setSequenceProgress(null);
        setBusy(false);
      }
    },
    [applyCaptureResult, captureOnePngBlob],
  );

  /**
   * M7b — short WebM via frame recordVideo (getCaptureStream + MediaRecorder).
   * M7c — auto PNG-sequence fallback when MediaRecorder missing or record fails.
   */
  const downloadVideo = useCallback(
    async (
      filenameBase: string,
      durationSeconds: number = RECORD_VIDEO_DEFAULT_SECONDS,
    ) => {
      setError(null);
      const seconds = clampRecordDurationSeconds(durationSeconds);

      // Host-side precheck → go straight to sequence fallback
      if (!isMediaRecorderSupported()) {
        await downloadPngSequence(filenameBase, seconds, {
          usedAsVideoFallback: true,
        });
        return;
      }

      setBusy(true);
      setRecordSecondsLeft(seconds);

      const tick = window.setInterval(() => {
        setRecordSecondsLeft((prev) => {
          if (prev == null || prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      let fellBackToSequence = false;
      try {
        const host = hostRef.current;
        if (!host?.isReady()) {
          throw new Error("Host not ready — wait until the tool is live");
        }
        await waitForPaintFrames();
        const wire = await host.recordVideo(seconds);
        const blob = captureFrameWireToBlob(wire);
        if (blob.size < 32) {
          throw new Error("Recorded video empty");
        }

        const at = new Date();
        setLastVideoExport({
          at: at.toISOString(),
          byteLength: wire.byteLength ?? blob.size,
          durationSeconds: seconds,
          mimeType: wire.mimeType || blob.type || "video/webm",
        });
        downloadBlob(blob, buildWebmExportFilename(filenameBase, at));
      } catch (err) {
        const msg = formatErr(err);

        // M7c: try PNG sequence when video path fails
        if (
          /MediaRecorder|RECORD_FAILED|not available|empty|UNSUPPORTED|timeout/i.test(
            msg,
          )
        ) {
          fellBackToSequence = true;
          window.clearInterval(tick);
          setRecordSecondsLeft(null);
          setBusy(false);
          await downloadPngSequence(filenameBase, seconds, {
            usedAsVideoFallback: true,
          });
          return;
        }
        if (/taint|security|cross-origin/i.test(msg)) {
          setError(
            `${msg} — check storage CORS + crossOrigin=anonymous (M0f/M2a6)`,
          );
        } else {
          setError(msg);
        }
      } finally {
        window.clearInterval(tick);
        setRecordSecondsLeft(null);
        // downloadPngSequence owns busy when we fell back
        if (!fellBackToSequence) {
          setBusy(false);
        }
      }
    },
    [downloadPngSequence],
  );

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
    lastVideoExport,
    lastSequenceExport,
    recordSecondsLeft,
    sequenceProgress,
    recordingVideo: recordSecondsLeft != null,
    capturingSequence: sequenceProgress != null,
    busy,
    m2aCaptureProved,
    hasRealAsset: hasRealUploadedAsset(assets),
    mediaRecorderSupported: isMediaRecorderSupported(),
    onStatusChange,
    onReady,
    onBridgeError,
    setParam,
    applyParams,
    resetParams,
    setAsset,
    capturePng,
    captureAndUploadThumbnail,
    downloadPng,
    downloadVideo,
    downloadPngSequence,
    proveRealAssetCapture,
    remount,
  };
}
