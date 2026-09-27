import type { ReactNode } from "react";

import { Alert, Check } from "@/components/icons";
import { cn } from "@/lib/utils";

/*
 * Auth form parts, assembled from the landing recipes
 * (md/design-language.md §3.13 text input, §3.22 auth forms).
 * The Wordmark sits above the card in app/(auth)/layout.tsx.
 */

export const labelCls =
  "text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg";

/** Landing text input at 44px; focus and aria-invalid turn the border ink, never red. */
export const inputCls =
  "block h-11 w-full rounded-[8px] border border-border bg-bg px-3 text-[13.5px] leading-[1.35] text-fg transition-colors duration-[180ms] ease-standard placeholder:text-muted hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none aria-invalid:border-fg disabled:cursor-not-allowed disabled:opacity-45";

export const formCls = "mt-6 flex flex-col gap-4";

export const submitCls = "btn btn-primary mt-2 w-full";

/** Line under the card: "No account? Create one". */
export const footerCls = "mt-6 text-center text-[13.5px] text-muted";

export const footerLinkCls = "hit link-draw font-medium text-fg";

/** Standalone "Back to sign in" link under the card (pair with <ArrowLeft size={14} />). */
export const backLinkCls =
  "inline-flex items-center gap-1.5 py-1 transition-colors duration-[180ms] ease-standard hover:text-fg pointer-coarse:py-3";

/** Small muted link, e.g. "Forgot password?" in a label row. */
export const quietLinkCls =
  "hit text-[12.5px] leading-none text-muted transition-colors duration-[180ms] ease-standard hover:text-fg";

export function AuthCard({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-6 md:p-8">
      {eyebrow ? <p className="t-label text-muted">{eyebrow}</p> : null}
      <h1 className={cn("t-h3", eyebrow && "mt-3")}>{title}</h1>
      {lead ? (
        <p className="mt-1.5 text-[14px] leading-[1.5] text-muted">{lead}</p>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  /** Right side of the label row, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** Form-level error: ink text plus an icon, no red. */
export function FormError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 text-[12.5px] leading-snug text-fg"
    >
      <Alert size={14} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Done state: ink check, neutral band card. */
export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="mt-6 flex items-start gap-2.5 rounded-[10px] border border-border bg-band px-3.5 py-3 text-[13.5px] leading-[1.45] text-fg"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-ink text-ink-fg"
      >
        <Check size={10} />
      </span>
      <span>{children}</span>
    </p>
  );
}
