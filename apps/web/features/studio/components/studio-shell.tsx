"use client";

import Link from "next/link";
import { useState } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";
import { RuntimeHost, isRealUploadedAssetUrl } from "@/runtime";

import type { StudioFixtureMeta } from "../fixtures";
import { useStudioRuntime } from "../hooks/use-studio-runtime";
import styles from "../styles.module.css";
import { AssetSlotsPanel } from "./asset-slots-panel";
import { ParamControls } from "./param-controls";
import { ViewSourcePanel } from "./view-source-panel";

export type StudioShellProps = {
  fixture: StudioFixtureMeta;
  /** Optional generated source for view-only panel (M3g). */
  sourceCode?: string | null;
  versionId?: string | null;
  publicId?: string | null;
  isGenerated?: boolean;
};

/**
 * Studio shell (M2a5 + M2a6 capture + M3g generated tools).
 */
export function StudioShell({
  fixture,
  sourceCode,
  versionId,
  publicId,
  isGenerated,
}: StudioShellProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const runtime = useStudioRuntime({ runtimeToolId: fixture.runtimeToolId });

  const statusClass =
    runtime.status === "ready" || runtime.mounted
      ? styles.badgeReady
      : runtime.status === "error"
        ? styles.badgeError
        : styles.badgeLoading;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <Link href="/" className={styles.brand}>
            Vibeit
          </Link>
          <span className={styles.badge}>Studio</span>
          <span className={`${styles.badge} ${statusClass}`}>
            {runtime.mounted
              ? "live"
              : runtime.status === "ready"
                ? "ready"
                : runtime.status}
          </span>
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
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Params</h2>
            <ParamControls
              schema={runtime.paramSchema}
              params={runtime.params}
              onChange={runtime.setParam}
              disabled={!runtime.mounted || runtime.busy}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Assets</h2>
            <p className={styles.muted}>
              Upload via API (http URL + CORS). Required for M2a exit capture —
              not a data: fixture.
            </p>
            <AssetSlotsPanel
              slots={runtime.assetSlots}
              assets={runtime.assets}
              onAssetUrl={runtime.setAsset}
              disabled={!runtime.mounted || runtime.busy}
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
            ) : (
              <p className={styles.muted}>
                No http storage asset yet — upload a logo to prove capture.
              </p>
            )}
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
          />

          {runtime.error ? (
            <p className={styles.errorText}>{runtime.error}</p>
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
