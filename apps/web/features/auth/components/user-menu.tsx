"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <span style={{ fontSize: "0.875rem", opacity: 0.6 }}>Loading…</span>
    );
  }

  if (!session?.user) {
    return (
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <Link href="/login" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          Sign in
        </Link>
        <Link
          href="/signup"
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            padding: "0.4rem 0.75rem",
            borderRadius: 8,
            background: "var(--foreground)",
            color: "var(--background)",
          }}
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
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <span style={{ fontSize: "0.875rem", opacity: 0.75 }}>
        {session.user.name || session.user.email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        style={{
          font: "inherit",
          fontSize: "0.875rem",
          fontWeight: 500,
          background: "transparent",
          border: "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
          borderRadius: 8,
          padding: "0.35rem 0.65rem",
          cursor: "pointer",
          color: "var(--foreground)",
        }}
      >
        Sign out
      </button>
    </div>
  );
}