"use client";

import Link from "next/link";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";

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

export type GalleryCardProps = {
  card: GalleryCardType;
  /** Link target: detail page (default) or open public tool directly. */
  href?: string;
};

/**
 * M8e — one gallery grid card → detail or /t/:publicId.
 */
export function GalleryCard({ card, href }: GalleryCardProps) {
  const title = card.title?.trim() || "Untitled tool";
  const desc = card.description?.trim() || null;
  const tags = (card.tags ?? []).slice(0, 4);
  const when = formatPublishedAt(card.publishedAt);
  const to = href ?? `/gallery/${encodeURIComponent(card.publicId)}`;

  return (
    <Link href={to} className={styles.card} title={title}>
      <div className={styles.thumbWrap}>
        {card.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- CORS raw asset URL
          <img
            src={card.thumbnailUrl}
            alt=""
            className={styles.thumb}
            crossOrigin="anonymous"
            loading="lazy"
          />
        ) : (
          <div className={styles.thumbPlaceholder}>No preview</div>
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
