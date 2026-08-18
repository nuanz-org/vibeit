"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const ease = "ease-[cubic-bezier(0.4,0,0.2,1)]";

function initialsFromUser(name?: string | null, email?: string | null): string {
  const source = (name?.trim() || email?.trim() || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (source.includes("@")) {
    return source.slice(0, 2).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export type UserMenuProps = {
  /**
   * `default` — marketing chrome: name + Sign out.
   * `avatar` — playground chrome: circular icon → /profile (Brickspace-clean).
   */
  variant?: "default" | "avatar";
  className?: string;
};

export function UserMenu({ variant = "default", className }: UserMenuProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    if (variant === "avatar") {
      return (
        <span
          className={cn(
            "inline-flex size-9 shrink-0 animate-pulse rounded-full bg-ink/8",
            className,
          )}
          aria-hidden
        />
      );
    }
    return <span className="text-sm text-muted-foreground">Loading…</span>;
  }

  if (!session?.user) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Link
          href="/login"
          className="text-[15px] font-medium tracking-[-0.01em] transition-opacity duration-150 hover:opacity-60"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className={`inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors duration-150 ${ease} hover:bg-base-blue-hover`}
        >
          Get Started
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  }

  if (variant === "avatar") {
    const initials = initialsFromUser(session.user.name, session.user.email);
    const label = session.user.name || session.user.email || "Profile";

    return (
      <Link
        href="/profile"
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          "bg-ink/8 text-[0.72rem] font-semibold tracking-[-0.02em] text-ink",
          "outline outline-1 outline-black/10 dark:outline-white/10",
          "transition-[transform,background-color,opacity] duration-150",
          "hover:bg-ink/12 hover:opacity-95",
          "active:scale-[0.96]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "motion-reduce:transition-none motion-reduce:active:scale-100",
          className,
        )}
        aria-label={`Profile — ${label}`}
        title={label}
      >
        <span className="translate-y-[0.5px] select-none" aria-hidden>
          {initials}
        </span>
      </Link>
    );
  }

  const initials = initialsFromUser(session.user.name, session.user.email);
  const label = session.user.name || session.user.email || "Profile";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href="/profile"
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-full pr-1",
          "text-sm text-muted-foreground",
          "transition-opacity duration-150 hover:opacity-70",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        aria-label={`Profile — ${label}`}
        title={label}
      >
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[0.68rem] font-semibold tracking-[-0.02em] text-ink outline outline-1 outline-black/10 dark:outline-white/10"
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">
          {label}
        </span>
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        className={`cursor-pointer rounded-full border border-border bg-transparent px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors duration-150 ${ease} hover:bg-[#F8F8F8] dark:hover:bg-secondary`}
      >
        Sign out
      </button>
    </div>
  );
}
