"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AssetSlots, ParamSchema, ToolParams } from "@repo/contracts";

import { UserMenu } from "@/features/auth/components/user-menu";
import {
  PlaygroundShell,
  playgroundStyles as pg,
} from "@/features/playground/components/playground-shell";
import { RuntimeHost, isRealUploadedAssetUrl } from "@/runtime";

import type { StudioFixtureMeta } from "../fixtures";
import { useStudioDraftPersist } from "../hooks/use-studio-draft-persist";
import { useStudioRuntime } from "../hooks/use-studio-runtime";
import {
  asParams,
  parseVersionAssetSlots,
  parseVersionParamSchema,
} from "../lib/version-metadata";
import styles from "../styles.module.css";
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
}: StudioShellProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [focusSlotId, setFocusSlotId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
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
    <div className={pg.stageInner}>
      {runtime.error && !runtime.mounted ? (
        <div className={styles.errorBanner}>{runtime.error}</div>
      ) : null}
      <div className={pg.frame}>
        <RuntimeHost
          ref={runtime.hostRef}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          onReady={(msg) => {
            void runtime.onReady(msg);
          }}
          onStatusChange={runtime.onStatusChange}
          onBridgeError={runtime.onBridgeError}
        />
      </div>
    </div>
  );

  const controls = (
    <>
      <div className={pg.panelHeader}>
        <h2 className={pg.panelTitle}>Controls</h2>
      </div>
      <div className={pg.panelScroll}>
        <section className={styles.section}>
          {runtime.mounted && runtime.paramSchema.length === 0 ? (
            <p className={styles.muted}>No controls for this tool.</p>
          ) : (
            <ParamControls
              schema={runtime.paramSchema}
              params={runtime.params}
              onChange={runtime.setParam}
              onResetDefaults={runtime.resetParams}
              onFocusAssetSlot={focusAssetSlot}
              disabled={!runtime.mounted || runtime.busy}
            />
          )}
        </section>

        <section
          className={styles.section}
          ref={assetsSectionRef}
          id="studio-assets"
        >
          <h2 className={styles.sectionTitle}>Assets</h2>
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
            toolId={persistToolId ?? null}
          />
          {runtime.hasRealAsset ? (
            <p className={styles.okText}>
              Upload bound
              {Object.entries(runtime.assets)
                .filter(([, ref]) => {
                  const u =
                    typeof ref === "string"
                      ? ref
                      : ref && "url" in ref
                        ? ref.url
                        : null;
                  return isRealUploadedAssetUrl(u);
                })
                .map(([id]) => ` · ${id}`)
                .join("")}
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

        <details className={styles.advancedDetails}>
          <summary>Advanced</summary>
          <div className={styles.advancedBody}>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
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
                className={styles.button}
                disabled={!runtime.mounted || runtime.busy}
                onClick={() => void runtime.capturePng()}
              >
                Capture
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={runtime.busy || runtime.status === "loading"}
                onClick={() => void runtime.remount()}
              >
                Remount
              </button>
            </div>
            {runtime.capturePreviewUrl ? (
              <div className={styles.captureRow} style={{ padding: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={runtime.capturePreviewUrl}
                  alt="Captured PNG"
                  className={styles.captureThumb}
                />
              </div>
            ) : null}
          </div>
        </details>

        {runtime.error ? (
          <p className={styles.errorText}>{runtime.error}</p>
        ) : null}
        {persist.error ? (
          <p className={styles.errorText}>Draft save: {persist.error}</p>
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
