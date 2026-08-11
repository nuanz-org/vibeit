"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
        <label className="flex flex-col gap-1.5 text-[0.9rem] font-medium">
          Vision
          <textarea
            className="min-h-[120px] w-full resize-y rounded-[10px] border border-foreground/14 bg-transparent px-[0.85rem] py-3 font-[inherit] leading-[1.45] text-inherit focus:outline-2 focus:outline-offset-1 focus:outline-foreground/25"
            value={visionText}
            onChange={(e) => setVisionText(e.target.value)}
            rows={5}
            required
            disabled={pending || generating || isAwaitingClarify}
            placeholder="Describe the living design tool you want…"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[0.9rem] font-medium">
          Model
          <select
            className="w-full max-w-[28rem] rounded-[10px] border border-foreground/14 bg-transparent px-3 py-[0.6rem] font-[inherit] text-inherit focus:outline-2 focus:outline-offset-1 focus:outline-foreground/25 disabled:cursor-not-allowed disabled:opacity-55"
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
          <span className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
            OpenRouter model for plan + codegen + repair. Options come from
            server config (LLM_MODELS_ALLOWED).
          </span>
          {modelsError ? (
            <span className="m-0 text-sm leading-[1.4] text-[#b91c1c]">
              {modelsError}
            </span>
          ) : null}
        </label>

        <div className="flex flex-col gap-1.5 text-[0.9rem] font-medium">
          <span>Inspiration images (optional)</span>
          <input
            className="max-w-full font-[inherit] text-sm"
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
              className="m-0 flex list-none flex-wrap gap-[0.45rem] p-0"
              aria-label="Inspiration images"
            >
              {inspirationPreviews.map((p, index) => (
                <li
                  key={p.key}
                  className="relative size-14 shrink-0 overflow-hidden rounded-[10px] border border-foreground/12"
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
          <span className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
            Up to {MAX_INSPIRATION} PNG/JPEG/WebP — multi-select or add more.
            Style is interpreted only — never copied 1:1.
            {inspirationFiles.length
              ? ` · ${inspirationFiles.length} selected`
              : null}
          </span>
        </div>

        <label className="flex cursor-pointer items-start gap-[0.55rem] text-[0.9rem] font-medium leading-[1.4]">
          <input
            type="checkbox"
            className="mt-[0.2rem] size-4 shrink-0"
            checked={planMode}
            disabled={pending || generating || isAwaitingClarify || Boolean(jobId)}
            onChange={(e) => setPlanMode(e.target.checked)}
          />
          <span>
            Plan with me
            <span className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
              {" "}
              — short clarify questions first; “All options” becomes Studio enum
              controls
            </span>
          </span>
        </label>

        {quota ? (
          <p className="text-[0.8rem] opacity-70">
            Creates today: {quota.createsUsed}/{quota.createsLimit}
            {quota.resetsAt ? ` · resets ${quota.resetsAt}` : null}
          </p>
        ) : (
          <p className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
            One create uses your daily generation quota (default 10/day).
          </p>
        )}

        <div className="flex flex-wrap items-center gap-[0.65rem]">
          <button
            type="submit"
            className="h-12 cursor-pointer rounded-full border-none bg-primary px-6 font-[inherit] text-[15px] font-medium text-primary-foreground transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-base-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
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
            <button
              type="button"
              className={cn(
                "h-12 cursor-pointer rounded-full border border-border bg-transparent px-6 font-[inherit] text-[15px] font-medium text-inherit transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#F8F8F8] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-secondary",
              )}
              onClick={reset}
            >
              New vision
            </button>
          ) : null}
        </div>
      </form>

      {submitError ? (
        <p className="m-0 text-sm leading-[1.4] text-[#b91c1c]">{submitError}</p>
      ) : null}

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
        <p className="m-0 text-sm leading-[1.4] text-[#b91c1c]">
          {jobQuery.error instanceof Error
            ? jobQuery.error.message
            : "Failed to poll job status"}
        </p>
      ) : null}

      {isSuccess && resultQuery.isLoading ? (
        <p className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
          Opening Studio…
        </p>
      ) : null}

      {isSuccess && resultQuery.isError ? (
        <p className="m-0 text-sm leading-[1.4] text-[#b91c1c]">
          Job succeeded but result could not be loaded.{" "}
          {resultQuery.error instanceof Error
            ? resultQuery.error.message
            : null}
        </p>
      ) : null}

      {isFailed ? (
        <div>
          <p className="m-0 text-sm leading-[1.4] text-[#b91c1c]">
            {status?.errorMessage || "Generation failed"}
          </p>
          {salvageToolId ? (
            <p className="m-0 text-[0.85rem] leading-[1.45] opacity-65">
              A salvage draft was saved.{" "}
              <Link
                href={`/studio/${encodeURIComponent(salvageToolId)}`}
                className="font-medium text-inherit underline"
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
