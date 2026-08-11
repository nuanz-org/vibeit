import type { Metadata } from "next";

import { PublicToolLoader } from "@/features/public-tool/components/public-tool-loader";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  return {
    title: `Shared tool · Aiditr`,
    description: `Interactive Aiditr tool ${publicId}`,
    robots: { index: false, follow: false },
  };
}

/**
 * M7e — public interactive tool page.
 * No auth required. Draft / unknown publicId → friendly not-found from loader.
 * Not matched by apps/web/proxy.ts (only /create and /studio are gated).
 */
export default async function PublicToolPage({ params }: PageProps) {
  const { publicId } = await params;
  const id = decodeURIComponent(publicId).trim();

  if (!id) {
    return (
      <main className="mx-auto max-w-[420px] px-6 py-10">
        <h1 className="text-xl">Tool not found</h1>
        <p className="opacity-70">Missing public id.</p>
      </main>
    );
  }

  return <PublicToolLoader publicId={id} />;
}
