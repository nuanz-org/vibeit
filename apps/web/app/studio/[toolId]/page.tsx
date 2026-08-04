import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioShell } from "@/features/studio/components/studio-shell";
import { resolveStudioFixture } from "@/features/studio/fixtures";
import { requireSession } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ toolId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { toolId } = await params;
  const fixture = resolveStudioFixture(toolId);
  return {
    title: fixture ? `${fixture.label} · Studio · Vibeit` : "Studio · Vibeit",
  };
}

/**
 * Studio for a tool id (M2a5 fixture mode).
 * Known fixtures only until M3 loads versions from the API.
 */
export default async function StudioToolPage({ params }: PageProps) {
  const { toolId } = await params;
  await requireSession(`/studio/${toolId}`);

  const fixture = resolveStudioFixture(toolId);
  if (!fixture) {
    notFound();
  }

  return <StudioShell fixture={fixture} />;
}
