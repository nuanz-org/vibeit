"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";
import { cn } from "@/lib/utils";

export type GalleryShellProps = {
  children: ReactNode;
};

/**
 * Public gallery chrome (no auth required).
 * Base.org language: white/muted stage, blue mark, pill nav, snappy ease.
 */
export function GalleryShell({ children }: GalleryShellProps) {
  const pathname = usePathname() || "";
  const onBrowse =
    pathname === "/gallery" || pathname.startsWith("/gallery/");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/88 px-5 py-3.5 backdrop-blur-[12px] md:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-[0.35rem]">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-[0.15rem] py-[0.35rem] text-[15px] font-medium tracking-tight text-inherit no-underline hover:opacity-70 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ring"
          >
            <span
              className="inline-block size-6 shrink-0 rounded-[2px] bg-primary"
              aria-hidden
            />
            Aiditr
          </Link>
          <nav
            className="flex items-center gap-[0.2rem] rounded-full border border-border bg-surface p-[0.2rem]"
            aria-label="Primary"
          >
            <Link
              href="/gallery"
              className={cn(
                "rounded-full px-3.5 py-[0.45rem] text-[0.8125rem] font-medium text-muted-foreground no-underline transition-[color,background] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#F8F8F8] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none dark:hover:bg-secondary",
                onBrowse && "bg-card text-foreground shadow-sm",
              )}
              aria-current={onBrowse ? "page" : undefined}
            >
              Gallery
            </Link>
            <Link
              href="/create"
              className="rounded-full px-3.5 py-[0.45rem] text-[0.8125rem] font-medium text-muted-foreground no-underline transition-[color,background] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#F8F8F8] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none dark:hover:bg-secondary"
            >
              Create
            </Link>
          </nav>
        </div>
        <UserMenu />
      </header>
      {children}
    </div>
  );
}
