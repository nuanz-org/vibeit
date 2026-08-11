"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getPublicTool } from "@/lib/api/tools";

import { resolveRuntimeTarget } from "@/features/studio/lib/resolve-runtime-target";
import { asParams } from "@/features/studio/lib/version-metadata";

import { PublicToolShell } from "./public-tool-shell";

const centerMsg = "mx-auto max-w-md px-6 py-10 text-left";
const centerHeading = "mb-2 text-xl tracking-tight";
const centerBody = "mb-4 leading-relaxed opacity-70";
const linkMuted = "text-[0.8rem] text-inherit underline opacity-65";

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
    return (
      <main className={centerMsg}>
        <p className="m-0 opacity-70">Loading tool…</p>
      </main>
    );
  }

  if (q.isError || !q.data) {
    const msg =
      q.error instanceof Error ? q.error.message : "Could not load this tool.";
    const notFound =
      /404|not found/i.test(msg) || msg.includes("Get public tool failed (404)");

    return (
      <main className={centerMsg}>
        <h1 className={centerHeading}>
          {notFound ? "Tool not found" : "Could not open tool"}
        </h1>
        <p className={centerBody}>
          {notFound
            ? "This link may be private, unpublished, or invalid. Ask the creator to make the tool public."
            : msg}
        </p>
        <Link href="/" className={linkMuted}>
          Back to Aiditr
        </Link>
      </main>
    );
  }

  const tool = q.data;
  const code = tool.version?.code?.trim() ?? "";
  if (!code) {
    return (
      <main className={centerMsg}>
        <h1 className={centerHeading}>No runnable source</h1>
        <p className={centerBody}>This published tool has no code to run.</p>
        <Link href="/" className={linkMuted}>
          Back to Aiditr
        </Link>
      </main>
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
