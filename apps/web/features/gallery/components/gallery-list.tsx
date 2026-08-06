"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { listGallery } from "@/lib/api/gallery";

import styles from "../styles.module.css";
import { GalleryCard } from "./gallery-card";
import { GalleryShell } from "./gallery-shell";

const PAGE_SIZE = 24;

/**
 * M8e — anonymous gallery browse with load-more pagination.
 * No source download or owner controls.
 */
export function GalleryList() {
  const q = useInfiniteQuery({
    queryKey: ["public-gallery"],
    queryFn: ({ pageParam }) =>
      listGallery({ limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastPageParam) =>
      last.hasMore ? lastPageParam + PAGE_SIZE : undefined,
    retry: false,
  });

  const items = useMemo(
    () => q.data?.pages.flatMap((p) => p.items) ?? [],
    [q.data?.pages],
  );

  const loadingFirst = q.isLoading;
  const error = q.isError && items.length === 0;

  return (
    <GalleryShell>
      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Gallery</h1>
        <p className={styles.pageLead}>
          Browse published tools. Open any card to preview, then run it live —
          no sign-in required.
        </p>

        {loadingFirst ? (
          <p className={styles.muted}>Loading gallery…</p>
        ) : null}

        {error ? (
          <div className={styles.centerMsg}>
            <h1>Could not load gallery</h1>
            <p>
              {q.error instanceof Error
                ? q.error.message
                : "Something went wrong."}
            </p>
            <Link href="/" className={styles.linkMuted}>
              Back to Vibeit
            </Link>
          </div>
        ) : null}

        {!loadingFirst && !error && items.length === 0 ? (
          <div className={styles.centerMsg}>
            <h1>Nothing published yet</h1>
            <p>
              When creators publish tools to the gallery, they will show up
              here.
            </p>
            <div
              className={styles.actions}
              style={{ justifyContent: "center" }}
            >
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
              <Link href="/create" className={styles.button}>
                Create your own
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </GalleryShell>
  );
}
