"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getTool } from "@/lib/api/tools";

import type { StudioFixtureMeta } from "../fixtures";
import { StudioShell } from "./studio-shell";

/**
 * Load a generated tool from the API and open Studio shell (M3g).
 * Preview still uses the sandboxed canvas2d host (social-frame harness);
 * generated source is shown in View source.
 */
export function StudioToolLoader({ toolId }: { toolId: string }) {
  const q = useQuery({
    queryKey: ["tools", toolId],
    queryFn: () => getTool(toolId),
  });

  if (q.isLoading) {
    return (
      <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
        <p style={{ opacity: 0.7 }}>Loading tool…</p>
      </main>
    );
  }

  if (q.isError || !q.data) {
    return (
      <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Tool not found
        </h1>
        <p style={{ opacity: 0.7, marginBottom: "1rem", lineHeight: 1.5 }}>
          {q.error instanceof Error
            ? q.error.message
            : "Could not load this tool."}
        </p>
        <Link href="/create" style={{ textDecoration: "underline" }}>
          Back to Create
        </Link>
      </main>
    );
  }

  const tool = q.data;
  const version = tool.latestVersion;
  const meta: StudioFixtureMeta = {
    toolId: tool.id,
    runtimeToolId: `generated:${tool.id}`,
    label: tool.title || "Generated tool",
    description:
      tool.description ||
      "Created from your vision. Preview uses the canvas2d sandbox host; full source is available below.",
    target: "canvas2d",
  };

  return (
    <StudioShell
      fixture={meta}
      sourceCode={version?.code ?? null}
      versionId={version?.id ?? null}
      publicId={tool.publicId}
      isGenerated
    />
  );
}
