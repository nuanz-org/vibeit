/**
 * Shared playground chrome (Create + Studio) — Tailwind class strings only.
 *
 * Ported from the landing's Studio panel (aiditr-landing/features/landing/ui/Studio.tsx)
 * and its chat / status recipes (sections/HowItWorks.tsx). See
 * md/design-language.md §3.14–3.17. Monochrome chrome, 1px hairlines before
 * shadows, pills for buttons, blue only for "go" (send / generate).
 */

/** 1px hairline edge for cards and floating panels. */
export const surfaceEdge = "border border-border";

/** Edge for compact outline controls (buttons, selects). */
export const controlEdge = "border border-border-strong";

/** Hairline dividers between panel sections. */
export const dividerTop = "border-t border-border";

export const dividerBottom = "border-b border-border";

export const playgroundStyles = {
  /** Inner card: 10px radius, hairline, no shadow. */
  surface: ["rounded-[10px] bg-surface", surfaceEdge].join(" "),

  panelScroll: "flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4",

  /** 48px panel title row, like the landing Studio top bar. */
  panelHeader: [
    "flex h-12 shrink-0 items-center justify-between gap-2 px-4",
    dividerBottom,
  ].join(" "),

  /** Group / panel headers are mono labels: CONTROLS, CHAT, ASSETS. */
  panelTitle: "t-label m-0 text-muted",

  stageInner: [
    "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-5",
    "data-[stage-layout=pinned-bar]:justify-start",
    "data-[stage-layout=pinned-bar]:gap-3",
    "data-[stage-layout=pinned-bar]:pb-4",
  ].join(" "),

  /** Mono dimension label, top-left of the workspace: SQUARE · 1080 × 1080. */
  stageLabel:
    "t-label pointer-events-none absolute top-3.5 left-4 z-[1] flex items-center gap-1.5 text-muted",

  /**
   * Canvas frame: square corners, registration marks outside (so no
   * overflow clipping here — see frameClip), canvas-frame lift.
   * Size comes from inline style (StageSizeBar); the fallback is a square.
   */
  frame: [
    "relative aspect-square w-[min(100%,480px)] max-h-[min(78vh,720px)] max-w-full shrink",
    "bg-surface shadow-frame",
  ].join(" "),

  /** Clips the live canvas inside the frame. */
  frameClip: "absolute inset-0 overflow-hidden",

  frameWide:
    "aspect-auto h-[min(78vh,640px)] w-[min(100%,720px)] max-h-[min(78vh,720px)]",

  emptyStage:
    "flex max-w-[34ch] flex-col items-center justify-center gap-2 p-6 text-center",

  emptyStageTitle:
    "m-0 text-[15px] font-medium tracking-[-0.01em] text-fg text-balance",

  emptyStageHint: "m-0 text-[13.5px] leading-[1.5] text-muted text-pretty",

  chatBody: "flex min-h-0 flex-1 flex-col gap-0 p-0",

  chatCard: "flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent",

  chatScroll: "flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-3",

  /** Composer dock: the input card floats at the foot of the panel. */
  chatComposer: "flex shrink-0 flex-col gap-2 bg-surface px-3 pt-1 pb-3",

  /** Composer card: 12px, hairline; the edge inks while typing. */
  composerCard: [
    "flex flex-col rounded-[12px] bg-bg",
    surfaceEdge,
    "transition-[border-color] duration-fast ease-standard",
    "hover:border-border-strong focus-within:border-fg!",
  ].join(" "),

  composerInput: [
    "w-full min-h-[4.5rem] max-h-48 resize-none rounded-none border-0 bg-transparent",
    "px-3 pt-3 pb-1 text-[13.5px] leading-[1.5] text-fg",
    "[field-sizing:content]",
    "placeholder:text-muted",
    "focus:outline-none focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-45",
  ].join(" "),

  composerFooter: "flex items-center justify-between gap-2 px-2 pb-2",

  composerMeta: "flex min-w-0 items-center gap-1",

  composerActions: "flex shrink-0 items-center gap-1.5",

  greeting: "flex flex-col gap-2 px-0.5 pt-5 pb-4",

  greetingTitle: "t-h3 m-0 text-fg text-balance",

  greetingSub:
    "m-0 max-w-[36ch] text-[13.5px] leading-[1.55] text-muted text-pretty",

  /** Outline pill, 36px (landing `btn btn-outline btn-sm`). */
  btn: [
    "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-2",
    "whitespace-nowrap rounded-full bg-bg px-3.5",
    controlEdge,
    "text-[13px] font-medium tracking-[-0.01em] text-fg",
    "transition-[background-color,border-color,color,opacity,transform] duration-fast ease-standard",
    "not-disabled:hover:border-fg",
    "not-disabled:active:scale-[0.985]",
    "disabled:cursor-not-allowed disabled:opacity-45",
  ].join(" "),

  // Variant modifiers use ! so they win when composed as `${btn} ${btnPrimary}`.
  /** Accent fill — the one "go" action on screen. */
  btnPrimary: [
    "border-transparent! bg-accent! text-accent-fg!",
    "not-disabled:hover:bg-accent-hover!",
  ].join(" "),

  /** Ink fill — secondary solid action inside tools (Export, Publish). */
  btnAccent: [
    "border-transparent! bg-ink! text-ink-fg!",
    "not-disabled:hover:bg-ink-hover!",
  ].join(" "),

  /** Quiet: muted text, band on hover (landing nav links). */
  btnGhost: [
    "border-transparent! bg-transparent! text-muted!",
    "not-disabled:hover:bg-band! not-disabled:hover:text-fg!",
  ].join(" "),

  btnIcon: "w-9 px-0!",

  /**
   * Send: 32px circle with an up arrow. Neutral until there is something to
   * send, then it turns accent — a dimmed blue reads as murky, not "off".
   */
  btnSend: [
    "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center",
    "rounded-full border-0 bg-accent text-accent-fg",
    "transition-[background-color,color,transform] duration-fast ease-standard",
    "not-disabled:hover:bg-accent-hover",
    "not-disabled:active:scale-[0.94]",
    "disabled:cursor-not-allowed disabled:bg-band disabled:text-muted",
  ].join(" "),

  /** Quiet in-composer control (model picker, Plan): no edge until hover. */
  composerTool: [
    "hit inline-flex h-8 min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-full",
    "border border-transparent bg-transparent px-2.5",
    "text-[12.5px] font-medium text-muted",
    "transition-[background-color,border-color,color] duration-fast ease-standard",
    "hover:bg-band hover:text-fg",
    "disabled:cursor-not-allowed disabled:opacity-45",
    "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45",
    "pointer-coarse:h-11",
  ].join(" "),

  /** Status pill: 20px, mono 10px, hairline (landing LIVE pill). */
  chip: [
    "t-label inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full",
    "border border-border px-2 text-[10px] text-muted",
  ].join(" "),

  chipLive: "text-muted!",

  chipWarn: "border-border-strong! text-fg!",

  chipError: "border-border-strong! text-danger!",

  /** 6px blinking accent dot for "live" / "working". */
  liveDot: "live-dot size-1.5 shrink-0 rounded-full bg-accent-text",

  selectCompact: [
    "h-8 max-w-[11rem] cursor-pointer rounded-full bg-bg pr-7 pl-3",
    controlEdge,
    "text-[12.5px] font-medium text-fg",
    "transition-[border-color,background-color] duration-fast ease-standard",
    "not-disabled:hover:border-fg",
    "disabled:cursor-not-allowed disabled:opacity-45",
  ].join(" "),

  /** 32px quiet icon button wrapping a hidden file input. */
  attachBtn: [
    "hit inline-grid size-8 shrink-0 cursor-pointer place-items-center",
    "rounded-full bg-transparent text-muted",
    "transition-[background-color,color] duration-fast ease-standard",
    "not-has-[input:disabled]:hover:bg-band",
    "not-has-[input:disabled]:hover:text-fg",
    "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-45",
    // Visually hidden, still focusable: the ring follows keyboard focus.
    "[&_input]:sr-only",
    "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2",
    "has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-(--focus)",
  ].join(" "),

  muted: "m-0 text-[12.5px] leading-snug text-muted",

  drawerBackdrop: [
    "fixed inset-0 z-40 bg-bg/70",
    "animate-in fade-in duration-ui",
  ].join(" "),

  /** Side sheet: surface, hairline edge, panel lift. */
  drawer: [
    "fixed top-0 right-0 bottom-0 z-50 flex w-[min(100vw,380px)] flex-col",
    "border-l border-border bg-surface shadow-panel",
    "animate-in fade-in slide-in-from-right-3 duration-ui",
  ].join(" "),

  drawerHeader: [
    "flex h-12 shrink-0 items-center justify-between gap-3 px-4",
    dividerBottom,
  ].join(" "),

  drawerTitle: "m-0 text-[13.5px] font-medium tracking-[-0.01em] text-fg",

  drawerBody: "flex flex-1 flex-col gap-5 overflow-auto p-4",
} as const;

export type PlaygroundStyleKey = keyof typeof playgroundStyles;
