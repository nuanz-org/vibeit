import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft } from "@/components/icons";
import { GalleryDetail } from "@/features/gallery/components/gallery-detail";
import { GalleryShell } from "@/features/gallery/components/gallery-shell";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  return {
    title: `Gallery · Aiditr`,
    description: `Published tool ${publicId}`,
  };
}

/**
 * M8e — gallery detail card → Open tool links to /t/:publicId (M7e).
 * No auth. Not matched by proxy (only /create and /studio are gated).
 */
export default async function GalleryDetailPage({ params }: PageProps) {
  const { publicId } = await params;
  const id = decodeURIComponent(publicId).trim();

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

  return <GalleryDetail publicId={id} />;
}
