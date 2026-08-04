"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import type { AssetSlots, ParamSchema, ToolParams } from "@repo/contracts";

import { UserMenu } from "@/features/auth/components/user-menu";
import { RuntimeHost, isRealUploadedAssetUrl } from "@/runtime";

import type { StudioFixtureMeta } from "../fixtures";
import { useStudioDraftPersist } from "../hooks/use-studio-draft-persist";
import { useStudioRuntime } from "../hooks/use-studio-runtime";
import styles from "../styles.module.css";
import { AssetSlotsPanel } from "./asset-slots-panel";
import { EmptySlotsBanner } from "./empty-slots-banner";
import { ParamControls } from "./param-controls";
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
  /**
   * M5e: show note that live preview may use the canvas2d fixture harness
   * while Control / source come from the generated version.
   */
  previewHarnessNote?: boolean;
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
 * Studio shell (M2a5 + M2a6 + M3g + M5a–M5e Control + draft persist).
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
  previewHarnessNote,
}: StudioShellProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [focusSlotId, setFocusSlotId] = useState<string | null>(null);
  const assetsSectionRef = useRef<HTMLElement | null>(null);

  const runtime = useStudioRuntime({
    runtimeToolId: fixture.runtimeToolId,
    versionDefaultParams,
    versionParamSchema,
    versionAssetSlots,
    initialDraftParams,
    initialDraftAssets,
  });

  const persist = useStudioDraftPersist({
    toolId: persistToolId ?? null,
    params: runtime.params,
    assets: runtime.assets,
    assetSlots: runtime.assetSlots,
    ready: runtime.mounted && runtime.hydrated,
  });

  const focusAssetSlot = useCallback((slotId: string) => {
    setFocusSlotId(slotId);
    assetsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

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
          {toolStatus ? (
            <span
              className={`${styles.badge} ${
                toolStatus === "published"
                  ? styles.badgeReady
                  : styles.badgeLoading
              }`}
              title="Tool row status"
            >
              {toolStatus}
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
            {previewHarnessNote ? (
              <p className={styles.harnessNote}>
                Live preview uses the canvas2d host harness. Control schema and
                View source come from your generated version — personalize
                without regenerating.
              </p>
            ) : null}
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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Capture (M2a6)</h2>
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
            sourceCode={sourceCode}
            isGenerated={isGenerated}
            versionId={versionId}
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
