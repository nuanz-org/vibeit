import { getApiBaseUrl } from "./config";
import {
  CreateJobApiError,
  getJobResult,
  getJobStatus,
  type JobResultResponse,
  type JobStatusResponse,
  type QuotaFields,
} from "./jobs";

export type RefineJobRequest = {
  message: string;
  baseVersionId?: string;
  /** Live Control slider values (preferred over last draft PATCH) */
  clientParams?: Record<string, unknown>;
};

export type RefineJobResponse = {
  jobId: string;
  toolId: string;
  baseVersionId: string;
  status: string;
  createdAt: string;
  jobKind?: string;
  refine?: {
    refineUsed: number;
    refineLimit: number;
  };
};

/**
 * POST /api/v1/tools/{toolId}/refine — enqueue Control refine (AM7).
 */
export async function startRefineJob(
  toolId: string,
  body: RefineJobRequest,
): Promise<RefineJobResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/tools/${encodeURIComponent(toolId)}/refine`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        baseVersionId: body.baseVersionId,
        clientParams: body.clientParams,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errorCode: string | undefined;
    let quota: QuotaFields | undefined;
    let message = `Refine failed (${res.status})${text ? `: ${text}` : ""}`;
    try {
      const parsed = JSON.parse(text) as {
        errorCode?: string;
        errorMessage?: string;
        detail?: string;
        quota?: QuotaFields;
      };
      if (parsed.errorCode) errorCode = parsed.errorCode;
      if (parsed.quota) quota = parsed.quota;
      if (parsed.errorMessage) message = parsed.errorMessage;
      else if (typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      /* plain text */
    }
    throw new CreateJobApiError(message, {
      status: res.status,
      errorCode,
      quota,
    });
  }

  return res.json() as Promise<RefineJobResponse>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll job status until terminal; return status + result when succeeded.
 */
export async function pollRefineJob(
  jobId: string,
  opts?: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatus?: (s: JobStatusResponse) => void;
  },
): Promise<{
  status: JobStatusResponse;
  result: JobResultResponse | null;
}> {
  const interval = opts?.intervalMs ?? 1500;
  const timeout = opts?.timeoutMs ?? 180_000;
  const started = Date.now();

  while (Date.now() - started < timeout) {
    const status = await getJobStatus(jobId);
    opts?.onStatus?.(status);
    if (status.status === "succeeded") {
      const result = await getJobResult(jobId);
      return { status, result };
    }
    if (status.status === "failed") {
      return { status, result: null };
    }
    await sleep(interval);
  }

  throw new Error("Refine timed out while polling");
}
