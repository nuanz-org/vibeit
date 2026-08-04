"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getTool } from "@/lib/api/tools";

import type { StudioFixtureMeta } from "../fixtures";
import {
  asDraftAssets,
  asParams,
  parseVersionAssetSlots,
  parseVersionParamSchema,
} from "../lib/version-metadata";
import { StudioShell } from "./studio-shell";

/**
 * Load a generated tool from the API and open Studio shell (M3g + M5d + M5e).
 * Control prefers version paramSchema / assetSlots from API.
 * Preview may still use the canvas2d fixture harness (M3g limitation);
 * personalization + source + draft persist satisfy the M5 product bar.
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
  const versionParamSchema = parseVersionParamSchema(version?.paramSchema);
  const versionAssetSlots = parseVersionAssetSlots(version?.assetSlots);
  const versionDefaultParams = asParams(version?.defaultParams);

  const meta: StudioFixtureMeta = {
    toolId: tool.id,
    // Preview host still mounts canvas2d fixture harness for generated tools.
    runtimeToolId: "fixture:social-frame",
    label: tool.title || "Generated tool",
    description:
      tool.description ||
      "Created from your vision. Control + assets personalize the live preview; full source is below.",
    target: "canvas2d",
  };

  return (
    <StudioShell
      fixture={meta}
      sourceCode={version?.code ?? null}
      versionId={version?.id ?? null}
      publicId={tool.publicId}
      toolStatus={tool.status}
      isGenerated
      persistToolId={tool.id}
      versionDefaultParams={versionDefaultParams}
      versionParamSchema={versionParamSchema}
      versionAssetSlots={versionAssetSlots}
      initialDraftParams={asParams(tool.draftParams)}
      initialDraftAssets={asDraftAssets(tool.draftAssets)}
      previewHarnessNote
    />
  );
}
