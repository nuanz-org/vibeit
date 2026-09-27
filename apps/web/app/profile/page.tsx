import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { ProfileWorkbench } from "@/features/profile/components/profile-workbench";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile · Aiditr",
};

/**
 * Private workbench — identity + tools this user created or remixed.
 * Avatar / name in chrome link here.
 */
export default async function ProfilePage() {
  const session = await requireSession("/profile");
  const name =
    (session.user as { name?: string | null }).name?.trim() || null;
  const email = session.user.email;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppHeader />
      <Suspense
        fallback={
          <div className="wrap pt-10 pb-20 md:pt-14" aria-busy="true">
            <p className="t-label flex items-center gap-2 text-muted">
              <span
                className="live-dot size-1.5 rounded-full bg-accent-text"
                aria-hidden="true"
              />
              Loading
            </p>
            <div className="mt-5 h-12 w-64 max-w-full rounded-[8px] bg-band" />
            <div className="mt-14 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-[10px] border border-border bg-band"
                />
              ))}
            </div>
          </div>
        }
      >
        <ProfileWorkbench name={name} email={email} />
      </Suspense>
    </div>
  );
}
