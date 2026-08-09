"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import styles from "../styles.module.css";

function formatPublishedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

/** Clean vision-dump titles for card display. */
function displayTitle(raw: string | null | undefined): string {
  let t = (raw ?? "").trim();
  if (!t) return "Untitled tool";
  // Strip wrapping / leading quote marks from pasted prompts
  t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  // First sentence / clause for long vision texts
  if (t.length > 72) {
    const cut = t.slice(0, 72);
    const stop = Math.max(
      cut.lastIndexOf(". "),
      cut.lastIndexOf(" — "),
      cut.lastIndexOf(" - "),
      cut.lastIndexOf(", "),
    );
    t = (stop > 24 ? cut.slice(0, stop) : cut).trim();
    if (!t.endsWith("…") && t.length < (raw ?? "").trim().length) {
      t = `${t.replace(/[.,;:\-—]+$/u, "").trim()}…`;
    }
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

function monogram(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "V";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export type GalleryCardProps = {
  card: GalleryCardType;
  /** Link target: detail page (default) or open public tool directly. */
  href?: string;
};

/**
 * One gallery grid card → detail or /t/:publicId.
 */
export function GalleryCard({ card, href }: GalleryCardProps) {
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const rawDesc = card.description?.trim() || null;
  const desc =
    rawDesc &&
    rawDesc !== fullTitle &&
    rawDesc.toLowerCase() !== title.toLowerCase()
      ? rawDesc
      : null;
  const tags = (card.tags ?? []).slice(0, 4);
  const when = formatPublishedAt(card.publishedAt);
  const to = href ?? `/gallery/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || title);

  return (
    <Link href={to} className={styles.card} title={fullTitle}>
      <div className={styles.thumbWrap}>
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
            <span className={styles.thumbMonogram}>{monogram(title)}</span>
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{title}</div>
        {desc ? <div className={styles.cardDesc}>{desc}</div> : null}
        {tags.length > 0 ? (
          <div className={styles.tags}>
            {tags.map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {when ? <div className={styles.meta}>{when}</div> : null}
      </div>
    </Link>
  );
}
