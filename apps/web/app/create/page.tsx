import type { Metadata } from "next";
import Link from "next/link";

import { UserMenu } from "@/features/auth/components/user-menu";
import { CreateForm } from "@/features/create/components/create-form";
import { UploadAssetStub } from "@/features/create/components/upload-asset-stub";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create · Vibeit",
};

/**
 * Create is auth-gated. M3g: vision → job poll → Studio.
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
          Signed in as <strong>{session.user.email}</strong>. Describe a vision
          — we generate a canvas2d tool and open Studio when it is ready.
        </p>

        <div style={cardStyle}>
          <CreateForm />
        </div>

        <details style={{ marginTop: "1.5rem" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: 0.65,
              fontWeight: 500,
            }}
          >
            Platform debug (upload stub)
          </summary>
          <div style={{ ...cardStyle, marginTop: "1rem" }}>
            <p
              style={{
                fontSize: "0.9rem",
                lineHeight: 1.5,
                opacity: 0.85,
                marginTop: 0,
                marginBottom: "1rem",
              }}
            >
              Optional image upload (M1e). Studio assets can also be uploaded
              inside Studio.
            </p>
            <UploadAssetStub />
            <p style={{ fontSize: "0.85rem", opacity: 0.6, marginTop: "1rem" }}>
              Fixture Studio:{" "}
              <Link
                href="/studio/social-frame"
                style={{ textDecoration: "underline" }}
              >
                /studio/social-frame
              </Link>
            </p>
          </div>
        </details>
      </main>
    </div>
  );
}
