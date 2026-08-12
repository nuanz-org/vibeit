"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import { displayTitle, hashHue } from "../lib/display-title";

/** Vary tile proportions so masonry feels less uniform. */
function aspectClass(publicId: string): string {
  let h = 0;
  for (let i = 0; i < publicId.length; i++) {
    h = (h * 33 + publicId.charCodeAt(i)) >>> 0;
  }
  const bucket = h % 5;
  if (bucket === 0 || bucket === 1) return "aspect-[3/4]";
  if (bucket === 2) return "aspect-[16/10]";
  return "";
}

export type GalleryCardProps = {
  card: GalleryCardType;
  /** Link target: detail page (default) or open public tool directly. */
  href?: string;
};

/**
 * Media-first gallery tile (Brik-style): large preview, short name, quiet meta.
 * Used on detail-adjacent surfaces; the main /gallery list uses the infinite canvas.
 */
export function GalleryCard({ card, href }: GalleryCardProps) {
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const tags = (card.tags ?? []).slice(0, 2);
  const to = href ?? `/gallery/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || title);
  const wrapAspect = aspectClass(card.publicId || title);

  return (
    <Link
      href={to}
      className="group mb-3 block w-full break-inside-avoid overflow-visible rounded-none border-none bg-transparent text-inherit no-underline focus-visible:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring min-[1100px]:mb-3.5"
      title={fullTitle}
    >
      <div
        className={cn(
          "relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-elev",
          "transition-[box-shadow,transform] duration-ui ease-ui",
          "group-hover:-translate-y-0.5 group-hover:shadow-elev-hover",
          "motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
          wrapAspect,
        )}
      >
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- public asset URL
          <img
            src={thumbSrc}
            alt=""
            className="block size-full object-cover transition-transform duration-ui ease-ui group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            loading="lazy"
            decoding="async"
          />
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
            <span className="size-7 rounded-[10px] border-[1.5px] border-foreground/14 opacity-35" />
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-col gap-0.5 px-0.5 pt-3 pb-1">
        <div className="line-clamp-2 text-sm font-medium leading-snug tracking-[-0.015em] text-ink">
          {title}
        </div>
        {tags.length > 0 ? (
          <div className="line-clamp-1 text-xs leading-snug tracking-[-0.01em] text-ink-caption">
            {tags.join(" · ")}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
