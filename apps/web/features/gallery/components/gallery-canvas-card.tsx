"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import type { CanvasSlot } from "../lib/canvas-layout";
import { displayTitle, tileMeta } from "../lib/display-title";
import { CARD_MOTION, DUR, EASE } from "../lib/gallery-motion";
import { fitBox, ToolThumb } from "./tool-thumb";

export type GalleryCanvasCardProps = {
  slot: CanvasSlot;
  card: GalleryCardType;
  onSelect: (instanceId: string, publicId: string) => void;
  /** A detail dialog is open: tiles stop taking pointer input. */
  inert: boolean;
  index: number;
  ready: boolean;
};

/**
 * One tile on the gallery canvas, with the landing's tile anatomy
 * (aiditr-landing/features/landing/sections/Gallery.tsx): a hairline 10px
 * frame that hugs the captured frame's own ratio, caption underneath.
 * Hover darkens the edge; nothing lifts, tilts or scales.
 */
export function GalleryCanvasCard({
  slot,
  card,
  onSelect,
  inert,
  index,
  ready,
}: GalleryCanvasCardProps) {
  const reduce = useReducedMotion();
  const [ratio, setRatio] = useState<number | null>(null);
  const title = displayTitle(card.title);
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  // The slot is the bounding box; the frame takes the image's own shape.
  const box = fitBox(slot.w, slot.h, ratio ?? slot.w / slot.h);

  return (
    <motion.button
      type="button"
      data-gallery-card
      className={cn(
        "group absolute m-0 flex cursor-pointer flex-col items-start rounded-[12px] border-0 bg-transparent p-0 text-left",
        inert && "pointer-events-none",
      )}
      style={{ left: slot.x, top: slot.y, width: slot.w }}
      initial={reduce ? false : { opacity: 0, y: CARD_MOTION.enterY }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              duration: DUR.ui,
              ease: EASE,
              delay: ready
                ? 0
                : Math.min(index * CARD_MOTION.stagger, CARD_MOTION.maxDelay),
            }
      }
      onPointerDown={(e) => {
        // Keep canvas pan from capturing this interaction
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(slot.instanceId, card.publicId);
      }}
      aria-label={`${fullTitle}. View details`}
      title={fullTitle}
      tabIndex={inert ? -1 : undefined}
    >
      <span
        className="relative block overflow-hidden rounded-[10px] border border-border bg-surface transition-colors duration-[180ms] ease-standard group-hover:border-fg"
        style={{ width: box.w, height: box.h }}
      >
        <ToolThumb src={thumbSrc} onRatio={setRatio} />
      </span>
      <span className="mt-2.5 block w-full min-w-0" style={{ maxWidth: box.w }}>
        <span className="block truncate text-[14px] font-medium tracking-[-0.01em] text-fg">
          {title}
        </span>
        <span className="t-mono mt-0.5 block truncate text-[12px] text-muted">
          {tileMeta(card)}
        </span>
      </span>
    </motion.button>
  );
}
