"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getJobResult,
  getJobStatus,
  type JobResultResponse,
  type JobStatus,
  type JobStatusResponse,
} from "@/lib/api/jobs";

/** Stop auto-poll on terminal or when user must answer clarify. */
const POLL_PAUSED: JobStatus[] = ["succeeded", "failed", "awaiting_clarify"];

export function jobQueryKey(jobId: string | null) {
  return ["jobs", jobId] as const;
}

/**
 * Poll job status until terminal or awaiting_clarify (M3g + A3).
 * refetchInterval: 1.2s while queued/running; stop when succeeded/failed/awaiting_clarify.
 */
export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: jobQueryKey(jobId),
    queryFn: () => getJobStatus(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || POLL_PAUSED.includes(status)) return false;
      return 1200;
    },
  });
}
export function useJobResult(jobId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...jobQueryKey(jobId), "result"] as const,
    queryFn: () => getJobResult(jobId!),
    enabled: Boolean(jobId) && enabled,
    retry: 1,
  });
}

export type { JobResultResponse, JobStatusResponse };
