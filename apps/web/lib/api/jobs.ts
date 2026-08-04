import { getApiBaseUrl } from "./config";

/** M0e CreateJobRequest (wire camelCase). */
export type CreateJobRequest = {
  visionText: string;
  inspirationAssetIds?: string[];
  clientMetadata?: Record<string, unknown>;
};

/** M0e CreateJobResponse (+ optional M1a stub userId). */
export type CreateJobResponse = {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  createdAt: string;
  userId?: string;
};

/**
 * POST /api/v1/jobs with session cookie (credentials include).
 * Used by Create proof UI (M1a); real Create flow is M3.
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
    throw new Error(
      `Create job failed (${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  return res.json() as Promise<CreateJobResponse>;
}
