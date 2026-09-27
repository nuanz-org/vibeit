"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Close, Menu } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { UserMenu } from "@/features/auth/components/user-menu";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type AppHeaderProps = {
  /** Extra actions on the right, before the account control. */
  actions?: ReactNode;
  /**
   * Always show the bottom hairline. By default it appears only once the
   * page scrolls (landing behaviour); full-height screens pass `true`.
   */
  bordered?: boolean;
  className?: string;
};

type NavLink = { href: string; label: string; match: (p: string) => boolean };

const GALLERY: NavLink = {
  href: "/gallery",
  label: "Gallery",
  match: (p) => p === "/" || p.startsWith("/gallery"),
};

const YOUR_TOOLS: NavLink = {
  href: "/profile",
  label: "Your tools",
  match: (p) => p.startsWith("/profile"),
};

/**
 * App chrome — a port of the landing nav (aiditr-landing/features/landing/sections/Nav.tsx):
 * 64px, wordmark, quiet pill links, muted "Sign in", one blue "Start creating".
 */
export function AppHeader({
  actions,
  bordered = false,
  className,
}: AppHeaderProps) {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const links = signedIn ? [GALLERY, YOUR_TOOLS] : [GALLERY];

  useEffect(() => {
    const el = sentinel.current;
    if (!el || bordered) return;
    const io = new IntersectionObserver(([e]) =>
      setScrolled(!e!.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [bordered]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {bordered ? null : (
        <div
          ref={sentinel}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-2"
        />
      )}
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-bg transition-colors duration-[240ms] ease-standard",
          bordered || scrolled || open ? "border-border" : "border-transparent",
          className,
        )}
      >
        <nav
          aria-label="Main"
          className="wrap flex h-(--nav-h) items-center gap-2"
        >
          <Link
            href="/gallery"
            className="wm-link -ml-1 rounded-[8px] p-1"
            aria-label="Aiditr gallery"
          >
            <Wordmark />
          </Link>

          <ul className="ml-6 hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const current = l.match(pathname);
              return (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3 text-[14px] transition-colors duration-[180ms] hover:bg-band hover:text-fg",
                      current ? "text-fg" : "text-muted",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-1.5">
            {actions}
            <UserMenu className="hidden sm:inline-flex" />
            <Link
              href="/create"
              className="btn btn-primary h-10! px-4! text-[14px]!"
            >
              Start creating
            </Link>
            <button
              ref={button}
              type="button"
              className="-mr-2 grid size-11 cursor-pointer place-items-center rounded-full text-fg md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(!open)}
            >
              {open ? <Close size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        <div
          id="mobile-menu"
          hidden={!open}
          className="border-t border-border md:hidden"
        >
          <ul className="wrap flex flex-col py-2">
            {[
              ...links,
              signedIn
                ? null
                : { href: "/login", label: "Sign in", match: () => false },
            ]
              .filter((l): l is NavLink => l != null)
              .map((l) => (
                <li
                  key={l.label}
                  className="border-b border-border last:border-0"
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center text-[16px]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </header>
    </>
  );
}
