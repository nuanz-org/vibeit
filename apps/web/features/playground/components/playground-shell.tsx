"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

import { playgroundStyles, surfaceEdge } from "../styles";

export type PlaygroundShellProps = {
  /** Center title next to brand (tool name or "Create"). */
  title?: string;
  /**
   * When set, shows a quiet edit control next to the title
   * (Brickspace: name + pencil → metadata / cover).
   */
  onEditTitle?: () => void;
  /** Accessible label for the edit control. */
  editTitleLabel?: string;
  /** Status chips next to title (prefer empty in studio — keep chrome quiet). */
  headerMeta?: ReactNode;
  /** Right-side actions (Export, avatar). */
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

/**
 * Brickspace-class floating shell:
 * nav touches the top; L/R/B gutters float panels on the stage.
 */
const shellClass = cn(
  "grid h-dvh max-h-dvh overflow-hidden bg-stage text-ink",
  "grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(280px,320px)]",
  "grid-rows-[auto_minmax(0,1fr)]",
  // No top gutter — nav bar flushes to top; L/R/B stage shows through
  "px-3 pb-3 pt-0",
  // Between columns + under header
  "gap-x-3 gap-y-3",
  "data-[controls=false]:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]",
  // Mobile: stage full width + bottom tabs; side panels become overlays
  "max-[1100px]:grid-cols-1",
  "max-[1100px]:grid-rows-[auto_minmax(0,1fr)_auto]",
  "max-[1100px]:[grid-template-areas:'header'_'stage'_'tabs']",
  "max-[1100px]:gap-2 max-[1100px]:px-2 max-[1100px]:pb-2 max-[1100px]:pt-0",
);

const headerClass = cn(
  "z-20 flex min-h-[3.25rem] items-center justify-between gap-4",
  // Flush top; L/R align with shell gutters (spans all columns)
  "[grid-area:header]",
  // Square top corners against the viewport; soft radius only on bottom
  "rounded-b-[10px] bg-surface-elevated px-4 py-2",
  surfaceEdge,
);

const sidePanelClass = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden",
  "rounded-[10px] bg-surface-elevated",
  surfaceEdge,
  // Mobile overlay panels — inset matches shell gutter
  "max-[1100px]:fixed max-[1100px]:inset-x-2",
  "max-[1100px]:top-[calc(3.25rem+0.5rem)]",
  "max-[1100px]:bottom-[calc(0.5rem+3.25rem+0.5rem)]",
  "max-[1100px]:z-20",
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

function EditTitleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.2 2.35a1.35 1.35 0 0 1 1.91 1.91L5.4 12 2.5 12.75l.75-2.9 7.95-7.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9.85 3.7 11.55 5.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Header label: first two words + ellipsis (full title stays in `title` tooltip). */
function headerTitleLabel(title: string, wordLimit = 2): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= wordLimit) return words.join(" ");
  return `${words.slice(0, wordLimit).join(" ")}…`;
}

/**
 * Brickspace-class 3-column playground: Chat | Stage | Controls (or swapped).
 * Header stays sparse: logo + name (+ edit) | primary actions + avatar.
 */
export function PlaygroundShell({
  title,
  onEditTitle,
  editTitleLabel = "Edit tool details",
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
        {/* Content-sized left cluster — title+edit stay tight (never stretch to center) */}
        <div className="flex min-w-0 shrink items-center gap-1.5">
          <Link
            href={brandHref}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]",
              "transition-opacity duration-fast ease-snap hover:opacity-70",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "active:scale-[0.96] motion-reduce:active:scale-100",
            )}
            aria-label="Aiditr home"
          >
            <span
              className="inline-block size-[1.15rem] shrink-0 rounded-[3px] bg-primary"
              aria-hidden
            />
          </Link>
          {title ? (
            <div className="inline-flex min-w-0 max-w-full items-center gap-0">
              <span
                className="min-w-0 whitespace-nowrap text-[0.95rem] font-medium tracking-[-0.02em] text-ink"
                title={title}
              >
                {headerTitleLabel(title)}
              </span>
              {onEditTitle ? (
                <button
                  type="button"
                  onClick={onEditTitle}
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-[9px]",
                    "text-muted-ink",
                    "transition-[background-color,color,transform] duration-ui ease-ui",
                    "hover:bg-ink/6 hover:text-ink",
                    "active:scale-[0.96]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    "motion-reduce:transition-none motion-reduce:active:scale-100",
                  )}
                  aria-label={editTitleLabel}
                  title={editTitleLabel}
                >
                  {/* Optical nudge: pencil tip reads slightly high when pure-centered */}
                  <span className="translate-y-px">
                    <EditTitleIcon />
                  </span>
                </button>
              ) : null}
            </div>
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
          "relative flex min-h-0 min-w-0 flex-col bg-transparent",
          "[grid-area:stage]",
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
          "hidden gap-[0.35rem] rounded-[10px]",
          "bg-surface-elevated p-[0.4rem]",
          surfaceEdge,
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
