"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getTool } from "@/lib/api/tools";

import type { StudioFixtureMeta } from "../fixtures";
import { resolveRuntimeTarget } from "../lib/resolve-runtime-target";
import {
  asDraftAssets,
  asParams,
  parseVersionAssetSlots,
  parseVersionParamSchema,
  parseVersionPlanAspect,
} from "../lib/version-metadata";
import { StudioShell } from "./studio-shell";

/**
 * Load a generated tool from the API and open Studio shell.
 * Compiles version.code and mounts it in the sandbox (not the social-frame fixture).
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
  const versionCode = version?.code ?? null;

  // Empty-code early return lives in the loader — never mount StudioShell with
  // a generated tool and null sourceCode (that would fall back to default fixture).
  if (!versionCode?.trim()) {
    return (
      <main style={{ padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          No runnable source
        </h1>
        <p style={{ opacity: 0.7, marginBottom: "1rem", lineHeight: 1.5 }}>
          This tool has no version code yet, so the live preview cannot start.
          Create a new tool from vision, or open a completed generation.
        </p>
        <p style={{ opacity: 0.6, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {tool.title || tool.id}
        </p>
        <Link href="/create" style={{ textDecoration: "underline" }}>
          Back to Create
        </Link>
      </main>
    );
  }

  const versionParamSchema = parseVersionParamSchema(version?.paramSchema);
  const versionAssetSlots = parseVersionAssetSlots(version?.assetSlots);
  const versionDefaultParams = asParams(version?.defaultParams);
  const planAspect = parseVersionPlanAspect(version?.plan);

  const runtimeTarget = resolveRuntimeTarget(version?.target);

  const meta: StudioFixtureMeta = {
    toolId: tool.id,
    // Logging / mount toolId — not a fixture id; moduleSource carries the code.
    runtimeToolId: tool.id,
    label: tool.title || "Generated tool",
    description:
      tool.description ||
      "Created from your vision. Control + assets personalize the live preview; full source is below.",
    // B3: pass version.target so three (and p5) tools mount correctly
    target: runtimeTarget,
  };

  return (
    <StudioShell
      fixture={meta}
      sourceCode={versionCode}
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
      initialTitle={tool.title}
      initialDescription={tool.description}
      initialTags={tool.tags}
      initialGalleryReady={tool.galleryReady}
      initialThumbnailAssetId={tool.thumbnailAssetId}
      initialThumbnailUrl={tool.thumbnailUrl}
      planAspect={planAspect}
    />
  );
}
