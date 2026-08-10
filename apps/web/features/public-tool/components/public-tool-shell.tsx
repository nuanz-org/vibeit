"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { TargetId, ToolParams } from "@repo/contracts";

import {
  fitStageBox,
  parseAspectFromSource,
  sizeFromAspect,
} from "@/features/studio/lib/stage-size";
import { RuntimeHost } from "@/runtime";

import { usePublicToolRuntime } from "../hooks/use-public-tool-runtime";
import styles from "../styles.module.css";

export type PublicToolShellProps = {
  publicId: string;
  title?: string | null;
  description?: string | null;
  /** B3: published version target for mount. */
  target?: TargetId | string | null;
  defaultParams?: ToolParams | null;
  /** C6: version source used only to seed preview aspect (not shown). */
  sourceCode?: string | null;
};

/**
 * M7e — interactive public tool (no auth, no Control, no source download).
 */
export function PublicToolShell({
  publicId,
  title,
  description,
  target,
  defaultParams,
  sourceCode,
}: PublicToolShellProps) {
  const runtime = usePublicToolRuntime({
    publicId,
    runtimeToolId: `public:${publicId}`,
    target,
    defaultParams,
  });

  const frameStyle = useMemo(() => {
    const aspect = parseAspectFromSource(sourceCode) ?? "1:1";
    const size = sizeFromAspect(aspect);
    // Contain into a generous public stage box
    const fitted = fitStageBox(size.width, size.height, 720, 640);
    return {
      width: fitted.displayW,
      height: fitted.displayH,
      aspectRatio: "unset" as const,
      maxWidth: "100%",
      maxHeight: "min(70vh, 720px)",
    };
  }, [sourceCode]);

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
            Aiditr
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
          <div className={styles.frameWrap} style={frameStyle}>
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
