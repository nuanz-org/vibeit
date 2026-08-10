"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import styles from "../styles.module.css";

export type PlaygroundShellProps = {
  /** Center title next to brand (tool name or "Create"). */
  title?: string;
  /** Status chips next to title. */
  headerMeta?: ReactNode;
  /** Right-side actions (Export, Publish, user). */
  headerActions?: ReactNode;
  /** Left column content (usually chat console). */
  chat: ReactNode;
  /** Center stage (preview or empty). */
  stage: ReactNode;
  /** Right column; omit for create empty full-bleed stage. */
  controls?: ReactNode;
  /** Brand link href */
  brandHref?: string;
};

/**
 * Brickspace-class 3-column playground: Chat | Stage | Controls.
 */
export function PlaygroundShell({
  title,
  headerMeta,
  headerActions,
  chat,
  stage,
  controls,
  brandHref = "/",
}: PlaygroundShellProps) {
  const hasControls = controls != null;
  const [mobilePane, setMobilePane] = useState<"chat" | "stage" | "controls">(
    "stage",
  );

  return (
    <div
      className={styles.shell}
      data-controls={hasControls ? "true" : "false"}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={brandHref} className={styles.brand}>
            Aiditr
          </Link>
          {title ? (
            <>
              <span className={styles.headerDivider} aria-hidden />
              <span className={styles.title} title={title}>
                {title}
              </span>
            </>
          ) : null}
          {headerMeta}
        </div>
        <div className={styles.headerRight}>{headerActions}</div>
      </header>

      <aside
        className={styles.chat}
        data-mobile-hidden={mobilePane !== "chat" ? "true" : "false"}
        aria-label="Chat"
      >
        {chat}
      </aside>

      <main className={styles.stage} aria-label="Preview">
        {stage}
      </main>

      {hasControls ? (
        <aside
          className={styles.controls}
          data-mobile-hidden={mobilePane !== "controls" ? "true" : "false"}
          aria-label="Controls"
        >
          {controls}
        </aside>
      ) : null}

      <div className={styles.mobileTabs} role="tablist" aria-label="Panels">
        <button
          type="button"
          role="tab"
          className={styles.mobileTab}
          data-active={mobilePane === "chat"}
          aria-selected={mobilePane === "chat"}
          onClick={() => setMobilePane("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          className={styles.mobileTab}
          data-active={mobilePane === "stage"}
          aria-selected={mobilePane === "stage"}
          onClick={() => setMobilePane("stage")}
        >
          Preview
        </button>
        {hasControls ? (
          <button
            type="button"
            role="tab"
            className={styles.mobileTab}
            data-active={mobilePane === "controls"}
            aria-selected={mobilePane === "controls"}
            onClick={() => setMobilePane("controls")}
          >
            Controls
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { styles as playgroundStyles };
