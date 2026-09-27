import type { ReactNode, SVGProps } from "react";

import { Alert, Check } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Studio class recipes, copied from the landing's controls
 * (aiditr-landing/features/landing/ui/controls.tsx) and panel recipes in
 * md/design-language.md §3.9–3.20. Shared by the Studio panels so the
 * strings stay identical everywhere.
 */

/** Control label: 12.5px / 500 / −0.005em. */
export const labelCls =
  "text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg";

/** Control readout / counter: mono 11.5px, muted. */
export const valueCls = "t-mono text-[11.5px] leading-none text-muted";

/** Label → control row (6px gap below). */
export const rowCls = "mb-1.5 flex items-baseline justify-between gap-3";

/** Every control sits in this wrapper (landing `Control`). */
export const controlWrapCls = "-mx-2 rounded-[8px] px-2 py-1.5";

/** Wrapper ring for a control the UI points at. */
export const controlHighlightCls =
  "bg-accent/[0.06] shadow-[0_0_0_1px_var(--accent)] dark:bg-accent/20";

/** Text input / textarea (36px input: add `h-9 pointer-coarse:h-11`). */
export const inputCls =
  "block w-full rounded-[8px] border border-border bg-bg px-3 text-[13.5px] leading-[1.35] text-fg transition-colors duration-[180ms] placeholder:text-muted hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45";

/** Helper line under a control. */
export const hintCls = "text-[11.5px] leading-snug text-muted";

/** Panel / group header. */
export const groupLabelCls = "t-label text-muted";

/** Inner card: 10px, hairline, no shadow. */
export const innerCardCls = "rounded-[10px] border border-border bg-surface p-3";

/** Neutral status pill (landing LIVE pill). Pair with `StatusDot`. */
export const statusPillCls =
  "t-label inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-[10px] text-muted";

/** Copy pill: band when idle, accent once copied. */
export function copyPillCls(copied: boolean) {
  return cn(
    "hit inline-flex h-7 min-w-[4.5rem] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-[11.5px] font-medium transition-colors duration-[180ms] ease-standard disabled:cursor-not-allowed disabled:opacity-45",
    copied ? "bg-accent text-white" : "bg-band text-fg",
  );
}

/** 6px status dot: accent-text when live, hollow when not. */
export function StatusDot({ live = true }: { live?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        live ? "bg-accent-text" : "border border-border-strong",
      )}
    />
  );
}

/** Error copy: ink text with the house Alert glyph. Never a red fill. */
export function ErrorNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-[12.5px] leading-snug text-fg",
        className,
      )}
    >
      <Alert size={14} className="mt-px shrink-0 text-danger" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Ink toast pill with a check (landing Studio toast). */
export function StatusToast({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p role="status" aria-live="polite" className={cn("flex", className)}>
      <span className="flex max-w-full animate-toast-in items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-ink-fg">
        <Check size={13} className="shrink-0" />
        <span className="min-w-0">{children}</span>
      </span>
    </p>
  );
}

/** Restore-defaults glyph drawn on the house 16px grid (1.5px, round). */
export function ResetIcon({
  size = 16,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M2.5 3.5v3h3" />
      <path d="M3.2 9.2A5 5 0 1 0 4 4.8L2.5 6.5" />
    </svg>
  );
}
