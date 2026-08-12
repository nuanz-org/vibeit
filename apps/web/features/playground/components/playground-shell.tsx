"use client";

import Link from "next/link";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

import { playgroundStyles, surfaceEdge } from "../styles";

const CHAT_COLLAPSED_KEY = "aiditr.playground.chatCollapsed";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — chat panel open / close (desktop)
 *
 *    0ms   user toggles collapse (panel icon or reopen FAB)
 *  0–320ms grid track + column-gap ease-in-out (0 ↔ open width)
 *  0–280ms chat panel opacity ease-in-out (fade with width)
 *  0–280ms reopen FAB fades/scales in (when collapsed)
 *
 * Reduced motion: all durations → 0 (instant).
 * ───────────────────────────────────────────────────────── */

/** Fixed desktop chat track (px) — animates cleanly 0 ↔ open. */
const CHAT_TRACK_CREATE = 360;
const CHAT_TRACK_STUDIO = 300;
const CONTROLS_TRACK = 300;

const CHAT_COLLAPSE = {
  /** Full open/close track + gap duration */
  durationMs: 320,
  /** Opacity / FAB slightly shorter so content settles with the track */
  fadeMs: 280,
  /** Symmetric ease — accelerates mid-way, soft at both ends */
  ease: "ease-in-out" as const,
};

type PlaygroundChatUi = {
  /** Desktop: hide chat column and expand stage. */
  collapseChat: () => void;
};

const PlaygroundChatUiContext = createContext<PlaygroundChatUi | null>(null);

/** Optional chrome for chat panel headers (Create / Studio refine). */
export function usePlaygroundChatUi(): PlaygroundChatUi | null {
  return useContext(PlaygroundChatUiContext);
}

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
 *
 * Desktop chat open/close animates grid track width + opacity with ease-in-out.
 * Mobile still uses full-width overlays + bottom tabs (no collapse animation).
 */
