"use client";

import { motion, useReducedMotion } from "motion/react";

import type { JobStatusResponse } from "@/lib/api/jobs";

import styles from "../styles.module.css";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Job progress timeline
 *
 *    0ms   card present
 *  120ms   fill bar eases to phase width
 *  active  current step pulse (respects reduced motion)
 * ───────────────────────────────────────────────────────── */

const PHASE_ORDER = ["plan", "codegen", "validate"] as const;

const PHASE_LABEL: Record<string, string> = {
  clarify: "Clarifying",
  plan: "Planning",
  codegen: "Generating code",
  validate: "Validating",
  repair: "Repairing",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  awaiting_clarify: "Needs input",
};

function phaseProgress(
  status: string,
  phase: string | null | undefined,
): number {
  if (status === "succeeded") return 1;
  if (status === "failed") return 1;
  if (status === "awaiting_clarify") return 0.28;
  if (status === "queued") return 0.12;
  if (phase === "plan") return 0.35;
  if (phase === "codegen" || phase === "repair") return 0.62;
  if (phase === "validate") return 0.88;
  return 0.45;
}

function activePhaseIndex(phase: string | null | undefined): number {
  if (!phase) return 0;
  if (phase === "plan" || phase === "clarify") return 0;
  if (phase === "codegen" || phase === "repair") return 1;
  if (phase === "validate") return 2;
  return 0;
}

export function JobProgress({
  status,
  jobId,
}: {
  status: JobStatusResponse | undefined;
  jobId: string;
}) {
  const reduce = useReducedMotion();
  const phase = status?.phase ?? null;
  const st = status?.status ?? "queued";
  const progress = phaseProgress(st, phase);
  const active = activePhaseIndex(phase);
  const done = st === "succeeded";
  const failed = st === "failed";

  return (
    <div className={styles.progressCard}>
      <div className={styles.progressHeader}>
        <span className={styles.progressTitle}>
          {PHASE_LABEL[phase ?? ""] ?? "Generation"}
        </span>
        <span className={styles.progressStatus} data-status={st}>
          {STATUS_LABEL[st] ?? st}
        </span>
      </div>

      <ol className={styles.progressSteps} aria-label="Build steps">
        {PHASE_ORDER.map((id, i) => {
          const state = failed
            ? i <= active
              ? "error"
              : "todo"
            : done || i < active
              ? "done"
              : i === active
                ? "active"
                : "todo";
          return (
            <li key={id} className={styles.progressStep} data-state={state}>
              <span className={styles.progressStepDot} aria-hidden>
                {state === "done" ? (
                  <CheckMini />
                ) : state === "active" && !reduce ? (
                  <motion.span
                    className={styles.progressStepPulse}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0.4, 0.9] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ) : state === "active" ? (
                  <span className={styles.progressStepPulse} />
                ) : null}
              </span>
              <span className={styles.progressStepLabel}>
                {id === "plan"
                  ? "Plan"
                  : id === "codegen"
                    ? "Code"
                    : "Validate"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className={styles.progressBarTrack} aria-hidden>
        <motion.div
          className={styles.progressBarFill}
          data-failed={failed ? "true" : "false"}
          initial={false}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 180, damping: 28 }
          }
        />
      </div>

      <p className={styles.muted}>
        Job <code className={styles.code}>{jobId.slice(0, 8)}…</code>
        {status?.repair && status.repair.repairsUsed > 0
          ? ` · repair ${status.repair.repairsUsed}/${status.repair.maxRepairs}`
          : null}
      </p>
    </div>
  );
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
