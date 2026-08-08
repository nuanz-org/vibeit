"use client";

import { useCallback, useState } from "react";

import {
  playgroundStyles as pg,
} from "@/features/playground/components/playground-shell";
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
  /** When true, fills playground chat column as a console card. */
  consoleLayout?: boolean;
  toolLabel?: string | null;
};

type Phase = "idle" | "queued" | "running" | "succeeded" | "failed";

/**
 * AM7b — Studio refine chat (Chat Console layout for playground shell).
 */
export function RefineChatPanel({
  toolId,
  versionId,
  sourceCode,
  disabled,
  onApplied,
  onRollback,
  canRollback,
  consoleLayout = false,
  toolLabel,
}: RefineChatPanelProps) {
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  const busy = phase === "queued" || phase === "running";
  const enabled = Boolean(toolId && sourceCode?.trim()) && !disabled;

  const submit = useCallback(async () => {
    if (!toolId || !message.trim() || busy) return;
    setError(null);
    setPhase("queued");
    setStatusLine("Starting refine…");
    const text = message.trim();
    setLastUserMessage(text);
    const previous = {
      versionId: versionId ?? null,
      sourceCode: sourceCode ?? null,
    };

    try {
      const created = await startRefineJob(toolId, {
        message: text,
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

  if (!consoleLayout) {
    if (!toolId) {
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Refine</h2>
          <p className={styles.muted}>Available on generated tools.</p>
        </section>
      );
    }

    return (
      <section className={styles.section} aria-label="Chat refine">
        <h2 className={styles.sectionTitle}>Refine</h2>
        <textarea
          className={styles.refineInput}
          rows={3}
          value={message}
          disabled={!enabled || busy}
          placeholder="Describe a change…"
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
            {busy ? "Refining…" : "Apply"}
          </button>
          {canRollback && onRollback ? (
            <button
              type="button"
              className={styles.linkButton}
              disabled={busy}
              onClick={onRollback}
            >
              Undo
            </button>
          ) : null}
        </div>
        {statusLine ? (
          <p className={styles.muted} style={{ marginTop: 8 }}>
            {statusLine}
          </p>
        ) : null}
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </section>
    );
  }

  // Console layout for playground shell
  return (
    <div className={pg.chatBody}>
      <div className={pg.chatCard}>
        <div className={pg.panelHeader} style={{ paddingBottom: "0.35rem" }}>
          <h2 className={pg.panelTitle}>Chat</h2>
          {canRollback && onRollback ? (
            <button
              type="button"
              className={pg.btnGhost}
              style={{ fontSize: "0.75rem", minHeight: "1.75rem" }}
              disabled={busy}
              onClick={onRollback}
            >
              Undo refine
            </button>
          ) : null}
        </div>

        <div className={pg.chatScroll}>
          {!toolId ? (
            <div className={pg.greeting}>
              <p className={pg.greetingTitle}>Fixture mode</p>
              <p className={pg.greetingSub}>
                Chat refine is available on generated tools.
              </p>
            </div>
          ) : (
            <>
              <div className={pg.greeting}>
                <p className={pg.greetingTitle}>
                  {toolLabel?.trim() || "Your tool is ready"}
                </p>
                <p className={pg.greetingSub}>
                  Ask for structural or creative changes. Param tweaks stay in
                  Controls.
                </p>
              </div>

              {lastUserMessage ? (
                <div className={styles.chatBubbleUser}>
                  <p>{lastUserMessage}</p>
                </div>
              ) : null}

              {statusLine || busy || phase === "succeeded" || error ? (
                <div className={styles.chatBubbleAssistant}>
                  {busy ? (
                    <p>Working on it — preview keeps the last good version.</p>
                  ) : null}
                  {statusLine && !busy ? (
                    <p>
                      {statusLine}
                      {jobId ? ` · ${jobId.slice(0, 8)}…` : null}
                    </p>
                  ) : null}
                  {error ? (
                    <p className={styles.errorText} style={{ marginTop: 4 }}>
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className={pg.chatComposer}>
          <textarea
            className={pg.composerInput}
            rows={3}
            value={message}
            disabled={!enabled || busy}
            placeholder="Describe a change…"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div className={pg.composerFooter}>
            <span className={pg.muted}>Enter to send</span>
            <div className={pg.composerActions}>
              <button
                type="button"
                className={pg.btnSend}
                disabled={!enabled || busy || !message.trim()}
                onClick={() => void submit()}
                aria-label={busy ? "Refining" : "Send refine"}
                title="Send"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 12.5V3.5M8 3.5L4 7.5M8 3.5L12 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
