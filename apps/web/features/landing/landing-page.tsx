"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { AppHeader, LogoMark } from "@/components/app-header";
import { cn } from "@/lib/utils";

import { ControlPlayground } from "./components/control-playground";
import { HeroCollage } from "./components/hero-collage";
import { StoryFlow } from "./components/story-flow";
import { EASE_UI, HERO_TIMING } from "./motion";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Landing (story: vision → control → real)
 *
 * HERO
 *    0ms   atmosphere (in collage)
 *   60ms   eyebrow
 *  100ms   H1 line 1
 *  180ms   H1 line 2 + sub
 *  260ms   CTAs (stagger 60ms)
 *  300ms+  collage (frame, messy chip out, satellites)
 *
 * ACT 2 / 3 / FINAL — in-view staggers in child components
 * ───────────────────────────────────────────────────────── */

const ctaSolid = cn(
  "inline-flex h-11 min-w-10 items-center justify-center rounded-[10px] bg-cta px-5",
  "text-[14px] font-medium tracking-[-0.01em] text-cta-foreground",
  "transition-[background-color,transform,opacity] duration-ui ease-ui",
  "hover:bg-cta-hover active:scale-[0.96]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
);

const ctaOutline = cn(
  "inline-flex h-11 min-w-10 items-center justify-center rounded-[10px] border border-border bg-background px-5",
  "text-[14px] font-medium tracking-[-0.01em] text-ink-secondary",
  "transition-[background-color,border-color,color,transform] duration-ui ease-ui",
  "hover:bg-surface hover:text-ink active:scale-[0.96]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
);

function FadeIn({
  delayMs,
  reduce,
  className,
  children,
}: {
  delayMs: number;
  reduce: boolean | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              duration: 0.45,
              delay: delayMs / 1000,
              ease: EASE_UI,
            }
      }
    >
      {children}
    </motion.div>
  );
}

function ControlSection({ reduce }: { reduce: boolean | null }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const show = inView || reduce;

  return (
    <section
      ref={ref}
      className="mx-auto max-w-[1120px] px-5 py-20 md:px-6 md:py-28"
      aria-labelledby="controls-heading"
    >
      <div className="grid gap-12 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start md:gap-16">
        <div className="flex flex-col gap-5 md:sticky md:top-28">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_UI }
            }
          >
            <h2
              id="controls-heading"
              className="m-0 text-[clamp(1.5rem,2.8vw,1.85rem)] font-medium leading-[1.15] tracking-[-0.025em] text-balance text-ink"
            >
              <span className="block">Your vision.</span>
              <span className="mt-1 block text-ink-caption">Your controls.</span>
            </h2>
            <p className="mt-4 mb-0 max-w-[36ch] text-[16px] leading-[1.6] text-pretty text-muted-ink">
              We generate the tool. You shape the feeling — motion, type, color,
              slots — until it matches what you meant.
            </p>
            <Link
              href="/create"
              className={cn(
                "mt-6 inline-flex h-10 min-w-10 items-center text-[14px] font-medium tracking-[-0.01em] text-ink",
                "underline-offset-4 transition-[opacity,transform] duration-ui ease-ui",
                "hover:opacity-60 active:scale-[0.96]",
                "focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "motion-reduce:active:scale-100",
              )}
            >
              Open Create →
            </Link>
          </motion.div>
        </div>
        <div className="flex justify-center md:justify-end">
          <ControlPlayground />
        </div>
      </div>
    </section>
  );
}

/**
 * Story landing — messy vision → living tool you can play with → ship.
 * Tailwind + motion; Attio-caliber restraint.
 */
