"use client";

import { motion, useReducedMotion } from "motion/react";

import type { JobStatusResponse } from "@/lib/api/jobs";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-[0.65rem] rounded-[10px] bg-ink/[3.5%] px-[0.95rem] py-[0.85rem] ring-1 ring-black/10 shadow-sm shadow-black/10 dark:ring-white/10 dark:shadow-black/40">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.88rem] font-semibold tracking-[-0.015em]">
          {PHASE_LABEL[phase ?? ""] ?? "Generation"}
        </span>
        <span
          className={cn(
            "rounded-full bg-ink/8 px-2 py-[0.18rem] text-[0.68rem] font-[650] tracking-[0.02em] text-muted-ink",
            "data-[status=running]:bg-[oklch(0.65_0.14_75)]/14 data-[status=running]:text-[oklch(0.55_0.12_75)]",
            "data-[status=queued]:bg-[oklch(0.65_0.14_75)]/14 data-[status=queued]:text-[oklch(0.55_0.12_75)]",
            "data-[status=succeeded]:bg-[oklch(0.55_0.14_150)]/14 data-[status=succeeded]:text-[oklch(0.48_0.12_150)]",
            "data-[status=failed]:bg-[oklch(0.55_0.2_25)]/14 data-[status=failed]:text-[oklch(0.52_0.18_25)]",
            "data-[status=awaiting_clarify]:bg-[oklch(0.55_0.16_260)]/14 data-[status=awaiting_clarify]:text-[oklch(0.48_0.14_260)]",
          )}
          data-status={st}
        >
          {STATUS_LABEL[st] ?? st}
        </span>
      </div>

      <ol className="m-0 flex list-none items-center gap-[0.35rem] p-0" aria-label="Build steps">
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
            <li
              key={id}
              className="group inline-flex min-w-0 flex-1 items-center gap-[0.35rem]"
              data-state={state}
            >
              <span
                className={cn(
                  "relative grid size-[1.05rem] shrink-0 place-items-center rounded-full border-[1.5px] border-ink/18 bg-transparent text-background transition-[background-color,border-color] duration-200 ease-in-out",
                  "group-data-[state=done]:border-ink group-data-[state=done]:bg-ink",
                  "group-data-[state=active]:border-accent group-data-[state=active]:bg-accent/14",
                  "group-data-[state=error]:border-[oklch(0.55_0.2_25)] group-data-[state=error]:bg-[oklch(0.55_0.2_25)]/18",
                )}
                aria-hidden
              >
                {state === "done" ? (
                  <CheckMini />
                ) : state === "active" && !reduce ? (
                  <motion.span
                    className="block size-[0.4rem] rounded-full bg-accent"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0.4, 0.9] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ) : state === "active" ? (
                  <span className="block size-[0.4rem] rounded-full bg-accent" />
                ) : null}
              </span>
              <span
                className={cn(
                  "overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[550] text-muted-ink",
                  "group-data-[state=active]:text-ink group-data-[state=done]:text-ink",
                )}
              >
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

      <div className="h-1 overflow-hidden rounded-full bg-ink/9" aria-hidden>
        <motion.div
          className="h-full w-0 rounded-full bg-ink data-[failed=true]:bg-[oklch(0.55_0.2_25)] data-[failed=true]:opacity-40"
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

      <p className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
        Job{" "}
        <code className="font-[var(--font-geist-mono),ui-monospace,monospace] text-[0.8em]">
          {jobId.slice(0, 8)}…
        </code>
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
