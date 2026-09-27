"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Alert, Close } from "@/components/icons";
import { ClarifyPanel } from "@/features/create/components/clarify-panel";
import { JobProgress } from "@/features/create/components/job-progress";
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

const DEFAULT_VISION =
  "A kinetic 9:16 social frame with a bold headline, purple accent pulse, and a logo slot";

const MAX_INSPIRATION = 4;

/* Landing controls (ui/controls.tsx §3.9 / §3.13): label, field, helper. */
const labelCls =
  "text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg";

const fieldCls =
  "block w-full rounded-[8px] border border-border bg-bg px-3 text-[13.5px] leading-[1.35] text-fg transition-colors duration-fast ease-standard placeholder:text-muted hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45";

const helperCls = "m-0 text-[12.5px] leading-[1.5] text-muted";

/** Native file input dressed as an outline pill. */
const fileCls =
  "max-w-full text-[12.5px] text-muted file:mr-3 file:h-8 file:cursor-pointer file:rounded-full file:border file:border-border-strong file:bg-bg file:px-3 file:text-[12.5px] file:font-medium file:text-fg file:transition-colors file:duration-fast file:ease-standard hover:file:border-fg disabled:cursor-not-allowed disabled:opacity-45";

/** Error line: ink text with an alert icon — no red fills. */
function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-fg">
      <Alert size={14} className="mt-px shrink-0 text-danger" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Create form: vision + optional inspiration images → job → poll → Studio.
 * AM5: inspirationAssetIds flow into style extract before plan.
 * Model picker: GET /api/v1/llm/models → POST /jobs { model }.
 * A3: planMode → clarify questions → Build it → resume pipeline.
 */
