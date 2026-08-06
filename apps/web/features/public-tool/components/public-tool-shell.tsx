"use client";

import Link from "next/link";

import type { ToolParams } from "@repo/contracts";

import { RuntimeHost } from "@/runtime";

import { usePublicToolRuntime } from "../hooks/use-public-tool-runtime";
import styles from "../styles.module.css";

export type PublicToolShellProps = {
  publicId: string;
  title?: string | null;
  description?: string | null;
  defaultParams?: ToolParams | null;
};

/**
 * M7e — interactive public tool (no auth, no Control, no source download).
 */
export function PublicToolShell({
  publicId,
  title,
  description,
  defaultParams,
}: PublicToolShellProps) {
  const runtime = usePublicToolRuntime({
    publicId,
    runtimeToolId: `public:${publicId}`,
    defaultParams,
  });

  const statusClass =
    runtime.status === "ready" || runtime.mounted
      ? styles.badgeReady
      : runtime.status === "error"
        ? styles.badgeError
        : styles.badgeLoading;

  const label = title?.trim() || "Shared tool";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <Link href="/" className={styles.brand}>
            Vibeit
          </Link>
          <span className={styles.badge}>Public</span>
          <span className={styles.title} title={label}>
            {label}
          </span>
          <span className={`${styles.badge} ${statusClass}`}>
            {runtime.mounted
              ? "live"
              : runtime.busy
                ? "loading"
                : runtime.status === "ready"
                  ? "ready"
                  : runtime.status}
          </span>
        </div>
        <div className={styles.headerMeta}>
          <Link href="/gallery" className={styles.linkMuted}>
            Gallery
          </Link>
          <Link href="/create" className={styles.linkMuted}>
            Create your own
          </Link>
        </div>
      </header>

      <div className={styles.body}>
        {description?.trim() ? (
          <p className={styles.desc}>{description.trim()}</p>
        ) : (
          <p className={styles.muted}>
            Interactive preview · view only (no Studio controls on this page)
          </p>
        )}

        {runtime.error ? (
          <div className={styles.errorBanner} role="alert">
            {runtime.error}
          </div>
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

        <p className={styles.muted}>
          publicId <code>{publicId}</code>
        </p>
      </div>
    </div>
  );
}
