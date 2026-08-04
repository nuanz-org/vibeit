"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { JobProgress } from "@/features/create/components/job-progress";
import { useJob, useJobResult } from "@/features/jobs/hooks/use-job";
import {
  CreateJobApiError,
  createJob,
  parseSalvageToolId,
  type QuotaFields,
} from "@/lib/api/jobs";

import styles from "../styles.module.css";

const DEFAULT_VISION =
  "A kinetic 9:16 social frame with a bold headline, purple accent pulse, and a logo slot";

/**
 * M3g Create form: vision → job → poll → Studio (or salvage).
 */
export function CreateForm() {
  const router = useRouter();
  const [visionText, setVisionText] = useState(DEFAULT_VISION);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaFields | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [salvageToolId, setSalvageToolId] = useState<string | null>(null);

  const jobQuery = useJob(jobId);
  const status = jobQuery.data;
  const isSuccess = status?.status === "succeeded";
  const isFailed = status?.status === "failed";

  const resultQuery = useJobResult(jobId, Boolean(isSuccess));

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
      const created = await createJob({
        visionText: vision,
        clientMetadata: { uiSource: "create-form-m3g" },
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

  function reset() {
    setJobId(null);
    setSubmitError(null);
    setSalvageToolId(null);
    setPending(false);
  }

  const generating = Boolean(jobId) && !isSuccess && !isFailed;
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
            disabled={pending || generating}
            placeholder="Describe the living design tool you want…"
          />
        </label>

        {quota ? (
          <p className={styles.quota}>
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

      {jobId ? (
        <JobProgress status={status} jobId={jobId} />
      ) : null}

      {jobQuery.isError ? (
        <p className={styles.error}>
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