export function CreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [visionText, setVisionText] = useState(DEFAULT_VISION);
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

  const jobQuery = useJob(jobId);
  const status = jobQuery.data;
  const isSuccess = status?.status === "succeeded";
  const isFailed = status?.status === "failed";
  const isAwaitingClarify = status?.status === "awaiting_clarify";

  const resultQuery = useJobResult(jobId, Boolean(isSuccess));
  // Load selectable models from server config
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

  // Keep quota from latest status
  useEffect(() => {
    if (status?.quota) setQuota(status.quota);
  }, [status?.quota]);

  // Success → fetch result → redirect Studio
  useEffect(() => {
    if (!isSuccess || !resultQuery.data) return;
    const toolId = resultQuery.data.toolId;
    router.push(`/studio/${encodeURIComponent(toolId)}`);
  }, [isSuccess, resultQuery.data, router]);

  // Failure → parse salvage
  useEffect(() => {
    if (!isFailed) return;
    const id = parseSalvageToolId(status?.errorMessage);
    setSalvageToolId(id);
  }, [isFailed, status?.errorMessage]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vision = visionText.trim();
    if (!vision) return;

    setPending(true);
    setSubmitError(null);
    setJobId(null);
    setSalvageToolId(null);
    setQuotaBlocked(false);

    try {
      // AM5: upload inspiration images first (optional)
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
          uiSource: "create-form-a3",
          inspirationCount: inspirationAssetIds.length,
          model: selectedModel.trim() || undefined,
          planMode,
        },
      });
      setJobId(created.jobId);
      if (created.quota) setQuota(created.quota);
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
      // Resume polling after re-queue
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
  }

  const generating =
    Boolean(jobId) && !isSuccess && !isFailed && !isAwaitingClarify;
  const overQuota =
    quotaBlocked ||
    (quota != null && quota.createsUsed >= quota.createsLimit);
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Vision</span>
          <textarea
            className={cn(fieldCls, "min-h-[120px] resize-y py-2")}
            value={visionText}
            onChange={(e) => setVisionText(e.target.value)}
            rows={5}
            required
            disabled={pending || generating || isAwaitingClarify}
            placeholder="Describe a tool…"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Model</span>
          <select
            className={cn(fieldCls, "h-9 max-w-[28rem] cursor-pointer pointer-coarse:h-11")}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={pending || generating || modelOptions.length === 0}
          >
            {modelOptions.length === 0 ? (
              <option value="">Loading models…</option>
            ) : (
              modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.default ? " (default)" : ""}
                </option>
              ))
            )}
          </select>
          <span className={helperCls}>
            OpenRouter model for plan, codegen and repair. Options come from
            server config (<span className="t-mono text-[11.5px]">LLM_MODELS_ALLOWED</span>).
          </span>
          {modelsError ? <ErrorLine>{modelsError}</ErrorLine> : null}
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Inspiration images (optional)</span>
          <input
            className={fileCls}
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
              const list = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              if (!list.length) return;
              setInspirationFiles((prev) => {
                const room = MAX_INSPIRATION - prev.length;
                if (room <= 0) return prev;
                // Append; keep first-selected order (visual tray L→R).
                return [...prev, ...list.slice(0, room)];
              });
            }}
          />
          {inspirationPreviews.length > 0 ? (
            <ul
              className="m-0 flex list-none flex-wrap gap-1.5 p-0"
              aria-label="Inspiration images"
            >
              {inspirationPreviews.map((p, index) => (
                <li
                  key={p.key}
                  className="relative size-14 shrink-0 overflow-hidden rounded-[6px] border border-border bg-workspace"
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
          <span className={helperCls}>
            Up to {MAX_INSPIRATION} PNG, JPEG or WebP images. Pick several at
            once or add more. Style is interpreted, never copied 1:1.
            {inspirationFiles.length ? (
              <>
                {" · "}
                <span className="t-mono text-[11.5px]">
                  {inspirationFiles.length}
                </span>{" "}
                selected
              </>
            ) : null}
          </span>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-px size-4 shrink-0 cursor-pointer accent-fg disabled:cursor-not-allowed"
            checked={planMode}
            disabled={pending || generating || isAwaitingClarify || Boolean(jobId)}
            onChange={(e) => setPlanMode(e.target.checked)}
          />
          <span className="flex flex-col gap-1">
            <span className={labelCls}>Plan with me</span>
            <span className={helperCls}>
              Short clarifying questions first. “All options” becomes a
              Studio enum control.
            </span>
          </span>
        </label>

        {quota ? (
          <p className={helperCls}>
            Creates today:{" "}
            <span className="t-mono text-[11.5px] text-fg">
              {quota.createsUsed}/{quota.createsLimit}
            </span>
            {quota.resetsAt ? (
              <>
                {" · resets "}
                <span className="t-mono text-[11.5px]">{quota.resetsAt}</span>
              </>
            ) : null}
          </p>
        ) : (
          <p className={helperCls}>
            One create uses your daily generation quota (default{" "}
            <span className="t-mono text-[11.5px]">10</span> a day).
          </p>
        )}

        <div className="flex flex-col gap-3 xs:flex-row xs:items-center">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              pending ||
              generating ||
              !visionText.trim() ||
              overQuota
            }
          >
            {pending
              ? "Starting…"
              : generating
                ? "Generating…"
                : overQuota
                  ? "Quota reached"
                  : planMode
                    ? "Plan with me"
                    : "Generate tool"}
          </button>
          {jobId ? (
            <button type="button" className="btn btn-outline" onClick={reset}>
              New vision
            </button>
          ) : null}
        </div>
      </form>

      {submitError ? <ErrorLine>{submitError}</ErrorLine> : null}

      {jobId && !isAwaitingClarify ? (
        <JobProgress status={status} jobId={jobId} />
      ) : null}

      {jobId && isAwaitingClarify && status?.clarify ? (
        <ClarifyPanel
          clarify={status.clarify}
          pending={clarifyPending}
          onSubmit={(answers) => void onClarifySubmit(answers)}
        />
      ) : null}

      {jobQuery.isError ? (
        <ErrorLine>
          {jobQuery.error instanceof Error
            ? jobQuery.error.message
            : "Failed to poll job status"}
        </ErrorLine>
      ) : null}

      {isSuccess && resultQuery.isLoading ? (
        <p className="t-label m-0 flex items-center gap-2 text-muted">
          <span
            className="live-dot size-1.5 rounded-full bg-accent-text"
            aria-hidden="true"
          />
          Opening Studio…
        </p>
      ) : null}

      {isSuccess && resultQuery.isError ? (
        <ErrorLine>
          Job succeeded but result could not be loaded.{" "}
          {resultQuery.error instanceof Error
            ? resultQuery.error.message
            : null}
        </ErrorLine>
      ) : null}

      {isFailed ? (
        <div className="flex flex-col gap-1.5">
          <ErrorLine>{status?.errorMessage || "Generation failed"}</ErrorLine>
          {salvageToolId ? (
            <p className={helperCls}>
              A salvage draft was saved.{" "}
              <Link
                href={`/studio/${encodeURIComponent(salvageToolId)}`}
                className="link-draw font-medium text-accent-text"
              >
                Open draft in Studio
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
