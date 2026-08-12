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
  /** Chat / refine console. */
  chat: ReactNode;
  /** Center stage (preview or empty). */
  stage: ReactNode;
  /** Param controls; omit for create empty full-bleed stage. */
  controls?: ReactNode;
  /** Brand link href */
  brandHref?: string;
  /**
   * Column order when controls exist.
   * - `chat-left` (default Create): Chat | Stage | Controls
   * - `controls-left` (Studio): Controls | Stage | Chat
   */
  panelOrder?: "chat-left" | "controls-left";
};

const shellClass = cn(
  "grid h-dvh max-h-dvh overflow-hidden bg-stage text-ink",
  "grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(280px,320px)]",
  "grid-rows-[auto_minmax(0,1fr)]",
  "px-[0.65rem] pt-0 pb-[0.65rem]",
  "data-[controls=false]:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]",
  // Mobile: stage full width + bottom tabs; side panels become overlays
  "max-[1100px]:grid-cols-1",
  "max-[1100px]:grid-rows-[auto_minmax(0,1fr)_auto]",
  "max-[1100px]:[grid-template-areas:'header'_'stage'_'tabs']",
  "max-[1100px]:px-2 max-[1100px]:pb-2",
);

const headerClass = cn(
  "z-20 flex min-h-[3.25rem] items-center justify-between gap-4",
  "[grid-area:header] -mx-[0.65rem] border-b border-border",
  "bg-surface-elevated/95 px-4 py-2 backdrop-blur-[8px]",
);

const sidePanelClass = cn(
  "mt-[0.65rem] flex min-h-0 min-w-0 flex-col overflow-hidden",
  "rounded-2xl border border-border-subtle bg-surface-elevated shadow-elev",
  // Mobile overlay panels
  "max-[1100px]:fixed max-[1100px]:inset-x-2",
  "max-[1100px]:top-[calc(3.25rem+0.5rem)]",
  "max-[1100px]:bottom-[calc(3.25rem+0.5rem)]",
  "max-[1100px]:z-20 max-[1100px]:mt-0",
  "max-[1100px]:data-[mobile-hidden=true]:hidden",
);

const mobileTabClass = cn(
  "min-h-11 flex-1 cursor-pointer rounded-[10px] border-0 bg-transparent",
  "text-[0.82rem] font-semibold text-muted-ink [font:inherit]",
  "transition-[background-color,color] duration-ui ease-ui",
  "data-[active=true]:bg-ink/8",
  "data-[active=true]:text-ink",
  "motion-reduce:transition-none",
);

/**
 * Brickspace-class 3-column playground: Chat | Stage | Controls (or swapped).
 */
export function PlaygroundShell({
  title,
  headerMeta,
  headerActions,
  chat,
  stage,
  controls,
  brandHref = "/",
  panelOrder = "chat-left",
}: PlaygroundShellProps) {
  const hasControls = controls != null;
  const controlsLeft = hasControls && panelOrder === "controls-left";
  const [mobilePane, setMobilePane] = useState<"chat" | "stage" | "controls">(
    "stage",
  );

  const areas = !hasControls
    ? "'header header' 'chat stage'"
    : controlsLeft
      ? "'header header header' 'controls stage chat'"
      : "'header header header' 'chat stage controls'";

  return (
    <div
      className={shellClass}
      data-controls={hasControls ? "true" : "false"}
      style={{ gridTemplateAreas: areas }}
    >
      <header className={headerClass}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href={brandHref}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[10px] py-1 pr-1",
              "text-[0.95rem] font-[650] tracking-[-0.02em] text-ink",
              "transition-opacity duration-fast ease-snap hover:opacity-70",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <span
              className="inline-block size-[1.15rem] shrink-0 rounded-[3px] bg-primary"
              aria-hidden
            />
            Aiditr
          </Link>
          {title ? (
            <>
              <span
                className="h-4 w-px shrink-0 bg-border"
                aria-hidden
              />
              <span
                className="max-w-[28ch] truncate text-[0.88rem] font-medium tracking-[-0.015em] text-ink-secondary"
                title={title}
              >
                {title}
              </span>
            </>
          ) : null}
          {headerMeta ? (
            <div className="ml-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              {headerMeta}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {headerActions}
        </div>
      </header>

      <aside
        className={cn(
          sidePanelClass,
          controlsLeft ? "[grid-area:controls]" : "[grid-area:chat]",
        )}
        data-mobile-hidden={
          mobilePane !== (controlsLeft ? "controls" : "chat")
            ? "true"
            : "false"
        }
        aria-label={controlsLeft ? "Controls" : "Chat"}
      >
        {controlsLeft ? controls : chat}
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
          className={cn(
            sidePanelClass,
            "overflow-auto",
            controlsLeft ? "[grid-area:chat]" : "[grid-area:controls]",
          )}
          data-mobile-hidden={
            mobilePane !== (controlsLeft ? "chat" : "controls")
              ? "true"
              : "false"
          }
          aria-label={controlsLeft ? "Chat" : "Controls"}
        >
          {controlsLeft ? chat : controls}
        </aside>
      ) : null}

      <div
        className={cn(
          "mt-2 hidden gap-[0.35rem] rounded-2xl border border-border-subtle",
          "bg-surface-elevated p-[0.4rem] shadow-elev",
          "[grid-area:tabs]",
          "max-[1100px]:flex",
        )}
        role="tablist"
        aria-label="Panels"
      >
        {(controlsLeft
          ? (["controls", "stage", "chat"] as const)
          : (["chat", "stage", "controls"] as const)
        )
          .filter((id) => id !== "controls" || hasControls)
          .map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={mobileTabClass}
              data-active={mobilePane === id}
              aria-selected={mobilePane === id}
              onClick={() => setMobilePane(id)}
            >
              {id === "chat"
                ? "Chat"
                : id === "stage"
                  ? "Preview"
                  : "Controls"}
            </button>
          ))}
      </div>
    </div>
  );
}

export { playgroundStyles };
