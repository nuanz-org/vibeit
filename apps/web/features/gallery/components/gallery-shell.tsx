"use client";

import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

export type GalleryShellProps = {
  children: ReactNode;
  className?: string;
  /** Full-height screens keep the header hairline on; scrolling pages don't. */
  bordered?: boolean;
};

/** Public gallery chrome: the landing nav over a plain --bg page. */
export function GalleryShell({
  children,
  className,
  bordered,
}: GalleryShellProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-bg text-fg", className)}>
      <AppHeader className="shrink-0" bordered={bordered} />
      {children}
    </div>
  );
}
