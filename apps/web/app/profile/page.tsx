import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { ProfileSignOut } from "@/features/auth/components/profile-sign-out";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile · Aiditr",
};

/**
 * Account home — name, email, sign out. Keeps playground chrome free of
 * identity clutter (avatar in tool header links here).
 */
export default async function ProfilePage() {
  const session = await requireSession("/profile");
  const name =
    (session.user as { name?: string | null }).name?.trim() || null;
  const email = session.user.email;

  const initials = (() => {
    const source = name || email || "?";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    if (source.includes("@")) return source.slice(0, 2).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-5 py-10 md:px-6 md:py-14">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div
              className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[1rem] font-semibold tracking-[-0.02em] text-ink outline outline-1 outline-black/10 dark:outline-white/10"
              aria-hidden
            >
              <span className="translate-y-[0.5px]">{initials}</span>
            </div>
            <div className="min-w-0">
              <h1 className="m-0 text-balance text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">
                {name || "Your account"}
              </h1>
              <p className="m-0 mt-1 truncate text-[0.9rem] text-muted-ink">
                {email}
              </p>
            </div>
          </div>

          <nav
            className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-surface-elevated p-1.5 shadow-elev"
            aria-label="Account"
          >
            <Link
              href="/create"
              className="rounded-[12px] px-3.5 py-3 text-[0.9rem] font-medium tracking-[-0.01em] text-ink transition-[background-color] duration-150 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Create tool
            </Link>
            <Link
              href="/gallery"
              className="rounded-[12px] px-3.5 py-3 text-[0.9rem] font-medium tracking-[-0.01em] text-ink transition-[background-color] duration-150 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Gallery
            </Link>
          </nav>

          <div className="flex flex-col gap-3">
            <ProfileSignOut />
          </div>
        </div>
      </main>
    </div>
  );
}
