import Link from "next/link";

export default function PublicToolNotFound() {
  return (
    <main className="mx-auto max-w-[420px] px-6 py-10">
      <h1 className="mb-2 text-xl">Tool not found</h1>
      <p className="mb-4 leading-relaxed opacity-70">
        This public link is invalid or the tool is not published.
      </p>
      <Link href="/" className="underline opacity-75">
        Back to Aiditr
      </Link>
    </main>
  );
}
