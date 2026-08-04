import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioShell } from "@/features/studio/components/studio-shell";
import { StudioToolLoader } from "@/features/studio/components/studio-tool-loader";
import { resolveStudioFixture } from "@/features/studio/fixtures";
import { requireSession } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ toolId: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { toolId } = await params;
  const fixture = resolveStudioFixture(toolId);
  if (fixture) {
    return { title: `${fixture.label} · Studio · Vibeit` };
  }
  return { title: "Studio · Vibeit" };
}

/**
 * Studio for fixture slug or generated tool UUID (M3g).
 */
export default async function StudioToolPage({ params }: PageProps) {
  const { toolId } = await params;
  await requireSession(`/studio/${toolId}`);

  const fixture = resolveStudioFixture(toolId);
  if (fixture) {
    return <StudioShell fixture={fixture} />;
  }

  if (UUID_RE.test(toolId)) {
    return <StudioToolLoader toolId={toolId} />;
  }

  notFound();
}
