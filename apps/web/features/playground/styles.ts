/**
 * Shared playground chrome — Tailwind class strings only.
 * Monochrome surfaces + Base Blue for generate/send.
 */
export const playgroundStyles = {
  panelScroll:
    "flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 pt-3 pb-5",

  panelHeader:
    "flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-3.5 py-3",

  panelTitle:
    "m-0 text-[0.72rem] font-semibold tracking-[-0.01em] text-ink-caption uppercase",

  stageInner: [
    "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.85rem] px-6 py-5",
    "data-[stage-layout=pinned-bar]:justify-start",
    "data-[stage-layout=pinned-bar]:gap-[0.65rem]",
    "data-[stage-layout=pinned-bar]:pb-[0.85rem]",
  ].join(" "),

  /**
   * Preview chrome only — size is driven by inline style from StageSizeBar (C6).
   * Fallback square when no inline size is set (create empty stage).
   */
  frame: [
    "aspect-square w-[min(100%,480px)] max-h-[min(78vh,720px)] max-w-full shrink",
    "overflow-hidden rounded-2xl border border-border-subtle bg-[#0a0a0c]",
    "shadow-elev",
  ].join(" "),

  frameWide:
    "aspect-auto h-[min(78vh,640px)] w-[min(100%,720px)] max-h-[min(78vh,720px)]",

  emptyStage:
    "flex max-w-[32ch] flex-col items-center justify-center gap-[0.55rem] p-6 text-center",

  emptyStageTitle:
    "m-0 text-[0.95rem] font-semibold tracking-[-0.02em] text-ink",

  emptyStageHint: "m-0 text-[0.85rem] leading-[1.45] text-muted-ink",

  chatBody: "flex min-h-0 flex-1 flex-col gap-0 p-0",

  chatCard:
    "flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent",

  chatScroll:
    "flex min-h-0 flex-1 flex-col overflow-hidden px-[0.85rem] pt-[0.65rem] pb-2",

  chatComposer: [
    "flex shrink-0 flex-col gap-[0.55rem] border-t border-border-subtle",
    "bg-surface-elevated/95",
    "px-[0.8rem] pt-[0.7rem] pb-[0.8rem]",
  ].join(" "),

  composerInput: [
    "w-full min-h-[4.25rem] max-h-48 resize-none rounded-none border-0 bg-transparent",
    "px-[0.15rem] py-[0.55rem] text-[0.9rem] leading-normal text-inherit",
    "[field-sizing:content] [font:inherit]",
    "placeholder:text-muted-ink placeholder:opacity-85",
    "focus:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" "),

  composerFooter: "flex flex-wrap items-center justify-between gap-2",

  composerMeta: "flex min-w-0 flex-wrap items-center gap-[0.4rem]",

  composerActions: "flex shrink-0 items-center gap-[0.4rem]",

  greeting: "flex flex-col gap-[0.4rem] px-[0.35rem] pt-[1.1rem] pb-[0.65rem]",

  greetingTitle: [
    "m-0 text-[1.15rem] font-[650] leading-snug tracking-[-0.025em] text-ink",
    "text-balance",
  ].join(" "),

  greetingSub: "m-0 text-[0.88rem] leading-[1.45] text-muted-ink",

  btn: [
    "inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center gap-[0.35rem]",
    "whitespace-nowrap rounded-[10px] border border-border-subtle bg-transparent px-3 py-[0.4rem]",
    "text-[0.8rem] font-medium tracking-[-0.01em] text-ink-secondary no-underline [font:inherit]",
    "transition-[background-color,border-color,color,transform,opacity] duration-ui ease-ui",
    "not-disabled:hover:border-border not-disabled:hover:bg-surface not-disabled:hover:text-ink",
    "not-disabled:active:scale-[0.96]",
    "disabled:cursor-not-allowed disabled:opacity-45",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
  ].join(" "),

  // Variant modifiers use ! so they win when composed as `${btn} ${btnPrimary}`
  btnPrimary: [
    "rounded-[10px]! border-transparent! bg-primary! text-primary-foreground!",
    "not-disabled:hover:bg-base-blue-hover! not-disabled:hover:text-primary-foreground!",
  ].join(" "),

  btnAccent: [
    "rounded-[10px]! border-transparent! bg-cta! text-cta-foreground!",
    "not-disabled:hover:bg-cta-hover! not-disabled:hover:text-cta-foreground!",
  ].join(" "),

  btnGhost: [
    "border-transparent! bg-transparent! font-medium text-muted-ink!",
    "not-disabled:hover:bg-ink/5! not-disabled:hover:text-ink!",
  ].join(" "),

  btnIcon: "min-h-9 min-w-9 p-[0.35rem]",

  btnSend: [
    "inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center",
    "rounded-full border-0 bg-primary p-[0.4rem] text-primary-foreground",
    "transition-[background-color,transform,opacity] duration-ui ease-ui",
    "not-disabled:hover:bg-base-blue-hover",
    "not-disabled:active:scale-[0.96]",
    "disabled:cursor-not-allowed disabled:translate-y-0",
    "disabled:bg-primary/40 disabled:opacity-35",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
  ].join(" "),

  chip: [
    "inline-flex items-center rounded-[10px] px-2 py-[0.2rem]",
    "bg-surface text-[0.7rem] font-medium tracking-[-0.01em] text-muted-ink",
  ].join(" "),

  chipLive:
    "bg-ink/8! text-ink!",

  chipWarn:
    "bg-[color-mix(in_oklch,oklch(0.65_0.14_75)_14%,transparent)]! text-[oklch(0.55_0.12_75)]!",

  chipError:
    "bg-[color-mix(in_oklch,oklch(0.55_0.2_25)_14%,transparent)]! text-[oklch(0.52_0.18_25)]!",

  selectCompact: [
    "max-w-[11rem] rounded-lg border border-border-subtle bg-transparent px-2 py-[0.3rem]",
    "text-[0.75rem] font-medium text-inherit [font:inherit]",
    "transition-colors duration-150",
    "not-disabled:hover:border-[color-mix(in_oklch,var(--ink)_22%,transparent)]",
    "motion-reduce:transition-none",
  ].join(" "),

  attachBtn: [
    "inline-grid size-8 shrink-0 cursor-pointer place-items-center",
    "rounded-[9px] border border-border-subtle bg-transparent text-muted-ink [font:inherit]",
    "transition-[background-color,border-color,color] duration-150",
    "not-has-[input:disabled]:hover:border-[color-mix(in_oklch,var(--ink)_20%,transparent)]",
    "not-has-[input:disabled]:hover:bg-[color-mix(in_oklch,var(--ink)_5%,transparent)]",
    "not-has-[input:disabled]:hover:text-ink",
    "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-45",
    "[&_input]:hidden",
    "motion-reduce:transition-none",
  ].join(" "),

  muted: "m-0 text-[0.8rem] leading-snug text-muted-ink",

  drawerBackdrop: [
    "fixed inset-0 z-40 bg-[color-mix(in_oklch,#000_28%,transparent)]",
    "animate-in fade-in duration-150",
    "motion-reduce:animate-none",
  ].join(" "),

  drawer: [
    "fixed top-0 right-0 bottom-0 z-50 flex w-[min(100vw,380px)] flex-col",
    "border-l border-border-subtle bg-surface-elevated",
    "shadow-[-8px_0_28px_color-mix(in_oklch,#000_10%,transparent)]",
    "animate-in fade-in slide-in-from-right-3 duration-200",
    "motion-reduce:animate-none",
  ].join(" "),

  drawerHeader:
    "flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-[0.85rem]",

  drawerTitle: "m-0 text-[0.95rem] font-[650] tracking-[-0.02em]",

  drawerBody: "flex flex-1 flex-col gap-[1.1rem] overflow-auto p-4",
} as const;

export type PlaygroundStyleKey = keyof typeof playgroundStyles;
