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
 */
export function GalleryShell({ children }: GalleryShellProps) {
  const pathname = usePathname() || "";
  const onBrowse =
    pathname === "/gallery" || pathname.startsWith("/gallery/");

  return (
    <div className="flex min-h-screen flex-col bg-stage text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-stage/88 px-5 py-[0.85rem] backdrop-blur-[12px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-[0.35rem]">
          <Link
            href="/"
            className="px-[0.15rem] py-[0.35rem] text-[0.95rem] font-semibold tracking-tight text-inherit no-underline hover:opacity-70 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ring"
          >
            Aiditr
          </Link>
          <nav
            className="flex items-center gap-[0.2rem] rounded-xl bg-foreground/5 p-[0.2rem]"
            aria-label="Primary"
          >
            <Link
              href="/gallery"
              className={cn(
                "rounded-[10px] px-3 py-[0.45rem] text-[0.8125rem] font-medium text-muted-foreground no-underline transition-[color,background] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                onBrowse &&
                  "bg-card text-foreground shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_8%,transparent)]",
              )}
              aria-current={onBrowse ? "page" : undefined}
            >
              Gallery
            </Link>
            <Link
              href="/create"
              className="rounded-[10px] px-3 py-[0.45rem] text-[0.8125rem] font-medium text-muted-foreground no-underline transition-[color,background] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
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
