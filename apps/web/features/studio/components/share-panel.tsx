"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ArrowUpRight, Check, Code, LinkIcon } from "@/components/icons";
import { publishTool } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

import {
  buildEmbedSnippet,
  buildShareUrl,
  copyTextToClipboard,
  publicToolPath,
} from "../lib/share-links";
import {
  ErrorNote,
  StatusDot,
  copyPillCls,
  groupLabelCls,
  labelCls,
  statusPillCls,
} from "../lib/studio-ui";

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
      <section className="flex flex-col gap-2" aria-label="Share">
        <h3 className={groupLabelCls}>Share</h3>
        <p className="text-[12.5px] leading-snug text-muted">
          Share is available on generated tools.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Share">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className={groupLabelCls}>Share</h3>
          <span className={statusPillCls}>
            <StatusDot live={isPublished} />
            {isPublished ? "Public" : "Private"}
          </span>
        </div>
        <p className="text-[12.5px] leading-snug text-muted">
          {isPublished
            ? "Public link is live."
            : "Private until you make it public."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isPublished ? (
          <button
            type="button"
            className="btn btn-ink btn-sm"
            disabled={publishing}
            onClick={() => void handleMakePublic()}
            title="Set status=published so /t/{publicId} works anonymously"
          >
            {publishing ? "Publishing…" : "Make public link"}
          </button>
        ) : null}
        <a
          className="btn btn-ghost btn-sm"
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
          <ArrowUpRight size={14} />
        </a>
      </div>

      <ShareRow
        id="studio-share-url"
        label="Share URL"
        icon={<LinkIcon size={13} />}
        value={shareUrl}
        copied={copied === "url"}
        copyDisabled={!isPublished}
        copyLabel="Copy share URL"
        copyTitle={
          isPublished
            ? "Copy share URL"
            : "Make public first so the link works for others"
        }
        onCopy={() => void handleCopyUrl()}
      />

      <ShareRow
        id="studio-embed"
        label="Embed snippet"
        icon={<Code size={13} />}
        value={embedSnippet}
        copied={copied === "embed"}
        copyDisabled={!isPublished}
        copyLabel="Copy embed snippet"
        copyTitle={
          isPublished
            ? "Copy iframe embed HTML"
            : "Make public first so the embed works for others"
        }
        onCopy={() => void handleCopyEmbed()}
      />

      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </section>
  );
}

/**
 * Read-only value with a copy pill (landing share row, design-language §3.20).
 * The row border turns ink while the field has focus.
 */
function ShareRow({
  id,
  label,
  icon,
  value,
  copied,
  copyDisabled,
  copyLabel,
  copyTitle,
  onCopy,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  copied: boolean;
  copyDisabled: boolean;
  copyLabel: string;
  copyTitle: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={cn(labelCls, "mb-1.5 block")}>
        {label}
      </label>
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-[10px] border bg-surface pr-1.5 pl-3 transition-colors duration-[240ms] ease-standard focus-within:border-fg",
          copied ? "border-fg" : "border-border",
        )}
      >
        <span className="shrink-0 text-muted">{icon}</span>
        <input
          id={id}
          className="t-mono min-w-0 flex-1 truncate bg-transparent text-[11.5px] text-fg focus:outline-none focus-visible:outline-none"
          readOnly
          spellCheck={false}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className={copyPillCls(copied)}
          onClick={onCopy}
          disabled={copyDisabled}
          aria-label={copied ? "Copied" : copyLabel}
          title={copyTitle}
        >
          {copied ? (
            <>
              <Check size={11} /> Copied
            </>
          ) : (
            "Copy"
          )}
        </button>
      </div>
    </div>
  );
}
