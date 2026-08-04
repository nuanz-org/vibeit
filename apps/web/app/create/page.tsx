import type { Metadata } from "next";
import Link from "next/link";

import { UserMenu } from "@/features/auth/components/user-menu";
import { CreateJobStub } from "@/features/create/components/create-job-stub";
import { UploadAssetStub } from "@/features/create/components/upload-asset-stub";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create · Vibeit",
};

/**
 * Create is auth-gated (M1 product rule).
 * M1a: stub create-job · M1e: upload proof.
 * Full Create UI lands in M3.
 */
export default async function CreatePage() {
  const session = await requireSession("/create");

  const cardStyle = {
    padding: "1.25rem",
    borderRadius: 12,
    border:
      "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
    marginBottom: "1.25rem",
  } as const;

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
          generation ships in M3; upload + job stubs prove the platform path.
        </p>

        <div style={cardStyle}>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.5,
              opacity: 0.85,
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            <strong>M1e</strong> — upload inspiration/studio image (session
            cookie + multipart). Preview uses CORS-safe raw URL.
          </p>
          <UploadAssetStub />
        </div>

        <div style={cardStyle}>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.5,
              opacity: 0.85,
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            <strong>M1a</strong> — start a stub create job (no worker yet).
          </p>
          <CreateJobStub />
        </div>
      </main>
    </div>
  );
}