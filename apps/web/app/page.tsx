import Link from "next/link";

import { UserMenu } from "@/features/auth/components/user-menu";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderBottom:
            "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>
            Aiditr
          </span>
          <Link
            href="/gallery"
            style={{ fontSize: "0.9rem", fontWeight: 500, opacity: 0.75 }}
          >
            Gallery
          </Link>
        </div>
        <UserMenu />
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            letterSpacing: "-0.04em",
            maxWidth: 640,
            lineHeight: 1.15,
          }}
        >
          Turn a vision into a living design tool
        </h1>
        <p
          style={{
            maxWidth: 480,
            lineHeight: 1.55,
            opacity: 0.7,
            fontSize: "1.05rem",
          }}
        >
          Describe what you want to make. Aiditr generates a freeform interactive
          tool you can control, export, share, and publish.
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/create"
            style={{
              padding: "0.7rem 1.15rem",
              borderRadius: 10,
              background: "var(--foreground)",
              color: "var(--background)",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            Start creating
          </Link>
          <Link
            href="/gallery"
            style={{
              padding: "0.7rem 1.15rem",
              borderRadius: 10,
              border:
                "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Browse gallery
          </Link>
          <Link
            href="/login"
            style={{
              padding: "0.7rem 1.15rem",
              borderRadius: 10,
              border:
                "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}