"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { UserMenu } from "@/features/auth/components/user-menu";
import { cn } from "@/lib/utils";

/**
 * Marketing landing — Base restraint + Aiditr craft product POV.
 * Canvas is the star; no SaaS metrics, fake logos, or decorative 3D CSS.
 */

const easeOut = [0.16, 1, 0.3, 1] as const;

const pillPrimary = cn(
  "inline-flex h-12 items-center justify-center rounded-full bg-primary px-6",
  "text-[15px] font-medium text-primary-foreground",
  "transition-[background-color,transform,opacity] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
  "hover:bg-base-blue-hover active:scale-[0.96]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const pillSecondary = cn(
  "inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-6",
  "text-[15px] font-medium text-foreground",
  "transition-[background-color,transform,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
  "hover:bg-[#F8F8F8] active:scale-[0.96] dark:hover:bg-secondary",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-6 shrink-0 rounded-[2px] bg-primary",
        className,
      )}
      aria-hidden
    />
  );
}

/** Product chrome mock — reads as Studio, not illustration filler. */
function StudioStageMock() {
  return (
    <div
      className={cn(
        "relative w-full max-w-[560px]",
        "rounded-[14px] border border-border bg-surface-elevated",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_rgb(0_0_0/0.06)]",
        "dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_16px_48px_rgb(0_0_0/0.35)]",
      )}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <LogoMark className="size-4 rounded-[1.5px]" />
          <span className="truncate text-[12px] font-medium tracking-[-0.01em] text-ink">
            Social frame · draft
          </span>
          <span className="hidden rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-ink sm:inline">
            Saved
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden h-7 items-center rounded-full border border-border px-2.5 text-[11px] font-medium text-muted-ink sm:inline-flex">
            Export
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-primary px-2.5 text-[11px] font-medium text-primary-foreground">
            Share
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_148px]">
        {/* Stage */}
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div
            className={cn(
              "relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[10px]",
              "bg-[#0a0a0c] outline outline-1 outline-black/10 dark:outline-white/10",
            )}
          >
            {/* Living design tool preview — abstract type poster, not doodles */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgb(0_0_255/0.35),transparent_65%)]" />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute inset-x-5 top-[18%] flex flex-col gap-2">
              <div className="h-[3px] w-10 rounded-full bg-white/35" />
              <p className="m-0 text-[22px] font-medium leading-[1.05] tracking-[-0.03em] text-white">
                Drop
                <br />
                the beat
              </p>
              <p className="m-0 max-w-[12ch] text-[10px] leading-snug tracking-[-0.01em] text-white/55">
                Headline · pulse · logo slot
              </p>
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
              <div className="size-8 rounded-full bg-white/90" />
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
            </div>
            {/* Soft vignette edge */}
            <div className="pointer-events-none absolute inset-0 rounded-[10px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
          </div>
          <p className="m-0 text-center text-[11px] text-muted-ink">
            9:16 · parametric · live
          </p>
        </div>

        {/* Control rail */}
        <div className="flex flex-col gap-3 border-t border-border p-3 sm:border-t-0 sm:border-l sm:p-3.5">
          <p className="m-0 text-[10px] font-medium tracking-[0.04em] text-muted-ink uppercase">
            Control
          </p>
          {[
            { label: "Accent", value: "Blue" },
            { label: "Pulse", value: "1.2s" },
            { label: "Type", value: "Tight" },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-ink">{row.label}</span>
                <span className="text-[11px] font-medium tabular-nums text-ink">
                  {row.value}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-ink/35 dark:bg-white/35"
                  style={{
                    width:
                      row.label === "Accent"
                        ? "72%"
                        : row.label === "Pulse"
                          ? "48%"
                          : "64%",
                  }}
                />
              </div>
            </div>
          ))}
          <div className="mt-auto hidden rounded-[8px] border border-border bg-surface p-2 sm:block">
            <p className="m-0 text-[10px] leading-snug text-muted-ink">
              “Make the pulse sharper”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const flow = [
  {
    title: "Describe",
    body: "A short vision — optional reference frames. Aiditr plans the tool, not a static mock.",
  },
  {
    title: "Control",
    body: "Params, assets, and chat refine. The canvas stays center; chrome stays quiet.",
  },
  {
    title: "Ship",
    body: "Export PNG or video, share a link, embed, or publish to the gallery.",
  },
] as const;

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const fade = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-5 md:px-6">
          <div className="flex min-w-0 items-center gap-7">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[15px] font-medium tracking-[-0.02em]"
            >
              <LogoMark />
              Aiditr
            </Link>
            <nav
              className="hidden items-center gap-6 md:flex"
              aria-label="Primary"
            >
              <Link
                href="/create"
                className="text-[14px] font-medium text-ink/80 transition-opacity duration-150 hover:opacity-55"
              >
                Create
              </Link>
              <Link
                href="/gallery"
                className="text-[14px] font-medium text-ink/80 transition-opacity duration-150 hover:opacity-55"
              >
                Gallery
              </Link>
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>

      <main>
        {/* Hero — product stage is the visual, not a prop sculpture */}
        <section className="mx-auto grid max-w-[1120px] gap-12 px-5 pt-14 pb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-center md:gap-10 md:px-6 md:pt-20 md:pb-28 lg:gap-16">
          <div className="flex flex-col items-start gap-6 md:max-w-[34rem]">
            <motion.p
              {...fade}
              transition={{ duration: 0.45, ease: easeOut }}
              className="m-0 text-[13px] font-medium tracking-[-0.01em] text-muted-ink"
            >
              Living design tools
            </motion.p>
            <motion.h1
              {...fade}
              transition={{ duration: 0.5, delay: 0.04, ease: easeOut }}
              className="m-0 text-[clamp(2.25rem,4.8vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.03em] text-balance text-foreground"
            >
              Turn a vision into a tool you can actually use
            </motion.h1>
            <motion.p
              {...fade}
              transition={{ duration: 0.5, delay: 0.08, ease: easeOut }}
              className="m-0 max-w-[36ch] text-[17px] leading-[1.55] text-pretty text-ink/75 md:text-[18px]"
            >
              Describe what you want. Aiditr generates a freeform interactive
              design tool — params, assets, export, share — without writing code.
            </motion.p>
            <motion.div
              {...fade}
              transition={{ duration: 0.5, delay: 0.12, ease: easeOut }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <Link href="/create" className={pillPrimary}>
                Start creating
              </Link>
              <Link href="/gallery" className={pillSecondary}>
                Browse gallery
              </Link>
            </motion.div>
          </div>

          <motion.div
            {...fade}
            transition={{ duration: 0.55, delay: 0.1, ease: easeOut }}
            className="flex justify-center md:justify-end"
          >
            <StudioStageMock />
          </motion.div>
        </section>

        {/* Flow — real sequence, not a 3-up feature card grid */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-6 md:py-20">
            <h2 className="m-0 mb-10 max-w-[20ch] text-[clamp(1.5rem,2.8vw,1.85rem)] font-medium leading-[1.15] tracking-[-0.025em] text-balance">
              From brief to living craft in one loop
            </h2>
            <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
              {flow.map((step, i) => (
                <li key={step.title} className="relative flex flex-col gap-2.5">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[12px] tabular-nums text-muted-ink">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="m-0 text-[17px] font-medium tracking-[-0.02em]">
                      {step.title}
                    </h3>
                  </div>
                  <p className="m-0 max-w-[32ch] pl-[calc(1.5rem+0.75rem)] text-[15px] leading-[1.55] text-pretty text-ink/70">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principle — single deep section, not four icon tiles */}
        <section className="mx-auto max-w-[1120px] px-5 py-20 md:px-6 md:py-28">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start md:gap-16">
            <div className="flex flex-col gap-4 md:sticky md:top-24">
              <h2 className="m-0 text-[clamp(1.5rem,2.8vw,1.85rem)] font-medium leading-[1.15] tracking-[-0.025em] text-balance">
                The canvas is the stage
              </h2>
              <p className="m-0 max-w-[36ch] text-[16px] leading-[1.6] text-pretty text-ink/70">
                Tool chrome stays secondary. Preview takes the center and the
                space. Chat creates; controls personalize. Labels over lectures.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-0 border-t border-border p-0">
              {[
                {
                  title: "Parametric by default",
                  body: "Generated tools expose real knobs — color, type, motion, assets — not locked artboards.",
                },
                {
                  title: "Refine in chat",
                  body: "Push the craft with short instructions. Drafts persist; the stage stays live.",
                },
                {
                  title: "Export & publish",
                  body: "PNG, short video, share URL, embed. Gallery publish only after system gates.",
                },
                {
                  title: "Sandboxed runtime",
                  body: "Public tools never leak owner APIs or source. Preview runs isolated.",
                },
              ].map((row) => (
                <li
                  key={row.title}
                  className="border-b border-border py-5 first:pt-0 last:pb-0"
                >
                  <h3 className="m-0 mb-1.5 text-[15px] font-medium tracking-[-0.015em]">
                    {row.title}
                  </h3>
                  <p className="m-0 max-w-[48ch] text-[15px] leading-[1.55] text-pretty text-ink/70">
                    {row.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quiet proof — not fake logo marquee or metric vanity */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-16">
            <div className="max-w-md">
              <h2 className="m-0 text-[clamp(1.35rem,2.4vw,1.65rem)] font-medium leading-[1.2] tracking-[-0.025em] text-balance">
                See what people ship
              </h2>
              <p className="mt-2 mb-0 text-[15px] leading-[1.55] text-pretty text-ink/70">
                Open any gallery tool and play — no account required.
              </p>
            </div>
            <Link
              href="/gallery"
              className={cn(
                pillSecondary,
                "shrink-0 self-start md:self-auto",
              )}
            >
              Open gallery
            </Link>
          </div>
        </section>

        {/* Bottom CTA — drenched blue, no decorative orbs */}
        <section className="bg-primary px-5 py-20 text-white md:px-6 md:py-24">
          <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="m-0 text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em] text-balance">
                Start with a vision.
              </h2>
              <p className="mt-3 mb-0 max-w-[34ch] text-[16px] leading-[1.55] text-pretty text-white/80">
                Open Create, describe the craft, and generate a tool people can
                control and share.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create"
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-full bg-white px-6",
                  "text-[15px] font-medium text-primary",
                  "transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "hover:opacity-90 active:scale-[0.96]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                )}
              >
                Get started
              </Link>
              <Link
                href="/signup"
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-transparent px-6",
                  "text-[15px] font-medium text-white",
                  "transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "hover:bg-white/10 active:scale-[0.96]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                )}
              >
                Create account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-[14px] font-medium tracking-[-0.02em]">
                Aiditr
              </span>
            </div>
            <p className="m-0 max-w-[28ch] text-[13px] leading-relaxed text-muted-ink">
              Living design tools from a vision.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
            <Link
              href="/create"
              className="text-muted-ink transition-opacity duration-150 hover:opacity-70"
            >
              Create
            </Link>
            <Link
              href="/gallery"
              className="text-muted-ink transition-opacity duration-150 hover:opacity-70"
            >
              Gallery
            </Link>
            <Link
              href="/login"
              className="text-muted-ink transition-opacity duration-150 hover:opacity-70"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-muted-ink transition-opacity duration-150 hover:opacity-70"
            >
              Sign up
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-[1120px] border-t border-border px-5 py-5 md:px-6">
          <p className="m-0 text-[12px] text-muted-ink">
            © {new Date().getFullYear()} Aiditr
          </p>
        </div>
      </footer>
    </div>
  );
}
