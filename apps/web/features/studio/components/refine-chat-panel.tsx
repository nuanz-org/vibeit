"use client";

import { useCallback, useMemo, useState } from "react";

import { ArrowUp } from "@/components/icons";
import {
  AiMessage,
  ChatStatusMarker,
  ChatThread,
  ChatThreadItem,
} from "@/features/chat";
import {
  ChatPanelCollapseButton,
  playgroundStyles as pg,
} from "@/features/playground/components/playground-shell";
import { CreateJobApiError } from "@/lib/api/jobs";
import { pollRefineJob, startRefineJob } from "@/lib/api/refine";
import { getTool, type ToolResponse } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

import { ErrorNote, inputCls } from "../lib/studio-ui";

export type RefineChatMessage = {
  id?: string;
  role: string;
  content: string;
  kind?: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
};

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
  /** Tool-scoped history from GET tool.chatHistory */
  initialHistory?: RefineChatMessage[] | null;
  /** Live Control params to send as clientParams */
  getClientParams?: () => Record<string, unknown>;
};

type Phase = "idle" | "queued" | "running" | "succeeded" | "failed";

/**
 * AM7b — Studio refine chat (continuous capability agent).
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
  initialHistory,
  getClientParams,
}: RefineChatPanelProps) {
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setJobId] = useState<string | null>(null);
  const [history, setHistory] = useState<RefineChatMessage[]>(() =>
    Array.isArray(initialHistory) ? initialHistory : [],
  );

  const busy = phase === "queued" || phase === "running";
  const enabled = Boolean(toolId && sourceCode?.trim()) && !disabled;

  const thread = useMemo(() => {
    return history.filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    );
  }, [history]);

  const submit = useCallback(async () => {
    if (!toolId || !message.trim() || busy) return;
    setError(null);
    setPhase("queued");
    setStatusLine("Starting refine…");
    const text = message.trim();
    const previous = {
      versionId: versionId ?? null,
      sourceCode: sourceCode ?? null,
    };

    const optimisticUser: RefineChatMessage = {
      role: "user",
      content: text,
      kind: "refine",
      createdAt: new Date().toISOString(),
    };
    setHistory((h) => [...h, optimisticUser]);
    setMessage("");

    try {
      const clientParams = getClientParams?.() ?? undefined;
      const created = await startRefineJob(toolId, {
        message: text,
        baseVersionId: versionId ?? undefined,
        clientParams,
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
        const errText =
          status.errorMessage ||
          status.errorCode ||
          "Refine failed — previous version kept";
        setError(errText);
        setStatusLine("Failed · last-good kept");
        setHistory((h) => [
          ...h,
          {
            role: "assistant",
            content: errText,
            kind: "error",
          },
        ]);
        return;
      }

      const tool = await getTool(toolId);
      if (Array.isArray(tool.chatHistory) && tool.chatHistory.length > 0) {
        setHistory(tool.chatHistory as RefineChatMessage[]);
      } else {
        const assistantText =
          status.messages
            ?.slice()
            .reverse()
            .find((m) => m.role === "assistant")?.content ||
          "Applied controller updates.";
        setHistory((h) => [
          ...h,
          {
            role: "assistant",
            content: assistantText,
            kind: "refine_result",
          },
        ]);
      }
      setPhase("succeeded");
      setStatusLine("Applied");
      onApplied({ tool, previous });
    } catch (err) {
      setPhase("failed");
      let errText = "Refine failed";
      if (err instanceof CreateJobApiError) {
        errText = err.message;
      } else if (err instanceof Error) {
        errText = err.message;
      }
      setError(errText);
      setStatusLine("Failed · last-good kept");
      setHistory((h) => [
        ...h,
        { role: "assistant", content: errText, kind: "error" },
      ]);
    }
  }, [
    toolId,
    message,
    busy,
    versionId,
    sourceCode,
    onApplied,
    getClientParams,
  ]);

  if (!consoleLayout) {
    if (!toolId) {
      return (
        <section className="flex flex-col gap-2">
          <h2 className={pg.panelTitle}>Refine</h2>
          <p className={pg.muted}>Available on generated tools.</p>
        </section>
      );
    }

    return (
      <section className="flex flex-col gap-3" aria-label="Chat refine">
        <h2 className={pg.panelTitle}>Refine</h2>
        <textarea
          className={cn(inputCls, "resize-none py-2")}
          rows={3}
          value={message}
          disabled={!enabled || busy}
          placeholder="Ask for a change…"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!enabled || busy || !message.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Refining…" : "Apply"}
          </button>
          {canRollback && onRollback ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={onRollback}
            >
              Undo
            </button>
          ) : null}
        </div>
        {statusLine ? (
          <p className="t-label flex items-center gap-2 text-muted">
            {busy ? (
              <span
                aria-hidden="true"
                className="live-dot size-1.5 rounded-full bg-accent-text"
              />
            ) : null}
            {statusLine}
          </p>
        ) : null}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </section>
    );
  }

  // Console layout for playground shell
  return (
    <div className={pg.chatBody}>
      <div className={pg.chatCard}>
        <div className={pg.panelHeader}>
          <h2 className={pg.panelTitle}>Chat</h2>
          <div className="flex shrink-0 items-center gap-0.5">
            {canRollback && onRollback ? (
              <button
                type="button"
                className={cn(
                  pg.btn,
                  pg.btnGhost,
                  "hit h-8 px-3 text-[12.5px]",
                )}
                disabled={busy}
                onClick={onRollback}
              >
                Undo
              </button>
            ) : null}
            <ChatPanelCollapseButton />
          </div>
        </div>

        <div className={pg.chatScroll}>
          <ChatThread className="h-full min-h-0">
            {!toolId ? (
              <ChatThreadItem>
                <div className={pg.greeting}>
                  <p className={pg.greetingTitle}>Fixture mode</p>
                  <p className={pg.greetingSub}>
                    Chat refine is available on generated tools.
                  </p>
                </div>
              </ChatThreadItem>
            ) : (
              <>
                <ChatThreadItem>
                  <div className={pg.greeting}>
                    <p className="t-label m-0 text-muted">Your tool</p>
                    <p
                      className="m-0 line-clamp-3 text-[15px] leading-[1.4] font-medium tracking-[-0.01em] text-balance text-fg"
                      title={toolLabel?.trim() || undefined}
                    >
                      {toolLabel?.trim() || "Your tool is ready"}
                    </p>
                    <p className={pg.greetingSub}>
                      Ask for a change — a new control, more range, a different
                      look. Fine-tune the rest in Controls.
                    </p>
                  </div>
                </ChatThreadItem>

                {thread.map((m, i) => (
                  <ChatThreadItem
                    key={m.id || `${m.role}-${m.createdAt || i}-${i}`}
                    id={m.id}
                  >
                    <AiMessage
                      role={m.role === "user" ? "user" : "assistant"}
                      variant={m.kind === "error" ? "destructive" : undefined}
                      header={m.role === "assistant" ? "Aiditr" : undefined}
                    >
                      {m.content}
                    </AiMessage>
                  </ChatThreadItem>
                ))}

                {busy ? (
                  <ChatThreadItem id="refine-busy" scrollAnchor>
                    <ChatStatusMarker pending>
                      Working on it. The preview keeps the last good version
                      {statusLine ? ` · ${statusLine}` : null}
                    </ChatStatusMarker>
                  </ChatThreadItem>
                ) : null}
              </>
            )}
          </ChatThread>
        </div>

        <div className={pg.chatComposer}>
          <div className={pg.composerCard}>
            <textarea
              className={pg.composerInput}
              rows={3}
              value={message}
              disabled={!enabled || busy}
              placeholder="Ask for a change…"
              aria-label="Ask for a change"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <div className={pg.composerFooter}>
              <span className="t-mono px-1.5 text-[11px] text-muted">
                ↵ send · ⇧↵ new line
              </span>
              <div className={pg.composerActions}>
                <button
                  type="button"
                  className={pg.btnSend}
                  disabled={!enabled || busy || !message.trim()}
                  onClick={() => void submit()}
                  aria-label={busy ? "Refining" : "Send refine"}
                  title="Send"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
