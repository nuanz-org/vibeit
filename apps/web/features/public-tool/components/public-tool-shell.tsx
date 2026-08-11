"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { TargetId, ToolParams } from "@repo/contracts";

import {
  fitStageBox,
  parseAspectFromSource,
  sizeFromAspect,
} from "@/features/studio/lib/stage-size";
import { cn } from "@/lib/utils";
import { RuntimeHost } from "@/runtime";

import { usePublicToolRuntime } from "../hooks/use-public-tool-runtime";

export type PublicToolShellProps = {
  publicId: string;
  title?: string | null;
  description?: string | null;
  /** B3: published version target for mount. */
  target?: TargetId | string | null;
  defaultParams?: ToolParams | null;
  /** C6: version source used only to seed preview aspect (not shown). */
  sourceCode?: string | null;
};

/**
 * M7e — interactive public tool (no auth, no Control, no source download).
 */
export function PublicToolShell({
  publicId,
  title,
  description,
  target,
  defaultParams,
  sourceCode,
}: PublicToolShellProps) {
  const runtime = usePublicToolRuntime({
    publicId,
    runtimeToolId: `public:${publicId}`,
    target,
    defaultParams,
  });

  const frameStyle = useMemo(() => {
    const aspect = parseAspectFromSource(sourceCode) ?? "1:1";
    const size = sizeFromAspect(aspect);
    // Contain into a generous public stage box
    const fitted = fitStageBox(size.width, size.height, 720, 640);
    return {
      width: fitted.displayW,
      height: fitted.displayH,
      aspectRatio: "unset" as const,
      maxWidth: "100%",
      maxHeight: "min(70vh, 720px)",
    };
  }, [sourceCode]);

  const statusReady = runtime.status === "ready" || runtime.mounted;
  const statusError = runtime.status === "error";

  const label = title?.trim() || "Shared tool";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight text-inherit hover:opacity-80">
            Aiditr
          </Link>
          <span className="rounded-full bg-foreground/8 px-2.5 py-0.5 text-xs font-semibold">
            Public
          </span>
          <span
            className="max-w-[min(40vw,280px)] truncate text-[0.95rem] font-semibold tracking-tight"
            title={label}
          >
            {label}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              statusReady && "bg-[#15803d]/14 text-[#15803d]",
              statusError && "bg-[#b91c1c]/14 text-[#b91c1c]",
              !statusReady && !statusError && "bg-[#a16207]/14 text-[#a16207]",
            )}
          >
            {runtime.mounted
              ? "live"
              : runtime.busy
                ? "loading"
                : runtime.status === "ready"
                  ? "ready"
                  : runtime.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/gallery" className="text-[0.8rem] text-inherit underline opacity-65">
            Gallery
          </Link>
          <Link href="/create" className="text-[0.8rem] text-inherit underline opacity-65">
            Create your own
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4 pb-6">
        {description?.trim() ? (
          <p className="m-0 max-w-xl text-sm leading-snug opacity-65">
            {description.trim()}
          </p>
        ) : (
          <p className="m-0 text-[0.8rem] opacity-55">
            Interactive preview · view only (no Studio controls on this page)
          </p>
        )}

        {runtime.error ? (
          <div
            className="rounded-[10px] border border-[#b91c1c]/35 bg-[#b91c1c]/10 px-4 py-3 text-sm leading-snug text-[#b91c1c]"
            role="alert"
          >
            {runtime.error}
          </div>
        ) : null}

        <div className="flex min-h-[min(70vh,720px)] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
          <div
            className="max-h-[min(70vh,720px)] max-w-full overflow-hidden rounded-xl bg-[#0a0a0a] shadow-[0_12px_40px_color-mix(in_srgb,#000_18%,transparent)] [&_iframe]:block [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
            style={frameStyle}
          >
            <RuntimeHost
              ref={runtime.hostRef}
              onReady={(msg) => {
                void runtime.onReady(msg);
              }}
              onStatusChange={runtime.onStatusChange}
              onBridgeError={runtime.onBridgeError}
            />
          </div>
        </div>

        <p className="m-0 text-[0.8rem] opacity-55">
          publicId <code>{publicId}</code>
        </p>
      </div>
    </div>
  );
}
