"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getPublicTool } from "@/lib/api/tools";

import { resolveRuntimeTarget } from "@/features/studio/lib/resolve-runtime-target";
import { asParams } from "@/features/studio/lib/version-metadata";

import styles from "../styles.module.css";
import { PublicToolShell } from "./public-tool-shell";

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
      <main className={styles.centerMsg}>
        <p style={{ opacity: 0.7, margin: 0 }}>Loading tool…</p>
      </main>
    );
  }

  if (q.isError || !q.data) {
    const msg =
      q.error instanceof Error ? q.error.message : "Could not load this tool.";
    const notFound =
      /404|not found/i.test(msg) || msg.includes("Get public tool failed (404)");

    return (
      <main className={styles.centerMsg}>
        <h1>{notFound ? "Tool not found" : "Could not open tool"}</h1>
        <p>
          {notFound
            ? "This link may be private, unpublished, or invalid. Ask the creator to make the tool public."
            : msg}
        </p>
        <Link href="/" className={styles.linkMuted}>
          Back to Vibeit
        </Link>
      </main>
    );
  }

  const tool = q.data;
  const code = tool.version?.code?.trim() ?? "";
  if (!code) {
    return (
      <main className={styles.centerMsg}>
        <h1>No runnable source</h1>
        <p>This published tool has no code to run.</p>
        <Link href="/" className={styles.linkMuted}>
          Back to Vibeit
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
