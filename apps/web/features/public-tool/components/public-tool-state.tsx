import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowLeft } from "@/components/icons";
import { Mark, Wordmark } from "@/components/wordmark";

/**
 * Top bar of the public tool page — the Studio panel bar (design-language
 * §3.17) at 56px, with the wordmark leading back to the gallery.
 */
export function PublicToolBar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4">
      <Link
        href="/gallery"
        className="wm-link -ml-1 shrink-0 rounded-[8px] p-1"
        aria-label="Aiditr gallery"
      >
        <span className="hidden sm:block">
          <Wordmark />
        </span>
        <Mark className="sm:hidden" />
      </Link>
      {children}
    </header>
  );
}

/** Loading: the empty workspace with a live status line. */
export function PublicToolLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <PublicToolBar />
      <main className="workspace-grid flex flex-1 items-center justify-center px-5 py-16">
        <p role="status" className="t-label flex items-center gap-2 text-muted">
          <span
            className="live-dot size-1.5 rounded-full bg-accent-text"
            aria-hidden="true"
          />
          {label}
        </p>
      </main>
    </div>
  );
}

/**
 * Not found / error: a dashed slot on the workspace where the canvas would be
 * (derived empty state, design-language §3.21).
 */
export function PublicToolMessage({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <PublicToolBar />
      <main className="workspace-grid flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-[28rem] rounded-[12px] border border-dashed border-border-strong bg-surface p-6 md:p-8">
          <p className="t-label text-muted">{eyebrow}</p>
          <h1 className="t-h3 mt-3">{title}</h1>
          <p className="mt-2 text-[15px] leading-[1.55] text-muted">{body}</p>
          <Link href="/gallery" className="btn btn-outline mt-6">
            <ArrowLeft />
            Back to gallery
          </Link>
        </div>
      </main>
    </div>
  );
}
