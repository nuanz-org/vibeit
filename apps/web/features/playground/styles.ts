/**
 * Shared playground chrome class names (Brik-class craft tool).
 * Exported as string constants so create/studio can keep using
 * `playgroundStyles` without CSS modules.
 */
export const playgroundStyles = {
  panelScroll:
    "flex min-h-0 flex-1 flex-col gap-[0.85rem] overflow-auto px-[0.9rem] pt-[0.85rem] pb-5",

  panelHeader:
    "flex shrink-0 items-center justify-between gap-2 px-[0.95rem] pt-3",

  panelTitle: "m-0 text-[0.78rem] font-[650] tracking-[-0.01em] text-ink",

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
    "overflow-hidden rounded-xl border border-border-subtle bg-[#0a0a0c]",
    "shadow-[0_4px_16px_color-mix(in_oklch,#000_10%,transparent),0_20px_48px_color-mix(in_oklch,#000_8%,transparent)]",
  ].join(" "),

  frameWide:
    "aspect-auto h-[min(78vh,640px)] w-[min(100%,720px)] max-h-[min(78vh,720px)]",

  emptyStage:
    "flex max-w-[32ch] flex-col items-center justify-center gap-[0.55rem] p-6 text-center",

  emptyStageTitle: "m-0 text-[0.95rem] font-semibold tracking-[-0.02em]",

  emptyStageHint: "m-0 text-[0.85rem] leading-[1.45] text-muted-ink",

  chatBody: "flex min-h-0 flex-1 flex-col gap-0 p-0",

  chatCard:
    "flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent",

  chatScroll:
    "flex min-h-0 flex-1 flex-col overflow-hidden px-[0.85rem] pt-[0.65rem] pb-2",

  chatComposer: [
    "flex shrink-0 flex-col gap-[0.55rem] border-t border-border-subtle",
    "bg-[color-mix(in_oklch,var(--surface-elevated)_92%,var(--stage-bg))]",
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
    "m-0 text-[1.15rem] font-[650] leading-snug tracking-[-0.025em]",
    "text-balance",
  ].join(" "),

  greetingSub: "m-0 text-[0.88rem] leading-[1.45] text-muted-ink",

  btn: [
    "inline-flex min-h-[2.15rem] cursor-pointer items-center justify-center gap-[0.35rem]",
    "whitespace-nowrap rounded-[10px] border border-border-subtle bg-transparent px-[0.85rem] py-[0.4rem]",
    "text-[0.82rem] font-semibold text-inherit no-underline [font:inherit]",
    "transition-[background-color,border-color,transform] duration-[180ms]",
    "[transition-timing-function:cubic-bezier(0.2,0,0,1)]",
    "not-disabled:hover:bg-[color-mix(in_oklch,var(--ink)_5%,transparent)]",
    "not-disabled:active:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-45",
    "motion-reduce:transition-none",
  ].join(" "),

  // Variant modifiers use ! so they win when composed as `${btn} ${btnPrimary}`
  // (create/studio join class strings; Tailwind source order is not className order).
  btnPrimary: [
    "border-transparent! bg-ink! text-background!",
    "not-disabled:hover:bg-[color-mix(in_oklch,var(--ink)_88%,#000)]!",
  ].join(" "),

  btnAccent: [
    "border-transparent! bg-accent! text-accent-ink!",
    "not-disabled:hover:brightness-[0.97]",
  ].join(" "),

  btnGhost: "border-transparent! font-medium opacity-75",

  btnIcon: "min-h-[2.15rem] min-w-[2.15rem] p-[0.35rem]",

  btnSend: [
    "inline-flex min-h-[2.15rem] min-w-[2.15rem] cursor-pointer items-center justify-center",
    "rounded-[10px] border-0 bg-ink p-[0.4rem] text-background",
    "transition-[background-color,transform,opacity] duration-[180ms]",
    "[transition-timing-function:cubic-bezier(0.2,0,0,1)]",
    "not-disabled:hover:-translate-y-px",
    "not-disabled:active:scale-[0.96]",
    "disabled:cursor-not-allowed disabled:translate-y-0",
    "disabled:bg-[color-mix(in_oklch,var(--ink)_55%,transparent)] disabled:opacity-35",
    "motion-reduce:transition-none",
  ].join(" "),

  chip: [
    "inline-flex items-center rounded-full px-2 py-[0.2rem]",
    "bg-[color-mix(in_oklch,var(--ink)_7%,transparent)] text-[0.72rem] font-semibold text-muted-ink",
  ].join(" "),

  chipLive:
    "bg-[color-mix(in_oklch,oklch(0.55_0.14_150)_14%,transparent)]! text-[oklch(0.48_0.12_150)]!",

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
