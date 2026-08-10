"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import styles from "../styles.module.css";

/** Soft-truncate on a word boundary; never mid-glyph. */
function clipAtWord(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > Math.floor(max * 0.45) ? cut.slice(0, sp) : cut)
    .replace(/[.,;:\-—…\s]+$/u, "")
    .trim();
  return base ? `${base}…` : `${cut.trim()}…`;
}

function looksTruncatedToken(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return false;
  const w = words[0] ?? "";
  if (w.length < 6 || w.length > 16) return false;
  // Complete short titles we keep
  if (/^(dvd|vhs|logo|grid|type|clock|morph)$/i.test(w)) return false;
  // Half-words from storage truncation rarely end in common suffixes
  return !/(ions?|ings?|ments?|ness|able|ally|ed|er|ly|ty|al|ous|ive|parc)$/i.test(
    w,
  );
}

/** Prefer a short craft name; vision dumps become a tight line. */
function displayTitle(raw: string | null | undefined): string {
  let t = (raw ?? "").trim();
  if (!t) return "Untitled tool";

  // Strip wrapping quote marks from pasted prompts
  t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();

  // Named tool patterns: `… called "X"` — only use X if it looks complete
  const called = t.match(
    /(?:called|named)\s+["'“”‘’]([^"'“”‘’\n]{2,56})/i,
  );
  if (called?.[1]) {
    const name = called[1].replace(/[.,;:\-—…"']+$/u, "").trim();
    if (name.length >= 2 && !looksTruncatedToken(name)) {
      return clipAtWord(name, 42);
    }
  }

  // Strip openers + "called …" tail so we never surface raw scaffolding
  t = t
    .replace(
      /^(build|create|make|design|generate|i want|i need|please)\s+(an|a|me|my)?\s*/i,
      "",
    )
    .replace(
      /^(remixable\s+)?(creative\s+)?(motion\s+)?tool\s*/i,
      "",
    )
    .replace(/^a\s+tool\s*/i, "")
    .replace(/^(which|that|whihc|simple)\s+/i, "")
    .replace(/^(these are|this is|here(?:'s| are))\s+/i, "")
    // Drop leftover "called/named …" whether mid-string or the whole remainder
    .replace(/(?:^|\s+)(?:called|named)\s+["'“”‘’]?.*$/i, "")
    .trim();

  // First sentence / clause
  if (t.length > 48) {
    const cut = t.slice(0, 48);
    const stop = Math.max(
      cut.lastIndexOf(". "),
      cut.lastIndexOf(" — "),
      cut.lastIndexOf(" - "),
      cut.lastIndexOf(", "),
    );
    t = (stop > 16 ? cut.slice(0, stop) : cut).trim();
  }

  // If stripping left nothing useful, avoid resurfacing "called …" fragments
  if (t.length < 3) {
    const fallback = (raw ?? "")
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(
        /^(build|create|make)\s+(an|a)?\s*(remixable\s+)?(creative\s+)?(motion\s+)?tool\s*/i,
        "",
      )
      .replace(/(?:^|\s+)(?:called|named)\s+["'“”‘’]?.*$/i, "")
      .trim();
    t = fallback.length >= 3 ? fallback : "Creative tool";
  }

  t = clipAtWord(t, 44);

  // Title-case only short lowercase phrases (not long vision dumps)
  const body = t.replace(/…$/, "");
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (body.length > 0 && body === body.toLowerCase() && wordCount > 0 && wordCount <= 6) {
    t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return t || "Untitled tool";
}

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** Vary tile proportions so masonry feels less uniform. */
function aspectClass(publicId: string): string {
  let h = 0;
  for (let i = 0; i < publicId.length; i++) {
    h = (h * 33 + publicId.charCodeAt(i)) >>> 0;
  }
  const bucket = h % 5;
  if (bucket === 0 || bucket === 1) return styles.thumbWrapTall ?? "";
  if (bucket === 2) return styles.thumbWrapWide ?? "";
  return "";
}

export type GalleryCardProps = {
  card: GalleryCardType;
  /** Link target: detail page (default) or open public tool directly. */
  href?: string;
};

/**
 * Media-first gallery tile (Brik-style): large preview, short name, quiet meta.
 */
export function GalleryCard({ card, href }: GalleryCardProps) {
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const tags = (card.tags ?? []).slice(0, 2);
  const to = href ?? `/gallery/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || title);
  const wrapAspect = aspectClass(card.publicId || title);

  return (
    <Link href={to} className={styles.card} title={fullTitle}>
      <div className={`${styles.thumbWrap} ${wrapAspect}`.trim()}>
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- public asset URL
          <img
            src={thumbSrc}
            alt=""
            className={styles.thumb}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className={styles.thumbPlaceholder}
            style={
              {
                ["--ph-hue" as string]: String(hue),
              } as CSSProperties
            }
            aria-hidden
          >
            <span className={styles.thumbPlaceholderMark} />
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{title}</div>
        {tags.length > 0 ? (
          <div className={styles.cardMeta}>{tags.join(" · ")}</div>
        ) : null}
      </div>
    </Link>
  );
}
