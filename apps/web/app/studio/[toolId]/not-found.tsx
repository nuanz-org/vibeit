import Link from "next/link";

import { DEFAULT_STUDIO_FIXTURE_ID } from "@/features/studio/fixtures";

export default function StudioNotFound() {
  return (
    <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
        Tool not found
      </h1>
      <p style={{ opacity: 0.7, marginBottom: "1rem", lineHeight: 1.5 }}>
        This Studio id is not a known fixture yet. Generated tools load here
        after M3.
      </p>
      <Link
        href={`/studio/${DEFAULT_STUDIO_FIXTURE_ID}`}
        style={{ textDecoration: "underline" }}
      >
        Open social-frame fixture
      </Link>
    </main>
  );
}
