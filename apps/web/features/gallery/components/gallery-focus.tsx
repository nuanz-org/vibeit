"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";

import { getGalleryItem, type GalleryCard as GalleryCardType } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import { displayTitle, hashHue } from "../lib/display-title";
import { FOCUS, OPEN_TIMING } from "../lib/gallery-motion";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Tool detail (click card)
 *
 * Click opens DETAIL only — never auto-runs the tool.
 * User chooses: Use tool · or · Keep browsing.
 *
 *    0ms   layoutId media morph into detail frame
 *   40ms   backdrop
 *  160ms   title / meta / description
 *  260ms   actions (Use tool · Keep browsing)
 * ───────────────────────────────────────────────────────── */

export type GalleryFocusProps = {
  /** List-card snapshot (instant paint while full detail loads). */
  card: GalleryCardType | null;
  instanceId: string | null;
  onClose: () => void;
};

export function GalleryFocus({ card, instanceId, onClose }: GalleryFocusProps) {
  const reduce = useReducedMotion();
  const open = Boolean(card && instanceId);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!open) {
      setStage(0);
      return;
    }
    setStage(0);
    if (reduce) {
      setStage(3);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), OPEN_TIMING.backdrop));
    timers.push(setTimeout(() => setStage(2), OPEN_TIMING.meta));
    timers.push(setTimeout(() => setStage(3), OPEN_TIMING.actions));
    return () => timers.forEach(clearTimeout);
  }, [open, card?.publicId, instanceId, reduce]);

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

  return (
    <AnimatePresence>
      {open && card && instanceId ? (
        <FocusPanel
          key={instanceId}
          seed={card}
          instanceId={instanceId}
          stage={stage}
          reduce={Boolean(reduce)}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>
  );
}

function formatPublished(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}

function FocusPanel({
  seed,
  instanceId,
  stage,
  reduce,
  onClose,
}: {
  seed: GalleryCardType;
  instanceId: string;
  stage: number;
  reduce: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const detailQ = useQuery({
    queryKey: ["public-gallery-item", seed.publicId],
    queryFn: () => getGalleryItem(seed.publicId),
    staleTime: 60_000,
    retry: 1,
  });

  const card = detailQ.data ?? seed;
  const shortTitle = displayTitle(card.title);
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const showFull =
    fullTitle.length > shortTitle.length + 4 &&
    !fullTitle.startsWith(shortTitle.replace(/…$/, ""));
  const desc = card.description?.trim() || null;
  const tags = card.tags ?? [];
  const published = formatPublished(card.publishedAt);
  const runHref = `/t/${encodeURIComponent(card.publicId)}`;
  const remixHref = `/remix/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || shortTitle);
  const layoutId = `gallery-media-${instanceId}`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8 md:px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <motion.button
        type="button"
        aria-label="Keep browsing"
        className="absolute inset-0 cursor-default border-0 bg-background/72 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 || reduce ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={reduce ? { duration: 0 } : FOCUS.backdrop}
        onClick={onClose}
      />

      <motion.div
        className={cn(
          "relative z-[1] grid w-full max-w-[920px] overflow-hidden rounded-2xl bg-card shadow-elev",
          "md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]",
        )}
        initial={reduce ? false : { opacity: 0, scale: FOCUS.initialScale }}
        animate={{ opacity: 1, scale: FOCUS.finalScale }}
        exit={
          reduce
            ? { opacity: 0 }
            : {
                opacity: 0,
                scale: FOCUS.initialScale,
                transition: { duration: 0.2 },
              }
        }
        transition={reduce ? { duration: 0 } : FOCUS.spring}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          layoutId={reduce ? undefined : layoutId}
          className="relative aspect-[4/3] w-full overflow-hidden bg-muted md:aspect-auto md:min-h-[380px] md:h-full"
        >
          {thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt=""
              className="block size-full object-cover"
              decoding="async"
              draggable={false}
            />
          ) : (
            <div
              className={cn(
                "relative flex size-full min-h-[220px] items-center justify-center",
                "bg-[radial-gradient(120%_90%_at_20%_15%,oklch(0.78_0.04_var(--ph-hue)/0.55),transparent_55%),radial-gradient(100%_80%_at_85%_90%,oklch(0.72_0.035_calc(var(--ph-hue)+50)/0.4),transparent_50%),oklch(0.82_0.02_var(--ph-hue))]",
                "[@media(prefers-color-scheme:dark)]:bg-[radial-gradient(120%_90%_at_20%_15%,oklch(0.32_0.05_var(--ph-hue)/0.7),transparent_55%),radial-gradient(100%_80%_at_85%_90%,oklch(0.28_0.04_calc(var(--ph-hue)+50)/0.55),transparent_50%),oklch(0.2_0.025_var(--ph-hue))]",
              )}
              style={
                {
                  ["--ph-hue" as string]: String(hue),
                } as CSSProperties
              }
              aria-hidden
            >
              <span className="size-8 rounded-[10px] border-[1.5px] border-foreground/14 opacity-35" />
            </div>
          )}
        </motion.div>

        <div className="flex flex-col justify-center gap-4 p-5 md:gap-5 md:p-8">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: FOCUS.metaOffsetY }}
            animate={{
              opacity: stage >= 2 || reduce ? 1 : 0,
              y: stage >= 2 || reduce ? 0 : FOCUS.metaOffsetY,
            }}
            transition={
              reduce ? { duration: 0 } : { ...FOCUS.metaSpring, delay: 0 }
            }
          >
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="m-0 text-[12px] font-medium tracking-[-0.01em] text-ink-caption">
                Tool detail
              </p>
              {published ? (
                <span className="text-[12px] text-ink-caption">
                  · Published {published}
                </span>
              ) : null}
              {detailQ.isFetching && !detailQ.data ? (
                <span className="text-[11px] text-muted-ink">Updating…</span>
              ) : null}
            </div>
            <h2
              id={titleId}
              className="m-0 text-[clamp(1.25rem,2.2vw,1.65rem)] font-semibold leading-tight tracking-[-0.03em] text-balance text-ink"
              title={fullTitle}
            >
              {shortTitle}
            </h2>
            {showFull ? (
              <p className="mt-1.5 mb-0 line-clamp-3 text-[13px] leading-snug text-ink-caption">
                {fullTitle}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: FOCUS.metaOffsetY }}
            animate={{
              opacity: stage >= 2 || reduce ? 1 : 0,
              y: stage >= 2 || reduce ? 0 : FOCUS.metaOffsetY,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { ...FOCUS.metaSpring, delay: FOCUS.metaStagger }
            }
          >
            {desc ? (
              <p className="m-0 max-w-[38ch] text-[0.95rem] leading-relaxed text-pretty text-muted-ink">
                {desc}
              </p>
            ) : (
              <p className="m-0 max-w-[38ch] text-[0.95rem] leading-relaxed text-muted-ink">
                Interactive design tool from the public gallery. Open it to play
                with live controls — no sign-in, no source download.
              </p>
            )}
          </motion.div>

          {tags.length > 0 ? (
            <motion.div
              className="flex flex-wrap gap-1.5"
              initial={reduce ? false : { opacity: 0, y: FOCUS.metaOffsetY }}
              animate={{
                opacity: stage >= 2 || reduce ? 1 : 0,
                y: stage >= 2 || reduce ? 0 : FOCUS.metaOffsetY,
              }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { ...FOCUS.metaSpring, delay: FOCUS.metaStagger * 2 }
              }
            >
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-[10px] bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-ink"
                >
                  {t}
                </span>
              ))}
            </motion.div>
          ) : null}

          <motion.p
            className="m-0 text-sm leading-snug text-ink-caption"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: stage >= 2 || reduce ? 1 : 0 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.2, delay: 0.1 }
            }
          >
            Preview only. Using the tool opens a live, view-only session.
          </motion.p>

          <motion.div
            className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{
              opacity: stage >= 3 || reduce ? 1 : 0,
              y: stage >= 3 || reduce ? 0 : 10,
            }}
            transition={
              reduce ? { duration: 0 } : { ...FOCUS.metaSpring, delay: 0 }
            }
          >
            <Link
              href={runHref}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-[10px] px-5",
                "bg-primary text-sm font-medium text-primary-foreground no-underline",
                "transition-[background-color,opacity] duration-ui ease-ui",
                "hover:bg-base-blue-hover",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              Use tool
            </Link>
            <Link
              href={remixHref}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-[10px] border border-border bg-card px-5",
                "text-sm font-medium text-ink-secondary no-underline",
                "transition-[border-color,background-color,color] duration-ui ease-ui",
                "hover:bg-surface hover:text-ink",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              Remix in Studio
            </Link>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-[10px] border border-border bg-card px-5",
                "text-sm font-medium text-ink-secondary",
                "transition-[border-color,background-color,color] duration-ui ease-ui",
                "hover:bg-surface hover:text-ink",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              Keep browsing
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
