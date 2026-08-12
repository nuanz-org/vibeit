"use client";

import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

export type GalleryShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Public gallery chrome — shares AppHeader with Landing.
 * Tailwind-only surfaces.
 */
export function GalleryShell({ children, className }: GalleryShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground",
        className,
      )}
    >
      <AppHeader className="shrink-0" />
      {children}
    </div>
  );
}
