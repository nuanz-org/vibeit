"use client";

import { useMemo, useState } from "react";

import type {
  ClarifyAnswerValue,
  ClarifyQuestion,
  JobClarifyState,
} from "@/lib/api/jobs";
import { cn } from "@/lib/utils";

const ALL_OPTIONS_KEY = "__all_options__";

type Props = {
  clarify: JobClarifyState;
  pending?: boolean;
  onSubmit: (answers: Record<string, ClarifyAnswerValue>) => void;
};

function isSelected(
  current: ClarifyAnswerValue | undefined,
  value: string,
  multi: boolean,
): boolean {
  if (current == null) return false;
  if (typeof current === "object" && !Array.isArray(current)) {
    return value === ALL_OPTIONS_KEY && current.type === "all_options";
  }
  if (multi && Array.isArray(current)) {
    return current.includes(value);
  }
  return current === value;
}

/**
 * A3: show clarify understanding + option chips; "Build it" submits answers.
 */
export function ClarifyPanel({ clarify, pending, onSubmit }: Props) {
  const questions = useMemo(
    () =>
      (clarify.questions ?? []).filter(
        (q): q is ClarifyQuestion =>
          Boolean(q?.id && q.prompt && Array.isArray(q.options)),
      ),
    [clarify.questions],
  );

  const [answers, setAnswers] = useState<Record<string, ClarifyAnswerValue>>(
    {},
  );

  function setSingle(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function toggleMulti(qid: string, value: string) {
    setAnswers((prev) => {
      const cur = prev[qid];
      const list = Array.isArray(cur) ? [...cur] : [];
      const idx = list.indexOf(value);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(value);
      return { ...prev, [qid]: list };
    });
  }

  function setAllOptions(qid: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { type: "all_options" } }));
  }

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => {
      const a = answers[q.id];
      if (a == null) return false;
      if (Array.isArray(a)) return a.length > 0;
      if (typeof a === "object") return a.type === "all_options";
      return String(a).trim().length > 0;
    });

  function handleBuild() {
    if (!allAnswered || pending) return;
    onSubmit(answers);
  }

  return (
    <div className="flex flex-col gap-[0.85rem] rounded-[10px] bg-[#1d4ed8]/6 px-[1.1rem] py-4 ring-1 ring-[#1d4ed8]/25 shadow-sm shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.88rem] font-semibold tracking-[-0.015em]">
          Plan with me
        </span>
        <span
          className={cn(
            "rounded-full bg-ink/8 px-2 py-[0.18rem] text-[0.68rem] font-[650] tracking-[0.02em] text-muted-ink",
            "data-[status=awaiting_clarify]:bg-[oklch(0.55_0.16_260)]/14 data-[status=awaiting_clarify]:text-[oklch(0.48_0.14_260)]",
          )}
          data-status="awaiting_clarify"
        >
          awaiting answers
        </span>
      </div>

      {clarify.understanding ? (
        <p className="m-0 text-[0.92rem] leading-normal opacity-90">
          {clarify.understanding}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {questions.map((q) => {
          const multi = Boolean(q.multiSelect);
          const allowAll = q.allowAllOptions !== false;
          const current = answers[q.id];
          return (
            <div key={q.id} className="flex flex-col gap-2">
              <p className="m-0 text-[0.9rem] font-semibold leading-[1.4]">
                {q.group ? (
                  <span className="font-medium opacity-70">{q.group} · </span>
                ) : null}
                {q.prompt}
              </p>
              <div className="flex flex-wrap gap-[0.45rem]" role="group" aria-label={q.prompt}>
                {allowAll ? (
                  <button
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-full bg-transparent px-3 py-[0.4rem] text-[0.82rem] font-medium text-inherit font-[inherit] ring-1 ring-black/10 shadow-sm shadow-black/[0.06] transition-[background,box-shadow] duration-150 ease-in-out dark:ring-white/10",
                      "enabled:hover:ring-black/20 dark:enabled:hover:ring-white/20",
                      "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:ring-primary data-[selected=true]:shadow-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                    data-selected={
                      isSelected(current, ALL_OPTIONS_KEY, false)
                        ? "true"
                        : "false"
                    }
                    disabled={pending}
                    onClick={() => setAllOptions(q.id)}
                  >
                    All options
                  </button>
                ) : null}
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-full bg-transparent px-3 py-[0.4rem] text-[0.82rem] font-medium text-inherit font-[inherit] ring-1 ring-black/10 shadow-sm shadow-black/[0.06] transition-[background,box-shadow] duration-150 ease-in-out dark:ring-white/10",
                      "enabled:hover:ring-black/20 dark:enabled:hover:ring-white/20",
                      "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:ring-primary data-[selected=true]:shadow-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                    data-selected={
                      isSelected(current, opt.value, multi) ? "true" : "false"
                    }
                    title={opt.description}
                    disabled={pending}
                    onClick={() =>
                      multi
                        ? toggleMulti(q.id, opt.value)
                        : setSingle(q.id, opt.value)
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-[0.65rem]">
        <button
          type="button"
          className="h-12 cursor-pointer rounded-full border-none bg-primary px-6 font-[inherit] text-[15px] font-medium text-primary-foreground transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-base-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!allAnswered || pending}
          onClick={handleBuild}
        >
          {pending ? "Starting build…" : "Build it"}
        </button>
      </div>
      <p className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
        Choosing <strong>All options</strong> turns that axis into a Studio enum
        control so you can switch variants later.
      </p>
    </div>
  );
}
