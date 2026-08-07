/**
 * Job API shapes (M0e).
 *
 * Create-job / status / result / error / quota DTOs for M1a stubs and M3 worker.
 * TS is source of truth; Python Pydantic mirrors can land with M1a.
 *
 * Status machine: queued → running → succeeded | failed
 * Invariant: failed never becomes ready/published.
 *
 * Transport MVP: client polls GET status (SSE optional later).
 *
 * Docs: md/contracts/job-api.md
 */

import type { TargetId } from "./targets";

// ---------------------------------------------------------------------------
// Status machine
// ---------------------------------------------------------------------------

/**
 * Terminal-aware job lifecycle.
 *
 * ```
 * queued → running → succeeded
 *                  ↘ failed
 * ```
 *
 * Invariant: **`failed` never becomes ready/published.**
 * Only `succeeded` may attach a publishable tool version.
 */
export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export const JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
] as const satisfies readonly JobStatus[];

/** Terminal states (no further worker progress). */
export type TerminalJobStatus = "succeeded" | "failed";

export function isTerminalJobStatus(status: JobStatus): status is TerminalJobStatus {
  return status === "succeeded" || status === "failed";
}

/**
 * Whether this status may lead to publish/gallery readiness.
 * Failed jobs must never be treated as publishable.
 */
export function jobMayBecomePublished(status: JobStatus): boolean {
  return status === "succeeded";
}

/**
 * Coarse worker phase while `status === "running"` (optional on poll).
 * Aligns with Create graph stages (M3).
 */
export type JobPhase = "plan" | "codegen" | "validate" | "repair";

export const JOB_PHASES = [
  "plan",
  "codegen",
  "validate",
  "repair",
] as const satisfies readonly JobPhase[];

// ---------------------------------------------------------------------------
// Error codes (provisional — extend later, do not bikeshed)
// ---------------------------------------------------------------------------

export type JobErrorCode =
  | "UNAUTHORIZED"
  | "QUOTA_EXCEEDED"
  | "VALIDATION_FAILED"
  | "GENERATION_FAILED"
  | "TIMEOUT"
  | "INTERNAL";

export const JOB_ERROR_CODES = [
  "UNAUTHORIZED",
  "QUOTA_EXCEEDED",
  "VALIDATION_FAILED",
  "GENERATION_FAILED",
  "TIMEOUT",
  "INTERNAL",
] as const satisfies readonly JobErrorCode[];

export const JOB_ERROR_CODE_MEANING: Record<JobErrorCode, string> = {
  UNAUTHORIZED: "No or invalid session",
  QUOTA_EXCEEDED: "Daily create quota hit",
  VALIDATION_FAILED: "Bad input or contract validation failed",
  GENERATION_FAILED: "Agent/runtime failure after repairs exhausted",
  TIMEOUT: "Wall-time budget exceeded",
  INTERNAL: "Unexpected server error",
};

// ---------------------------------------------------------------------------
// Quota + repair budget
// ---------------------------------------------------------------------------

/**
 * Per-user create quota (live from Create).
 * Maps loosely to generation_jobs / user quota store (M1b+).
 */
export interface QuotaFields {
  createsUsed: number;
  createsLimit: number;
  /** ISO-8601 when the quota window resets. */
  resetsAt?: string;
}

/**
 * Per-job repair / cost budget (worker-enforced in M3).
 * DB: repair_budget / repairs_used + token/cost fields on generation_jobs.
 */
export interface RepairBudgetFields {
  maxRepairs: number;
  repairsUsed: number;
  /** Optional token budget for the whole job. */
  tokenBudget?: number;
  tokensUsed?: number;
  /** Optional wall-clock budget in ms. */
  wallTimeMs?: number;
  wallTimeUsedMs?: number;
}

// ---------------------------------------------------------------------------
// Request / response DTOs
// ---------------------------------------------------------------------------

