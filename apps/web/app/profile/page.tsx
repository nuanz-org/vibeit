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
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[1120px] px-5 py-10 md:px-6 md:py-12">
            <div className="h-14 w-56 animate-pulse rounded-full bg-ink/8" />
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] animate-pulse rounded-2xl bg-ink/8"
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