export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <AppHeader />

      <main>
        {/* ACT 1 — Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-[1120px] gap-12 px-5 pt-14 pb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] md:items-center md:gap-12 md:px-6 md:pt-20 md:pb-28 lg:gap-16">
            <div className="flex flex-col items-start gap-6 md:max-w-[34rem]">
              <FadeIn delayMs={HERO_TIMING.eyebrow} reduce={reduceMotion}>
                <p className="m-0 text-[13px] font-medium tracking-[-0.01em] text-ink-caption">
                  Vision → living tool
                </p>
              </FadeIn>

              <h1 className="m-0 text-[clamp(2.25rem,4.6vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance text-ink">
                <FadeIn delayMs={HERO_TIMING.title} reduce={reduceMotion}>
                  <span className="block">Make your vision real.</span>
                </FadeIn>
                <FadeIn delayMs={HERO_TIMING.titleLine2} reduce={reduceMotion}>
                  <span className="mt-1 block font-medium text-ink-caption">
                    Then play with it until it’s yours.
                  </span>
                </FadeIn>
              </h1>

              <FadeIn delayMs={HERO_TIMING.body} reduce={reduceMotion}>
                <p className="m-0 max-w-[38ch] text-[17px] leading-[1.55] text-pretty text-muted-ink md:text-[18px]">
                  Aiditr turns a messy brief into an interactive design tool —
                  with controls you can tune, assets you drop in, and export
                  when it’s right. No code.
                </p>
              </FadeIn>

              <FadeIn delayMs={HERO_TIMING.ctas} reduce={reduceMotion}>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link href="/create" className={ctaSolid}>
                    Start with a vision
                  </Link>
                  <Link href="/gallery" className={ctaOutline}>
                    See tools people ship
                  </Link>
                </div>
              </FadeIn>
            </div>

            <div className="flex justify-center pt-6 md:justify-end md:pt-0">
              <HeroCollage reduce={reduceMotion} />
            </div>
          </div>
        </section>

        {/* ACT 2 — Controls & play */}
        <ControlSection reduce={reduceMotion} />

        {/* ACT 3 — Loop */}
        <StoryFlow />

        {/* Proof */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-16">
            <div className="max-w-md">
              <h2 className="m-0 text-[clamp(1.35rem,2.4vw,1.65rem)] font-medium leading-[1.2] tracking-[-0.025em] text-balance text-ink">
                Reality, shared.
              </h2>
              <p className="mt-2 mb-0 text-[15px] leading-[1.55] text-pretty text-muted-ink">
                Open any gallery tool and play — no account required.
              </p>
            </div>
            <Link
              href="/gallery"
              className={cn(ctaOutline, "shrink-0 self-start md:self-auto")}
            >
              Open gallery
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-cta px-5 py-20 text-cta-foreground md:px-6 md:py-24">
          <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="m-0 text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em] text-balance">
                Stop explaining the idea.
                <span className="mt-1 block text-cta-foreground/65">
                  Ship the tool.
                </span>
              </h2>
              <p className="mt-3 mb-0 max-w-[34ch] text-[16px] leading-[1.55] text-pretty text-cta-foreground/70">
                Open Create, dump the messy vision, and leave with something you
                can control.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/create"
                className={cn(
                  "inline-flex h-11 min-w-10 items-center justify-center rounded-[10px] bg-background px-5",
                  "text-[14px] font-medium tracking-[-0.01em] text-ink",
                  "transition-[opacity,transform] duration-ui ease-ui",
                  "hover:opacity-90 active:scale-[0.96]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background",
                  "motion-reduce:transition-none motion-reduce:active:scale-100",
                )}
              >
                Make it real
              </Link>
              <Link
                href="/signup"
                className={cn(
                  "inline-flex h-11 min-w-10 items-center justify-center rounded-[10px] border border-cta-foreground/25 bg-transparent px-5",
                  "text-[14px] font-medium tracking-[-0.01em] text-cta-foreground",
                  "transition-[background-color,transform] duration-ui ease-ui",
                  "hover:bg-cta-foreground/10 active:scale-[0.96]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background",
                  "motion-reduce:transition-none motion-reduce:active:scale-100",
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
              <span className="text-[14px] font-medium tracking-[-0.02em] text-ink">
                Aiditr
              </span>
            </div>
            <p className="m-0 max-w-[28ch] text-[13px] leading-relaxed text-muted-ink">
              Messy vision in. Living tool out — yours to play with.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
            {(
              [
                ["/create", "Create"],
                ["/gallery", "Gallery"],
                ["/login", "Sign in"],
                ["/signup", "Sign up"],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-muted-ink transition-colors duration-fast ease-snap hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-[1120px] border-t border-border px-5 py-5 md:px-6">
          <p className="m-0 text-[12px] text-ink-caption">
            © {new Date().getFullYear()} Aiditr
          </p>
        </div>
      </footer>
    </div>
  );
}
