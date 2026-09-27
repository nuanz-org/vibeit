"use client";

import { useCallback } from "react";

import { ImageIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ToolThumbProps = {
  src: string | null | undefined;
  className?: string;
  /** Reports the image's natural width / height once it has loaded. */
  onRatio?: (ratio: number) => void;
  eager?: boolean;
};

/**
 * A published tool's captured frame, or an empty dot-grid slot when there
 * is none yet. Fills its parent; the parent owns the frame (border, radius).
 */
export function ToolThumb({ src, className, onRatio, eager }: ToolThumbProps) {
  const report = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth && img.naturalHeight) {
        onRatio?.(img.naturalWidth / img.naturalHeight);
      }
    },
    [onRatio],
  );

  if (!src) {
    return (
      <div
        className={cn(
          "workspace-grid grid size-full place-items-center text-muted",
          className,
        )}
        aria-hidden
      >
        <ImageIcon size={18} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- public asset URL
    <img
      ref={report}
      src={src}
      alt=""
      className={cn(
        "pointer-events-none block size-full object-cover",
        className,
      )}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onLoad={(e) => report(e.currentTarget)}
    />
  );
}

/** Largest box with ratio `ar` that fits in `maxW × maxH`. */
export function fitBox(maxW: number, maxH: number, ar: number) {
  const w = Math.min(maxW, maxH * ar);
  return { w: Math.round(w), h: Math.round(w / ar) };
}
