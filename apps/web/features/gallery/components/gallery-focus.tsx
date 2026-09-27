"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import { ArrowRight, Close, Remix } from "@/components/icons";
import {
  getGalleryItem,
  type GalleryCard as GalleryCardType,
} from "@/lib/api/gallery";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import { displayTitle, formatPublished } from "../lib/display-title";
import { ToolThumb } from "./tool-thumb";

/* ─────────────────────────────────────────────────────────
 * Tool detail (click a tile). Opens detail only — never runs the tool.
 *
 *    0ms   backdrop fades in; panel `panel-in` (fade + 8px rise, 240ms)
 *   40ms   copy block rises in
 *   80ms   actions (Use tool · Remix)
 * ───────────────────────────────────────────────────────── */

export type GalleryFocusProps = {
  /** List-card snapshot (instant paint while full detail loads). */
  card: GalleryCardType | null;
  instanceId: string | null;
  onClose: () => void;
};

export function GalleryFocus({ card, instanceId, onClose }: GalleryFocusProps) {
  const open = Boolean(card && instanceId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !card || !instanceId) return null;
  return <FocusPanel key={instanceId} seed={card} onClose={onClose} />;
}

const rise = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

function FocusPanel({
  seed,
  onClose,
}: {
  seed: GalleryCardType;
  onClose: () => void;
}) {
  const titleId = useId();
  const primary = useRef<HTMLAnchorElement>(null);
  const [ratio, setRatio] = useState(1);

  // Move focus into the dialog, and back to the tile that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    primary.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  const detailQ = useQuery({
    queryKey: ["public-gallery-item", seed.publicId],
    queryFn: () => getGalleryItem(seed.publicId),
    staleTime: 60_000,
    retry: 1,
  });

  const card = detailQ.data ?? seed;
  const shortTitle = displayTitle(card.title);
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const desc = card.description?.trim() || null;
  // The description usually carries the full vision; don't repeat it.
  const showFull =
    !desc &&
    fullTitle.length > shortTitle.length + 4 &&
    !fullTitle
      .toLowerCase()
      .startsWith(shortTitle.replace(/…$/, "").toLowerCase());
  const tags = card.tags ?? [];
  const published = formatPublished(card.publishedAt);
  const runHref = `/t/${encodeURIComponent(card.publicId)}`;
  const remixHref = `/remix/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 md:px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        className="absolute inset-0 cursor-default border-0 bg-bg/80 animate-in fade-in duration-fast"
        onClick={onClose}
      />

      <div className="relative z-[1] grid max-h-full w-full max-w-[920px] animate-panel-in overflow-auto rounded-[12px] border border-border bg-surface shadow-panel md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:overflow-hidden">
        {/* Media: the captured frame on the workspace, like the Studio stage */}
        <div className="workspace-grid relative grid min-h-[240px] place-items-center border-b border-border p-8 md:min-h-[400px] md:border-r md:border-b-0 md:p-10">
          <div
            className="frame-marks relative shadow-frame"
            style={{
              aspectRatio: ratio,
              width: `min(100%, 420px, calc(min(56vh, 460px) * ${ratio}))`,
            }}
          >
            <div className="absolute inset-0 overflow-hidden bg-surface">
              <ToolThumb src={thumbSrc} eager onRatio={setRatio} />
            </div>
            <span className="mark-b" aria-hidden />
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6 md:p-8">
          <div className="enter" style={rise(40)}>
            <p className="t-label flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              <span>Tool</span>
              {published ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Published {published}</span>
                </>
              ) : null}
              {detailQ.isFetching && !detailQ.data ? (
                <span
                  className="live-dot size-1.5 rounded-full bg-accent-text"
                  aria-hidden
                />
              ) : null}
            </p>
            <h2
              id={titleId}
              className="mt-3 text-[1.75rem] leading-[1.1] font-medium tracking-[-0.03em] text-balance text-fg"
              title={fullTitle}
            >
              {shortTitle}
            </h2>
            {showFull ? (
              <p className="mt-2 line-clamp-3 text-[13.5px] leading-snug text-muted">
                {fullTitle}
              </p>
            ) : null}
          </div>

          <div className="enter" style={rise(60)}>
            <p className="max-w-[40ch] text-[15px] leading-[1.55] text-pretty text-muted">
              {desc && desc !== fullTitle
                ? desc
                : "A live design tool from the gallery. Open it to play with its controls, or remix it into your own."}
            </p>
            {tags.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <li
                    key={t}
                    className="t-mono rounded-[5px] border border-border px-1.5 py-0.5 text-[10.5px] text-muted"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="enter mt-auto" style={rise(80)}>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link ref={primary} href={runHref} className="btn btn-primary">
                Use tool
                <ArrowRight size={16} className="btn-arrow" />
              </Link>
              <Link href={remixHref} className="btn btn-outline">
                <Remix size={15} />
                Remix
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
              <span
                className="size-1 rounded-full bg-accent-text"
                aria-hidden
              />
              Opens a live, view-only session. Remix copies it into your Studio.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="hit absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full border border-border bg-surface text-fg transition-colors duration-fast ease-standard hover:border-fg"
        >
          <Close size={14} />
        </button>
      </div>
    </div>
  );
}
