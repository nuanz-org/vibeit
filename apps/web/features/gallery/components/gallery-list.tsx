"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo } from "react";

import { listGallery } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { GalleryCanvas } from "./gallery-canvas";
import { GalleryShell } from "./gallery-shell";

const PAGE_SIZE = 24;

const btn = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card px-4",
  "text-sm font-medium text-ink-secondary no-underline",
  "transition-[border-color,background-color,color,opacity] duration-ui ease-ui",
  "hover:enabled:bg-surface hover:enabled:text-ink",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "motion-reduce:transition-none",
);

const btnSolid = cn(
  "border-transparent bg-cta text-cta-foreground",
  "hover:enabled:border-transparent hover:enabled:bg-cta-hover hover:enabled:text-cta-foreground",
);

/**
 * Anonymous gallery browse — infinite pannable canvas of published tools.
 * Media-first; click a card to open with Motion storyboard focus.
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
    <GalleryShell className="h-dvh max-h-dvh overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Floating chrome over the canvas */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-4 md:px-6 md:pt-5">
          <div className="pointer-events-auto max-w-[min(100%,28rem)] rounded-2xl bg-background/80 px-4 py-3 shadow-elev backdrop-blur-sm">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="m-0 text-[13px] font-medium tracking-[-0.01em] text-ink-caption">
                Gallery
              </p>
              {countLabel ? (
                <span className="rounded-[10px] bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-ink">
                  {countLabel}
                </span>
              ) : null}
            </div>
            <h1 className="m-0 text-[clamp(1.15rem,2.4vw,1.45rem)] font-semibold leading-tight tracking-[-0.03em] text-balance text-ink">
              Explore interactive design tools
            </h1>
            <p className="mt-1 mb-0 text-[12px] leading-snug text-ink-caption">
              Drag to pan · click a card for details
            </p>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            {q.hasNextPage && items.length > 0 ? (
              <button
                type="button"
                className={cn(btn, "h-9 px-3 text-[13px]")}
                disabled={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : null}
            <Link
              href="/create"
              className={cn(btn, btnSolid, "h-9 px-3 text-[13px]")}
            >
              Create
            </Link>
          </div>
        </header>

        {loadingFirst ? (
          <div className="flex flex-1 items-center justify-center bg-stage">
            <div className="flex flex-col items-center gap-3" aria-busy>
              <div className="size-10 animate-pulse rounded-2xl bg-ink/8 shadow-elev" />
              <p className="m-0 text-sm text-muted-ink">Loading gallery…</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-1 items-center justify-center bg-background px-4">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
              <div
                className="mb-1 size-[4.5rem] rounded-2xl bg-[radial-gradient(70%_80%_at_50%_40%,rgb(188,203,255)_0%,transparent_70%)] opacity-80"
                aria-hidden
              />
              <h2 className="m-0 text-xl font-semibold tracking-[-0.02em] text-balance text-ink">
                Could not load gallery
              </h2>
              <p className="m-0 max-w-[26rem] text-[0.95rem] leading-relaxed text-muted-ink">
                {q.error instanceof Error
                  ? q.error.message
                  : "Something went wrong while fetching public tools."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  className={cn(btn, btnSolid)}
                  onClick={() => void q.refetch()}
                >
                  Try again
                </button>
                <Link href="/" className={btn}>
                  Home
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {empty ? (
          <div className="relative flex flex-1 items-center justify-center bg-background px-4">
            <div
              className="pointer-events-none absolute -inset-x-16 top-1/4 -z-10 h-48 rounded-[50%] bg-[radial-gradient(90%_80%_at_50%_100%,rgb(230,236,255)_0%,rgb(188,203,255)_50%,transparent_75%)] opacity-60 dark:opacity-20"
              aria-hidden
            />
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
              <h2 className="m-0 text-xl font-semibold tracking-[-0.02em] text-balance text-ink">
                Nothing published yet
              </h2>
              <p className="m-0 max-w-[26rem] text-[0.95rem] leading-relaxed text-muted-ink">
                Create a tool, capture a thumbnail, and publish to seed the
                gallery.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <Link href="/create" className={cn(btn, btnSolid)}>
                  Create a tool
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {items.length > 0 ? (
          <GalleryCanvas
            items={items}
            hasMore={Boolean(q.hasNextPage)}
            onNeedMore={onNeedMore}
            className="min-h-0 flex-1"
          />
        ) : null}
      </div>
    </GalleryShell>
  );
}
