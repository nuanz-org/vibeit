"use client";

import { useCallback, useMemo, useState } from "react";

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
  const [jobId, setJobId] = useState<string | null>(null);
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
        <section className="flex flex-col gap-[0.55rem]">
          <h2 className="text-[0.72rem] font-[650] tracking-[0.06em] uppercase opacity-55">
            Refine
          </h2>
          <p className="text-sm opacity-55">Available on generated tools.</p>
        </section>
      );
    }

    return (
      <section
        className="flex flex-col gap-[0.55rem]"
        aria-label="Chat refine"
      >
        <h2 className="text-[0.72rem] font-[650] tracking-[0.06em] uppercase opacity-55">
          Refine
        </h2>
        <textarea
          className="mt-2 min-h-[4.5rem] w-full resize-y rounded-[10px] border border-foreground/14 bg-foreground/[0.04] px-3 py-[0.65rem] font-inherit text-[0.85rem] leading-snug text-inherit focus:outline-2 focus:outline-offset-1 focus:outline-foreground/28 disabled:cursor-not-allowed disabled:opacity-55"
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
        <div className="mt-[0.55rem] flex flex-wrap items-center gap-[0.65rem]">
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!enabled || busy || !message.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Refining…" : "Apply"}
          </button>
          {canRollback && onRollback ? (
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent font-inherit text-[0.8rem] text-inherit underline opacity-65 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={busy}
              onClick={onRollback}
            >
              Undo
            </button>
          ) : null}
        </div>
        {statusLine ? (
          <p className="mt-2 text-sm opacity-55">{statusLine}</p>
        ) : null}
        {error ? (
          <p className="text-[0.8rem] leading-snug text-[#b91c1c]">{error}</p>
        ) : null}
      </section>
    );
  }

  // Console layout for playground shell
  return (
    <div className={pg.chatBody}>
      <div className={pg.chatCard}>
        <div className={pg.panelHeader} style={{ paddingBottom: "0.35rem" }}>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-grid size-5 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#0000ff_0%,#0735ff_55%,#1c1d1f_140%)] text-[0.55rem] font-bold tracking-[-0.04em] text-white"
              aria-hidden
            >
              Ai
            </span>
            <h2 className={pg.panelTitle}>Chat</h2>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
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
                    <p className={pg.greetingTitle}>
                      {toolLabel?.trim() || "Your tool is ready"}
                    </p>
                    <p className={pg.greetingSub}>
                      Ask for more range on a control (e.g. gallery arc past 600),
                      set values, or structural changes. We expand controller
                      limits first — then you fine-tune in Controls.
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
                      variant={
                        m.kind === "error" ? "destructive" : undefined
                      }
                      header={m.role === "assistant" ? "Aiditr" : undefined}
                    >
                      {m.content}
                    </AiMessage>
                  </ChatThreadItem>
                ))}

                {busy ? (
                  <ChatThreadItem id="refine-busy" scrollAnchor>
                    <ChatStatusMarker pending>
                      Working on it — preview keeps the last good version
                      {statusLine ? ` · ${statusLine}` : null}
                    </ChatStatusMarker>
                  </ChatThreadItem>
                ) : null}
              </>
            )}
          </ChatThread>
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
