"use client";

import { useQuery } from "@tanstack/react-query";

import { getPublicTool } from "@/lib/api/tools";

import { resolveRuntimeTarget } from "@/features/studio/lib/resolve-runtime-target";
import { asParams } from "@/features/studio/lib/version-metadata";

import { PublicToolShell } from "./public-tool-shell";
import { PublicToolLoading, PublicToolMessage } from "./public-tool-state";

/**
 * Load published tool by publicId (M7e). No session cookies.
 */
export function PublicToolLoader({ publicId }: { publicId: string }) {
  const q = useQuery({
    queryKey: ["public-tools", publicId],
    queryFn: () => getPublicTool(publicId),
    retry: false,
  });

  if (q.isLoading) {
    return <PublicToolLoading label="Loading tool" />;
  }

  if (q.isError || !q.data) {
    const msg =
      q.error instanceof Error ? q.error.message : "Couldn’t load this tool.";
    const notFound =
      /404|not found/i.test(msg) || msg.includes("Get public tool failed (404)");

    return notFound ? (
      <PublicToolMessage
        eyebrow="404"
        title="Tool not found."
        body="This link may be private, unpublished or invalid. Ask the creator to make the tool public."
      />
    ) : (
      <PublicToolMessage eyebrow="Error" title="Couldn’t open this tool." body={msg} />
    );
  }

  const tool = q.data;
  const code = tool.version?.code?.trim() ?? "";
  if (!code) {
    return (
      <PublicToolMessage
        eyebrow="Unavailable"
        title="No runnable source."
        body="This published tool has no code to run."
      />
    );
  }

  const defaultParams = asParams(tool.version.defaultParams);
  const target = resolveRuntimeTarget(tool.version.target);

  return (
    <PublicToolShell
      publicId={tool.publicId}
      title={tool.title}
      description={tool.description}
      target={target}
      defaultParams={defaultParams}
      sourceCode={code}
    />
  );
}
