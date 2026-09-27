"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";

import type { TargetId, ToolParams } from "@repo/contracts";

import { Alert, Remix } from "@/components/icons";
import { displayTitle } from "@/features/gallery/lib/display-title";
import {
  parseAspectFromSource,
  sizeFromAspect,
} from "@/features/studio/lib/stage-size";
import { cn } from "@/lib/utils";
import { RuntimeHost } from "@/runtime";

import { usePublicToolRuntime } from "../hooks/use-public-tool-runtime";
import { PublicToolBar } from "./public-tool-state";

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
 * A view-only mirror of the Studio panel (design-language §3.17): top bar,
 * dot-grid workspace with the framed canvas, 248px side column.
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

  const stage = useMemo(() => {
    const aspect = parseAspectFromSource(sourceCode) ?? "1:1";
    const size = sizeFromAspect(aspect);
    return { aspect, width: size.width, height: size.height };
  }, [sourceCode]);

  const statusReady = runtime.status === "ready" || runtime.mounted;
  const statusError = runtime.status === "error";
  const working = !statusError && (runtime.mounted || runtime.busy || !statusReady);

  // Same cleaned, sentence-case name the gallery shows.
  const label = title?.trim() ? displayTitle(title) : "Shared tool";

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <PublicToolBar>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
        <span
          className="min-w-0 truncate text-[13.5px] font-medium tracking-[-0.01em]"
          title={label}
        >
          {label}
        </span>
        <span
          className={cn(
            "t-label hidden h-5 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-[10px] xs:inline-flex",
            statusError ? "text-fg" : "text-muted",
          )}
        >
          {statusError ? (
            <Alert size={11} />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full bg-accent-text",
                working && "live-dot",
              )}
            />
          )}
          {runtime.mounted
            ? "live"
            : runtime.busy
              ? "loading"
              : runtime.status === "ready"
                ? "ready"
                : runtime.status}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/gallery"
            className="hidden h-9 items-center rounded-full px-3 text-[13px] text-muted transition-colors duration-[180ms] ease-standard hover:bg-band hover:text-fg md:inline-flex"
          >
            Gallery
          </Link>
          <Link
            href={`/remix/${encodeURIComponent(publicId)}`}
            className="btn btn-outline btn-sm"
          >
            <Remix size={14} />
            <span>
              Remix<span className="hidden md:inline"> in Studio</span>
            </span>
          </Link>
          <Link href="/create" className="btn btn-primary btn-sm">
            <span>
              Create<span className="hidden sm:inline"> your own</span>
            </span>
          </Link>
        </div>
      </PublicToolBar>

      <div className="grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_248px]">
        <div className="workspace-grid relative h-[420px] sm:h-[520px] md:h-auto md:min-h-[480px]">
          <div className="t-label absolute top-3.5 left-4 flex items-center gap-1.5 text-muted">
            <span>{stage.aspect}</span>
            <span aria-hidden="true">·</span>
            <span>
              {stage.width} × {stage.height}
            </span>
          </div>

          <div className="frame-host absolute inset-x-5 top-10 bottom-14 sm:inset-x-8">
            <div
              className="frame frame-marks bg-surface shadow-frame"
              style={{ "--ar": stage.width / stage.height } as CSSProperties}
            >
              <RuntimeHost
                ref={runtime.hostRef}
                onReady={(msg) => {
                  void runtime.onReady(msg);
                }}
                onStatusChange={runtime.onStatusChange}
                onBridgeError={runtime.onBridgeError}
              />
              <span className="mark-b" aria-hidden="true" />
            </div>
          </div>

          {runtime.error ? (
            <div className="absolute inset-x-4 bottom-3 flex justify-center">
              <p
                role="alert"
                className="flex max-h-28 max-w-[40rem] items-start gap-2 overflow-y-auto rounded-[10px] border border-border bg-surface px-3 py-2 text-[12.5px] leading-snug text-fg"
              >
                <Alert size={14} className="mt-px shrink-0" />
                <span className="min-w-0 break-words">{runtime.error}</span>
              </p>
            </div>
          ) : null}
        </div>

        <aside className="border-t border-border bg-surface md:border-t-0 md:border-l">
          <div className="flex flex-col gap-6 p-4">
            <div className="flex flex-col gap-2">
              <h2 className="t-label text-muted">About</h2>
              {description?.trim() ? (
                <p className="text-[13.5px] leading-[1.45] text-fg">
                  {description.trim()}
                </p>
              ) : (
                <p className="text-[13.5px] leading-[1.45] text-muted">
                  Interactive preview · view only. There are no Studio controls on
                  this page.
                </p>
              )}
            </div>

            <div>
              <h2 className="t-label text-muted">Details</h2>
              <dl className="mt-2 border-t border-border">
                <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 last:border-0">
                  <dt className="shrink-0 text-[12.5px] text-muted">Public ID</dt>
                  <dd className="t-mono min-w-0 truncate text-[11.5px] text-fg" title={publicId}>
                    {publicId}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
