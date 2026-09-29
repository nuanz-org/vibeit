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
  useRef,
  useState,
} from "react";
import { PanelLeft, Pencil } from "@/components/icons";
import { Mark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

import { playgroundStyles, surfaceEdge } from "../styles";

const CHAT_COLLAPSED_KEY = "aiditr.playground.chatCollapsed";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — chat panel open / close (desktop)
 *
 *    0ms   user toggles collapse (panel icon or reopen FAB)
 *  0–240ms chat column eases (0 ↔ open width)
 *  0–240ms chat inner opacity fades with width
 *  0–240ms reopen FAB fades/scales in (when collapsed)
 *
 * Inner chat rail stays at the open-track width; the aside clips.
 * Reduced motion: all durations → 0 (instant).
 * ───────────────────────────────────────────────────────── */

/** Fixed desktop chat track (px) — animates cleanly 0 ↔ open. */
const CHAT_TRACK_CREATE = 360;
const CHAT_TRACK_STUDIO = 300;
/** Design language: controls column is a fixed 248px. */
const CONTROLS_TRACK = 248;

const CHAT_COLLAPSE = {
  /** Full open/close track duration (--dur-3) */
  durationMs: 240,
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
 * Studio frame: 48px top bar, flush columns separated by 1px borders,
 * dot-grid workspace in the middle.
 *
 * Desktop chat open/close animates aside width + opacity with ease-in-out.
 * Mobile still uses full-width overlays + bottom tabs (no collapse animation).
 */
const shellClass = cn(
  "grid h-dvh max-h-dvh overflow-hidden bg-bg text-fg",
  "grid-rows-[auto_minmax(0,1fr)]",
  // Mobile: stage full width + bottom tabs; side panels become overlays
  "max-[1100px]:grid-cols-1!",
  "max-[1100px]:grid-rows-[auto_minmax(0,1fr)_auto]",
  "max-[1100px]:[grid-template-areas:'header'_'stage'_'tabs']",
);

const headerClass = cn(
  "z-20 flex h-12 items-center justify-between gap-4",
  "[grid-area:header]",
  // Same fill as the side panels so the chrome reads as one frame around the workspace.
  "border-b border-border bg-surface px-3 sm:px-4",
);

const sidePanelClass = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface",
  "min-[1101px]:data-[desktop-collapsed=true]:border-0",
  // Mobile overlay panels float over the workspace
  "max-[1100px]:fixed max-[1100px]:inset-x-2",
  "max-[1100px]:top-[calc(3rem+0.5rem)]",
  "max-[1100px]:bottom-[calc(0.5rem+3rem+0.5rem)]",
  "max-[1100px]:z-20",
  "max-[1100px]:rounded-panel max-[1100px]:shadow-panel",
  surfaceEdge,
  "min-[1101px]:border-y-0",
  "max-[1100px]:data-[mobile-hidden=true]:hidden",
);

/**
 * Holds chat at the open-track width so collapse/open clips the column
 * instead of wrapping greeting, bubbles, and composer chrome.
 */
const chatTrackInnerClass = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col",
  "min-[1101px]:h-full min-[1101px]:w-[var(--pg-chat-track)] min-[1101px]:shrink-0",
  "min-[1101px]:transition-opacity min-[1101px]:duration-ui min-[1101px]:ease-ui",
);

/** Segmented control option (light thumb) for mobile panel tabs. */
const mobileTabClass = cn(
  "h-9 flex-1 cursor-pointer rounded-full border border-transparent bg-transparent",
  "text-[13px] font-medium text-muted",
  "transition-[background-color,border-color,color] duration-ui ease-ui",
  "data-[active=true]:border-border data-[active=true]:bg-surface",
  "data-[active=true]:text-fg data-[active=true]:shadow-knob",
);

/** Quiet icon control — collapse / reopen chat, edit title. */
const iconBtnClass = cn(
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center",
  "rounded-full border-0 bg-transparent p-0 text-muted",
  "transition-[background-color,color,transform] duration-fast ease-ui",
  "hover:bg-band hover:text-fg",
  "active:scale-[0.985]",
  "motion-reduce:active:scale-100",
);

/** Floating reopen control on stage edge when chat is docked away. */
const reopenFabClass = cn(
  "pointer-events-auto absolute top-3 z-[6] hidden size-8",
  "cursor-pointer items-center justify-center rounded-full",
  "border border-border bg-surface text-muted",
  "transition-[border-color,color,transform] duration-fast ease-ui",
  "hover:border-fg hover:text-fg",
  "active:scale-[0.985]",
  "motion-reduce:active:scale-100",
  // Desktop only — mobile uses bottom tabs
  "min-[1101px]:inline-flex",
  "min-[1101px]:animate-in min-[1101px]:fade-in min-[1101px]:duration-ui",
);

/**
 * Collapse control for the chat panel title row (right of "CHAT").
 * Renders nothing outside a PlaygroundShell, or on mobile breakpoints.
 */
export function ChatPanelCollapseButton({ className }: { className?: string }) {
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
      <PanelLeft />
    </button>
  );
}

