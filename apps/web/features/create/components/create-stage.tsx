"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import React from "react";

import styles from "../styles.module.css";

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
  idleW: 280,
  idleH: 200,
  genW: 320,
  genH: 240,
  idleRadius: 20,
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
    <div className={styles.createStage}>
      <motion.div
        className={styles.morphSurface}
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
          className={styles.morphDot}
          transition={reduce ? { duration: 0 } : DOT.spring}
          style={{
            top: generating ? 18 : 22,
            left: generating ? 18 : 22,
          }}
        />

        {!reduce && generating ? (
          <motion.div
            className={styles.morphGlow}
            aria-hidden
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        <div className={styles.morphBody}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + (phase ?? "")}
              className={styles.morphCopy}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{
                type: "spring",
                stiffness: 480 / SPEED,
                damping: 36,
              }}
            >
              <p className={styles.morphTitle}>{copy.title}</p>
              <p className={styles.morphHint}>{copy.hint}</p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {generating ? (
              <motion.ol
                key="phases"
                className={styles.phaseRail}
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
                      className={styles.phaseItem}
                      data-state={state}
                    >
                      <span className={styles.phaseDot} aria-hidden>
                        {state === "done" ? (
                          <CheckMini />
                        ) : state === "active" ? (
                          <span className={styles.phasePulse} />
                        ) : null}
                      </span>
                      <span className={styles.phaseLabel}>{p.label}</span>
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
        title: "Your tool will appear here",
        hint: "Describe a vision in chat to generate a live design tool.",
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
