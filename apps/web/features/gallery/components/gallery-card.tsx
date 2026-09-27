"use client";

import Link from "next/link";
import { useState } from "react";

import { Remix } from "@/components/icons";
import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import { displayTitle, tileMeta } from "../lib/display-title";
import { ToolThumb } from "./tool-thumb";

export type GalleryCardProps = {
  card: GalleryCardType;
  /** Link target: detail page (default) or open public tool directly. */
  href?: string;
  /** Frame height in px; width follows the captured frame's ratio. */
  height?: number;
};

/**
 * Gallery tile for grids and rows, copied from the landing's gallery card
 * (aiditr-landing/features/landing/sections/Gallery.tsx): fixed-height frame
 * at the tool's own ratio, caption and a Remix pill that turns blue on hover.
 * The main /gallery list uses the infinite canvas instead.
 */
export function GalleryCard({ card, href, height = 300 }: GalleryCardProps) {
  const [ratio, setRatio] = useState(1);
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const to = href ?? `/gallery/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);

  return (
    <Link
      href={to}
      className="group block shrink-0 rounded-[12px] focus-visible:outline-offset-4"
      title={fullTitle}
    >
      <div
        className="relative overflow-hidden rounded-[10px] border border-border bg-surface"
        style={{ height, width: Math.round(height * ratio) }}
      >
        <ToolThumb src={thumbSrc} onRatio={setRatio} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium tracking-[-0.01em]">
            {title}
          </p>
          <p className="t-mono mt-0.5 truncate text-[12px] text-muted">
            {tileMeta(card)}
          </p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-medium text-fg transition-colors duration-[180ms] group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg">
          <Remix size={13} />
          Remix
        </span>
      </div>
    </Link>
  );
}
