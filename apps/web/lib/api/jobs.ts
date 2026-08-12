import { getApiBaseUrl } from "./config";

/** M0e + A3 CreateJobRequest (wire camelCase). */
export type CreateJobRequest = {
  visionText: string;
  inspirationAssetIds?: string[];
  clientMetadata?: Record<string, unknown>;
  /** OpenRouter model id from Create picker (must be server-allowed). */
  model?: string;
  /** A3: run clarify interview before plan/codegen. */
  planMode?: boolean;
};

export type JobStatus =
  | "queued"
  | "running"
  | "awaiting_clarify"
  | "succeeded"
  | "failed";

export type JobPhase = "clarify" | "plan" | "codegen" | "validate" | "repair";

export type QuotaFields = {
  createsUsed: number;
  createsLimit: number;
  resetsAt?: string;
};

export type ClarifyOption = {
  value: string;
  label: string;
  description?: string;
};

export type ClarifyQuestion = {
  id: string;
  prompt: string;
  options: ClarifyOption[];
  multiSelect?: boolean;
  allowAllOptions?: boolean;
  group?: string;
};

export type ClarifyAnswerValue =
  | string
  | string[]
  | { type: "all_options" };

export type ClarifyForcedEnum = {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  default: string;
  group?: string;
  sourceQuestionId: string;
};

export type ClarifyResult = {
  transcript: string;
  forcedEnums: ClarifyForcedEnum[];
  lockedNotes: string[];
  summary?: string;
};

export type JobClarifyState = {
  understanding?: string;
  questions?: ClarifyQuestion[];
  answers?: Record<string, ClarifyAnswerValue>;
  result?: ClarifyResult;
  answered?: boolean;
  skipReason?: string;
};

/** M0e CreateJobResponse (+ optional debug userId). */
export type CreateJobResponse = {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  userId?: string;
  quota?: QuotaFields;
  planMode?: boolean;
};

/** Persisted chat turn on a generation job. */
export type JobChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: string | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
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
  quota?: QuotaFields | null;
  planMode?: boolean | null;
  clarify?: JobClarifyState | null;
  /** Ordered user/assistant history for this job. */
  messages?: JobChatMessage[] | null;
};

export type ClarifyJobRequest = {
  answers: Record<string, ClarifyAnswerValue>;
  buildNow?: boolean;
};

export type ClarifyJobResponse = {
  jobId: string;
  status: JobStatus;
  clarify?: JobClarifyState | null;
  updatedAt?: string | null;
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

export class CreateJobApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly quota?: QuotaFields;

  constructor(
    message: string,
    opts: { status: number; errorCode?: string; quota?: QuotaFields },
  ) {
    super(message);
    this.name = "CreateJobApiError";
    this.status = opts.status;
    this.errorCode = opts.errorCode;
    this.quota = opts.quota;
  }
}

/**
 * POST /api/v1/jobs with session cookie (credentials include).
 * M3a+: persists job + draft tool; may 429 on quota.
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
    const text = await res.text().catch(() => "");
    let errorCode: string | undefined;
    let quota: QuotaFields | undefined;
    let message = `Create job failed (${res.status})${text ? `: ${text}` : ""}`;
    try {
      const parsed = JSON.parse(text) as {
        errorCode?: string;
        errorMessage?: string;
        quota?: QuotaFields;
      };
      if (parsed.errorCode) errorCode = parsed.errorCode;
      if (parsed.quota) quota = parsed.quota;
      if (parsed.errorMessage) {
        message = parsed.errorMessage;
      }
    } catch {
      /* plain text body */
    }
    throw new CreateJobApiError(message, {
      status: res.status,
      errorCode,
      quota,
    });
  }

  return res.json() as Promise<CreateJobResponse>;
}

/** POST /api/v1/jobs/{jobId}/clarify — A3 answers → resume build. */
export async function submitClarify(
  jobId: string,
  body: ClarifyJobRequest,
): Promise<ClarifyJobResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}/clarify`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `Clarify failed (${res.status})${text ? `: ${text}` : ""}`;
    try {
      const parsed = JSON.parse(text) as {
        detail?: string;
        errorMessage?: string;
      };
      if (parsed.errorMessage) message = parsed.errorMessage;
      else if (typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      /* plain */
    }
    throw new CreateJobApiError(message, { status: res.status });
  }

  return res.json() as Promise<ClarifyJobResponse>;
}

/** Parse salvage tool id from failed job errorMessage (M3e). */
export function parseSalvageToolId(
  errorMessage: string | null | undefined,
): string | null {
  if (!errorMessage) return null;
  const m = errorMessage.match(/salvage_draft=true\s+toolId=([0-9a-fA-F-]{36})/);
  return m?.[1] ?? null;
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
