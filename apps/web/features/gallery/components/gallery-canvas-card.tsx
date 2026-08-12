"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import type { CanvasSlot } from "../lib/canvas-layout";
import { displayTitle, hashHue } from "../lib/display-title";
import { CARD_MOTION } from "../lib/gallery-motion";
import { normalizePublicAssetUrl } from "../lib/asset-url";

export type GalleryCanvasCardProps = {
  slot: CanvasSlot;
  card: GalleryCardType;
  /** World → screen is handled by parent transform; card is absolute in world. */
  selected: boolean;
  dimmed: boolean;
  onSelect: (instanceId: string, publicId: string) => void;
  index: number;
  ready: boolean;
};

export function GalleryCanvasCard({
  slot,
  card,
  selected,
  dimmed,
  onSelect,
  index,
  ready,
}: GalleryCanvasCardProps) {
  const reduce = useReducedMotion();
  const title = displayTitle(card.title);
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const tags = (card.tags ?? []).slice(0, 2);
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || title);
  const layoutId = `gallery-media-${slot.instanceId}`;

  return (
    <motion.button
      type="button"
      data-gallery-card
      layout={false}
      className={cn(
        "group absolute m-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-left",
        "focus-visible:outline-none",
        selected && "z-20 pointer-events-none",
        dimmed && "pointer-events-none",
      )}
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.w,
      }}
      initial={
        reduce
          ? false
          : {
              opacity: 0,
              y: 18,
              scale: CARD_MOTION.initialScale,
            }
      }
      animate={{
        opacity: selected ? 0 : dimmed ? 0.28 : 1,
        y: 0,
        scale: 1,
        rotate: selected ? 0 : slot.rotate,
        filter: dimmed && !selected ? "blur(2px)" : "blur(0px)",
      }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              ...CARD_MOTION.restSpring,
              delay: ready ? 0 : Math.min(index * 0.03, 0.45),
              opacity: { duration: 0.22 },
              filter: { duration: 0.28 },
            }
      }
      whileHover={
        reduce || selected || dimmed
          ? undefined
          : {
              scale: CARD_MOTION.hoverScale,
              y: CARD_MOTION.hoverY,
              rotate: 0,
              transition: CARD_MOTION.hoverSpring,
            }
      }
      whileTap={
        reduce || dimmed || selected
          ? undefined
          : { scale: CARD_MOTION.pressScale, transition: { duration: 0.1 } }
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
      aria-label={`View details for ${fullTitle}`}
      title={fullTitle}
      aria-hidden={selected || undefined}
    >
      {/*
        When selected, unmount the layoutId media so Motion can morph it
        into the focus panel; keep a size placeholder for world layout.
      */}
      {selected ? (
        <div
          className="w-full rounded-2xl"
          style={{ height: slot.h }}
          aria-hidden
        />
      ) : (
        <motion.div
          layoutId={reduce ? undefined : layoutId}
          className={cn(
            "relative w-full overflow-hidden rounded-2xl bg-muted shadow-elev",
            "ring-0 transition-[box-shadow] duration-ui ease-ui",
            "group-hover:shadow-elev-hover group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
            "motion-reduce:transition-none",
          )}
          style={{ height: slot.h }}
        >
          {thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- public asset URL
            <img
              src={thumbSrc}
              alt=""
              className="pointer-events-none block size-full object-cover"
              loading="lazy"
              decoding="async"
              draggable={false}
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

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/55 via-black/15 to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 pt-8">
            <div className="line-clamp-2 text-[13px] font-medium leading-snug tracking-[-0.015em] text-white drop-shadow-sm">
              {title}
            </div>
            {tags.length > 0 ? (
              <div className="line-clamp-1 text-[11px] leading-snug tracking-[-0.01em] text-white/75">
                {tags.join(" · ")}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