/** Corner registration marks 6px outside a canvas frame (landing `.frame-marks`). */
export function RegistrationMarks() {
  const corners = [
    "-top-1.5 -left-1.5 border-t border-l",
    "-top-1.5 -right-1.5 border-t border-r",
    "-bottom-1.5 -left-1.5 border-b border-l",
    "-bottom-1.5 -right-1.5 border-b border-r",
  ];
  return (
    <>
      {corners.map((pos) => (
        <span
          key={pos}
          className={cn(
            "pointer-events-none absolute size-[9px] border-muted opacity-55",
            pos,
          )}
          aria-hidden
        />
      ))}
    </>
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
  chatColPx: number;
}): string {
  // Literal px track — CSS var() inside minmax() will not shrink to 0.
  const chatCol = `minmax(0,${Math.max(0, opts.chatColPx)}px)`;
  const ctrlPx = CONTROLS_TRACK;

  if (!opts.hasControls) {
    return `${chatCol} minmax(0,1fr)`;
  }
  if (opts.controlsLeft) {
    return `${ctrlPx}px minmax(0,1fr) ${chatCol}`;
  }
  return `${chatCol} minmax(0,1fr) ${ctrlPx}px`;
}

function animateLength(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
): { stop: () => void } {
  const started = performance.now();
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const t = Math.min(1, (performance.now() - started) / durationMs);
    const eased = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
    onUpdate(from + (to - from) * eased);
    if (t < 1) timer = window.setTimeout(tick, 16);
  };
  let timer = window.setTimeout(tick, 16);
  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
    },
  };
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
  brandHref = "/gallery",
  panelOrder = "chat-left",
}: PlaygroundShellProps) {
  const hasControls = controls != null;
  const controlsLeft = hasControls && panelOrder === "controls-left";
  const [mobilePane, setMobilePane] = useState<"chat" | "stage" | "controls">(
    "stage",
  );
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [chatColPx, setChatColPx] = useState(CHAT_TRACK_CREATE);
  const chatColRef = useRef(CHAT_TRACK_CREATE);
  const skipChatMotion = useRef(true);

  useEffect(() => {
    setChatCollapsed(readCollapsedPref());
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
  const chatDesktopCollapsed = chatCollapsed;

  const chatTrackPx = hasControls ? CHAT_TRACK_STUDIO : CHAT_TRACK_CREATE;

  const shellStyle = useMemo(() => {
    const cols = desktopGridColumns({
      hasControls,
      controlsLeft,
      chatColPx,
    });
    return {
      gridTemplateAreas: areas,
      ["--pg-chat-track" as string]: `${chatTrackPx}px`,
      gridTemplateColumns: cols,
    } as CSSProperties;
  }, [areas, chatColPx, chatTrackPx, controlsLeft, hasControls]);

  useEffect(() => {
    const colTo = chatCollapsed ? 0 : chatTrackPx;
    const instant = skipChatMotion.current || reduceMotion;
    skipChatMotion.current = false;

    const setCol = (v: number) => {
      chatColRef.current = v;
      setChatColPx(v);
    };

    if (instant) {
      setCol(colTo);
      return;
    }

    const colAnim = animateLength(
      chatColRef.current,
      colTo,
      CHAT_COLLAPSE.durationMs,
      setCol,
    );
    return () => colAnim.stop();
  }, [chatCollapsed, chatTrackPx, reduceMotion]);

  return (
    <PlaygroundChatUiContext.Provider value={chatUi}>
      <style>{`
        @media (min-width: 1101px) {
          [data-desktop-collapsed="true"] {
            pointer-events: none;
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
              className="wm-link inline-flex size-8 shrink-0 items-center justify-center rounded-[8px]"
              aria-label="Aiditr gallery"
            >
              <Mark />
            </Link>
            {title ? (
              <div className="inline-flex min-w-0 max-w-full items-center gap-0">
                <span
                  className="ml-1 min-w-0 whitespace-nowrap text-[13.5px] font-medium tracking-[-0.01em] text-fg"
                  title={title}
                >
                  {headerTitleLabel(title)}
                </span>
                {onEditTitle ? (
                  <button
                    type="button"
                    onClick={onEditTitle}
                    className={iconBtnClass}
                    aria-label={editTitleLabel}
                    title={editTitleLabel}
                  >
                    <Pencil size={14} />
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
            "min-[1101px]:border-l-0",
            controlsLeft ? "[grid-area:controls]" : "[grid-area:chat]",
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
          aria-hidden={!controlsLeft && chatDesktopCollapsed ? true : undefined}
        >
          {controlsLeft ? (
            controls
          ) : (
            <div
              className={chatTrackInnerClass}
              style={chatCollapsed ? { opacity: 0 } : { opacity: 1 }}
            >
              {chat}
            </div>
          )}
        </aside>

        <main
          className={cn(
            "workspace-grid relative flex min-h-0 min-w-0 flex-col",
            "[grid-area:stage]",
          )}
          aria-label="Preview"
        >
          {chatCollapsed ? (
            <button
              type="button"
              className={cn(reopenFabClass, chatOnLeft ? "left-3" : "right-3")}
              onClick={() => setCollapsed(false)}
              aria-label="Open chat panel"
              title="Open chat"
            >
              <PanelLeft />
            </button>
          ) : null}
          {stage}
        </main>

        {hasControls ? (
          <aside
            id={controlsLeft ? "playground-chat-panel" : undefined}
            className={cn(
              sidePanelClass,
              "overflow-auto min-[1101px]:border-r-0",
              controlsLeft ? "[grid-area:chat]" : "[grid-area:controls]",
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
            {controlsLeft ? (
              <div
                className={chatTrackInnerClass}
                style={chatCollapsed ? { opacity: 0 } : { opacity: 1 }}
              >
                {chat}
              </div>
            ) : (
              controls
            )}
          </aside>
        ) : null}

        <div
          className={cn(
            "m-2 mt-0 hidden gap-1 rounded-full border border-border",
            "bg-workspace p-[3px]",
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
