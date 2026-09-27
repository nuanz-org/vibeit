"use client";

import { Alert, Check, ImageIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/*
 * Create empty stage — the derived empty-state recipe (design-language §3.21)
 * on the workspace dot grid: a dashed slot awaiting output, a t-label
 * eyebrow, one declarative line, one muted sentence. While building, the
 * steps read as a mono flow (Plan → Code → Validate) under a live-dot
 * "Building" label. Each mode swap re-mounts and rises in with panel-in (240ms).
 * No springs, no glow, no accent fills — the composer's send is the one
 * accent on screen.
 */

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
  const generating = mode === "generating";
  const active = phaseIndex(phase);
  const copy = copyFor(mode);

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center p-4">
      <div
        key={mode + (phase ?? "")}
        className="flex max-w-[30rem] animate-panel-in flex-col items-center text-center motion-reduce:animate-none"
      >
        <div
          aria-hidden="true"
          className="mb-7 grid h-[132px] w-[106px] place-items-center rounded-[2px] border border-dashed border-border-strong text-muted"
        >
          {mode === "opening" ? (
            <Check size={16} />
          ) : mode === "failed" ? (
            <Alert size={16} />
          ) : (
            <ImageIcon size={16} />
          )}
        </div>

        <p className="t-label m-0 flex items-center gap-2 text-muted">
          {generating ? (
            <span
              className="live-dot size-1.5 rounded-full bg-accent-text"
              aria-hidden="true"
            />
          ) : null}
          {copy.eyebrow}
        </p>
        <p className="t-h3 m-0 mt-3 text-balance text-fg">{copy.title}</p>
        <p className="m-0 mt-2 max-w-[34ch] text-[15px] leading-[1.55] text-pretty text-muted">
          {copy.hint}
        </p>

        {generating ? (
          <ol
            className="t-label m-0 mt-6 flex list-none flex-wrap items-center justify-center gap-x-3 gap-y-2 p-0 text-muted"
            aria-label="Generation phases"
          >
            {PHASES.map((p, i) => {
              const state =
                i < active ? "done" : i === active ? "active" : "todo";
              return (
                <li key={p.id} className="inline-flex items-center gap-3">
                  {i > 0 ? (
                    <span aria-hidden="true" className="text-muted">
                      →
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 transition-colors duration-fast ease-standard",
                      state === "todo" ? "text-muted" : "text-fg",
                    )}
                    data-state={state}
                    aria-current={state === "active" ? "step" : undefined}
                  >
                    {state === "done" ? <Check size={11} /> : null}
                    {p.label}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

function copyFor(mode: CreateStageMode): {
  eyebrow: string;
  title: string;
  hint: string;
} {
  switch (mode) {
    case "generating":
      return {
        eyebrow: "Building",
        title: "Building your tool.",
        hint: "Plan → code → validate. Hang tight.",
      };
    case "clarify":
      return {
        eyebrow: "Plan with me",
        title: "Answer a few questions.",
        hint: "A clearer brief makes a better tool.",
      };
    case "opening":
      return {
        eyebrow: "Tool ready",
        title: "Opening Studio…",
        hint: "Your live canvas is ready.",
      };
    case "failed":
      return {
        eyebrow: "Build failed",
        title: "Something went wrong.",
        hint: "Check the chat for details, or try a new vision.",
      };
    default:
      return {
        eyebrow: "New tool",
        title: "Your tool appears here.",
        hint: "Describe a vision in chat. Controls, export and sharing come free.",
      };
  }
}
