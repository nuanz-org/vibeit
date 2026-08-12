"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { UserMenu } from "@/features/auth/components/user-menu";
import {
  AiMessage,
  ChatStatusMarker,
  ChatThread,
  ChatThreadItem,
} from "@/features/chat";
import { ClarifyPanel } from "@/features/create/components/clarify-panel";
import { CreateStage, type CreateStageMode } from "@/features/create/components/create-stage";
import { JobProgress } from "@/features/create/components/job-progress";
import {
  ChatPanelCollapseButton,
  PlaygroundShell,
  playgroundStyles as pg,
} from "@/features/playground/components/playground-shell";
import {
  jobQueryKey,
  useJob,
  useJobResult,
} from "@/features/jobs/hooks/use-job";
import { uploadAsset } from "@/lib/api/assets";
import {
  CreateJobApiError,
  createJob,
  parseSalvageToolId,
  submitClarify,
  type ClarifyAnswerValue,
  type QuotaFields,
} from "@/lib/api/jobs";
import {
  fetchLlmModels,
  type LlmModelOption,
} from "@/lib/api/llm";

const MAX_INSPIRATION = 4;

const VISION_STARTERS = [
  {
    label: "Kinetic logo",
    vision:
      "A kinetic logo mark that loops — soft spring motion, brand-ready, exportable as a short loop.",
  },
  {
    label: "Social frame",
    vision:
      "A social media frame with animated border and title type — customizable colors and photo slot.",
  },
  {
    label: "Type poster",
    vision:
      "A kinetic typography poster — bold headline, staggered word motion, warm gradient backdrop.",
  },
  {
    label: "3D object",
    vision:
      "A simple 3D object on a soft gradient stage — orbiting light, tweakable material and color.",
  },
] as const;

const SEND_SPRING = {
  type: "spring" as const,
  stiffness: 520,
  damping: 28,
  mass: 0.6,
};

export type CreatePlaygroundProps = {
  userName?: string | null;
  userEmail?: string | null;
};

/**
 * Brickspace-class Create: chat-first vision composer + morph empty stage.
 */
