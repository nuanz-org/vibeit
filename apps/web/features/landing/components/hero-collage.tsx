"use client";

import { motion } from "motion/react";
import Image from "next/image";

import { LogoMark } from "@/components/app-header";
import { cn } from "@/lib/utils";

import {
  FRAME_MOTION,
  HERO_TIMING,
  SATELLITE_MOTION,
} from "../motion";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Hero collage
 *
 *  300ms   main frame scale 0.97 → 1
 *  420ms   messy prompt chip fades / drifts up
 *  520ms   satellite cards stagger 90ms
 * ───────────────────────────────────────────────────────── */

export function HeroCollage({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[12%] -z-10 rounded-[40%] bg-[radial-gradient(90%_80%_at_50%_100%,rgb(230,236,255)_0%,rgb(188,203,255)_45%,rgb(134,160,238)_100%)] opacity-70 dark:opacity-25"
      />

      {/* Messy vision chip — exits as the tool arrives */}
      <motion.div
        className={cn(
          "absolute -top-2 left-1/2 z-[4] w-[min(100%,280px)] -translate-x-1/2 sm:-left-4 sm:top-8 sm:translate-x-0",
          "rounded-[10px] border border-border bg-surface-elevated/95 px-3 py-2.5 shadow-elev",
        )}
        initial={reduce ? false : { opacity: 1, y: 0 }}
        animate={
          reduce
            ? { opacity: 0.55, y: 0 }
            : { opacity: 0, y: -8 }
        }
        transition={
          reduce
            ? { duration: 0 }
            : {
                duration: 0.55,
                delay: HERO_TIMING.messyChip / 1000,
                ease: [0.2, 0, 0, 1],
              }
        }
        aria-hidden={reduce ? undefined : true}
      >
        <p className="m-0 text-[10px] font-medium tracking-[-0.01em] text-ink-caption">
          Messy vision
        </p>
        <p className="mt-1 mb-0 font-mono text-[11px] leading-snug tracking-[-0.02em] text-ink/80">
          kinetic logo, soft spring, brand blue, export loop…
        </p>
      </motion.div>

      <motion.div
        className={cn(
          "relative z-[2] w-full overflow-hidden rounded-2xl bg-surface-elevated/90 shadow-elev",
          "dark:bg-surface-elevated",
        )}
        initial={reduce ? false : { opacity: 0, scale: FRAME_MOTION.initialScale }}
        animate={{ opacity: 1, scale: FRAME_MOTION.finalScale }}
        transition={
          reduce
            ? { duration: 0 }
            : { ...FRAME_MOTION.spring, delay: HERO_TIMING.frame / 1000 }
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="size-4 rounded-[1.5px]" />
            <span className="truncate text-[12px] font-medium tracking-[-0.01em] text-ink">
              Kinetic mark · live
            </span>
            <span className="hidden rounded-[10px] bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
              Live
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden h-7 min-w-[2.5rem] items-center justify-center rounded-[10px] border border-border px-2.5 text-[11px] font-medium text-muted-ink sm:inline-flex">
              Export
            </span>
            <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-[10px] bg-cta px-2.5 text-[11px] font-medium text-cta-foreground">
              Share
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_148px]">
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            <div
              className={cn(
                "relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[10px]",
                "bg-[#0a0a0c] outline outline-1 outline-black/10 dark:outline-white/10",
              )}
            >
              <Image
                src="/landing/stage-kinetic.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="220px"
                priority
              />
              <div className="pointer-events-none absolute inset-0 rounded-[10px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" />
            </div>
            <p className="m-0 text-center text-[11px] tabular-nums text-muted-ink">
              9:16 · parametric · yours
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border p-3 sm:border-t-0 sm:border-l sm:p-3.5">
            <p className="m-0 text-[10px] font-medium tracking-[0.04em] text-muted-ink uppercase">
              Your controls
            </p>
            {[
              { label: "Accent", value: "Blue", w: "72%" },
              { label: "Spring", value: "Soft", w: "48%" },
              { label: "Type", value: "Tight", w: "64%" },
            ].map((row) => (
              <div key={row.label} className="flex min-h-10 flex-col justify-center gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-ink">{row.label}</span>
                  <span className="text-[11px] font-medium tabular-nums text-ink">
                    {row.value}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-ink/6 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-ink/35 dark:bg-white/35"
                    style={{ width: row.w }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-auto hidden rounded-[10px] border border-border bg-surface p-2 sm:block">
              <p className="m-0 text-[10px] leading-snug text-muted-ink">
                “Softer spring — keep the blue”
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className={cn(
          "absolute -left-2 top-[22%] z-[3] hidden w-[168px] overflow-hidden rounded-2xl bg-surface-elevated/95 p-3 shadow-elev sm:block",
          "dark:bg-surface-elevated",
        )}
        initial={reduce ? false : { opacity: 0, y: SATELLITE_MOTION.offsetY }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                ...SATELLITE_MOTION.spring,
                delay: HERO_TIMING.satellites / 1000,
              }
        }
      >
        <p className="m-0 text-[10px] font-medium text-ink-caption">Refine</p>
        <p className="mt-1.5 mb-0 text-[11px] leading-snug tracking-[-0.01em] text-ink">
          Soften the spring and lock brand blue
        </p>
      </motion.div>

      <motion.div
        className={cn(
          "absolute -right-1 bottom-[20%] z-[3] hidden w-[148px] overflow-hidden rounded-2xl bg-surface-elevated/95 p-3 shadow-elev sm:block",
          "dark:bg-surface-elevated",
        )}
        initial={reduce ? false : { opacity: 0, y: SATELLITE_MOTION.offsetY }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                ...SATELLITE_MOTION.spring,
                delay: (HERO_TIMING.satellites + 90) / 1000,
              }
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-ink">Play</span>
          <span className="text-[10px] font-medium tabular-nums text-ink">
            Tuned
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/6 dark:bg-white/10">
          <div className="h-full w-[62%] rounded-full bg-primary" />
        </div>
      </motion.div>
    </div>
  );
}
