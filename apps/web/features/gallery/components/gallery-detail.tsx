"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { CSSProperties } from "react";

import { getGalleryItem } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import { GalleryShell } from "./gallery-shell";

const btn = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card px-4",
  "text-sm font-medium text-ink-secondary no-underline",
  "transition-[border-color,background-color,color,opacity] duration-ui ease-ui",
  "hover:enabled:bg-surface hover:enabled:text-ink",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
);

const btnPrimary = cn(
  "border-transparent bg-primary text-primary-foreground",
  "hover:enabled:border-transparent hover:enabled:bg-base-blue-hover",
);

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/**
 * Gallery detail card → open live /t/:publicId.
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
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-[4.5rem] md:px-6 md:pt-7 md:pb-20">
          <p className="m-0 text-sm leading-snug text-muted-foreground">
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
        <main className="mx-auto mt-14 mb-8 flex max-w-md flex-col items-center gap-3 px-2 text-center [&_h1]:m-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-balance [&_p]:m-0 [&_p]:max-w-[26rem] [&_p]:text-[0.95rem] [&_p]:leading-relaxed [&_p]:text-muted-foreground">
          <div
            className="mb-[0.35rem] size-[4.5rem] rounded-xl bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_oklch,var(--foreground)_10%,transparent),transparent_72%),color-mix(in_oklch,var(--foreground)_5%,transparent)]"
            aria-hidden
          />
          <h1>{notFound ? "Not in gallery" : "Could not open"}</h1>
          <p>
            {notFound
              ? "This tool is not in the public gallery. It may be private or unpublished."
              : msg}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-[0.65rem]">
            <Link href="/gallery" className={btn}>
              Back to gallery
            </Link>
            <Link
              href="/"
              className="text-[0.85rem] text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
            >
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
  const remixHref = `/remix/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || title);

  return (
    <GalleryShell>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-[4.5rem] md:px-6 md:pt-7 md:pb-20">
        <Link
          href="/gallery"
          className="mb-5 inline-flex items-center gap-[0.35rem] rounded-md px-[0.15rem] py-1 text-sm font-medium text-muted-foreground no-underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          ← Back to Gallery
        </Link>

        <div className="grid gap-7 min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] min-[720px]:items-start min-[720px]:gap-9">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted [&_img]:block [&_img]:size-full [&_img]:object-cover">
            {thumbSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbSrc} alt="" decoding="async" />
            ) : (
              <div
                className={cn(
                  "relative flex size-full items-center justify-center",
                  "bg-[radial-gradient(120%_90%_at_20%_15%,oklch(0.78_0.04_var(--ph-hue)/0.55),transparent_55%),radial-gradient(100%_80%_at_85%_90%,oklch(0.72_0.035_calc(var(--ph-hue)+50)/0.4),transparent_50%),oklch(0.82_0.02_var(--ph-hue))]",
                  "[@media(prefers-color-scheme:dark)]:bg-[radial-gradient(120%_90%_at_20%_15%,oklch(0.32_0.05_var(--ph-hue)/0.7),transparent_55%),radial-gradient(100%_80%_at_85%_90%,oklch(0.28_0.04_calc(var(--ph-hue)+50)/0.55),transparent_50%),oklch(0.2_0.025_var(--ph-hue))]",
                  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_6%,transparent)] after:content-['']",
                )}
                style={
                  {
                    ["--ph-hue" as string]: String(hue),
                  } as CSSProperties
                }
                aria-hidden
              >
                <span className="size-7 rounded-md border-[1.5px] border-foreground/14 opacity-35" />
              </div>
            )}
          </div>

          <div>
            <h1 className="mt-0 mb-[0.65rem] text-[clamp(1.4rem,2.5vw,1.85rem)] font-semibold leading-tight tracking-tight text-balance">
              {title}
            </h1>
            {desc ? (
              <p className="m-0 mb-[1.1rem] max-w-[42rem] text-[0.95rem] leading-relaxed text-muted-foreground">
                {desc}
              </p>
            ) : null}

            {tags.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-[0.3rem]">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-[5px] bg-foreground/[0.06] px-[0.4rem] py-[0.12rem] text-[0.68rem] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="text-sm leading-snug text-muted-foreground">
              Interactive preview — view only. No source download or Studio
              controls.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-[0.65rem]">
              <Link href={runHref} className={cn(btn, btnPrimary)}>
                Open tool
              </Link>
              <Link href={remixHref} className={btn}>
                Remix in Studio
              </Link>
              <Link href="/gallery" className={btn}>
                Back to gallery
              </Link>
              <Link href="/create" className={btn}>
                Create your own
              </Link>
            </div>
          </div>
        </div>
      </main>
    </GalleryShell>
  );
}
