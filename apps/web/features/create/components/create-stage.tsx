"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import React from "react";

import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Create empty stage
 *
 * Idle
 *    0ms   soft frame sits on stage
 *  600ms   ambient glow breathes (loop)
 *
 * Generating
 *    0ms   frame morphs larger + tighter radius
 *  120ms   phase rail fades in
 *  200ms+  active phase dot pulses
 *
 * Success / clarify
 *    0ms   title cross-fades; frame settles
 * ───────────────────────────────────────────────────────── */

const SPEED = 1;

const SURFACE = {
  idleW: 288,
  idleH: 208,
  genW: 320,
  genH: 240,
  idleRadius: 16,
  genRadius: 16,
  spring: {
    type: "spring" as const,
    stiffness: 420 / SPEED,
    damping: 38,
    mass: 0.75,
  },
};

const DOT = {
  spring: {
    type: "spring" as const,
    stiffness: 500 / SPEED,
    damping: 28,
  },
};

const PHASES = [
  { id: "plan", label: "Plan" },
  { id: "codegen", label: "Code" },
  { id: "validate", label: "Validate" },
] as const;

export type CreateStageMode =
  | "idle"
  | "generating"
  | "clarify"
  | "opening"
  | "failed";

export type CreateStageProps = {
  mode: CreateStageMode;
  /** Job phase when generating: plan | codegen | validate | repair | clarify */
  phase?: string | null;
};

function phaseIndex(phase: string | null | undefined): number {
  if (!phase) return 0;
  if (phase === "clarify") return 0;
  if (phase === "plan") return 0;
  if (phase === "codegen" || phase === "repair") return 1;
  if (phase === "validate") return 2;
  return 0;
}

export function CreateStage({ mode, phase }: CreateStageProps) {
  const reduce = useReducedMotion();
  const generating = mode === "generating";
  const active = phaseIndex(phase);

  const copy = copyFor(mode);

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center p-4">
      <motion.div
        className="relative flex max-w-[min(100%,360px)] flex-col items-stretch justify-center overflow-hidden rounded-[10px] bg-surface-elevated ring-1 ring-black/10 shadow-sm shadow-black/10 dark:ring-white/10 dark:shadow-black/40"
        layout
        initial={false}
        animate={{
          width: generating ? SURFACE.genW : SURFACE.idleW,
          height: generating ? SURFACE.genH : SURFACE.idleH,
          borderRadius: generating ? SURFACE.genRadius : SURFACE.idleRadius,
        }}
        transition={reduce ? { duration: 0 } : SURFACE.spring}
      >
        {/* Ambient accent dot — layoutId continuity like Morph Surface */}
        <motion.div
          layoutId="create-surface-dot"
          className="absolute z-[2] size-[0.55rem] rounded-full bg-accent"
          transition={reduce ? { duration: 0 } : DOT.spring}
          style={{
            top: generating ? 18 : 22,
            left: generating ? 18 : 22,
          }}
        />

        {!reduce && generating ? (
          <motion.div
            className="pointer-events-none absolute -inset-[20%] z-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_55%)]"
            aria-hidden
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-4 px-6 pt-8 pb-6 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + (phase ?? "")}
              className="flex max-w-[26ch] flex-col gap-[0.4rem]"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{
                type: "spring",
                stiffness: 480 / SPEED,
                damping: 36,
              }}
            >
              <p className="m-0 text-[0.95rem] font-semibold tracking-[-0.02em] text-ink">
                {copy.title}
              </p>
              <p className="m-0 text-[0.82rem] leading-[1.45] text-muted-ink">
                {copy.hint}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {generating ? (
              <motion.ol
                key="phases"
                className="m-0 flex list-none items-center justify-center gap-3 p-0"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 4 }}
                transition={{
                  type: "spring",
                  stiffness: 400 / SPEED,
                  damping: 34,
                  delay: reduce ? 0 : 0.08,
                }}
                aria-label="Generation phases"
              >
                {PHASES.map((p, i) => {
                  const state =
                    i < active ? "done" : i === active ? "active" : "todo";
                  return (
                    <li
                      key={p.id}
                      className="group inline-flex items-center gap-[0.35rem]"
                      data-state={state}
                    >
                      <span
                        className={cn(
                          "grid size-4 place-items-center rounded-full border-[1.5px] border-ink/16 bg-transparent text-background",
                          "group-data-[state=done]:border-ink group-data-[state=done]:bg-ink",
                          "group-data-[state=active]:border-accent",
                        )}
                        aria-hidden
                      >
                        {state === "done" ? (
                          <CheckMini />
                        ) : state === "active" ? (
                          <span className="block size-[0.35rem] animate-phase-pulse rounded-full bg-accent motion-reduce:animate-none" />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "text-[0.72rem] font-[550] text-muted-ink",
                          "group-data-[state=active]:text-ink group-data-[state=done]:text-ink",
                        )}
                      >
                        {p.label}
                      </span>
                    </li>
                  );
                })}
              </motion.ol>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function copyFor(mode: CreateStageMode): { title: string; hint: string } {
  switch (mode) {
    case "generating":
      return {
        title: "Building your tool…",
        hint: "Plan → code → validate. Hang tight.",
      };
    case "clarify":
      return {
        title: "Answer a few questions",
        hint: "A clearer brief makes a better tool.",
      };
    case "opening":
      return {
        title: "Opening Studio…",
        hint: "Your live canvas is ready.",
      };
    case "failed":
      return {
        title: "Something went wrong",
        hint: "Check chat for details, or try a new vision.",
      };
    default:
      return {
        title: "Your tool appears here",
        hint: "Describe a vision in chat — params, export, and share come free.",
      };
  }
}

function CheckMini() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13L9 17L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
