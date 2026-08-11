import Link from "next/link";

import { DEFAULT_STUDIO_FIXTURE_ID } from "@/features/studio/fixtures";

export default function StudioNotFound() {
  return (
    <main className="mx-auto max-w-[480px] p-8">
      <h1 className="mb-2 text-xl">Tool not found</h1>
      <p className="mb-4 leading-relaxed opacity-70">
        This Studio id is not a known fixture yet. Generated tools load here
        after M3.
      </p>
      <Link
        href={`/studio/${DEFAULT_STUDIO_FIXTURE_ID}`}
        className="underline"
      >
        Open social-frame fixture
      </Link>
    </main>
  );
}
