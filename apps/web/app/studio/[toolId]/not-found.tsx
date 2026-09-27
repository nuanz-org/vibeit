import Link from "next/link";

import { ArrowRight } from "@/components/icons";
import { DEFAULT_STUDIO_FIXTURE_ID } from "@/features/studio/fixtures";

export default function StudioNotFound() {
  return (
    <main className="workspace-grid grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-[480px] rounded-[12px] border border-border bg-surface p-6 md:p-8">
        <p className="t-label text-muted">Studio</p>
        <h1 className="t-h3 mt-3 text-fg">Tool not found</h1>
        <p className="mt-2 text-[15px] leading-[1.55] text-muted">
          This Studio id is not a known fixture yet. Generated tools load here
          after M3.
        </p>
        <Link
          href={`/studio/${DEFAULT_STUDIO_FIXTURE_ID}`}
          className="btn btn-primary btn-sm mt-6"
        >
          Open social-frame fixture
          <ArrowRight size={14} className="btn-arrow" />
        </Link>
      </div>
    </main>
  );
}
