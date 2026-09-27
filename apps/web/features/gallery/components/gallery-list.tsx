"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo, type ReactNode } from "react";

import { ArrowRight } from "@/components/icons";
import { ThemeToggle } from "@/components/prefs";
import { listGallery } from "@/lib/api/gallery";

import { GalleryCanvas } from "./gallery-canvas";
import { GalleryShell } from "./gallery-shell";

const PAGE_SIZE = 24;

/**
 * The app's front door: an infinite, pannable workspace of published tools.
 * Copy and header anatomy follow the landing's gallery section.
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

  const onNeedMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) {
      void q.fetchNextPage();
    }
  }, [q]);

  return (
    <GalleryShell className="h-dvh max-h-dvh overflow-hidden" bordered>
      <main className="relative flex min-h-0 flex-1 flex-col">
        {items.length > 0 ? (
          <GalleryCanvas
            items={items}
            hasMore={Boolean(q.hasNextPage)}
            onNeedMore={onNeedMore}
            className="min-h-0 flex-1"
          />
        ) : (
          <div className="workspace-grid flex flex-1 items-center justify-center px-4">
            {loadingFirst ? (
              <p
                className="t-label flex items-center gap-2 text-muted"
                role="status"
              >
                <span
                  className="live-dot size-1.5 rounded-full bg-accent-text"
                  aria-hidden
                />
                Loading gallery
              </p>
            ) : null}

            {error ? (
              <StateCard
                eyebrow="Gallery"
                title="The gallery didn’t load."
                body={
                  q.error instanceof Error
                    ? q.error.message
                    : "Something went wrong while fetching published tools."
                }
              >
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void q.refetch()}
                >
                  Try again
                </button>
              </StateCard>
            ) : null}

            {empty ? (
              <StateCard
                eyebrow="Gallery"
                title="Nothing published yet."
                body="Make a tool, then publish it from Studio. It shows up here for anyone to use and remix."
              >
                <Link href="/create" className="btn btn-primary btn-sm">
                  Start creating
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              </StateCard>
            ) : null}
          </div>
        )}

        {/* Floating chrome over the workspace, on the nav's `wrap` grid so
            the card lines up with the wordmark and "Load more" with the CTA. */}
        <div className="wrap pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 pt-4 md:pt-6">
          <section
            aria-labelledby="gallery-title"
            className="pointer-events-auto w-[min(100%,25rem)] rounded-[12px] border border-border bg-surface p-4 md:p-5"
          >
            <p className="t-label flex items-center gap-2 text-muted">
              <span>Gallery</span>
              {countLabel ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{countLabel}</span>
                </>
              ) : null}
            </p>
            <h1
              id="gallery-title"
              className="mt-2.5 text-[1.375rem] leading-tight font-medium tracking-[-0.03em] text-balance"
            >
              What people are making.
            </h1>
            <ol className="t-label mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              <li>Find something close</li>
              <li aria-hidden="true">→</li>
              <li>Remix</li>
              <li aria-hidden="true">→</li>
              <li className="text-fg">Make it yours</li>
            </ol>
          </section>

          {q.hasNextPage && items.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline btn-sm pointer-events-auto"
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            >
              {q.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </div>

        <div className="wrap pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 pb-4 md:pb-6">
          <p className="t-label hidden text-muted sm:block">
            {items.length > 0
              ? "Drag, scroll or use arrow keys to look around"
              : ""}
          </p>
          <ThemeToggle className="pointer-events-auto" />
        </div>
      </main>
    </GalleryShell>
  );
}

function StateCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center rounded-[12px] border border-border bg-surface px-6 py-10 text-center md:px-10">
      <p className="t-label text-muted">{eyebrow}</p>
      <h2 className="t-h3 mt-3 text-balance">{title}</h2>
      <p className="mt-2 max-w-[34ch] text-[15px] leading-[1.55] text-pretty text-muted">
        {body}
      </p>
      {children ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
