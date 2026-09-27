import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft } from "@/components/icons";
import { GalleryShell } from "@/features/gallery/components/gallery-shell";
import { RemixLoader } from "@/features/remix/components/remix-loader";
import { requireSession } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  return {
    title: "Remix · Aiditr",
    description: `Remix published tool ${publicId} in Studio`,
  };
}

/**
 * Fork-on-open: auth gate, then clone the published tool and land in Studio.
 */
export default async function RemixPage({ params }: PageProps) {
  const { publicId } = await params;
  const id = decodeURIComponent(publicId).trim();
  await requireSession(id ? `/remix/${id}` : "/remix");

  if (!id) {
    return (
      <GalleryShell>
        <main className="wrap flex-1 py-16 md:py-24">
          <p className="t-label text-muted">404</p>
          <h1 className="t-h2 mt-5">Not found.</h1>
          <p className="mt-5 max-w-[34rem] text-[15px] leading-[1.55] text-muted">
            This link is missing its public ID.
          </p>
          <Link href="/gallery" className="btn btn-outline mt-8">
            <ArrowLeft />
            Back to gallery
          </Link>
        </main>
      </GalleryShell>
    );
  }

  return <RemixLoader publicId={id} />;
}
