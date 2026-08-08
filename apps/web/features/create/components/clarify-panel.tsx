"use client";

import { useMemo, useState } from "react";

import type {
  ClarifyAnswerValue,
  ClarifyQuestion,
  JobClarifyState,
} from "@/lib/api/jobs";

import styles from "../styles.module.css";

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
    <div className={styles.clarifyCard}>
      <div className={styles.progressHeader}>
        <span className={styles.progressTitle}>Plan with me</span>
        <span className={styles.progressStatus} data-status="awaiting_clarify">
          awaiting answers
        </span>
      </div>

      {clarify.understanding ? (
        <p className={styles.clarifyUnderstanding}>{clarify.understanding}</p>
      ) : null}

      <div className={styles.clarifyQuestions}>
        {questions.map((q) => {
          const multi = Boolean(q.multiSelect);
          const allowAll = q.allowAllOptions !== false;
          const current = answers[q.id];
          return (
            <div key={q.id} className={styles.clarifyQuestion}>
              <p className={styles.clarifyPrompt}>
                {q.group ? (
                  <span className={styles.clarifyGroup}>{q.group} · </span>
                ) : null}
                {q.prompt}
              </p>
              <div className={styles.chipRow} role="group" aria-label={q.prompt}>
                {allowAll ? (
                  <button
                    type="button"
                    className={styles.chip}
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
                    className={styles.chip}
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

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={!allAnswered || pending}
          onClick={handleBuild}
        >
          {pending ? "Starting build…" : "Build it"}
        </button>
      </div>
      <p className={styles.muted}>
        Choosing <strong>All options</strong> turns that axis into a Studio enum
        control so you can switch variants later.
      </p>
    </div>
  );
}
