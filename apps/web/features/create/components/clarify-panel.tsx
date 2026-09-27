"use client";

import { useMemo, useState } from "react";

import { ArrowRight } from "@/components/icons";
import type {
  ClarifyAnswerValue,
  ClarifyQuestion,
  JobClarifyState,
} from "@/lib/api/jobs";

const ALL_OPTIONS_KEY = "__all_options__";

/**
 * Quick-reply pill (landing §3.6): hairline outline, muted until chosen;
 * chosen flips to ink (bg-fg text-bg). Selection is never blue.
 */
const chipClass = [
  "hit inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-[12.5px] pointer-coarse:h-11",
  "transition-colors duration-fast ease-standard",
  "data-[selected=false]:border-border data-[selected=false]:bg-surface data-[selected=false]:text-muted",
  "enabled:data-[selected=false]:hover:border-fg enabled:data-[selected=false]:hover:text-fg",
  "data-[selected=true]:border-fg data-[selected=true]:bg-fg data-[selected=true]:text-bg",
  "disabled:cursor-not-allowed disabled:opacity-45",
].join(" ");

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
    <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="t-label text-muted">Plan with me</span>
        <span
          className="t-label inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-[10px] text-muted"
          data-status="awaiting_clarify"
        >
          <span
            className="size-1.5 rounded-full bg-accent-text"
            aria-hidden="true"
          />
          Awaiting answers
        </span>
      </div>

      {clarify.understanding ? (
        <p className="m-0 text-[13.5px] leading-[1.55] text-fg">
          {clarify.understanding}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {questions.map((q) => {
          const multi = Boolean(q.multiSelect);
          const allowAll = q.allowAllOptions !== false;
          const current = answers[q.id];
          const allSelected = isSelected(current, ALL_OPTIONS_KEY, false);
          return (
            <div key={q.id} className="flex flex-col gap-2">
              <p className="m-0 text-[13.5px] leading-[1.4] font-medium tracking-[-0.005em] text-fg">
                {q.group ? (
                  <span className="font-normal text-muted">{q.group} · </span>
                ) : null}
                {q.prompt}
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={q.prompt}>
                {allowAll ? (
                  <button
                    type="button"
                    className={chipClass}
                    data-selected={allSelected ? "true" : "false"}
                    aria-pressed={allSelected}
                    disabled={pending}
                    onClick={() => setAllOptions(q.id)}
                  >
                    All options
                  </button>
                ) : null}
                {q.options.map((opt) => {
                  const selected = isSelected(current, opt.value, multi);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={chipClass}
                      data-selected={selected ? "true" : "false"}
                      aria-pressed={selected}
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
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3.5">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!allAnswered || pending}
          onClick={handleBuild}
        >
          {pending ? "Starting build…" : "Build it"}
          {pending ? null : <ArrowRight size={14} className="btn-arrow" />}
        </button>
      </div>
      <p className="m-0 text-[12.5px] leading-[1.5] text-muted">
        Choosing <strong className="font-medium text-fg">All options</strong>{" "}
        turns that axis into a Studio enum control so you can switch variants
        later.
      </p>
    </div>
  );
}
