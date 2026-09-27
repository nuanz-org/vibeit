"use client";

import type { ReactNode } from "react";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ChatStatusMarkerProps = {
  children: ReactNode;
  /** Show the blinking live dot for in-progress work. */
  pending?: boolean;
  /** Accessible live region for assistive tech. */
  live?: boolean;
  className?: string;
  variant?: "default" | "separator" | "border";
};

/**
 * System/status line for job phase, refine progress, or soft errors.
 * Landing live caption: muted 13px text after a 6px accent-text live dot.
 */
export function ChatStatusMarker({
  children,
  pending = false,
  live = true,
  className,
  variant = "default",
}: ChatStatusMarkerProps) {
  return (
    <Marker
      variant={variant}
      role={live ? "status" : undefined}
      className={cn(className)}
    >
      {pending ? (
        <MarkerIcon className="size-3">
          <Spinner role={undefined} aria-label={undefined} />
        </MarkerIcon>
      ) : null}
      <MarkerContent>{children}</MarkerContent>
    </Marker>
  );
}
