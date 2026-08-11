"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient, useSession } from "@/lib/auth-client";

const ease = "ease-[cubic-bezier(0.4,0,0.2,1)]";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <span className="text-sm text-muted-foreground">Loading…</span>;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
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

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
        {session.user.name || session.user.email}
      </span>
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
