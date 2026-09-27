"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AssetSlots, ParamSchema, ToolParams } from "@repo/contracts";

import { ChevronDown, Close, Download } from "@/components/icons";
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
  stageShape,
  type StageSize,
} from "../lib/stage-size";
import { ErrorNote, ResetIcon } from "../lib/studio-ui";
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
  /** Tool-scoped continuous refine chat */
  initialChatHistory?: Array<{
    id?: string;
    role: string;
    content: string;
    kind?: string;
    createdAt?: string;
    meta?: Record<string, unknown>;
  }> | null;
};

type DrawerKind = "export" | "publish" | null;

/**
 * Studio shell — Chat | Preview | Controls, dressed as the landing's Studio
 * panel (design-language §3.17): dot-grid workspace, mono dimension label,
 * framed canvas with registration marks, 248px controls column.
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
  initialChatHistory,
}: StudioShellProps) {
  const [liveDraftParams, setLiveDraftParams] = useState<
    ToolParams | null | undefined
  >(initialDraftParams);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [focusSlotId, setFocusSlotId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  /** Header title: live publish metadata → initial → fixture label. */
  const [displayTitle, setDisplayTitle] = useState(
    () => initialTitle?.trim() || fixture.label,
  );

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
    initialDraftParams: liveDraftParams,
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
      title?: string | null;
      galleryReady?: boolean;
      thumbnailAssetId?: string | null;
      thumbnailUrl?: string | null;
    }) => {
      setLiveToolStatus(tool.status);
      setLiveGalleryReady(Boolean(tool.galleryReady));
      if (tool.title?.trim()) {
        setDisplayTitle(tool.title.trim());
      }
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
      // Capability agent may have written draft_params — keep Controls in sync
      setLiveDraftParams(asParams(payload.tool.draftParams) ?? null);
      setRemountToken((n) => n + 1);
    },
    [liveDefaults, liveParamSchema, liveAssetSlots],
  );

  const getClientParams = useCallback(() => {
    return { ...(runtime.params as Record<string, unknown>) };
  }, [runtime.params]);

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

  const headerActions = (
    <>
      <button
        type="button"
        className="btn btn-ink btn-sm"
        disabled={!runtime.mounted || runtime.busy}
        onClick={() => setDrawer("export")}
      >
        <Download size={14} />
        <span>Export</span>
      </button>
      <UserMenu variant="avatar" />
    </>
  );

  const headerMeta =
    runtime.status === "ready" ? (
      <span className={pg.chip}>
        <span className={pg.liveDot} aria-hidden="true" />
        Live
      </span>
    ) : null;

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
      initialHistory={initialChatHistory}
      getClientParams={getClientParams}
    />
  );

  const stage = (
    <div className={pg.stageInner} data-stage-layout="pinned-bar">
      {/*
        Canvas slot fills remaining height and centres the frame.
        Size bar is pinned to the bottom of the stage so aspect changes
        do not jump W/H controls up and down with the preview.
      */}
      <div className={pg.stageLabel}>
        <span>{stageShape(stageSize)}</span>
        <span aria-hidden="true">·</span>
        <span>
          {stageSize.width} × {stageSize.height}
        </span>
      </div>
      <div
        className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 pt-6"
        ref={stageAreaRef}
      >
        {runtime.error && !runtime.mounted ? (
          <div className="absolute top-3 left-1/2 z-[5] w-max max-w-[min(90%,28rem)] -translate-x-1/2 rounded-[10px] border border-border bg-surface px-3 py-2">
            <ErrorNote>{runtime.error}</ErrorNote>
          </div>
        ) : null}
        <div
          className={`${pg.frame} frame-marks`}
          style={{
            width: frameDisplay.displayW,
            height: frameDisplay.displayH,
            aspectRatio: "unset",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <div className={pg.frameClip}>
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
          <span className="mark-b" aria-hidden="true" />
        </div>
      </div>
      <div className="z-[2] flex w-full shrink-0 items-center justify-center">
        <StageSizeBar value={stageSize} onChange={onStageSizeChange} />
      </div>
    </div>
  );

  const controls = (
    <>
      <div className={pg.panelHeader}>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className={pg.panelTitle}>Controls</h2>
          <p className="m-0 truncate text-[12px] leading-none text-muted">
            Tune your vision
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm -mr-2"
          disabled={!runtime.mounted || runtime.busy}
          onClick={() => runtime.resetParams()}
          title="Restore default parameters"
        >
          <ResetIcon size={14} />
          Reset
        </button>
      </div>
      <div className={pg.panelScroll}>
        <section className="flex flex-col gap-1">
          {runtime.mounted && runtime.paramSchema.length === 0 ? (
            <p className="text-[12.5px] text-muted">
              No controls for this tool.
            </p>
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
          className="flex flex-col gap-3 border-t border-border pt-4"
          ref={assetsSectionRef}
          id="studio-assets"
        >
          <h2 className={pg.panelTitle}>Assets</h2>
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
            <p className="t-mono text-[11.5px] leading-snug text-muted">
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

        <details className="group/adv border-t border-border pt-4">
          <summary className="hit flex min-h-6 cursor-pointer list-none items-center justify-between gap-3 text-muted transition-colors duration-[180ms] ease-standard hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="t-label">Advanced</span>
            <ChevronDown
              size={14}
              className="shrink-0 -rotate-90 transition-transform duration-[240ms] ease-standard group-open/adv:rotate-0"
            />
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
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
                className="btn btn-outline btn-sm"
                disabled={!runtime.mounted || runtime.busy}
                onClick={() => void runtime.capturePng()}
              >
                Capture
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={runtime.busy || runtime.status === "loading"}
                onClick={() => void runtime.remount()}
              >
                Remount
              </button>
            </div>
            {runtime.capturePreviewUrl ? (
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={runtime.capturePreviewUrl}
                  alt="Captured PNG"
                  className="h-auto w-24 rounded-[6px] border border-border bg-workspace"
                />
              </div>
            ) : null}
          </div>
        </details>

        {runtime.error ? <ErrorNote>{runtime.error}</ErrorNote> : null}
        {persist.error ? (
          <ErrorNote>Draft save: {persist.error}</ErrorNote>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <PlaygroundShell
        title={displayTitle}
        onEditTitle={() => setDrawer("publish")}
        editTitleLabel="Edit name, publish and share"
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
                {drawer === "export" ? "Export" : "Publish and share"}
              </h2>
              <button
                type="button"
                className="hit -mr-2 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors duration-[180ms] ease-standard hover:bg-workspace hover:text-fg"
                aria-label="Close"
                onClick={() => setDrawer(null)}
              >
                <Close size={14} />
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
                  lastSequenceFrameCount={
                    runtime.lastSequenceExport?.frameCount
                  }
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
                  <div className="border-t border-border pt-5">
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
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