export function CreatePlayground({
  userName,
  userEmail,
}: CreatePlaygroundProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const [visionText, setVisionText] = useState("");
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [inspirationPreviews, setInspirationPreviews] = useState<
    { key: string; name: string; url: string }[]
  >([]);
  useEffect(() => {
    const next = inspirationFiles.map((file, index) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setInspirationPreviews(next);
    return () => {
      for (const p of next) URL.revokeObjectURL(p.url);
    };
  }, [inspirationFiles]);
  const [modelOptions, setModelOptions] = useState<LlmModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaFields | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [clarifyPending, setClarifyPending] = useState(false);
  const [salvageToolId, setSalvageToolId] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);

  const jobQuery = useJob(jobId);
  const status = jobQuery.data;
  const isSuccess = status?.status === "succeeded";
  const isFailed = status?.status === "failed";
  const isAwaitingClarify = status?.status === "awaiting_clarify";
  /** Server-persisted chat history (user vision + agent turns). */
  const historyMessages = status?.messages ?? null;

  const resultQuery = useJobResult(jobId, Boolean(isSuccess));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const catalog = await fetchLlmModels();
        if (cancelled) return;
        setModelOptions(catalog.models ?? []);
        const preferred =
          catalog.defaultModel ||
          catalog.models?.find((m) => m.default)?.id ||
          catalog.models?.[0]?.id ||
          "";
        setSelectedModel(preferred);
        setModelsError(null);
      } catch (err) {
        if (cancelled) return;
        setModelsError(
          err instanceof Error ? err.message : "Could not load models",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status?.quota) setQuota(status.quota);
  }, [status?.quota]);

  useEffect(() => {
    if (!isSuccess || !resultQuery.data) return;
    const toolId = resultQuery.data.toolId;
    router.push(`/studio/${encodeURIComponent(toolId)}`);
  }, [isSuccess, resultQuery.data, router]);

  useEffect(() => {
    if (!isFailed) return;
    const id = parseSalvageToolId(status?.errorMessage);
    setSalvageToolId(id);
  }, [isFailed, status?.errorMessage]);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const vision = visionText.trim();
    if (!vision) return;

    setPending(true);
    setSubmitError(null);
    setJobId(null);
    setSalvageToolId(null);
    setQuotaBlocked(false);
    setLastSubmitted(vision);

    try {
      const inspirationAssetIds: string[] = [];
      for (const file of inspirationFiles.slice(0, MAX_INSPIRATION)) {
        const asset = await uploadAsset(file, "inspiration");
        if (asset?.id) inspirationAssetIds.push(asset.id);
      }

      const created = await createJob({
        visionText: vision,
        inspirationAssetIds:
          inspirationAssetIds.length > 0 ? inspirationAssetIds : undefined,
        model: selectedModel.trim() || undefined,
        planMode: planMode || undefined,
        clientMetadata: {
          uiSource: "create-playground",
          inspirationCount: inspirationAssetIds.length,
          model: selectedModel.trim() || undefined,
          planMode,
        },
      });
      setJobId(created.jobId);
      if (created.quota) setQuota(created.quota);
      setVisionText("");
      setInspirationFiles([]);
    } catch (err) {
      if (err instanceof CreateJobApiError) {
        setSubmitError(err.message);
        if (err.quota) setQuota(err.quota);
        if (err.errorCode === "QUOTA_EXCEEDED" || err.status === 429) {
          setQuotaBlocked(true);
        }
      } else {
        setSubmitError(err instanceof Error ? err.message : "Create failed");
      }
    } finally {
      setPending(false);
    }
  }

  async function onClarifySubmit(
    answers: Record<string, ClarifyAnswerValue>,
  ) {
    if (!jobId) return;
    setClarifyPending(true);
    setSubmitError(null);
    try {
      await submitClarify(jobId, { answers, buildNow: true });
      await queryClient.invalidateQueries({ queryKey: jobQueryKey(jobId) });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not submit answers",
      );
    } finally {
      setClarifyPending(false);
    }
  }

  function reset() {
    setJobId(null);
    setSubmitError(null);
    setSalvageToolId(null);
    setPending(false);
    setClarifyPending(false);
    setInspirationFiles([]);
    setLastSubmitted(null);
  }

  const generating =
    Boolean(jobId) && !isSuccess && !isFailed && !isAwaitingClarify;
  const overQuota =
    quotaBlocked ||
    (quota != null && quota.createsUsed >= quota.createsLimit);
  const canSend =
    Boolean(visionText.trim()) &&
    !pending &&
    !generating &&
    !isAwaitingClarify &&
    !overQuota;

  const greetingName =
    userName?.trim() ||
    (userEmail ? userEmail.split("@")[0] : null) ||
    null;

  const historyUserMessages =
    historyMessages?.filter((m) => m.role === "user") ?? [];
  const historyAssistantMessages =
    historyMessages?.filter(
      (m) =>
        m.role === "assistant" &&
        (m.kind === "clarify" ||
          m.kind === "success" ||
          m.kind === "error" ||
          m.kind === "status"),
    ) ?? [];
  /** Prefer server history; fall back to optimistic local submit. */
  const showUserFromLocal =
    Boolean(lastSubmitted) && historyUserMessages.length === 0;
  const showStarters =
    !jobId && !lastSubmitted && historyUserMessages.length === 0;

  const stageMode: CreateStageMode = generating
    ? "generating"
    : isAwaitingClarify
      ? "clarify"
      : isSuccess
        ? "opening"
        : isFailed
          ? "failed"
          : "idle";

  const chat = (
    <div className={pg.chatBody}>
      <div className={pg.chatCard}>
        <div className={pg.panelHeader}>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-block size-3.5 shrink-0 rounded-[2.5px] bg-primary"
              aria-hidden
            />
            <h2 className={pg.panelTitle}>Chat</h2>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {jobId ? (
              <button
                type="button"
                className={pg.btnGhost}
                style={{ fontSize: "0.75rem", minHeight: "1.75rem" }}
                onClick={reset}
              >
                New vision
              </button>
            ) : null}
            <ChatPanelCollapseButton />
          </div>
        </div>

        <div className={pg.chatScroll}>
          <ChatThread className="h-full min-h-0">
            <ChatThreadItem>
              <div className={pg.greeting}>
                <p className={pg.greetingTitle}>
                  {greetingName
                    ? `Hi ${greetingName}, what do you want to build?`
                    : "What do you want to build?"}
                </p>
                <p className={pg.greetingSub}>
                  Describe a living design tool — motion, brand mark, social
                  frame.
                </p>
                {showStarters ? (
                  <>
                    <p className="mt-[0.15rem] mb-0 w-full text-[0.72rem] text-muted-ink">
                      Or try one of these
                    </p>
                    <ul className="mt-[0.35rem] mb-0 flex list-none flex-wrap gap-[0.4rem] p-0">
                      {VISION_STARTERS.map((s) => (
                        <li key={s.label}>
                          <button
                            type="button"
                            className="cursor-pointer appearance-none rounded-[10px] bg-transparent px-[0.75rem] py-[0.45rem] text-xs font-medium font-[inherit] text-ink-secondary ring-1 ring-black/10 shadow-sm shadow-black/[0.06] transition-[background-color,box-shadow,color,transform] duration-ui ease-ui hover:-translate-y-px hover:bg-surface hover:text-ink hover:ring-black/15 active:scale-[0.98] dark:ring-white/10 dark:shadow-black/30 dark:hover:ring-white/15 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                            onClick={() => setVisionText(s.vision)}
                          >
                            {s.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </ChatThreadItem>

            {historyUserMessages.map((m) => (
              <ChatThreadItem key={m.id} id={`msg-${m.id}`}>
                <AiMessage role="user">{m.content}</AiMessage>
              </ChatThreadItem>
            ))}
            {showUserFromLocal && lastSubmitted ? (
              <ChatThreadItem id="user-vision">
                <AiMessage role="user">{lastSubmitted}</AiMessage>
              </ChatThreadItem>
            ) : null}

            {historyAssistantMessages.map((m) => {
              if (m.kind === "error") {
                return (
                  <ChatThreadItem key={m.id} id={`msg-${m.id}`}>
                    <AiMessage
                      role="assistant"
                      variant="destructive"
                      header="Generation failed"
                      footer={
                        salvageToolId ? (
                          <Link
                            href={`/studio/${encodeURIComponent(salvageToolId)}`}
                            className="text-primary underline-offset-3 hover:underline"
                          >
                            Open salvage draft in Studio
                          </Link>
                        ) : undefined
                      }
                    >
                      {m.content}
                    </AiMessage>
                  </ChatThreadItem>
                );
              }
              if (m.kind === "clarify") {
                return (
                  <ChatThreadItem key={m.id} id={`msg-${m.id}`}>
                    <AiMessage
                      role="assistant"
                      header="Aiditr"
                      variant="ghost"
                      showAvatar
                    >
                      {m.content}
                    </AiMessage>
                  </ChatThreadItem>
                );
              }
              return (
                <ChatThreadItem key={m.id} id={`msg-${m.id}`}>
                  <AiMessage role="assistant" header="Aiditr" showAvatar>
                    {m.content}
                  </AiMessage>
                </ChatThreadItem>
              );
            })}

            {jobId && !isAwaitingClarify && !isSuccess && !isFailed ? (
              <ChatThreadItem id="job-progress" scrollAnchor>
                <AiMessage
                  role="assistant"
                  header="Aiditr"
                  variant="ghost"
                  showAvatar
                >
                  <JobProgress status={status} jobId={jobId} />
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {jobId && isAwaitingClarify && status?.clarify ? (
              <ChatThreadItem id="clarify" scrollAnchor>
                <AiMessage
                  role="assistant"
                  header="A few questions"
                  variant="ghost"
                  showAvatar
                >
                  <ClarifyPanel
                    clarify={status.clarify}
                    pending={clarifyPending}
                    onSubmit={(answers) => void onClarifySubmit(answers)}
                  />
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {submitError ? (
              <ChatThreadItem id="submit-error" scrollAnchor>
                <AiMessage role="assistant" variant="destructive" header="Error">
                  {submitError}
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {jobQuery.isError ? (
              <ChatThreadItem id="poll-error" scrollAnchor>
                <AiMessage role="assistant" variant="destructive" header="Error">
                  {jobQuery.error instanceof Error
                    ? jobQuery.error.message
                    : "Failed to poll job status"}
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {isSuccess && resultQuery.isLoading ? (
              <ChatThreadItem id="opening-studio" scrollAnchor>
                <ChatStatusMarker pending>
                  Opening Studio…
                </ChatStatusMarker>
              </ChatThreadItem>
            ) : null}

            {isSuccess && resultQuery.isError ? (
              <ChatThreadItem id="result-error" scrollAnchor>
                <AiMessage role="assistant" variant="destructive" header="Error">
                  Job succeeded but result could not be loaded.
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {isFailed &&
            !historyAssistantMessages.some((m) => m.kind === "error") ? (
              <ChatThreadItem id="job-failed" scrollAnchor>
                <AiMessage
                  role="assistant"
                  variant="destructive"
                  header="Generation failed"
                  footer={
                    salvageToolId ? (
                      <Link
                        href={`/studio/${encodeURIComponent(salvageToolId)}`}
                        className="text-primary underline-offset-3 hover:underline"
                      >
                        Open salvage draft in Studio
                      </Link>
                    ) : undefined
                  }
                >
                  {status?.errorMessage || "Generation failed"}
                </AiMessage>
              </ChatThreadItem>
            ) : null}
          </ChatThread>
        </div>

        <form
          className={pg.chatComposer}
          onSubmit={(e) => void onSubmit(e)}
        >
          <textarea
            className={pg.composerInput}
            value={visionText}
            onChange={(e) => setVisionText(e.target.value)}
            rows={3}
            required
            disabled={pending || generating || isAwaitingClarify}
            placeholder="Describe your vision…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void onSubmit();
              }
            }}
          />
          {inspirationPreviews.length > 0 ? (
            <ul
              className="m-0 flex list-none flex-wrap gap-[0.45rem] p-0"
              aria-label="Inspiration images"
            >
              {inspirationPreviews.map((p, index) => (
                <li
                  key={p.key}
                  className="relative size-14 shrink-0 overflow-hidden rounded-[10px] ring-1 ring-black/10 shadow-sm shadow-black/10 dark:ring-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.name}
                    className="block size-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 h-[1.1rem] min-w-[1.1rem] rounded-full bg-black/55 px-[0.2rem] text-center text-[0.62rem] font-bold leading-[1.1rem] text-white">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 grid size-[1.15rem] cursor-pointer place-items-center rounded-full border-none bg-black/55 p-0 text-[0.85rem] leading-none text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={pending || generating || isAwaitingClarify}
                    aria-label={`Remove ${p.name}`}
                    onClick={() =>
                      setInspirationFiles((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className={pg.composerFooter}>
            <div className={pg.composerMeta}>
              <label className={pg.attachBtn} title="Add inspiration images">
                <PlusIcon />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={
                    pending ||
                    generating ||
                    isAwaitingClarify ||
                    inspirationFiles.length >= MAX_INSPIRATION
                  }
                  onChange={(e) => {
                    const list = e.target.files
                      ? Array.from(e.target.files)
                      : [];
                    e.target.value = "";
                    if (!list.length) return;
                    setInspirationFiles((prev) => {
                      const room = MAX_INSPIRATION - prev.length;
                      if (room <= 0) return prev;
                      return [...prev, ...list.slice(0, room)];
                    });
                  }}
                />
              </label>
              {inspirationFiles.length > 0 ? (
                <span className={pg.muted}>
                  {inspirationFiles.length}/{MAX_INSPIRATION}
                </span>
              ) : null}
              <select
                className={pg.selectCompact}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={
                  pending || generating || modelOptions.length === 0
                }
                title="Model"
              >
                {modelOptions.length === 0 ? (
                  <option value="">Models…</option>
                ) : (
                  modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))
                )}
              </select>
              <label
                className={pg.muted}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={planMode}
                  disabled={
                    pending ||
                    generating ||
                    isAwaitingClarify ||
                    Boolean(jobId)
                  }
                  onChange={(e) => setPlanMode(e.target.checked)}
                />
                Plan
              </label>
            </div>
            <div className={pg.composerActions}>
              {quota ? (
                <span className={pg.muted}>
                  {quota.createsUsed}/{quota.createsLimit}
                </span>
              ) : null}
              <motion.button
                type="submit"
                className={pg.btnSend}
                disabled={!canSend}
                aria-label={
                  pending
                    ? "Starting"
                    : generating
                      ? "Generating"
                      : overQuota
                        ? "Quota reached"
                        : "Generate tool"
                }
                whileTap={reduce || !canSend ? undefined : { scale: 0.92 }}
                animate={
                  reduce
                    ? undefined
                    : {
                        scale: canSend ? 1 : 0.96,
                        backgroundColor: canSend
                          ? "var(--ink, var(--foreground))"
                          : undefined,
                      }
                }
                transition={SEND_SPRING}
              >
                <SendIcon />
              </motion.button>
            </div>
          </div>
          {modelsError ? (
            <p className="m-0 text-sm leading-[1.4] text-[#b91c1c]">
              {modelsError}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );

  const stage = (
    <div className={pg.stageInner}>
      <CreateStage mode={stageMode} phase={status?.phase} />
    </div>
  );

  return (
    <PlaygroundShell
      title="New tool"
      headerMeta={
        generating ? (
          <span className={`${pg.chip} ${pg.chipWarn}`}>generating</span>
        ) : null
      }
      headerActions={<UserMenu variant="avatar" />}
      chat={chat}
      stage={stage}
    />
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3.25V12.75M3.25 8H12.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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
