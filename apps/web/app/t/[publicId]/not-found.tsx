import Link from "next/link";

export default function PublicToolNotFound() {
  return (
    <main style={{ padding: "2.5rem 1.5rem", maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
        Tool not found
      </h1>
      <p style={{ opacity: 0.7, marginBottom: "1rem", lineHeight: 1.5 }}>
        This public link is invalid or the tool is not published.
      </p>
      <Link href="/" style={{ textDecoration: "underline", opacity: 0.75 }}>
        Back to Aiditr
      </Link>
    </main>
  );
}
