"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Alert,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Close,
  Plus,
} from "@/components/icons";
import { UserMenu } from "@/features/auth/components/user-menu";
import {
  AiMessage,
  ChatStatusMarker,
  ChatThread,
  ChatThreadItem,
} from "@/features/chat";
import { ClarifyPanel } from "@/features/create/components/clarify-panel";
import {
  CreateStage,
  type CreateStageMode,
} from "@/features/create/components/create-stage";
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
import { fetchLlmModels, type LlmModelOption } from "@/lib/api/llm";
import { cn } from "@/lib/utils";

const MAX_INSPIRATION = 4;

const VISION_STARTERS = [
  {
    label: "Kinetic logo",
    hint: "A mark that loops with soft motion",
    glyph: "logo",
    vision:
      "A kinetic logo mark that loops — soft spring motion, brand-ready, exportable as a short loop.",
  },
  {
    label: "Social frame",
    hint: "Animated border, title and photo slot",
    glyph: "frame",
    vision:
      "A social media frame with animated border and title type — customisable colours and photo slot.",
  },
  {
    label: "Type poster",
    hint: "Bold headline with staggered motion",
    glyph: "type",
    vision:
      "A kinetic typography poster — bold headline, staggered word motion, warm gradient backdrop.",
  },
  {
    label: "3D object",
    hint: "An object, a light, tweakable material",
    glyph: "cube",
    vision:
      "A simple 3D object on a soft gradient stage — orbiting light, tweakable material and colour.",
  },
] as const;

/*
 * Create-only chrome on top of the shared playground styles: quiet starter
 * rows that fill the composer, and a composer whose tools (attach, model,
 * Plan) stay edgeless until hovered. Plan inks once checked. The send is the
 * one accent on screen, and only once there is something to send.
 */

/** Starter prompt: a quiet row (glyph tile, name, one-line hint). */
const starterRow = cn(
  "group flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent px-2 py-2 text-left",
  "transition-[background-color,border-color] duration-fast ease-standard",
  "hover:border-border hover:bg-bg",
);

const starterGlyph = cn(
  "grid size-9 shrink-0 place-items-center rounded-[8px] border border-border bg-bg text-muted",
  "transition-colors duration-fast ease-standard group-hover:text-fg",
);

/** "Plan" checkbox as a quiet composer tool; ink once checked. */
const planToggle = cn(
  pg.composerTool,
  "has-[:checked]:bg-fg! has-[:checked]:text-bg!",
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid",
);

/** 16px line glyphs for the starters, drawn on the house icon grid. */
function StarterGlyph({
  kind,
}: {
  kind: (typeof VISION_STARTERS)[number]["glyph"];
}) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "logo" ? (
        <>
          <circle cx="8" cy="8" r="5.5" />
          <circle cx="8" cy="2.5" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r="2" />
        </>
      ) : kind === "frame" ? (
        <>
          <rect x="2.5" y="2" width="11" height="12" rx="1.5" />
          <rect x="4.5" y="4" width="7" height="5" rx="0.5" />
          <path d="M4.5 11.5h4" />
        </>
      ) : kind === "type" ? (
        <path d="M3 13l3.2-9h.6L10 13M4.2 10h4.6M11 8.5h3M12.5 7v6" />
      ) : (
        <>
          <path d="M8 2l5.2 3v6L8 14l-5.2-3V5z" />
          <path d="M2.8 5L8 8l5.2-3M8 8v6" />
        </>
      )}
    </svg>
  );
}

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

  async function onClarifySubmit(answers: Record<string, ClarifyAnswerValue>) {
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
    quotaBlocked || (quota != null && quota.createsUsed >= quota.createsLimit);
  const canSend =
    Boolean(visionText.trim()) &&
    !pending &&
    !generating &&
    !isAwaitingClarify &&
    !overQuota;

  const rawGreetingName =
    userName?.trim().split(/\s+/)[0] ||
    (userEmail ? userEmail.split("@")[0] : null) ||
    null;
  const greetingName = rawGreetingName
    ? rawGreetingName.charAt(0).toUpperCase() + rawGreetingName.slice(1)
    : null;

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
                {greetingName ? (
                  <p className="t-label m-0 text-muted">Hi {greetingName}</p>
                ) : null}
                <p className={pg.greetingTitle}>What do you want to build?</p>
                <p className={pg.greetingSub}>
                  Describe a design tool in a sentence. You get a live canvas,
                  controls and export.
                </p>
                {showStarters ? (
                  <>
                    <p className="t-label m-0 mt-5 mb-1 text-muted">
                      Start from
                    </p>
                    <ul className="-mx-2 m-0 flex list-none flex-col gap-0.5 p-0">
                      {VISION_STARTERS.map((s) => (
                        <li key={s.label}>
                          <button
                            type="button"
                            className={starterRow}
                            onClick={() => setVisionText(s.vision)}
                          >
                            <span className={starterGlyph}>
                              <StarterGlyph kind={s.glyph} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-[13.5px] font-medium leading-tight tracking-[-0.01em] text-fg">
                                {s.label}
                              </span>
                              <span className="truncate text-[12.5px] leading-tight text-muted">
                                {s.hint}
                              </span>
                            </span>
                            <ArrowUpRight
                              size={14}
                              className="shrink-0 text-muted opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 group-focus-visible:opacity-100"
                            />
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
                <AiMessage
                  role="assistant"
                  variant="destructive"
                  header="Error"
                >
                  {submitError}
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {jobQuery.isError ? (
              <ChatThreadItem id="poll-error" scrollAnchor>
                <AiMessage
                  role="assistant"
                  variant="destructive"
                  header="Error"
                >
                  {jobQuery.error instanceof Error
                    ? jobQuery.error.message
                    : "Failed to poll job status"}
                </AiMessage>
              </ChatThreadItem>
            ) : null}

            {isSuccess && resultQuery.isLoading ? (
              <ChatThreadItem id="opening-studio" scrollAnchor>
                <ChatStatusMarker pending>Opening Studio…</ChatStatusMarker>
              </ChatThreadItem>
            ) : null}

            {isSuccess && resultQuery.isError ? (
              <ChatThreadItem id="result-error" scrollAnchor>
                <AiMessage
                  role="assistant"
                  variant="destructive"
                  header="Error"
                >
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

        <form className={pg.chatComposer} onSubmit={(e) => void onSubmit(e)}>
          <div className={pg.composerCard}>
            <textarea
              className={pg.composerInput}
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
            <div className={pg.composerFooter}>
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
                <span className="relative inline-flex min-w-0">
                  <select
                    className={cn(
                      pg.composerTool,
                      "max-w-[10.5rem] appearance-none truncate pr-7",
                    )}
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
                  <ChevronDown
                    size={12}
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted"
                  />
                </span>
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
