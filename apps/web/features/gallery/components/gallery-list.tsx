"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { listGallery } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { GalleryCard } from "./gallery-card";
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

const masonry =
  "columns-1 gap-x-3.5 min-[560px]:columns-2 min-[1100px]:columns-3 min-[1100px]:gap-x-4";

function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div
      className={cn(
        masonry,
        "[&>div:nth-child(3n+2)>div:first-child]:aspect-[3/4]",
        "[&>div:nth-child(4n)>div:first-child]:aspect-[16/10]",
      )}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mb-3.5 break-inside-avoid bg-transparent">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-ink/6 shadow-elev" />
          <div className="flex flex-col gap-1.5 px-0.5 pt-3 pb-1">
            <div className="h-2.5 w-[72%] animate-pulse rounded bg-ink/8" />
            <div className="h-2.5 w-[42%] animate-pulse rounded bg-ink/6" />
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
      <main className="relative mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-[4.5rem] md:px-6 md:pt-8 md:pb-20">
        <header className="mb-8 flex max-w-[40rem] flex-col gap-3 md:mb-10 md:gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="m-0 text-[13px] font-medium tracking-[-0.01em] text-ink-caption">
              Gallery
            </p>
            {countLabel ? (
              <span className="shrink-0 rounded-[10px] bg-surface px-2.5 py-1 text-xs font-medium text-muted-ink">
                {countLabel}
              </span>
            ) : null}
          </div>
          <h1 className="m-0 text-[clamp(1.5rem,3.4vw,2.15rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-pretty text-ink">
            Explore interactive design tools.
            <span className="mt-1 block font-medium text-ink-caption">
              Open any piece to play — no sign-in.
            </span>
          </h1>
        </header>

        {loadingFirst ? <SkeletonGrid /> : null}

        {error ? (
          <div className="mx-auto mt-16 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center">
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
        ) : null}

        {empty ? (
          <div className="relative mx-auto mt-16 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center">
            <div
              className="pointer-events-none absolute -inset-x-16 -top-10 -z-10 h-48 rounded-[50%] bg-[radial-gradient(90%_80%_at_50%_100%,rgb(230,236,255)_0%,rgb(188,203,255)_50%,transparent_75%)] opacity-60 dark:opacity-20"
              aria-hidden
            />
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
        ) : null}

        {items.length > 0 ? (
          <>
            <div className={masonry}>
              {items.map((card) => (
                <GalleryCard key={card.publicId} card={card} />
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              {q.hasNextPage ? (
                <button
                  type="button"
                  className={btn}
                  disabled={q.isFetchingNextPage}
                  onClick={() => void q.fetchNextPage()}
                >
                  {q.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              ) : null}
              <Link href="/create" className={cn(btn, btnSolid)}>
                Create your own
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </GalleryShell>
  );
}
