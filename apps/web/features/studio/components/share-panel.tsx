"use client";

import { useCallback, useMemo, useState } from "react";

import { publishTool } from "@/lib/api/tools";

import {
  buildEmbedSnippet,
  buildShareUrl,
  copyTextToClipboard,
  publicToolPath,
} from "../lib/share-links";
import styles from "../styles.module.css";

export type SharePanelProps = {
  /** tools.public_id — required for share URLs. */
  publicId: string | null | undefined;
  /** tools.id — required for make-public API. */
  toolId: string | null | undefined;
  /** draft | published */
  status: string | null | undefined;
  /** Tool title for iframe title attribute. */
  title?: string | null;
  /** Called after successful publish with new status. */
  onPublished?: (status: string) => void;
  /**
   * Fixture / local-only Studio — show a short note instead of share actions.
   */
  fixtureMode?: boolean;
};

type CopyKind = "url" | "embed" | null;

/**
 * M7f — Studio share + embed + thin make-public.
 */
export function SharePanel({
  publicId,
  toolId,
  status,
  title,
  onPublished,
  fixtureMode,
}: SharePanelProps) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyKind>(null);
  const [localStatus, setLocalStatus] = useState(status ?? null);

  // Keep local badge in sync if parent status prop changes (e.g. remount)
  const effectiveStatus = localStatus ?? status ?? "draft";
  const isPublished = effectiveStatus === "published";

  const shareUrl = useMemo(
    () => (publicId ? buildShareUrl(publicId) : ""),
    [publicId],
  );
  const embedSnippet = useMemo(
    () =>
      publicId
        ? buildEmbedSnippet(publicId, {
            title: title ?? "Vibeit tool",
          })
        : "",
    [publicId, title],
  );
  const pathOnly = publicId ? publicToolPath(publicId) : "";

  const flashCopied = useCallback((kind: CopyKind) => {
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (!shareUrl) return;
    setError(null);
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) flashCopied("url");
    else setError("Could not copy — select the URL and copy manually.");
  }, [flashCopied, shareUrl]);

  const handleCopyEmbed = useCallback(async () => {
    if (!embedSnippet) return;
    setError(null);
    const ok = await copyTextToClipboard(embedSnippet);
    if (ok) flashCopied("embed");
    else setError("Could not copy embed snippet.");
  }, [embedSnippet, flashCopied]);

  const handleMakePublic = useCallback(async () => {
    if (!toolId) return;
    setError(null);
    setPublishing(true);
    try {
      const tool = await publishTool(toolId);
      setLocalStatus(tool.status);
      onPublished?.(tool.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [onPublished, toolId]);

  if (fixtureMode || !publicId || !toolId) {
    return (
      <section className={styles.section} aria-label="Share">
        <h2 className={styles.sectionTitle}>Share</h2>
        <p className={styles.muted}>
          Share links are available for generated tools with a{" "}
          <code>publicId</code>. Fixture Studio is local only — create a tool
          from vision to share.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Share">
      <h2 className={styles.sectionTitle}>Share</h2>
      {!isPublished ? (
        <p className={styles.muted}>
          Link is <strong>private</strong> until you make it public. Anonymous
          visitors get 404 until then. This is a thin share link only — use{" "}
          <strong>Publish to gallery</strong> below to list it publicly.
        </p>
      ) : (
        <p className={styles.muted}>
          Public link is live — anyone with the URL can open the interactive
          tool (no Studio controls). Gallery listing is separate (see Publish
          below).
        </p>
      )}

      <div className={styles.actions}>
        {!isPublished ? (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={publishing}
            onClick={() => void handleMakePublic()}
            title="Set status=published so /t/{publicId} works anonymously"
          >
            {publishing ? "Publishing…" : "Make public link"}
          </button>
        ) : (
          <span className={`${styles.badge} ${styles.badgeReady}`}>
            Public
          </span>
        )}
        <a
          className={styles.button}
          href={pathOnly}
          target="_blank"
          rel="noopener noreferrer"
          title={
            isPublished
              ? "Open public page in a new tab"
              : "Opens public page (404 until public)"
          }
        >
          Open public page
        </a>
      </div>

      <div className={styles.shareField}>
        <label className={styles.fieldLabelInline} htmlFor="studio-share-url">
          Share URL
        </label>
        <div className={styles.shareRow}>
          <input
            id="studio-share-url"
            className={styles.textInput}
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className={styles.button}
            onClick={() => void handleCopyUrl()}
            disabled={!isPublished}
            title={
              isPublished
                ? "Copy share URL"
                : "Make public first so the link works for others"
            }
          >
            {copied === "url" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className={styles.shareField}>
        <label className={styles.fieldLabelInline} htmlFor="studio-embed">
          Embed snippet
        </label>
        <textarea
          id="studio-embed"
          className={styles.embedTextarea}
          readOnly
          rows={4}
          value={embedSnippet}
          onFocus={(e) => e.currentTarget.select()}
          spellCheck={false}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => void handleCopyEmbed()}
            disabled={!isPublished}
            title={
              isPublished
                ? "Copy iframe embed HTML"
                : "Make public first so the embed works for others"
            }
          >
            {copied === "embed" ? "Copied" : "Copy embed"}
          </button>
        </div>
        <p className={styles.muted}>
          Default 360×640 iframe. Allow <code>autoplay</code> /{" "}
          <code>fullscreen</code> as needed for motion tools.
        </p>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}
    </section>
  );
}