/**
 * POST create job — start Create from vision text.
 * Aligns with generation_jobs: vision_text, inspiration_asset_ids.
 */
export interface CreateJobRequest {
  /** User vision / prompt text. */
  visionText: string;
  /** Optional inspiration asset ids (uploaded earlier). */
  inspirationAssetIds?: string[];
  /**
   * Optional client-only metadata (jsonb-friendly).
   * Not required for generation; must not carry secrets.
   */
  clientMetadata?: Record<string, unknown>;
  /**
   * Optional OpenRouter model id from the Create picker.
   * Must be in the server's LLM_MODELS_ALLOWED menu.
   */
  model?: string;
}

/** Immediate accept of a create job (usually status `queued`). */
export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  /** ISO-8601 */
  createdAt: string;
  /** Echo quota after accept when available. */
  quota?: QuotaFields;
}

/**
 * GET job status — poll until terminal.
 * SSE is optional later; MVP is refetchInterval polling.
 */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  /** Present while running; omit when queued/terminal if unknown. */
  phase?: JobPhase;
  /**
   * Optional progress fraction in **[0, 1]**.
   * Host may omit; UI should not require it.
   */
  progress?: number;
  /** Set when status is failed (and sometimes validation failures on accept). */
  errorCode?: JobErrorCode;
  errorMessage?: string;
  quota?: QuotaFields;
  repair?: RepairBudgetFields;
  /** ISO-8601 last update. */
  updatedAt?: string;
  /**
   * Hint that JobResultResponse is available.
   * Only true when status === "succeeded".
   */
  resultReady?: boolean;
}

/**
 * GET job result — success payload only.
 * Call when status is succeeded (or resultReady).
 * Failed jobs must not return a publishable result.
 */
export interface JobResultResponse {
  jobId: string;
  toolId: string;
  versionId: string;
  target: TargetId;
  /** Public id if already assigned (often draft until M8 publish). */
  publicId?: string;
  /** ISO-8601 when the version was created. */
  completedAt?: string;
}

/**
 * Error body shape for failed HTTP or failed job terminal state.
 * Jobs embed errorCode/errorMessage on JobStatusResponse; HTTP errors may use this envelope.
 */
export interface JobErrorBody {
  errorCode: JobErrorCode;
  errorMessage: string;
  jobId?: string;
  quota?: QuotaFields;
}

// ---------------------------------------------------------------------------
// Suggested HTTP surface (MVP polling — not a router implementation)
// ---------------------------------------------------------------------------

/**
 * Route sketch for M1a/M3 (paths may be prefixed with /api/v1):
 *
 * | Method | Path | Body / response |
 * |--------|------|-----------------|
 * | POST | /jobs | CreateJobRequest → CreateJobResponse |
 * | GET | /jobs/:jobId | → JobStatusResponse |
 * | GET | /jobs/:jobId/result | → JobResultResponse (succeeded only) |
 *
 * Auth: session required on all three. Unauthenticated → 401 UNAUTHORIZED.
 */
export const JOB_API_ROUTE_SKETCH = {
  create: "POST /api/v1/jobs",
  status: "GET /api/v1/jobs/:jobId",
  result: "GET /api/v1/jobs/:jobId/result",
} as const;

// ---------------------------------------------------------------------------
// DB column alignment (generation_jobs — M1b)
// ---------------------------------------------------------------------------

/**
 * Suggested mapping to Postgres generation_jobs (snake_case columns).
 * Types stay camelCase on the wire (JSON API).
 */
export const GENERATION_JOB_COLUMN_MAP = {
  id: "jobId",
  status: "status",
  vision_text: "visionText",
  inspiration_asset_ids: "inspirationAssetIds",
  error_code: "errorCode",
  error_message: "errorMessage",
  tool_id: "toolId",
  repairs_used: "repair.repairsUsed",
  repair_budget: "repair.maxRepairs",
  created_at: "createdAt",
  updated_at: "updatedAt",
} as const;
