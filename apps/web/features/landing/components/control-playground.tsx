"use client";

import {
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import {
  CONTROL_LOOP_MS,
  EASE_UI,
  SECTION_TIMING,
} from "../motion";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Control playground
 *
 *  in-view:
 *    0ms   section chrome (parent)
 *  180ms   frame in
 *  320ms   param rows stagger 80ms
 *  loop:   every 3000ms cycle preset A→B→C
 *  hover:  row highlight; pause loop
 * ───────────────────────────────────────────────────────── */

const PRESETS = [
  {
    id: "a",
    name: "Soft brand",
    accent: "#0000ff",
    accentLabel: "Blue",
    spring: 42,
    springLabel: "Soft",
    type: 28,
    typeLabel: "Tight",
    markScale: 1,
    tracking: "-0.04em",
  },
  {
    id: "b",
    name: "Bold pulse",
    accent: "#1c1d1f",
    accentLabel: "Ink",
    spring: 78,
    springLabel: "Snappy",
    type: 8,
    typeLabel: "Wide",
    markScale: 1.12,
    tracking: "0.02em",
  },
  {
    id: "c",
    name: "Quiet craft",
    accent: "#538bf3",
    accentLabel: "Sky",
    spring: 55,
    springLabel: "Balanced",
    type: 18,
    typeLabel: "Book",
    markScale: 0.92,
    tracking: "-0.02em",
  },
] as const;

const ROWS = [
  { key: "accent" as const, label: "Accent" },
  { key: "spring" as const, label: "Spring" },
  { key: "type" as const, label: "Type" },
];

export function ControlPlayground() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [presetIndex, setPresetIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const preset = PRESETS[presetIndex] ?? PRESETS[0];

  useEffect(() => {
    if (reduce || paused || !inView) return;
    const id = window.setInterval(() => {
      setPresetIndex((i) => (i + 1) % PRESETS.length);
    }, CONTROL_LOOP_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, inView]);

  const show = inView || reduce;

  return (
    <motion.div
      ref={ref}
      className="w-full max-w-[440px]"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              duration: 0.5,
              delay: SECTION_TIMING.frame / 1000,
              ease: EASE_UI,
            }
      }
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setHoverRow(null);
      }}
    >
      <div className="overflow-hidden rounded-2xl bg-surface-elevated shadow-elev">
        {/* Canvas */}
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#0a0a0c] outline outline-1 outline-black/10 dark:outline-white/10">
          <div
            aria-hidden
            className="absolute inset-0 opacity-90 transition-[background] duration-ui ease-ui"
            style={{
              background: `radial-gradient(70% 60% at 50% 30%, ${preset.accent}59, transparent 65%)`,
            }}
          />
          <motion.div
            className="relative z-[1] flex flex-col items-center gap-3"
            animate={
              reduce
                ? undefined
                : {
                    scale: preset.markScale,
                  }
            }
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
          >
            <div className="flex items-end gap-1.5">
              <span
                className="block h-10 w-1.5 rounded-full transition-[background-color,height] duration-ui ease-ui"
                style={{
                  backgroundColor: preset.accent,
                  height: 28 + preset.spring * 0.2,
                }}
              />
              <span
                className="block h-14 w-1.5 rounded-full transition-[background-color,height] duration-ui ease-ui"
                style={{
                  backgroundColor: "#fff",
                  height: 36 + preset.spring * 0.15,
                  opacity: 0.9,
                }}
              />
              <span
                className="block h-8 w-1.5 rounded-full bg-white/40 transition-[height] duration-ui ease-ui"
                style={{ height: 20 + preset.spring * 0.12 }}
              />
            </div>
            <p
              className="m-0 text-[15px] font-medium text-white transition-[letter-spacing] duration-ui ease-ui"
              style={{ letterSpacing: preset.tracking }}
            >
              Your mark
            </p>
          </motion.div>
          <p className="absolute bottom-3 left-0 right-0 m-0 text-center text-[10px] font-medium tabular-nums text-white/45">
            {preset.name}
            {paused ? " · paused" : ""}
          </p>
        </div>

        {/* Params */}
        <div className="flex flex-col gap-0.5 border-t border-border p-2">
          {ROWS.map((row, i) => {
            const valueLabel =
              row.key === "accent"
                ? preset.accentLabel
                : row.key === "spring"
                  ? preset.springLabel
                  : preset.typeLabel;
            const fill =
              row.key === "accent"
                ? 72
                : row.key === "spring"
                  ? preset.spring
                  : preset.type;
            const active = hoverRow === row.key;

            return (
              <motion.button
                key={row.key}
                type="button"
                className={cn(
                  "flex min-h-11 w-full cursor-default flex-col justify-center gap-1.5 rounded-[10px] px-3 py-2 text-left",
                  "transition-[background-color] duration-ui ease-ui",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "bg-surface" : "bg-transparent hover:bg-surface/80",
                )}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        duration: 0.4,
                        delay:
                          SECTION_TIMING.rows / 1000 +
                          i * SECTION_TIMING.rowStagger,
                        ease: EASE_UI,
                      }
                }
                onMouseEnter={() => setHoverRow(row.key)}
                onMouseLeave={() => setHoverRow(null)}
                onClick={() =>
                  setPresetIndex((idx) => (idx + 1) % PRESETS.length)
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[12px] font-medium tracking-[-0.01em] transition-colors duration-ui ease-ui",
                      active ? "text-ink" : "text-muted-ink",
                    )}
                  >
                    {row.label}
                  </span>
                  <span className="text-[12px] font-medium tabular-nums text-ink">
                    {valueLabel}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-ink/6 dark:bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${fill}%` }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", duration: 0.4, bounce: 0 }
                    }
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 mb-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-[12px] text-ink-caption">
        <span>Tune motion</span>
        <span aria-hidden>·</span>
        <span>Drop assets</span>
        <span aria-hidden>·</span>
        <span>Refine in chat</span>
      </p>
    </motion.div>
  );
}
