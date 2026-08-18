import type { Metadata } from "next";

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
      <main className="mx-auto max-w-[420px] px-6 py-10">
        <h1 className="text-xl">Not found</h1>
        <p className="opacity-70">Missing public id.</p>
      </main>
    );
  }

  return <RemixLoader publicId={id} />;
}
