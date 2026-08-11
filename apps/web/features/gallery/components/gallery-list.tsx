"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { listGallery } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { GalleryCard } from "./gallery-card";
import { GalleryShell } from "./gallery-shell";

const PAGE_SIZE = 24;

const btn =
  "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-border bg-card px-4 py-[0.55rem] text-sm font-medium text-inherit no-underline transition-[border-color,background,opacity] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:enabled:bg-[#F8F8F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none dark:hover:enabled:bg-secondary";

const btnPrimary =
  "border-transparent bg-primary font-medium text-primary-foreground hover:enabled:border-transparent hover:enabled:bg-base-blue-hover";

const masonry =
  "columns-1 gap-x-3 min-[560px]:columns-2 min-[1100px]:columns-3 min-[1100px]:gap-x-3.5";

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
        <div key={i} className="mb-3 break-inside-avoid bg-transparent">
          <div className="aspect-[4/3] animate-pulse rounded-[10px] bg-foreground/[0.08]" />
          <div className="flex flex-col gap-1.5 px-[0.15rem] pt-[0.65rem] pb-[0.35rem]">
            <div className="h-[0.65rem] w-[72%] animate-pulse rounded bg-foreground/[0.09]" />
            <div className="h-[0.65rem] w-[42%] animate-pulse rounded bg-foreground/[0.09]" />
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
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-[4.5rem] md:px-6 md:pt-7 md:pb-20">
        <header className="mb-7 flex max-w-[52rem] flex-col gap-[0.65rem] md:mb-9 md:gap-[0.85rem]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <h1 className="m-0 text-base font-semibold leading-tight tracking-tight">
              Gallery
            </h1>
            {countLabel ? (
              <span className="shrink-0 rounded-full bg-foreground/[0.06] px-[0.7rem] py-[0.35rem] text-xs font-medium text-muted-foreground">
                {countLabel}
              </span>
            ) : null}
          </div>
          <p className="m-0 max-w-[40rem] text-[clamp(1.35rem,3.6vw,2.15rem)] font-medium leading-tight tracking-tight text-pretty text-muted-ink">
            Explore interactive design tools from the community. Open any piece
            to play — no sign-in required.
          </p>
        </header>

        {loadingFirst ? <SkeletonGrid /> : null}

        {error ? (
          <div className="mx-auto mt-14 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center [&_h1]:m-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-balance [&_p]:m-0 [&_p]:max-w-[26rem] [&_p]:text-[0.95rem] [&_p]:leading-relaxed [&_p]:text-muted-foreground">
            <div
              className="mb-[0.35rem] size-[4.5rem] rounded-xl bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_oklch,var(--foreground)_10%,transparent),transparent_72%),color-mix(in_oklch,var(--foreground)_5%,transparent)]"
              aria-hidden
            />
            <h1>Could not load gallery</h1>
            <p>
              {q.error instanceof Error
                ? q.error.message
                : "Something went wrong while fetching public tools."}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-[0.65rem]">
              <button
                type="button"
                className={cn(btn, btnPrimary)}
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
          <div className="mx-auto mt-14 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center [&_h1]:m-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-balance [&_p]:m-0 [&_p]:max-w-[26rem] [&_p]:text-[0.95rem] [&_p]:leading-relaxed [&_p]:text-muted-foreground">
            <div
              className="mb-[0.35rem] size-[4.5rem] rounded-xl bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_oklch,var(--foreground)_10%,transparent),transparent_72%),color-mix(in_oklch,var(--foreground)_5%,transparent)]"
              aria-hidden
            />
            <h1>No tools yet</h1>
            <p>
              Published tools land here. Create one, capture a thumbnail, and
              publish to seed the gallery.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-[0.65rem]">
              <Link href="/create" className={cn(btn, btnPrimary)}>
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
            <div className="mt-7 flex flex-wrap items-center gap-[0.65rem]">
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
              <Link href="/create" className={cn(btn, btnPrimary)}>
                Create your own
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </GalleryShell>
  );
}
