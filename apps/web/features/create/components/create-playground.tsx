"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Alert, ArrowUp, Close, Plus } from "@/components/icons";
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
import { cn } from "@/lib/utils";

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
      "A social media frame with animated border and title type — customisable colours and photo slot.",
  },
  {
    label: "Type poster",
    vision:
      "A kinetic typography poster — bold headline, staggered word motion, warm gradient backdrop.",
  },
  {
    label: "3D object",
    vision:
      "A simple 3D object on a soft gradient stage — orbiting light, tweakable material and colour.",
  },
] as const;

/*
 * Create-only chrome on top of the shared playground styles (landing
 * HowItWorks §3.6 / §3.12–3.14): outline quick-reply pills, a 12px composer
 * card that inks its edge on focus, and a pill "Plan" toggle whose checked
 * state is ink. The composer's send is the one accent on screen.
 */

/** Starter prompts: outline pills that fill the composer. */
const starterPill = cn(
  "hit inline-flex h-8 cursor-pointer items-center rounded-full border border-border bg-surface px-3 pointer-coarse:h-11",
  "text-[12.5px] text-fg transition-colors duration-fast ease-standard hover:border-fg",
);

/** Composer card: 12px, hairline; the edge turns ink while typing. */
const composerCard = cn(
  "flex flex-col rounded-[12px] border border-border bg-surface",
  "transition-colors duration-fast ease-standard focus-within:border-fg",
);

/** "Plan" checkbox as a pill toggle: strong hairline off, ink on. */
const planToggle = cn(
  "hit inline-flex h-8 cursor-pointer items-center rounded-full border px-3 pointer-coarse:h-11",
  "text-[12.5px] font-medium transition-colors duration-fast ease-standard",
  "border-border-strong bg-bg text-fg hover:border-fg",
  "has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-bg",
  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45",
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid",
);

/** Salvage link under a failed build. */
const salvageLink = "link-draw text-[12.5px] font-medium text-accent-text";

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

  const salvageFooter = salvageToolId ? (
    <Link
      href={`/studio/${encodeURIComponent(salvageToolId)}`}
      className={salvageLink}
    >
      Open salvage draft in Studio
    </Link>
  ) : undefined;

  const chat = (
    <div className={pg.chatBody}>
      <div className={pg.chatCard}>
        <div className={pg.panelHeader}>
          <h2 className={pg.panelTitle}>Chat</h2>
          <div className="flex shrink-0 items-center gap-1">
            {jobId ? (
              <button
                type="button"
                className={cn(
                  pg.btn,
                  pg.btnGhost,
                  "hit h-8 px-3 text-[12.5px]",
                )}
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
                    <p className="t-label m-0 mt-3 text-muted">
                      Or try one of these
                    </p>
                    <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                      {VISION_STARTERS.map((s) => (
                        <li key={s.label}>
                          <button
                            type="button"
                            className={starterPill}
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
                      footer={salvageFooter}
                    >
                      {m.content}
                    </AiMessage>
                  </ChatThreadItem>
                );
              }
              if (m.kind === "clarify") {
                return (
                  <ChatThreadItem key={m.id} id={`msg-${m.id}`}>
                    <AiMessage role="assistant" header="Aiditr" variant="ghost">
                      {m.content}
                    </AiMessage>
                  </ChatThreadItem>
                );
              }
              return (
                <ChatThreadItem key={m.id} id={`msg-${m.id}`}>
                  <AiMessage role="assistant" header="Aiditr">
                    {m.content}
                  </AiMessage>
                </ChatThreadItem>
              );
            })}

            {jobId && !isAwaitingClarify && !isSuccess && !isFailed ? (
              <ChatThreadItem id="job-progress" scrollAnchor>
                <AiMessage role="assistant" header="Aiditr" variant="ghost">
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
                  footer={salvageFooter}
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
          <div className={composerCard}>
            <textarea
              className={cn(pg.composerInput, "px-3 pt-2.5 pb-1")}
              value={visionText}
              onChange={(e) => setVisionText(e.target.value)}
              rows={3}
              required
              disabled={pending || generating || isAwaitingClarify}
              placeholder="Describe a tool…"
              aria-label="Describe a tool"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) void onSubmit();
                }
              }}
            />
            {inspirationPreviews.length > 0 ? (
              <ul
                className="m-0 flex list-none flex-wrap gap-1.5 px-3 pt-1 pb-1.5"
                aria-label="Inspiration images"
              >
                {inspirationPreviews.map((p, index) => (
                  <li
                    key={p.key}
                    className="relative size-12 shrink-0 overflow-hidden rounded-[6px] border border-border bg-workspace"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.name}
                      className="block size-full object-cover"
                    />
                    <span
                      className="t-mono pointer-events-none absolute bottom-0.5 left-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-black/65 px-1 text-[10px] leading-none text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 grid size-5 cursor-pointer place-items-center rounded-full bg-black/65 text-white transition-opacity duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={pending || generating || isAwaitingClarify}
                      aria-label={`Remove ${p.name}`}
                      onClick={() =>
                        setInspirationFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Close size={10} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={cn(pg.composerFooter, "px-2 pb-2")}>
              <div className={pg.composerMeta}>
                <label className={pg.attachBtn} title="Add inspiration images">
                  <Plus size={14} />
                  <span className="sr-only">Add inspiration images</span>
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
                  <span
                    className="t-mono text-[11px] text-muted"
                    title="Inspiration images"
                  >
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
                  aria-label="Model"
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
                  className={planToggle}
                  title="Plan with me: short questions first"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
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
                  <span
                    className="t-mono text-[11px] text-muted"
                    title="Creates today"
                  >
                    {quota.createsUsed}/{quota.createsLimit}
                  </span>
                ) : null}
                <button
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
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
          {modelsError ? (
            <p className="m-0 flex items-start gap-1.5 px-1 text-[12.5px] leading-[1.45] text-fg">
              <Alert size={14} className="mt-px shrink-0 text-danger" />
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
          <span className={pg.chip}>
            <span className={pg.liveDot} aria-hidden="true" />
            Building
          </span>
        ) : null
      }
      headerActions={<UserMenu variant="avatar" />}
      chat={chat}
      stage={stage}
    />
  );
}
