"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AssetSlots, ParamSchema, ToolParams } from "@repo/contracts";

import { UserMenu } from "@/features/auth/components/user-menu";
import {
  PlaygroundShell,
  playgroundStyles as pg,
} from "@/features/playground/components/playground-shell";
import {
  RuntimeHost,
  isCaptureEligibleAssetUrl,
  isUserLocalAssetUrl,
} from "@/runtime";

import type { StudioFixtureMeta } from "../fixtures";
import { useStudioDraftPersist } from "../hooks/use-studio-draft-persist";
import { useStudioRuntime } from "../hooks/use-studio-runtime";
import {
  defaultStageSize,
  embedSizeFromStage,
  fitStageBox,
  loadStageSize,
  parseAspectFromSource,
  saveStageSize,
  sizeFromAspect,
  type StageSize,
} from "../lib/stage-size";
import {
  asParams,
  parseVersionAssetSlots,
  parseVersionParamSchema,
} from "../lib/version-metadata";
import { AssetSlotsPanel } from "./asset-slots-panel";
import { EmptySlotsBanner } from "./empty-slots-banner";
import { ExportPanel } from "./export-panel";
import { ParamControls } from "./param-controls";
import { PublishPanel } from "./publish-panel";
import {
  RefineChatPanel,
  type RefineAppliedPayload,
} from "./refine-chat-panel";
import { SharePanel } from "./share-panel";
import { StageSizeBar } from "./stage-size-bar";
import { ViewSourcePanel } from "./view-source-panel";

export type StudioShellProps = {
  fixture: StudioFixtureMeta;
  /** Optional generated source for view-only panel (M3g / M5e). */
  sourceCode?: string | null;
  versionId?: string | null;
  publicId?: string | null;
  /** tools.status — draft | published */
  toolStatus?: string | null;
  isGenerated?: boolean;
  /**
   * M5d: API tool id for draft persist. Omit/null for fixtures (local only).
   * Usually same as fixture.toolId for generated tools.
   */
  persistToolId?: string | null;
  /** M5d: tool_versions.default_params baseline. */
  versionDefaultParams?: ToolParams | null;
  /** M5e: prefer API paramSchema for Control. */
  versionParamSchema?: ParamSchema | null;
  /** M5e: prefer API assetSlots for Assets panel. */
  versionAssetSlots?: AssetSlots | null;
  /** M5d: tools.draft_params from GET. */
  initialDraftParams?: ToolParams | null;
  /** M5d: tools.draft_assets from GET. */
  initialDraftAssets?: Record<string, string | null> | null;
  /** M8f: publish panel seed from GET tool */
  initialTitle?: string | null;
  initialDescription?: string | null;
  initialTags?: string[] | null;
  initialGalleryReady?: boolean | null;
  initialThumbnailAssetId?: string | null;
  initialThumbnailUrl?: string | null;
  /**
   * C6: plan.aspect from tool_versions.plan (e.g. "16:9", "9:16").
   * Seeds stage size when no localStorage override.
   */
  planAspect?: string | null;
};

type DrawerKind = "export" | "publish" | null;

function saveStatusLabel(
  status: ReturnType<typeof useStudioDraftPersist>["status"],
  enabled: boolean,
): string | null {
  if (!enabled) return null;
  switch (status) {
    case "dirty":
      return "Unsaved…";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    default:
      return null;
  }
}

/**
 * Studio shell — Brickspace-class Chat | Preview | Controls.
 */
