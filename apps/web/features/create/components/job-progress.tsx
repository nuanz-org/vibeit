"use client";

import { useEffect, useState } from "react";

import { Alert, Check } from "@/components/icons";
import type { JobStatusResponse } from "@/lib/api/jobs";
import { cn } from "@/lib/utils";

/*
 * Progress / status list from the landing (HowItWorks.tsx §3.15):
 * a hairline card, a mono status label ("Building" → "Tool ready") with a
 * mono timer, and one row per step with a 16px state circle —
 * todo = strong hairline, busy = accent-text ring + live dot,
 * done = accent fill + white check. No spinners, no bars, no springs.
 */

const PHASE_ORDER = ["plan", "codegen", "validate"] as const;

type PhaseId = (typeof PHASE_ORDER)[number];

const STEP_LABEL: Record<PhaseId, string> = {
  plan: "Planning the tool",
  codegen: "Writing the code",
  validate: "Validating",
};

/** Busy-row wording when the pipeline is in a sub-phase of a step. */
const BUSY_LABEL: Record<string, string> = {
  clarify: "Clarifying the brief",
  repair: "Repairing the code",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Building",
  succeeded: "Tool ready",
  failed: "Build failed",
  awaiting_clarify: "Needs input",
};

type StepState = "todo" | "busy" | "done" | "error";

function activePhaseIndex(phase: string | null | undefined): number {
  if (!phase) return 0;
  if (phase === "plan" || phase === "clarify") return 0;
  if (phase === "codegen" || phase === "repair") return 1;
  if (phase === "validate") return 2;
  return 0;
}

/** Whole seconds since this job started showing here; freezes when stopped. */
function useElapsedSeconds(running: boolean, resetKey: string): number {
  const [clock, setClock] = useState<{
    key: string;
    start: number;
    now: number;
  } | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const now = Date.now();
      setClock((prev) =>
        prev && prev.key === resetKey
          ? { ...prev, now }
          : { key: resetKey, start: now, now },
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running, resetKey]);

  if (!clock || clock.key !== resetKey) return 0;
  return Math.max(0, Math.floor((clock.now - clock.start) / 1000));
}

function formatElapsed(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function JobProgress({
  status,
  jobId,
}: {
  status: JobStatusResponse | undefined;
  jobId: string;
}) {
  const phase = status?.phase ?? null;
  const st = status?.status ?? "queued";
  const active = activePhaseIndex(phase);
  const done = st === "succeeded";
  const failed = st === "failed";
  const elapsed = useElapsedSeconds(!done && !failed, jobId);

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="t-label text-muted">
          {STATUS_LABEL[st] ?? st}
        </span>
        <span className="t-mono text-[11px] text-muted">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Build steps">
        {PHASE_ORDER.map((id, i) => {
          const state: StepState = failed
            ? i < active
              ? "done"
              : i === active
                ? "error"
                : "todo"
            : done || i < active
              ? "done"
              : i === active
                ? "busy"
                : "todo";
          const label =
            state === "busy" && phase && BUSY_LABEL[phase]
              ? BUSY_LABEL[phase]
              : STEP_LABEL[id];
          return (
            <li
              key={id}
              className="flex items-center gap-2 text-[12.5px] leading-snug"
              data-state={state}
            >
              {state === "error" ? (
                <Alert size={16} className="shrink-0 text-danger" />
              ) : (
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-fast ease-standard",
                    state === "done" && "bg-accent text-white",
                    state === "busy" && "border border-accent-text",
                    state === "todo" && "border border-border-strong",
                  )}
                  aria-hidden
                >
                  {state === "done" ? <Check size={10} /> : null}
                  {state === "busy" ? (
                    <span className="live-dot size-1.5 rounded-full bg-accent-text" />
                  ) : null}
                </span>
              )}
              <span className={state === "todo" ? "text-muted" : "text-fg"}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="t-mono mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2 text-[11px] text-muted">
        <span>Job {jobId.slice(0, 8)}…</span>
        {status?.repair && status.repair.repairsUsed > 0 ? (
          <span>
            Repair {status.repair.repairsUsed}/{status.repair.maxRepairs}
          </span>
        ) : null}
      </p>
    </div>
  );
}
