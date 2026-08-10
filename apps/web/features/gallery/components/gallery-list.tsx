"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { listGallery } from "@/lib/api/gallery";

import styles from "../styles.module.css";
import { GalleryCard } from "./gallery-card";
import { GalleryShell } from "./gallery-shell";

const PAGE_SIZE = 24;

function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.skeletonGrid} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonThumb} />
          <div className={styles.skeletonBody}>
            <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Anonymous gallery browse with load-more pagination.
 * Media-first masonry; no source download or owner controls.
 */
export function GalleryList() {
  const q = useInfiniteQuery({
    queryKey: ["public-gallery"],
    queryFn: ({ pageParam }) =>
      listGallery({ limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastPageParam) =>
      last.hasMore ? lastPageParam + PAGE_SIZE : undefined,
    retry: 1,
  });

  const items = useMemo(
    () => q.data?.pages.flatMap((p) => p.items) ?? [],
    [q.data?.pages],
  );

  const loadingFirst = q.isLoading;
  const error = q.isError && items.length === 0;
  const empty = !loadingFirst && !error && items.length === 0;
  const countLabel =
    items.length > 0
      ? q.hasNextPage
        ? `${items.length}+ tools`
        : `${items.length} ${items.length === 1 ? "tool" : "tools"}`
      : null;

  return (
    <GalleryShell>
      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderTop}>
            <h1 className={styles.pageTitle}>Gallery</h1>
            {countLabel ? (
              <span className={styles.countPill}>{countLabel}</span>
            ) : null}
          </div>
          <p className={styles.pageLead}>
            Explore interactive design tools from the community. Open any piece
            to play — no sign-in required.
          </p>
        </header>

        {loadingFirst ? <SkeletonGrid /> : null}

        {error ? (
          <div className={styles.centerMsg}>
            <div className={styles.emptyVisual} aria-hidden />
            <h1>Could not load gallery</h1>
            <p>
              {q.error instanceof Error
                ? q.error.message
                : "Something went wrong while fetching public tools."}
            </p>
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => void q.refetch()}
              >
                Try again
              </button>
              <Link href="/" className={styles.button}>
                Home
              </Link>
            </div>
          </div>
        ) : null}

        {empty ? (
          <div className={styles.centerMsg}>
            <div className={styles.emptyVisual} aria-hidden />
            <h1>No tools yet</h1>
            <p>
              Published tools land here. Create one, capture a thumbnail, and
              publish to seed the gallery.
            </p>
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <Link
                href="/create"
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Create a tool
              </Link>
            </div>
          </div>
        ) : null}

        {items.length > 0 ? (
          <>
            <div className={styles.grid}>
              {items.map((card) => (
                <GalleryCard key={card.publicId} card={card} />
              ))}
            </div>
            <div className={styles.actions}>
              {q.hasNextPage ? (
                <button
                  type="button"
                  className={styles.button}
                  disabled={q.isFetchingNextPage}
                  onClick={() => void q.fetchNextPage()}
                >
                  {q.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              ) : null}
              <Link
                href="/create"
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Create your own
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </GalleryShell>
  );
}
