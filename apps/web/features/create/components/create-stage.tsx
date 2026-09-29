"use client";

import { Alert, Check } from "@/components/icons";
import { cn } from "@/lib/utils";

/*
 * Create empty stage — the derived empty-state recipe (design-language §3.21)
 * on the workspace dot grid: a miniature of the product (canvas + controls
 * card whose sliders drive the shape), a t-label eyebrow, one declarative
 * line, one muted sentence. While building, the
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
        <ToolMiniature mode={mode} />

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

/*
 * Miniature tool: a 4:5 canvas with registration marks and a floating
 * controls card. `.ctrl-demo` animates --k1 / --k2 (0–1); the slider knobs
 * and the canvas shape both read them, so the controls visibly drive the
 * canvas. Faster while building, still once the build ends.
 */
function ToolMiniature({ mode }: { mode: CreateStageMode }) {
  const still = mode === "opening" || mode === "failed";
  return (
    <div
      aria-hidden="true"
      className="ctrl-demo relative mb-9 h-[184px] w-[256px]"
      data-speed={mode === "generating" ? "fast" : undefined}
      data-still={still ? "true" : undefined}
    >
      <div className="frame-marks absolute top-0 left-2 h-[184px] w-[148px] bg-surface shadow-frame">
        <div className="absolute inset-0 grid place-items-center overflow-hidden text-muted">
          {mode === "opening" ? (
            <Check size={18} className="text-fg" />
          ) : mode === "failed" ? (
            <Alert size={18} className="text-danger" />
          ) : (
            <div className="relative grid size-24 place-items-center">
              <span className="ctrl-demo-disc absolute rounded-full border-[1.5px] border-fg" />
              <span className="ctrl-demo-bar absolute h-[1.5px] w-20 rounded-full bg-fg" />
              <span className="absolute size-1.5 rounded-full bg-fg" />
            </div>
          )}
        </div>
        <span className="t-label absolute top-2.5 left-2.5 text-[9px] text-muted">
          4:5
        </span>
        <span className="mark-b" />
      </div>

      <div className="absolute right-0 bottom-4 flex w-[118px] flex-col gap-3 rounded-[10px] border border-border bg-surface p-3 text-left shadow-panel">
        <MiniSlider label="Size" varName="--k1" />
        <MiniSlider label="Angle" varName="--k2" />
        <div className="flex flex-col gap-1.5">
          <span className="t-label text-[8.5px] leading-none text-muted">
            Ink
          </span>
          <span className="flex gap-1">
            <span className="size-2.5 rounded-full border border-border-strong bg-fg" />
            <span className="size-2.5 rounded-full border border-border-strong bg-muted" />
            <span className="size-2.5 rounded-full border border-border-strong bg-bg" />
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniSlider({
  label,
  varName,
}: {
  label: string;
  varName: "--k1" | "--k2";
}) {
  const pos = `calc(var(${varName}) * 100%)`;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-label text-[8.5px] leading-none text-muted">
        {label}
      </span>
      <span className="relative block h-[3px] rounded-full bg-border-strong">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-fg"
          style={{ width: pos }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-fg bg-surface"
          style={{ left: pos }}
        />
      </span>
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
        hint: "Describe it in chat. Controls, export and sharing come built in.",
      };
  }
}