const shellClass = cn(
  "grid h-dvh max-h-dvh overflow-hidden bg-stage text-ink",
  "grid-rows-[auto_minmax(0,1fr)]",
  // No top gutter — nav bar flushes to top; L/R/B stage shows through
  "px-3 pb-3 pt-0",
  "gap-y-3",
  // column-gap driven by --pg-col-gap so it can ease closed with the track
  "[column-gap:var(--pg-col-gap,0.75rem)]",
  // Mobile: stage full width + bottom tabs; side panels become overlays
  "max-[1100px]:grid-cols-1!",
  "max-[1100px]:grid-rows-[auto_minmax(0,1fr)_auto]",
  "max-[1100px]:[grid-template-areas:'header'_'stage'_'tabs']",
  "max-[1100px]:gap-2 max-[1100px]:px-2 max-[1100px]:pb-2 max-[1100px]:pt-0",
  "max-[1100px]:[column-gap:0.5rem]",
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

/** Desktop-only: chat track content fades while width eases (avoids squashed text). */
const chatTrackMotionClass = cn(
  "min-[1101px]:min-w-0",
  "min-[1101px]:overflow-hidden",
  "min-[1101px]:transition-[opacity]",
  "min-[1101px]:duration-[280ms]",
  "min-[1101px]:ease-in-out",
  "motion-reduce:transition-none!",
  // Collapsed: invisible + non-interactive (width handled by grid track → 0)
  "min-[1101px]:data-[desktop-collapsed=true]:opacity-0",
  "min-[1101px]:data-[desktop-collapsed=true]:pointer-events-none",
  "min-[1101px]:data-[desktop-collapsed=false]:opacity-100",
);

const mobileTabClass = cn(
  "min-h-11 flex-1 cursor-pointer rounded-[10px] border-0 bg-transparent",
  "text-[0.82rem] font-semibold text-muted-ink [font:inherit]",
  "transition-[background-color,color] duration-ui ease-ui",
  "data-[active=true]:bg-ink/8",
  "data-[active=true]:text-ink",
  "motion-reduce:transition-none",
);

/** Quiet icon control — collapse / reopen chat (Brik-class). */
const iconBtnClass = cn(
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center",
  "rounded-[9px] border-0 bg-transparent p-0 text-muted-ink [font:inherit]",
  "transition-[background-color,color,transform] duration-ui ease-ui",
  "hover:bg-ink/6 hover:text-ink",
  "active:scale-[0.96]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
);

/** Floating reopen control on stage edge when chat is docked away. */
const reopenFabClass = cn(
  "pointer-events-auto absolute top-3 z-[6] hidden size-9",
  "cursor-pointer items-center justify-center rounded-[10px]",
  "border-0 bg-surface-elevated text-muted-ink [font:inherit]",
  surfaceEdge,
  "transition-[background-color,color,transform,box-shadow,opacity] duration-ui ease-ui",
  "hover:bg-surface hover:text-ink",
  "active:scale-[0.96]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
  // Desktop only — mobile uses bottom tabs
  "min-[1101px]:inline-flex",
  // Enter: fade + slight scale with ease-in-out
  "min-[1101px]:animate-[pg-chat-fab-in_280ms_ease-in-out_both]",
  "motion-reduce:animate-none!",
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

/** Left-dock panel icon (Brik Chat Console collapse / reopen). */
function PanelDockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="1.75"
        y="2.25"
        width="12.5"
        height="11.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 2.25V13.75"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Collapse control for the chat panel title row (right of "CHAT").
 * Renders nothing outside a PlaygroundShell, or on mobile breakpoints.
 */
export function ChatPanelCollapseButton({
  className,
}: {
  className?: string;
}) {
  const ui = usePlaygroundChatUi();
  if (!ui) return null;

  return (
    <button
      type="button"
      className={cn(iconBtnClass, "max-[1100px]:hidden", className)}
      onClick={ui.collapseChat}
      aria-label="Close chat panel"
      aria-controls="playground-chat-panel"
      title="Close chat"
    >
      <PanelDockIcon />
    </button>
  );
}

/** Header label: first two words + ellipsis (full title stays in `title` tooltip). */
function headerTitleLabel(title: string, wordLimit = 2): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= wordLimit) return words.join(" ");
  return `${words.slice(0, wordLimit).join(" ")}…`;
}

function readCollapsedPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHAT_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsedPref(collapsed: boolean) {
  try {
    window.localStorage.setItem(CHAT_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode / quota */
  }
}

function desktopGridColumns(opts: {
  hasControls: boolean;
  controlsLeft: boolean;
  chatCollapsed: boolean;
}): string {
  const chatOpen = opts.hasControls ? CHAT_TRACK_STUDIO : CHAT_TRACK_CREATE;
  const chatPx = opts.chatCollapsed ? 0 : chatOpen;
  const ctrlPx = CONTROLS_TRACK;

  if (!opts.hasControls) {
    return `${chatPx}px minmax(0,1fr)`;
  }
  if (opts.controlsLeft) {
    // controls | stage | chat
    return `${ctrlPx}px minmax(0,1fr) ${chatPx}px`;
  }
  // chat | stage | controls
  return `${chatPx}px minmax(0,1fr) ${ctrlPx}px`;
}

/**
 * Brickspace-class 3-column playground: Chat | Stage | Controls (or swapped).
 * Header stays sparse: logo + name (+ edit) | primary actions + avatar.
 * Desktop: chat panel collapses like Brik (stage expands; floating reopen).
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
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [prefReady, setPrefReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setChatCollapsed(readCollapsedPref());
    setPrefReady(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setChatCollapsed(next);
    writeCollapsedPref(next);
  }, []);

  const chatUi = useMemo<PlaygroundChatUi>(
    () => ({
      collapseChat: () => setCollapsed(true),
    }),
    [setCollapsed],
  );

  /**
   * Always keep the chat track in the template so width can ease 0 ↔ open.
   * Mobile overrides areas via max-[1100px] CSS.
   */
  const areas = !hasControls
    ? "'header header' 'chat stage'"
    : controlsLeft
      ? "'header header header' 'controls stage chat'"
      : "'header header header' 'chat stage controls'";

  /** Chat sits on the left of stage unless Studio swaps to controls-left. */
  const chatOnLeft = !controlsLeft;
  /** Desktop collapsed state for motion attrs (after pref hydrate). */
  const chatDesktopCollapsed = prefReady && chatCollapsed;

  const shellStyle = useMemo(() => {
    const cols = desktopGridColumns({
      hasControls,
      controlsLeft,
      chatCollapsed: chatDesktopCollapsed,
    });
    const colGap = chatDesktopCollapsed ? "0px" : "0.75rem";
    const transition =
      prefReady && !reduceMotion
        ? `grid-template-columns ${CHAT_COLLAPSE.durationMs}ms ${CHAT_COLLAPSE.ease}, column-gap ${CHAT_COLLAPSE.durationMs}ms ${CHAT_COLLAPSE.ease}`
        : "none";

    return {
      gridTemplateAreas: areas,
      // Desktop tracks — mobile media query forces single column
      ["--pg-col-gap" as string]: colGap,
      gridTemplateColumns: cols,
      transition,
    } as CSSProperties;
  }, [
    areas,
    chatDesktopCollapsed,
    controlsLeft,
    hasControls,
    prefReady,
    reduceMotion,
  ]);

  return (
    <PlaygroundChatUiContext.Provider value={chatUi}>
      {/* FAB enter keyframes — scoped once per shell mount */}
      <style>{`
        @keyframes pg-chat-fab-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pg-chat-fab-in {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
      `}</style>
      <div
        className={shellClass}
        data-controls={hasControls ? "true" : "false"}
        data-chat-collapsed={chatCollapsed ? "true" : "false"}
        style={shellStyle}
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

        {/*
          Primary side column: controls when controls-left, else chat.
          Chat stays mounted; desktop track width eases 0 ↔ open (not display:none).
        */}
        <aside
          id={controlsLeft ? undefined : "playground-chat-panel"}
          className={cn(
            sidePanelClass,
            controlsLeft ? "[grid-area:controls]" : "[grid-area:chat]",
            !controlsLeft && chatTrackMotionClass,
          )}
          data-desktop-collapsed={
            !controlsLeft && chatDesktopCollapsed ? "true" : "false"
          }
          data-mobile-hidden={
            mobilePane !== (controlsLeft ? "controls" : "chat")
              ? "true"
              : "false"
          }
          aria-label={controlsLeft ? "Controls" : "Chat"}
          aria-hidden={
            !controlsLeft && chatDesktopCollapsed ? true : undefined
          }
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
          {chatCollapsed ? (
            <button
              type="button"
              className={cn(
                reopenFabClass,
                chatOnLeft ? "left-3" : "right-3",
              )}
              onClick={() => setCollapsed(false)}
              aria-label="Open chat panel"
              title="Open chat"
            >
              <PanelDockIcon />
            </button>
          ) : null}
          {stage}
        </main>

        {hasControls ? (
          <aside
            id={controlsLeft ? "playground-chat-panel" : undefined}
            className={cn(
              sidePanelClass,
              "overflow-auto",
              controlsLeft ? "[grid-area:chat]" : "[grid-area:controls]",
              controlsLeft && chatTrackMotionClass,
            )}
            data-desktop-collapsed={
              controlsLeft && chatDesktopCollapsed ? "true" : "false"
            }
            data-mobile-hidden={
              mobilePane !== (controlsLeft ? "chat" : "controls")
                ? "true"
                : "false"
            }
            aria-label={controlsLeft ? "Chat" : "Controls"}
            aria-hidden={
              controlsLeft && chatDesktopCollapsed ? true : undefined
            }
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
                onClick={() => {
                  setMobilePane(id);
                  // Opening chat from mobile tabs clears a stale desktop collapse
                  // so returning to wide viewport doesn't surprise-hide chat.
                  if (id === "chat" && chatCollapsed) setCollapsed(false);
                }}
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
    </PlaygroundChatUiContext.Provider>
  );
}

export { playgroundStyles };
