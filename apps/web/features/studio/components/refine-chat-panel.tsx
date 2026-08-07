"use client";

import { useCallback, useState } from "react";

import { CreateJobApiError } from "@/lib/api/jobs";
import { pollRefineJob, startRefineJob } from "@/lib/api/refine";
import { getTool, type ToolResponse } from "@/lib/api/tools";

import styles from "../styles.module.css";

export type RefineAppliedPayload = {
  tool: ToolResponse;
  previous: {
    versionId: string | null;
    sourceCode: string | null;
  };
};

export type RefineChatPanelProps = {
  toolId: string | null | undefined;
  versionId: string | null | undefined;
  sourceCode: string | null | undefined;
  disabled?: boolean;
  onApplied: (payload: RefineAppliedPayload) => void;
  onRollback?: () => void;
  canRollback?: boolean;
};

type Phase = "idle" | "queued" | "running" | "succeeded" | "failed";

/**
 * AM7b — Studio Control refine chat.
 * Enqueues patch job, polls status, reloads tool on success; keeps last-good for undo.
 */
export function RefineChatPanel({
  toolId,
  versionId,
  sourceCode,
  disabled,
  onApplied,
  onRollback,
  canRollback,
}: RefineChatPanelProps) {
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const busy = phase === "queued" || phase === "running";
  const enabled = Boolean(toolId && sourceCode?.trim()) && !disabled;

  const submit = useCallback(async () => {
    if (!toolId || !message.trim() || busy) return;
    setError(null);
    setPhase("queued");
    setStatusLine("Starting refine…");
    const previous = {
      versionId: versionId ?? null,
      sourceCode: sourceCode ?? null,
    };

    try {
      const created = await startRefineJob(toolId, {
        message: message.trim(),
        baseVersionId: versionId ?? undefined,
      });
      setJobId(created.jobId);
      setStatusLine(
        created.refine
          ? `Queued · refine ${created.refine.refineUsed}/${created.refine.refineLimit}`
          : "Queued…",
      );

      const { status, result } = await pollRefineJob(created.jobId, {
        onStatus: (s) => {
          setPhase(
            s.status === "running"
              ? "running"
              : s.status === "queued"
                ? "queued"
                : s.status === "succeeded"
                  ? "succeeded"
                  : s.status === "failed"
                    ? "failed"
                    : "running",
          );
          const phaseLabel = s.phase ? ` · ${s.phase}` : "";
          setStatusLine(`${s.status}${phaseLabel}`);
        },
      });

      if (status.status === "failed" || !result) {
        setPhase("failed");
        setError(
          status.errorMessage ||
            status.errorCode ||
            "Refine failed — previous version kept",
        );
        setStatusLine("Failed · last-good kept");
        return;
      }

      const tool = await getTool(toolId);
      setPhase("succeeded");
      setStatusLine("Applied new version");
      setMessage("");
      onApplied({ tool, previous });
    } catch (err) {
      setPhase("failed");
      if (err instanceof CreateJobApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Refine failed");
      }
      setStatusLine("Failed · last-good kept");
    }
  }, [toolId, message, busy, versionId, sourceCode, onApplied]);

  if (!toolId) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Refine (chat)</h2>
        <p className={styles.muted}>
          Chat refine is available on generated tools (not fixtures).
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Chat refine">
      <h2 className={styles.sectionTitle}>Refine (chat)</h2>
      <p className={styles.muted}>
        Describe a structural or creative change. Param-only tweaks prefer a
        cheap patch; bigger edits re-run gates before landing a new version.
      </p>
      <textarea
        className={styles.refineInput}
        rows={3}
        value={message}
        disabled={!enabled || busy}
        placeholder='e.g. "make particles slower and add a subtitle"'
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className={styles.refineActions}>
        <button
          type="button"
          className={styles.button}
          disabled={!enabled || busy || !message.trim()}
          onClick={() => void submit()}
        >
          {busy ? "Refining…" : "Apply refine"}
        </button>
        {canRollback && onRollback ? (
          <button
            type="button"
            className={styles.linkButton}
            disabled={busy}
            onClick={onRollback}
            title="Restore the version from before the last successful refine"
          >
            Undo last refine
          </button>
        ) : null}
      </div>
      {statusLine ? (
        <p className={styles.muted} style={{ marginTop: 8 }}>
          {statusLine}
          {jobId ? (
            <>
              {" "}
              · <code style={{ fontSize: "0.75em" }}>{jobId.slice(0, 8)}…</code>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
      {busy ? (
        <p className={styles.okText} style={{ marginTop: 6 }}>
          Refining — preview stays on last-good until the new version passes
          gates.
        </p>
      ) : null}
    </section>
  );
}
