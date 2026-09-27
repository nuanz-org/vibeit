"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function initialsFromUser(name?: string | null, email?: string | null): string {
  const source = (name?.trim() || email?.trim() || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export type UserMenuProps = {
  /**
   * `default` — app header: muted "Sign in" when signed out, avatar when in.
   * `avatar` — playground chrome: avatar only (routes there are auth-gated).
   */
  variant?: "default" | "avatar";
  className?: string;
};

const avatarCls = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
  "border border-border bg-band text-[11.5px] font-medium tracking-[-0.01em] text-fg",
  "transition-colors duration-[180ms] ease-standard hover:border-fg",
);

/** Account control. Sign out lives on /profile. */
export function UserMenu({ variant = "default", className }: UserMenuProps) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <span
        className={cn(
          "inline-flex size-8 shrink-0 rounded-full border border-border bg-band",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (!session?.user) {
    if (variant === "avatar") return null;
    return (
      <Link
        href="/login"
        className={cn(
          "h-10 items-center rounded-full px-3.5 text-[14px] text-muted transition-colors duration-[180ms] hover:text-fg",
          className,
        )}
      >
        Sign in
      </Link>
    );
  }

  const initials = initialsFromUser(session.user.name, session.user.email);
  const label = session.user.name || session.user.email || "Profile";

  return (
    <Link
      href="/profile"
      className={cn(avatarCls, "mx-1", className)}
      aria-label={`Your tools, signed in as ${label}`}
      title={label}
    >
      <span className="select-none" aria-hidden>
        {initials}
      </span>
    </Link>
  );
}
