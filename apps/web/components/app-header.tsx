"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-6 shrink-0 rounded-[2px] bg-primary",
        className,
      )}
      aria-hidden
    />
  );
}

export type AppHeaderProps = {
  /** Extra actions on the right (before UserMenu). */
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared marketing chrome — Landing + Gallery.
 * Tailwind-only: sticky bar, hairline border, quiet nav.
 */
export function AppHeader({ actions, className }: AppHeaderProps) {
  const pathname = usePathname() || "";
  const onGallery =
    pathname === "/gallery" || pathname.startsWith("/gallery/");
  const onCreate = pathname === "/create" || pathname.startsWith("/create");

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border bg-background/95",
        className,
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between gap-4 px-5 md:px-6">
        <div className="flex min-w-0 items-center gap-7">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[15px] font-medium tracking-[-0.02em] text-ink transition-opacity duration-fast ease-snap hover:opacity-70 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <LogoMark />
            Aiditr
          </Link>
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary"
          >
            <Link
              href="/create"
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-[14px] font-medium tracking-[-0.01em] transition-[color,background-color] duration-ui ease-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                onCreate
                  ? "bg-surface text-ink"
                  : "text-ink-secondary hover:bg-surface hover:text-ink",
              )}
              aria-current={onCreate ? "page" : undefined}
            >
              Create
            </Link>
            <Link
              href="/gallery"
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-[14px] font-medium tracking-[-0.01em] transition-[color,background-color] duration-ui ease-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                onGallery
                  ? "bg-surface text-ink"
                  : "text-ink-secondary hover:bg-surface hover:text-ink",
              )}
              aria-current={onGallery ? "page" : undefined}
            >
              Gallery
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export { LogoMark };
