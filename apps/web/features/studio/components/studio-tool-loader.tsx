"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowLeft } from "@/components/icons";

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
      <main className="workspace-grid grid min-h-dvh place-items-center p-6">
        <p
          className="t-label flex items-center gap-2 text-muted"
          role="status"
        >
          <span
            aria-hidden="true"
            className="live-dot size-1.5 rounded-full bg-accent-text"
          />
          Loading tool…
        </p>
      </main>
    );
  }

  if (q.isError || !q.data) {
    return (
      <StudioNotice title="Tool not found">
        <p className="mt-2 text-[15px] leading-[1.55] text-muted">
          {q.error instanceof Error
            ? q.error.message
            : "Could not load this tool."}
        </p>
      </StudioNotice>
    );
  }

  const tool = q.data;
  const version = tool.latestVersion;
  const versionCode = version?.code ?? null;

  // Empty-code early return lives in the loader — never mount StudioShell with
  // a generated tool and null sourceCode (that would fall back to default fixture).
  if (!versionCode?.trim()) {
    return (
      <StudioNotice title="No runnable source">
        <p className="mt-2 text-[15px] leading-[1.55] text-muted">
          This tool has no version code yet, so the live preview can’t start.
          Create a new tool from vision, or open a completed generation.
        </p>
        <p className="mt-4 truncate text-[13.5px] font-medium tracking-[-0.01em] text-fg">
          {tool.title || tool.id}
        </p>
      </StudioNotice>
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
      initialChatHistory={tool.chatHistory ?? null}
    />
  );
}

/** Full-screen Studio notice: workspace backdrop, one card, one way out. */
function StudioNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="workspace-grid grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-[480px] rounded-[12px] border border-border bg-surface p-6 md:p-8">
        <p className="t-label text-muted">Studio</p>
        <h1 className="t-h3 mt-3 text-fg">{title}</h1>
        {children}
        <Link href="/create" className="btn btn-primary btn-sm mt-6">
          <ArrowLeft size={14} />
          Back to Create
        </Link>
      </div>
    </main>
  );
}