export function StudioShell({
  fixture,
  sourceCode,
  versionId,
  publicId,
  toolStatus,
  isGenerated,
  persistToolId,
  versionDefaultParams,
  versionParamSchema,
  versionAssetSlots,
  initialDraftParams,
  initialDraftAssets,
  initialTitle,
  initialDescription,
  initialTags,
  initialGalleryReady,
  initialThumbnailAssetId,
  initialThumbnailUrl,
  planAspect,
}: StudioShellProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [focusSlotId, setFocusSlotId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerKind>(null);

  const stageToolKey =
    persistToolId?.trim() || fixture.toolId || "studio-local";
  const isSocialFrameFixture =
    fixture.toolId === "social-frame" ||
    fixture.runtimeToolId === "fixture:social-frame";

  /** SSR-safe seed (no localStorage); client effect applies stored preference. */
  const [stageSize, setStageSize] = useState<StageSize>(() => {
    const aspect =
      planAspect?.trim() || parseAspectFromSource(sourceCode) || null;
    if (aspect) return sizeFromAspect(aspect);
    return defaultStageSize(isSocialFrameFixture ? "9:16" : "1:1");
  });

  const stageAreaRef = useRef<HTMLDivElement | null>(null);
  const [stageMax, setStageMax] = useState({ w: 720, h: 640 });
  /** Skip persisting until localStorage preference has been applied once. */
  const [stagePrefsReady, setStagePrefsReady] = useState(false);

  // Apply localStorage override once on mount (avoids SSR hydration mismatch).
  useEffect(() => {
    const stored = loadStageSize(stageToolKey);
    if (stored) setStageSize(stored);
    setStagePrefsReady(true);
  }, [stageToolKey]);

  useEffect(() => {
    if (!stagePrefsReady) return;
    saveStageSize(stageToolKey, stageSize);
  }, [stageSize, stageToolKey, stagePrefsReady]);

  useEffect(() => {
    const el = stageAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // stageAreaRef is the canvas slot only (size bar is docked below).
      const w = Math.max(160, Math.floor(rect.width) - 16);
      const h = Math.max(160, Math.floor(rect.height) - 16);
      setStageMax({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frameDisplay = useMemo(() => {
    // stageMax is measured from the canvas slot above the pinned size bar.
    return fitStageBox(
      stageSize.width,
      stageSize.height,
      stageMax.w,
      stageMax.h,
    );
  }, [stageSize.height, stageSize.width, stageMax.h, stageMax.w]);

  const onStageSizeChange = useCallback((next: StageSize) => {
    setStageSize(next);
  }, []);
  /** M7f: update badge after thin publish without full reload. */
  const [liveToolStatus, setLiveToolStatus] = useState<string | null>(
    toolStatus ?? null,
  );
  const [liveGalleryReady, setLiveGalleryReady] = useState(
    Boolean(initialGalleryReady),
  );
  /** M8c: last gallery thumbnail capture (asset id for publish later). */
  const [galleryThumb, setGalleryThumb] = useState<{
    assetId: string;
    url: string;
    at: string;
  } | null>(
    initialThumbnailAssetId && initialThumbnailUrl
      ? {
          assetId: initialThumbnailAssetId,
          url: initialThumbnailUrl,
          at: new Date().toISOString(),
        }
      : null,
  );
  /** Once-per-tool guard for automatic gallery frame capture. */
  const autoThumbAttemptedRef = useRef<string | null>(null);
  // AM7 — live version after refine (client-side last-good rollback)
  const [liveSource, setLiveSource] = useState<string | null | undefined>(
    sourceCode,
  );
  const [liveVersionId, setLiveVersionId] = useState<string | null | undefined>(
    versionId,
  );
  const [liveDefaults, setLiveDefaults] = useState<
    ToolParams | null | undefined
  >(versionDefaultParams);
  const [liveParamSchema, setLiveParamSchema] = useState<
    ParamSchema | null | undefined
  >(versionParamSchema);
  const [liveAssetSlots, setLiveAssetSlots] = useState<
    AssetSlots | null | undefined
  >(versionAssetSlots);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<{
    sourceCode: string | null;
    versionId: string | null;
    defaultParams: ToolParams | null;
    paramSchema: ParamSchema | null;
    assetSlots: AssetSlots | null;
  } | null>(null);
  /** Bump after liveSource updates so remount sees the new module. */
  const [remountToken, setRemountToken] = useState(0);
  const assetsSectionRef = useRef<HTMLElement | null>(null);

  const runtime = useStudioRuntime({
    runtimeToolId: fixture.runtimeToolId,
    // Local-first asset map key (same id Assets panel uses for IDB bindings)
    localAssetToolId: stageToolKey,
    // B3: honor fixture/version target (canvas2d | p5 | three)
    target: fixture.target,
    sourceCode: liveSource,
    versionDefaultParams: liveDefaults,
    versionParamSchema: liveParamSchema,
    versionAssetSlots: liveAssetSlots,
    initialDraftParams,
    initialDraftAssets,
  });

  useEffect(() => {
    if (remountToken <= 0) return;
    void runtime.remount();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount only on token
  }, [remountToken]);

  const persist = useStudioDraftPersist({
    toolId: persistToolId ?? null,
    params: runtime.params,
    assets: runtime.assets,
    assetSlots: runtime.assetSlots,
    ready: runtime.mounted && runtime.hydrated,
  });

  /** Filename base: publicId → tool id → fixture id (M7a). */
  const exportFilenameBase =
    publicId?.trim() || persistToolId?.trim() || fixture.toolId || "tool";

  const displayStatus = liveToolStatus ?? toolStatus ?? null;
  const isFixtureOnly = !persistToolId || !publicId;

  /**
   * Auto gallery thumbnail: when Studio mounts a generated tool that has no
   * thumb yet, capture once and upload (API pins tools.thumbnail_asset_id).
   * Soft-fail — never blocks Studio. Backfills blanks created by create finalize.
   */
  useEffect(() => {
    const toolId = persistToolId?.trim();
    if (!toolId || isFixtureOnly) return;
    if (!runtime.mounted || runtime.status !== "ready") return;
    if (galleryThumb?.assetId || initialThumbnailAssetId) return;
    if (autoThumbAttemptedRef.current === toolId) return;

    autoThumbAttemptedRef.current = toolId;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await runtime.captureAndUploadThumbnail(toolId, {
            quiet: true,
          });
          if (cancelled) return;
          setGalleryThumb({
            assetId: result.assetId,
            url: result.url,
            at: new Date().toISOString(),
          });
        } catch {
          // Soft-fail: owner can still use manual “Save gallery thumbnail”
          if (!cancelled) {
            autoThumbAttemptedRef.current = `${toolId}:failed`;
          }
        }
      })();
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when host ready
  }, [
    persistToolId,
    isFixtureOnly,
    runtime.mounted,
    runtime.status,
    galleryThumb?.assetId,
    initialThumbnailAssetId,
  ]);

  const focusAssetSlot = useCallback((slotId: string) => {
    setFocusSlotId(slotId);
    assetsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  const onPublished = useCallback((next: string) => {
    setLiveToolStatus(next);
  }, []);

  const onToolUpdated = useCallback(
    (tool: {
      status: string;
      galleryReady?: boolean;
      thumbnailAssetId?: string | null;
      thumbnailUrl?: string | null;
    }) => {
      setLiveToolStatus(tool.status);
      setLiveGalleryReady(Boolean(tool.galleryReady));
      if (tool.thumbnailAssetId && tool.thumbnailUrl) {
        setGalleryThumb({
          assetId: tool.thumbnailAssetId,
          url: tool.thumbnailUrl,
          at: new Date().toISOString(),
        });
      }
    },
    [],
  );

  const onRefineApplied = useCallback(
    (payload: RefineAppliedPayload) => {
      const v = payload.tool.latestVersion;
      setRollbackSnapshot({
        sourceCode: payload.previous.sourceCode,
        versionId: payload.previous.versionId,
        defaultParams: liveDefaults ?? null,
        paramSchema: liveParamSchema ?? null,
        assetSlots: liveAssetSlots ?? null,
      });
      setLiveSource(v?.code ?? null);
      setLiveVersionId(v?.id ?? null);
      setLiveDefaults(asParams(v?.defaultParams) ?? null);
      setLiveParamSchema(parseVersionParamSchema(v?.paramSchema));
      setLiveAssetSlots(parseVersionAssetSlots(v?.assetSlots));
      setRemountToken((n) => n + 1);
    },
    [liveDefaults, liveParamSchema, liveAssetSlots],
  );

  const onRefineRollback = useCallback(() => {
    if (!rollbackSnapshot) return;
    setLiveSource(rollbackSnapshot.sourceCode);
    setLiveVersionId(rollbackSnapshot.versionId);
    setLiveDefaults(rollbackSnapshot.defaultParams);
    setLiveParamSchema(rollbackSnapshot.paramSchema);
    setLiveAssetSlots(rollbackSnapshot.assetSlots);
    setRollbackSnapshot(null);
    setRemountToken((n) => n + 1);
  }, [rollbackSnapshot]);

  const statusClass =
    runtime.status === "ready" || runtime.mounted
      ? pg.chipLive
      : runtime.status === "error"
        ? pg.chipError
        : pg.chipWarn;

  const saveLabel = saveStatusLabel(persist.status, persist.enabled);
  const saveChipClass =
    persist.status === "saved"
      ? pg.chipLive
      : persist.status === "error"
        ? pg.chipError
        : persist.status === "saving" || persist.status === "dirty"
          ? pg.chipWarn
          : pg.chip;

  const headerMeta = (
    <>
      {displayStatus ? (
        <span
          className={`${pg.chip} ${
            displayStatus === "published" ? pg.chipLive : pg.chipWarn
          }`}
        >
          {displayStatus}
        </span>
      ) : null}
      <span className={`${pg.chip} ${statusClass}`}>
        {runtime.mounted
          ? "live"
          : runtime.status === "ready"
            ? "ready"
            : runtime.status}
      </span>
      {saveLabel ? (
        <span className={`${pg.chip} ${saveChipClass}`}>{saveLabel}</span>
      ) : null}
    </>
  );

  const headerActions = (
    <>
      <Link href="/gallery" className={`${pg.btn} ${pg.btnGhost}`}>
        Gallery
      </Link>
      <Link href="/create" className={`${pg.btn} ${pg.btnGhost}`}>
        Create
      </Link>
      {persist.enabled ? (
        <button
          type="button"
          className={pg.btn}
          disabled={
            persist.status === "saving" ||
            persist.status === "idle" ||
            persist.status === "saved"
          }
          onClick={() => persist.saveNow()}
        >
          Save
        </button>
      ) : null}
      <button
        type="button"
        className={pg.btn}
        onClick={() => setDrawer("publish")}
      >
        Publish
      </button>
      <button
        type="button"
        className={`${pg.btn} ${pg.btnAccent}`}
        disabled={!runtime.mounted || runtime.busy}
        onClick={() => setDrawer("export")}
      >
        Export
      </button>
      <span className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
      <UserMenu />
    </>
  );

  const chat = (
    <RefineChatPanel
      consoleLayout
      toolId={persistToolId}
      versionId={liveVersionId}
      sourceCode={liveSource}
      disabled={runtime.busy}
      onApplied={onRefineApplied}
      onRollback={onRefineRollback}
      canRollback={Boolean(rollbackSnapshot)}
      toolLabel={fixture.label}
    />
  );

  const stage = (
    <div className={pg.stageInner} data-stage-layout="pinned-bar">
      {/*
        Canvas slot fills remaining height and centers the frame.
        Size bar is pinned to the bottom of the stage so aspect changes
        do not jump W/H controls up and down with the preview.
      */}
      <div
        className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col items-center justify-center gap-[0.65rem]"
        ref={stageAreaRef}
      >
        {runtime.error && !runtime.mounted ? (
          <div className="absolute top-3 left-1/2 z-[5] max-w-[min(90%,28rem)] -translate-x-1/2 rounded-[10px] border border-[#b91c1c]/28 bg-[color-mix(in_srgb,#b91c1c_12%,var(--background))] px-[0.85rem] py-[0.55rem] text-[0.8rem] leading-snug text-[#b91c1c]">
            {runtime.error}
          </div>
        ) : null}
        <div
          className={pg.frame}
          style={{
            width: frameDisplay.displayW,
            height: frameDisplay.displayH,
            aspectRatio: "unset",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <RuntimeHost
            ref={runtime.hostRef}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            onReady={(msg) => {
              void runtime.onReady(msg);
            }}
            onStatusChange={runtime.onStatusChange}
            onBridgeError={runtime.onBridgeError}
          />
        </div>
      </div>
      <div className="z-[2] flex w-full shrink-0 items-center justify-center px-0 pt-[0.15rem] pb-1">
        <StageSizeBar value={stageSize} onChange={onStageSizeChange} />
      </div>
    </div>
  );

  const controls = (
    <>
      <div className={pg.panelHeader}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className={pg.panelTitle}>Controls</h2>
          <p className="m-0 text-[0.7rem] leading-snug text-ink-caption">
            Tune your vision
          </p>
        </div>
        <button
          type="button"
          className={`${pg.btn} ${pg.btnGhost} min-h-9! px-2.5! text-[0.78rem]!`}
          disabled={!runtime.mounted || runtime.busy}
          onClick={() => runtime.resetParams()}
          title="Restore default parameters"
        >
          <span className="text-[0.95rem] leading-none opacity-85" aria-hidden>
            ↺
          </span>
          Reset
        </button>
      </div>
      <div className={pg.panelScroll}>
        <section className="flex flex-col gap-1">
          {runtime.mounted && runtime.paramSchema.length === 0 ? (
            <p className="text-sm text-muted-ink">No controls for this tool.</p>
          ) : (
            <ParamControls
              schema={runtime.paramSchema}
              params={runtime.params}
              onChange={runtime.setParam}
              onResetDefaults={runtime.resetParams}
              hideReset
              onFocusAssetSlot={focusAssetSlot}
              disabled={!runtime.mounted || runtime.busy}
            />
          )}
        </section>

        <section
          className="mt-1 flex flex-col gap-2 border-t border-border-subtle pt-4"
          ref={assetsSectionRef}
          id="studio-assets"
        >
          <h2 className="m-0 text-[0.72rem] font-semibold tracking-[-0.01em] text-ink-caption uppercase">
            Assets
          </h2>
          {runtime.mounted && runtime.assetSlots.length > 0 ? (
            <EmptySlotsBanner
              slots={runtime.assetSlots}
              assets={runtime.assets}
              onFocusSlot={focusAssetSlot}
            />
          ) : null}
          <AssetSlotsPanel
            slots={runtime.assetSlots}
            assets={runtime.assets}
            onAssetUrl={runtime.setAsset}
            disabled={!runtime.mounted || runtime.busy}
            highlightSlotId={focusSlotId}
            toolId={stageToolKey}
          />
          {runtime.hasRealAsset ? (
            <p className="text-[0.8rem] leading-snug text-[#15803d]">
              {(() => {
                const bound = Object.entries(runtime.assets).filter(
                  ([, ref]) => {
                    const u =
                      typeof ref === "string"
                        ? ref
                        : ref && "url" in ref
                          ? ref.url
                          : null;
                    return isCaptureEligibleAssetUrl(u);
                  },
                );
                const anyLocal = bound.some(([, ref]) => {
                  const u =
                    typeof ref === "string"
                      ? ref
                      : ref && "url" in ref
                        ? ref.url
                        : null;
                  return isUserLocalAssetUrl(u);
                });
                return `${anyLocal ? "Asset bound · on this device" : "Asset bound"}${bound
                  .map(([id]) => ` · ${id}`)
                  .join("")}`;
              })()}
            </p>
          ) : null}
        </section>

        <ViewSourcePanel
          toolId={fixture.toolId}
          target={fixture.target}
          open={sourceOpen}
          onToggle={() => setSourceOpen((v) => !v)}
          sourceCode={liveSource}
          isGenerated={isGenerated}
          versionId={liveVersionId}
        />

        <details className="rounded-xl border border-foreground/10 px-[0.7rem] py-[0.55rem] [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:text-[0.78rem] [&_summary]:font-semibold [&_summary]:opacity-65 [&_summary::-webkit-details-marker]:hidden">
          <summary>Advanced</summary>
          <div className="mt-[0.65rem] flex flex-col gap-[0.55rem]">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  !runtime.mounted || runtime.busy || !runtime.hasRealAsset
                }
                onClick={() => void runtime.proveRealAssetCapture()}
                title="Prove real-asset PNG capture"
              >
                Prove PNG
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!runtime.mounted || runtime.busy}
                onClick={() => void runtime.capturePng()}
              >
                Capture
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit disabled:cursor-not-allowed disabled:opacity-45"
                disabled={runtime.busy || runtime.status === "loading"}
                onClick={() => void runtime.remount()}
              >
                Remount
              </button>
            </div>
            {runtime.capturePreviewUrl ? (
              <div className="flex items-start gap-4 p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={runtime.capturePreviewUrl}
                  alt="Captured PNG"
                  className="h-auto w-24 rounded-[10px] border border-foreground/12 bg-white"
                />
              </div>
            ) : null}
          </div>
        </details>

        {runtime.error ? (
          <p className="text-[0.8rem] leading-snug text-[#b91c1c]">
            {runtime.error}
          </p>
        ) : null}
        {persist.error ? (
          <p className="text-[0.8rem] leading-snug text-[#b91c1c]">
            Draft save: {persist.error}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <PlaygroundShell
        title={fixture.label}
        headerMeta={headerMeta}
        headerActions={headerActions}
        chat={chat}
        stage={stage}
        controls={controls}
      />

      {drawer ? (
        <>
          <button
            type="button"
            className={pg.drawerBackdrop}
            aria-label="Close panel"
            onClick={() => setDrawer(null)}
          />
          <aside
            className={pg.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={drawer === "export" ? "Export" : "Publish"}
          >
            <div className={pg.drawerHeader}>
              <h2 className={pg.drawerTitle}>
                {drawer === "export" ? "Export" : "Publish & share"}
              </h2>
              <button
                type="button"
                className={pg.btn}
                onClick={() => setDrawer(null)}
              >
                Close
              </button>
            </div>
            <div className={pg.drawerBody}>
              {drawer === "export" ? (
                <ExportPanel
                  mounted={runtime.mounted}
                  busy={runtime.busy}
                  filenameBase={exportFilenameBase}
                  onDownloadPng={runtime.downloadPng}
                  onDownloadVideo={runtime.downloadVideo}
                  onDownloadPngSequence={runtime.downloadPngSequence}
                  mediaRecorderSupported={runtime.mediaRecorderSupported}
                  recordSecondsLeft={runtime.recordSecondsLeft}
                  sequenceProgress={runtime.sequenceProgress}
                  lastByteLength={runtime.lastCapture?.byteLength}
                  lastAt={runtime.lastCapture?.at}
                  lastVideoAt={runtime.lastVideoExport?.at}
                  lastVideoByteLength={runtime.lastVideoExport?.byteLength}
                  lastVideoDurationSeconds={
                    runtime.lastVideoExport?.durationSeconds
                  }
                  lastSequenceAt={runtime.lastSequenceExport?.at}
                  lastSequenceFrameCount={runtime.lastSequenceExport?.frameCount}
                  lastSequenceAsFallback={
                    runtime.lastSequenceExport?.usedAsVideoFallback
                  }
                  onSaveGalleryThumbnail={
                    persistToolId
                      ? async () => {
                          const result =
                            await runtime.captureAndUploadThumbnail(
                              persistToolId,
                            );
                          setGalleryThumb({
                            assetId: result.assetId,
                            url: result.url,
                            at: new Date().toISOString(),
                          });
                        }
                      : undefined
                  }
                  lastThumbnailUrl={galleryThumb?.url}
                  lastThumbnailAt={galleryThumb?.at}
                />
              ) : (
                <>
                  <SharePanel
                    publicId={publicId}
                    toolId={persistToolId}
                    status={displayStatus}
                    title={initialTitle ?? fixture.label}
                    onPublished={onPublished}
                    fixtureMode={isFixtureOnly}
                    embedWidth={embedSizeFromStage(stageSize).width}
                    embedHeight={embedSizeFromStage(stageSize).height}
                  />
                  <PublishPanel
                    toolId={persistToolId}
                    publicId={publicId}
                    status={displayStatus}
                    galleryReady={liveGalleryReady}
                    initialTitle={initialTitle ?? fixture.label}
                    initialDescription={
                      initialDescription ?? fixture.description
                    }
                    initialTags={initialTags}
                    thumbnailAssetId={
                      galleryThumb?.assetId ?? initialThumbnailAssetId
                    }
                    thumbnailUrl={galleryThumb?.url ?? initialThumbnailUrl}
                    mounted={runtime.mounted}
                    busy={runtime.busy}
                    exportSmokeProved={Boolean(
                      runtime.lastCapture?.byteLength || galleryThumb,
                    )}
                    onCaptureThumbnail={
                      persistToolId
                        ? async () => {
                            const result =
                              await runtime.captureAndUploadThumbnail(
                                persistToolId,
                              );
                            setGalleryThumb({
                              assetId: result.assetId,
                              url: result.url,
                              at: new Date().toISOString(),
                            });
                            return {
                              assetId: result.assetId,
                              url: result.url,
                            };
                          }
                        : undefined
                    }
                    onToolUpdated={onToolUpdated}
                    fixtureMode={isFixtureOnly}
                  />
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
