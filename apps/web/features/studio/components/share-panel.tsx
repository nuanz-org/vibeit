"use client";

import { useCallback, useMemo, useState } from "react";

import { publishTool } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

import {
  buildEmbedSnippet,
  buildShareUrl,
  copyTextToClipboard,
  publicToolPath,
} from "../lib/share-links";

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
  /** C6: embed iframe size from current stage (optional). */
  embedWidth?: number;
  embedHeight?: number;
};

type CopyKind = "url" | "embed" | null;

const btn =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit no-underline box-border disabled:cursor-not-allowed disabled:opacity-45";
const btnPrimary = "border-transparent bg-foreground text-background";
const section = "flex flex-col gap-[0.55rem]";
const sectionTitle =
  "text-[0.72rem] font-[650] tracking-[0.06em] uppercase opacity-55";
const muted = "text-sm opacity-55";
const shareField = "flex flex-col gap-[0.35rem]";
const fieldLabel = "block font-medium";
const textInput =
  "w-full min-w-0 rounded-lg border border-border-subtle bg-transparent px-[0.6rem] py-[0.45rem] font-inherit text-inherit";
const embedTextarea =
  "min-h-[5rem] w-full resize-y rounded-lg border border-foreground/14 bg-foreground/[0.04] px-[0.65rem] py-[0.55rem] font-[family-name:var(--font-geist-mono),ui-monospace,monospace] text-[0.75rem] leading-snug text-inherit";

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
  embedWidth,
  embedHeight,
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
            title: title ?? "Aiditr tool",
            width: embedWidth,
            height: embedHeight,
          })
        : "",
    [publicId, title, embedWidth, embedHeight],
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
      <section className={section} aria-label="Share">
        <h2 className={sectionTitle}>Share</h2>
        <p className={muted}>Share is available on generated tools.</p>
      </section>
    );
  }

  return (
    <section className={section} aria-label="Share">
      <h2 className={sectionTitle}>Share</h2>
      <p className={muted}>
        {isPublished ? "Public link is live." : "Private until you make it public."}
      </p>

      <div className="flex flex-wrap gap-2">
        {!isPublished ? (
          <button
            type="button"
            className={cn(btn, btnPrimary)}
            disabled={publishing}
            onClick={() => void handleMakePublic()}
            title="Set status=published so /t/{publicId} works anonymously"
          >
            {publishing ? "Publishing…" : "Make public link"}
          </button>
        ) : (
          <span className="rounded-full bg-[#15803d]/14 px-[0.55rem] py-[0.2rem] text-xs font-semibold text-[#15803d]">
            Public
          </span>
        )}
        <a
          className={btn}
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

      <div className={shareField}>
        <label className={fieldLabel} htmlFor="studio-share-url">
          Share URL
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="studio-share-url"
            className={cn(textInput, "flex-1")}
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className={btn}
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

      <div className={shareField}>
        <label className={fieldLabel} htmlFor="studio-embed">
          Embed snippet
        </label>
        <textarea
          id="studio-embed"
          className={embedTextarea}
          readOnly
          rows={4}
          value={embedSnippet}
          onFocus={(e) => e.currentTarget.select()}
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
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
      </div>

      {error ? (
        <p className="text-[0.8rem] leading-snug text-[#b91c1c]">{error}</p>
      ) : null}
    </section>
  );
}
