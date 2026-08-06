"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getGalleryItem } from "@/lib/api/gallery";

import styles from "../styles.module.css";
import { GalleryShell } from "./gallery-shell";

/**
 * M8e — gallery detail card → open live /t/:publicId (reuse M7e public run).
 * No source download or Studio owner controls.
 */
export function GalleryDetail({ publicId }: { publicId: string }) {
  const q = useQuery({
    queryKey: ["public-gallery-item", publicId],
    queryFn: () => getGalleryItem(publicId),
    retry: false,
  });

  if (q.isLoading) {
    return (
      <GalleryShell>
        <main className={styles.centerMsg}>
          <p className={styles.muted} style={{ margin: 0 }}>
            Loading…
          </p>
        </main>
      </GalleryShell>
    );
  }

  if (q.isError || !q.data) {
    const msg =
      q.error instanceof Error ? q.error.message : "Could not load this tool.";
    const notFound =
      /404|not found/i.test(msg) ||
      msg.includes("Get gallery item failed (404)");

    return (
      <GalleryShell>
        <main className={styles.centerMsg}>
          <h1>{notFound ? "Not in gallery" : "Could not open"}</h1>
          <p>
            {notFound
              ? "This tool is not in the public gallery. It may be private, unpublished, or share-only."
              : msg}
          </p>
          <div className={styles.actions} style={{ justifyContent: "center" }}>
            <Link href="/gallery" className={styles.button}>
              Back to gallery
            </Link>
            <Link href="/" className={styles.linkMuted}>
              Home
            </Link>
          </div>
        </main>
      </GalleryShell>
    );
  }

  const card = q.data;
  const title = card.title?.trim() || "Untitled tool";
  const desc = card.description?.trim() || null;
  const tags = card.tags ?? [];
  const runHref = `/t/${encodeURIComponent(card.publicId)}`;

  return (
    <GalleryShell>
      <main className={styles.main}>
        <p className={styles.muted} style={{ marginBottom: "1rem" }}>
          <Link href="/gallery" className={styles.linkMuted}>
            ← Gallery
          </Link>
        </p>

        <div className={styles.detail}>
          <div className={styles.detailThumb}>
            {card.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.thumbnailUrl}
                alt=""
                crossOrigin="anonymous"
              />
            ) : (
              <div className={styles.thumbPlaceholder}>No preview</div>
            )}
          </div>

          <div className={styles.detailBody}>
            <h1>{title}</h1>
            {desc ? <p className={styles.detailDesc}>{desc}</p> : null}

            {tags.length > 0 ? (
              <div className={styles.tags} style={{ marginBottom: "1rem" }}>
                {tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <p className={styles.muted}>
              Opens an interactive preview. View only — no source download or
              Studio controls.
            </p>

            <div className={styles.actions}>
              <Link
                href={runHref}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Open tool
              </Link>
              <Link href="/gallery" className={styles.button}>
                Back to gallery
              </Link>
              <Link href="/create" className={styles.button}>
                Create your own
              </Link>
            </div>
          </div>
        </div>
      </main>
    </GalleryShell>
  );
}
