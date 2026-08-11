import type { Metadata } from "next";

import { GalleryDetail } from "@/features/gallery/components/gallery-detail";

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
      <main className="mx-auto max-w-[420px] px-6 py-10">
        <h1 className="text-xl">Not found</h1>
        <p className="opacity-70">Missing public id.</p>
      </main>
    );
  }

  return <GalleryDetail publicId={id} />;
}
