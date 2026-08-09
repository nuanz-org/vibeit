"use client";

import type { ReactNode } from "react";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ChatStatusMarkerProps = {
  children: ReactNode;
  /** Show spinner for in-progress work. */
  pending?: boolean;
  /** Accessible live region for assistive tech. */
  live?: boolean;
  className?: string;
  variant?: "default" | "separator" | "border";
};

/**
 * System/status line for job phase, refine progress, or soft errors.
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
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
      ) : null}
      <MarkerContent>{children}</MarkerContent>
    </Marker>
  );
}
