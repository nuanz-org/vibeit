"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { normalizePublicAssetUrl } from "@/features/gallery/lib/asset-url";
import { displayTitle, hashHue } from "@/features/gallery/lib/display-title";
import type { OwnerToolCard as OwnerToolCardType } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

export type ProfileToolCardProps = {
  card: OwnerToolCardType;
};

function statusLabel(card: OwnerToolCardType): string {
  if (!card.hasRunnableVersion) return "Not ready yet";
  if (card.status === "published") return "Published";
  return "Draft";
}

export function ProfileToolCard({ card }: ProfileToolCardProps) {
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || card.id || title);
  const studioHref = `/studio/${encodeURIComponent(card.id)}`;
  const publicHref = `/t/${encodeURIComponent(card.publicId)}`;
  const openable = card.hasRunnableVersion;
  const published = card.status === "published";

  const metaParts = [
    card.isRemix ? "Remix" : null,
    statusLabel(card),
  ].filter(Boolean);

  return (
    <article className="min-w-0">
      <div
        className={cn(
          "group relative block overflow-hidden rounded-2xl bg-muted shadow-elev",
          "aspect-[4/3]",
          "transition-[box-shadow,transform] duration-ui ease-ui",
          openable &&
            "hover:-translate-y-0.5 hover:shadow-elev-hover",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        )}
      >
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- public asset URL
          <img
            src={thumbSrc}
            alt=""
            className={cn(
              "block size-full object-cover",
              openable &&
                "transition-transform duration-ui ease-ui group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
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
        {openable ? (
          <Link
            href={studioHref}
            className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`Open ${fullTitle} in Studio`}
          />
        ) : null}
      </div>

      <div className="px-0.5 pt-3 pb-1">
        {openable ? (
          <Link
            href={studioHref}
            className="line-clamp-2 text-sm font-medium leading-snug tracking-[-0.015em] text-ink no-underline hover:opacity-80 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            title={fullTitle}
          >
            {title}
          </Link>
        ) : (
          <p
            className="m-0 line-clamp-2 text-sm font-medium leading-snug tracking-[-0.015em] text-ink"
            title={fullTitle}
          >
            {title}
          </p>
        )}
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <p className="m-0 min-w-0 truncate text-xs leading-snug tracking-[-0.01em] text-ink-caption">
            {metaParts.join(" · ")}
          </p>
          {published ? (
            <Link
              href={publicHref}
              className={cn(
                "relative shrink-0 text-xs font-medium tracking-[-0.01em] text-ink-secondary no-underline",
                "transition-colors duration-fast ease-ui hover:text-ink",
                "before:absolute before:-inset-y-3 before:-inset-x-2 before:content-['']",
                "focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "motion-reduce:transition-none",
              )}
            >
              Open public
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
