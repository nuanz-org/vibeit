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

import styles from "../styles.module.css";

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
    <div className={styles.form}>
      <form onSubmit={(e) => void onSubmit(e)} className={styles.form}>
        <label className={styles.label}>
          Vision
          <textarea
            className={styles.textarea}
            value={visionText}
            onChange={(e) => setVisionText(e.target.value)}
            rows={5}
            required
            disabled={pending || generating || isAwaitingClarify}
            placeholder="Describe the living design tool you want…"
          />
        </label>

        <label className={styles.label}>
          Model
          <select
            className={styles.select}
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
          <span className={styles.muted}>
            OpenRouter model for plan + codegen + repair. Options come from
            server config (LLM_MODELS_ALLOWED).
          </span>
          {modelsError ? (
            <span className={styles.error}>{modelsError}</span>
          ) : null}
        </label>

        <label className={styles.label}>
          Inspiration images (optional)
          <input
            className={styles.fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={pending || generating || isAwaitingClarify}
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              setInspirationFiles(list.slice(0, MAX_INSPIRATION));
            }}
          />
          <span className={styles.muted}>
            Up to {MAX_INSPIRATION} PNG/JPEG/WebP. Style is interpreted only —
            never copied 1:1.
            {inspirationFiles.length
              ? ` · ${inspirationFiles.length} selected`
              : null}
          </span>
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={planMode}
            disabled={pending || generating || isAwaitingClarify || Boolean(jobId)}
            onChange={(e) => setPlanMode(e.target.checked)}
          />
          <span>
            Plan with me
            <span className={styles.muted}>
              {" "}
              — short clarify questions first; “All options” becomes Studio enum
              controls
            </span>
          </span>
        </label>

        {quota ? (          <p className={styles.quota}>
            Creates today: {quota.createsUsed}/{quota.createsLimit}
            {quota.resetsAt ? ` · resets ${quota.resetsAt}` : null}
          </p>
        ) : (
          <p className={styles.muted}>
            One create uses your daily generation quota (default 10/day).
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.button}
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
              className={`${styles.button} ${styles.buttonGhost}`}
              onClick={reset}
            >
              New vision
            </button>
          ) : null}
        </div>
      </form>

      {submitError ? <p className={styles.error}>{submitError}</p> : null}

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

      {jobQuery.isError ? (        <p className={styles.error}>
          {jobQuery.error instanceof Error
            ? jobQuery.error.message
            : "Failed to poll job status"}
        </p>
      ) : null}

      {isSuccess && resultQuery.isLoading ? (
        <p className={styles.muted}>Opening Studio…</p>
      ) : null}

      {isSuccess && resultQuery.isError ? (
        <p className={styles.error}>
          Job succeeded but result could not be loaded.{" "}
          {resultQuery.error instanceof Error
            ? resultQuery.error.message
            : null}
        </p>
      ) : null}

      {isFailed ? (
        <div>
          <p className={styles.error}>
            {status?.errorMessage || "Generation failed"}
          </p>
          {salvageToolId ? (
            <p className={styles.muted}>
              A salvage draft was saved.{" "}
              <Link
                href={`/studio/${encodeURIComponent(salvageToolId)}`}
                className={styles.link}
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
