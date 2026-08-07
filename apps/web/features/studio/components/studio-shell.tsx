"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AssetSlots, ParamSchema, ToolParams } from "@repo/contracts";

import { UserMenu } from "@/features/auth/components/user-menu";
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
 * Studio shell (M2a5–M5e Control + M7a–M7c export + M7f share).
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
  const [liveDefaults, setLiveDefaults] = useState<ToolParams | null | undefined>(
    versionDefaultParams,
  );
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
    publicId?.trim() ||
    persistToolId?.trim() ||
    fixture.toolId ||
    "tool";

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
      ? styles.badgeReady
      : runtime.status === "error"
        ? styles.badgeError
        : styles.badgeLoading;

  const saveLabel = saveStatusLabel(persist.status, persist.enabled);
  const saveBadgeClass =
    persist.status === "saved"
      ? styles.badgeReady
      : persist.status === "error"
        ? styles.badgeError
        : persist.status === "saving" || persist.status === "dirty"
          ? styles.badgeLoading
          : styles.badge;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <Link href="/" className={styles.brand}>
            Vibeit
          </Link>
          <span className={styles.badge}>Studio</span>
          <Link
            href="/gallery"
            style={{
              fontSize: "0.8rem",
              opacity: 0.65,
              textDecoration: "underline",
              color: "inherit",
            }}
          >
            Gallery
          </Link>
          {displayStatus ? (
            <span
              className={`${styles.badge} ${
                displayStatus === "published"
                  ? styles.badgeReady
                  : styles.badgeLoading
              }`}
              title="Tool row status"
            >
              {displayStatus}
            </span>
          ) : null}
          <span className={`${styles.badge} ${statusClass}`}>
            {runtime.mounted
              ? "live"
              : runtime.status === "ready"
                ? "ready"
                : runtime.status}
          </span>
          {saveLabel ? (
            <span className={`${styles.badge} ${saveBadgeClass}`}>
              {saveLabel}
            </span>
          ) : null}
          {runtime.m2aCaptureProved ? (
            <span className={`${styles.badge} ${styles.badgeReady}`}>
              M2a capture ✓
            </span>
          ) : runtime.hasRealAsset ? (
            <span className={`${styles.badge} ${styles.badgeLoading}`}>
              real asset bound
            </span>
          ) : null}
        </div>
        <div className={styles.headerMeta}>
          <button
            type="button"
            className={styles.linkButton}
            disabled={!runtime.mounted || runtime.busy}
            onClick={() => void runtime.downloadPng(exportFilenameBase)}
            title={
              runtime.mounted
                ? "Download PNG of the current preview"
                : "Wait until the tool is live"
            }
          >
            Download PNG
          </button>
          {persist.enabled ? (
            <button
              type="button"
              className={styles.linkButton}
              disabled={
                persist.status === "saving" ||
                persist.status === "idle" ||
                persist.status === "saved"
              }
              onClick={() => persist.saveNow()}
              title="Save draft params + assets now"
            >
              Save now
            </button>
          ) : null}
          <Link href="/create" className={styles.linkButton}>
            Create
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div>
            <h1 className={styles.sidebarTitle}>{fixture.label}</h1>
            <p className={styles.sidebarDesc}>{fixture.description}</p>
            {publicId ? (
              <p className={styles.muted} style={{ marginTop: 8 }}>
                publicId <code>{publicId}</code>
                {versionId ? (
                  <>
                    {" "}
                    · version <code>{versionId.slice(0, 8)}…</code>
                  </>
                ) : null}
              </p>
            ) : null}
            {persist.enabled ? (
              <p className={styles.muted} style={{ marginTop: 6 }}>
                Changes auto-save to your draft (no regenerate).
                {persist.lastSavedAt
                  ? ` Last saved ${new Date(persist.lastSavedAt).toLocaleTimeString()}.`
                  : null}
              </p>
            ) : (
              <p className={styles.muted} style={{ marginTop: 6 }}>
                Fixture mode — personalization is local only (not persisted).
              </p>
            )}
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Control</h2>
            {runtime.mounted && runtime.paramSchema.length === 0 ? (
              <p className={styles.muted}>
                No param schema for this tool — preview still runs.
              </p>
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

          {persistToolId && isGenerated ? (
            <RefineChatPanel
              toolId={persistToolId}
              versionId={liveVersionId}
              sourceCode={liveSource}
              disabled={runtime.busy}
              onApplied={onRefineApplied}
              onRollback={onRefineRollback}
              canRollback={Boolean(rollbackSnapshot)}
            />
          ) : null}

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
            <p className={styles.muted}>
              Empty slots use a generated placeholder — preview never crashes.
              Uploads are http URLs with CORS (needed for capture).
            </p>
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
                Real upload bound
                {Object.entries(runtime.assets)
                  .filter(([, ref]) => {
                    const u =
                      typeof ref === "string" ? ref : ref && "url" in ref
                        ? ref.url
                        : null;
                    return isRealUploadedAssetUrl(u);
                  })
                  .map(([id]) => ` · ${id}`)
                  .join("")}
              </p>
            ) : runtime.mounted && runtime.assetSlots.length > 0 ? (
              <p className={styles.muted}>
                No http storage asset yet — empty slots stay on placeholders.
              </p>
            ) : null}
          </section>

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
            lastVideoDurationSeconds={runtime.lastVideoExport?.durationSeconds}
            lastSequenceAt={runtime.lastSequenceExport?.at}
            lastSequenceFrameCount={runtime.lastSequenceExport?.frameCount}
            lastSequenceAsFallback={
              runtime.lastSequenceExport?.usedAsVideoFallback
            }
            onSaveGalleryThumbnail={
              persistToolId
                ? async () => {
                    const result =
                      await runtime.captureAndUploadThumbnail(persistToolId);
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
            initialDescription={initialDescription ?? fixture.description}
            initialTags={initialTags}
            thumbnailAssetId={galleryThumb?.assetId ?? initialThumbnailAssetId}
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
                      await runtime.captureAndUploadThumbnail(persistToolId);
                    setGalleryThumb({
                      assetId: result.assetId,
                      url: result.url,
                      at: new Date().toISOString(),
                    });
                    return { assetId: result.assetId, url: result.url };
                  }
                : undefined
            }
            onToolUpdated={onToolUpdated}
            fixtureMode={isFixtureOnly}
          />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Capture (M2a6)</h2>
            <p className={styles.muted}>
              Dev / exit gates — prefer{" "}
              <strong>Download PNG</strong> above for product export.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={
                  !runtime.mounted || runtime.busy || !runtime.hasRealAsset
                }
                onClick={() => void runtime.proveRealAssetCapture()}
                title={
                  runtime.hasRealAsset
                    ? "Capture PNG with real uploaded asset (M2a exit)"
                    : "Upload a studio image first"
                }
              >
                Prove real-asset PNG
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={!runtime.mounted || runtime.busy}
                onClick={() => void runtime.capturePng()}
              >
                Capture PNG
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
            {runtime.lastCapture ? (
              <p className={styles.muted}>
                Last capture:{" "}
                {runtime.lastCapture.usedRealAsset
                  ? `real asset (${runtime.lastCapture.realAssetSlotId})`
                  : "no real asset"}
                {runtime.lastCapture.byteLength != null
                  ? ` · ~${runtime.lastCapture.byteLength} bytes`
                  : null}
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

          {runtime.error ? (
            <p className={styles.errorText}>{runtime.error}</p>
          ) : null}
          {persist.error ? (
            <p className={styles.errorText}>Draft save: {persist.error}</p>
          ) : null}
        </aside>

        <main className={styles.preview}>
          {runtime.error && !runtime.mounted ? (
            <div className={styles.errorBanner}>{runtime.error}</div>
          ) : null}
          <div className={styles.previewStage}>
            <div className={styles.frameWrap}>
              <RuntimeHost
                ref={runtime.hostRef}
                onReady={(msg) => {
                  void runtime.onReady(msg);
                }}
                onStatusChange={runtime.onStatusChange}
                onBridgeError={runtime.onBridgeError}
              />
            </div>
          </div>
          {runtime.capturePreviewUrl ? (
            <div className={styles.captureRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={runtime.capturePreviewUrl}
                alt="Captured PNG preview"
                className={styles.captureThumb}
              />
              <div>
                <p className={styles.muted}>
                  {runtime.lastCapture?.usedRealAsset
                    ? "Captured with real uploaded asset (untainted canvas path)."
                    : "Captured without a real storage asset — not M2a exit."}
                </p>
                {runtime.lastCapture?.realAssetUrl ? (
                  <p className={styles.urlMono}>
                    {runtime.lastCapture.realAssetUrl}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
