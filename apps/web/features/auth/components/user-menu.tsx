"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <span className="text-sm opacity-60">Loading…</span>;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-[0.9rem] font-medium">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-foreground px-3 py-1.5 text-[0.9rem] font-semibold text-background"
        >
          Sign up
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

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm opacity-75">
        {session.user.name || session.user.email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="cursor-pointer rounded-lg border border-foreground/18 bg-transparent px-2.5 py-1.5 text-sm font-medium text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
