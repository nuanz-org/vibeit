import type { Metadata } from "next";
import Link from "next/link";

import { UserMenu } from "@/features/auth/components/user-menu";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create · Vibeit",
};

/**
 * Create is auth-gated (M1 product rule).
 * Full Create UI lands in later milestones; this proves the gate works.
 */
export default async function CreatePage() {
  const session = await requireSession("/create");

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <Link href="/" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
          Vibeit
        </Link>
        <UserMenu />
      </header>

      <main>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Create</h1>
        <p style={{ opacity: 0.7, marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Signed in as <strong>{session.user.email}</strong>. Vision → tool
          generation UI ships in later milestones; auth gating is active now.
        </p>
        <div
          style={{
            padding: "1.25rem",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
          }}
        >
          <p style={{ fontSize: "0.95rem", lineHeight: 1.5, opacity: 0.85 }}>
            Placeholder Create surface. Next: upload inspiration images and start
            a generation job (M3+).
          </p>
        </div>
      </main>
    </div>
  );
}