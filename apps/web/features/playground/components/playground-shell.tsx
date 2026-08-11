"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

import { playgroundStyles } from "../styles";

export type PlaygroundShellProps = {
  /** Center title next to brand (tool name or "Create"). */
  title?: string;
  /** Status chips next to title. */
  headerMeta?: ReactNode;
  /** Right-side actions (Export, Publish, user). */
  headerActions?: ReactNode;
  /** Left column content (usually chat console). */
  chat: ReactNode;
  /** Center stage (preview or empty). */
  stage: ReactNode;
  /** Right column; omit for create empty full-bleed stage. */
  controls?: ReactNode;
  /** Brand link href */
  brandHref?: string;
};

const shellClass = cn(
  "grid h-dvh max-h-dvh overflow-hidden bg-stage text-ink",
  "grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(280px,320px)]",
  "grid-rows-[auto_minmax(0,1fr)]",
  "[grid-template-areas:'header_header_header'_'chat_stage_controls']",
  "px-[0.65rem] pt-0 pb-[0.65rem]",
  "data-[controls=false]:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]",
  "data-[controls=false]:[grid-template-areas:'header_header'_'chat_stage']",
  // Mobile: stage full width + bottom tabs; side panels become overlays
  "max-[1100px]:grid-cols-1",
  "max-[1100px]:grid-rows-[auto_minmax(0,1fr)_auto]",
  "max-[1100px]:[grid-template-areas:'header'_'stage'_'tabs']",
  "max-[1100px]:px-2 max-[1100px]:pb-2",
);

const headerClass = cn(
  "z-10 flex min-h-[3.1rem] items-center justify-between gap-4",
  "[grid-area:header] -mx-[0.65rem] border-b border-border-subtle",
  "bg-surface-elevated px-4 py-2",
);

const sidePanelClass = cn(
  "mt-[0.65rem] flex min-h-0 min-w-0 flex-col overflow-hidden",
  "rounded-panel border border-border-subtle bg-surface-elevated shadow-panel",
  // Mobile overlay panels
  "max-[1100px]:fixed max-[1100px]:inset-x-2",
  "max-[1100px]:top-[calc(3.1rem+0.5rem)]",
  "max-[1100px]:bottom-[calc(3.25rem+0.5rem)]",
  "max-[1100px]:z-20 max-[1100px]:mt-0",
  "max-[1100px]:data-[mobile-hidden=true]:hidden",
);

const mobileTabClass = cn(
  "min-h-[2.4rem] flex-1 cursor-pointer rounded-[10px] border-0 bg-transparent",
  "text-[0.82rem] font-semibold text-muted-ink [font:inherit]",
  "transition-[background-color,color] duration-150",
  "data-[active=true]:bg-[color-mix(in_oklch,var(--ink)_8%,transparent)]",
  "data-[active=true]:text-ink",
  "motion-reduce:transition-none",
);

/**
 * Brickspace-class 3-column playground: Chat | Stage | Controls.
 */
export function PlaygroundShell({
  title,
  headerMeta,
  headerActions,
  chat,
  stage,
  controls,
  brandHref = "/",
}: PlaygroundShellProps) {
  const hasControls = controls != null;
  const [mobilePane, setMobilePane] = useState<"chat" | "stage" | "controls">(
    "stage",
  );

  return (
    <div className={shellClass} data-controls={hasControls ? "true" : "false"}>
      <header className={headerClass}>
        <div className="flex min-w-0 items-center gap-[0.55rem]">
          <Link
            href={brandHref}
            className="shrink-0 text-[0.95rem] font-[650] tracking-[-0.02em]"
          >
            Aiditr
          </Link>
          {title ? (
            <>
              <span
                className="h-4 w-px shrink-0 bg-border-subtle"
                aria-hidden
              />
              <span
                className="max-w-[28ch] truncate text-[0.9rem] font-[550] tracking-[-0.015em] opacity-[0.88]"
                title={title}
              >
                {title}
              </span>
            </>
          ) : null}
          {headerMeta}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-[0.55rem]">
          {headerActions}
        </div>
      </header>

      <aside
        className={cn(sidePanelClass, "[grid-area:chat]")}
        data-mobile-hidden={mobilePane !== "chat" ? "true" : "false"}
        aria-label="Chat"
      >
        {chat}
      </aside>

      <main
        className={cn(
          "relative mt-[0.65rem] flex min-h-0 min-w-0 flex-col bg-transparent",
          "[grid-area:stage]",
          "max-[1100px]:mt-2",
        )}
        aria-label="Preview"
      >
        {stage}
      </main>

      {hasControls ? (
        <aside
          className={cn(sidePanelClass, "[grid-area:controls] overflow-auto")}
          data-mobile-hidden={mobilePane !== "controls" ? "true" : "false"}
          aria-label="Controls"
        >
          {controls}
        </aside>
      ) : null}

      <div
        className={cn(
          "mt-2 hidden gap-[0.35rem] rounded-panel border-t border-border-subtle",
          "bg-surface-elevated p-[0.4rem] shadow-panel",
          "[grid-area:tabs]",
          "max-[1100px]:flex",
        )}
        role="tablist"
        aria-label="Panels"
      >
        <button
          type="button"
          role="tab"
          className={mobileTabClass}
          data-active={mobilePane === "chat"}
          aria-selected={mobilePane === "chat"}
          onClick={() => setMobilePane("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          className={mobileTabClass}
          data-active={mobilePane === "stage"}
          aria-selected={mobilePane === "stage"}
          onClick={() => setMobilePane("stage")}
        >
          Preview
        </button>
        {hasControls ? (
          <button
            type="button"
            role="tab"
            className={mobileTabClass}
            data-active={mobilePane === "controls"}
            aria-selected={mobilePane === "controls"}
            onClick={() => setMobilePane("controls")}
          >
            Controls
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { playgroundStyles };
