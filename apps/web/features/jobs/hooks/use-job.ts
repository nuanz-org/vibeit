"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getJobResult,
  getJobStatus,
  type JobResultResponse,
  type JobStatus,
  type JobStatusResponse,
} from "@/lib/api/jobs";

const TERMINAL: JobStatus[] = ["succeeded", "failed"];

export function jobQueryKey(jobId: string | null) {
  return ["jobs", jobId] as const;
}

/**
 * Poll job status until terminal (M3g).
 * refetchInterval: 1.2s while queued/running; stop when succeeded/failed.
 */
export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: jobQueryKey(jobId),
    queryFn: () => getJobStatus(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL.includes(status)) return false;
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
