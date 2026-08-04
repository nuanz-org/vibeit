import { getApiBaseUrl } from "./config";

/** M0e CreateJobRequest (wire camelCase). */
export type CreateJobRequest = {
  visionText: string;
  inspirationAssetIds?: string[];
  clientMetadata?: Record<string, unknown>;
};

export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type JobPhase = "plan" | "codegen" | "validate" | "repair";

/** M0e CreateJobResponse (+ optional debug userId). */
export type CreateJobResponse = {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  userId?: string;
  quota?: {
    createsUsed: number;
    createsLimit: number;
    resetsAt?: string;
  };
};

export type JobStatusResponse = {
  jobId: string;
  status: JobStatus;
  phase?: JobPhase | null;
  progress?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  resultReady?: boolean | null;
  updatedAt?: string | null;
  repair?: {
    maxRepairs: number;
    repairsUsed: number;
    tokenBudget?: number | null;
    tokensUsed?: number | null;
    wallTimeMs?: number | null;
    wallTimeUsedMs?: number | null;
  } | null;
  quota?: CreateJobResponse["quota"] | null;
};

export type JobResultResponse = {
  jobId: string;
  toolId: string;
  versionId: string;
  target: string;
  publicId?: string | null;
  completedAt?: string | null;
};

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text ? `: ${text}` : "";
}

/**
 * POST /api/v1/jobs with session cookie (credentials include).
 * M3a: persists job + draft tool (queued until worker).
 */
export async function createJob(
  body: CreateJobRequest,
): Promise<CreateJobResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/jobs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(
      `Create job failed (${res.status})${await readError(res)}`,
    );
  }

  return res.json() as Promise<CreateJobResponse>;
}

/** GET /api/v1/jobs/{jobId} — owner poll. */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!res.ok) {
    throw new Error(
      `Get job status failed (${res.status})${await readError(res)}`,
    );
  }

  return res.json() as Promise<JobStatusResponse>;
}

/**
 * GET /api/v1/jobs/{jobId}/result — only when status is succeeded.
 * Returns 409 while still queued/running/failed.
 */
export async function getJobResult(jobId: string): Promise<JobResultResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}/result`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!res.ok) {
    throw new Error(
      `Get job result failed (${res.status})${await readError(res)}`,
    );
  }

  return res.json() as Promise<JobResultResponse>;
}
