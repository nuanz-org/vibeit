/**
 * Job API shapes (M0e + A3 planMode clarify).
 *
 * Create-job / status / result / error / quota DTOs for M1a stubs and M3 worker.
 * TS is source of truth; Python Pydantic mirrors can land with M1a.
 *
 * Status machine:
 * ```
 * queued → running → succeeded
 *                  ↘ failed
 *                  ↘ awaiting_clarify → queued  (planMode answers → resume build)
 * ```
 * Invariant: failed never becomes ready/published.
 *
 * Transport MVP: client polls GET status (SSE optional later).
 * Pause at `awaiting_clarify` until POST /jobs/:id/clarify.
 *
 * Docs: md/contracts/job-api.md
 */

import type { TargetId } from "./targets";

// ---------------------------------------------------------------------------
// Status machine
// ---------------------------------------------------------------------------

/**
 * Terminal-aware job lifecycle (+ A3 clarify pause).
 *
 * ```
 * queued → running → succeeded
 *                  ↘ failed
 *                  ↘ awaiting_clarify → queued → running → …
 * ```
 *
 * Invariant: **`failed` never becomes ready/published.**
 * Only `succeeded` may attach a publishable tool version.
 * `awaiting_clarify` is a **pause** (not terminal): worker stopped; user answers.
 */
export type JobStatus =
  | "queued"
  | "running"
  | "awaiting_clarify"
  | "succeeded"
  | "failed";

export const JOB_STATUSES = [
  "queued",
  "running",
  "awaiting_clarify",
  "succeeded",
  "failed",
] as const satisfies readonly JobStatus[];

/** Terminal states (no further worker progress without a new job). */
export type TerminalJobStatus = "succeeded" | "failed";

export function isTerminalJobStatus(status: JobStatus): status is TerminalJobStatus {
  return status === "succeeded" || status === "failed";
}

/**
 * Whether the client should stop auto-polling (terminal or needs user input).
 * Resume polling after POST clarify re-queues the job.
 */
export function isJobPollPaused(status: JobStatus): boolean {
  return isTerminalJobStatus(status) || status === "awaiting_clarify";
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
 * Aligns with Create graph stages (M3). A3 adds `clarify`.
 */
export type JobPhase = "clarify" | "plan" | "codegen" | "validate" | "repair";

export const JOB_PHASES = [
  "clarify",
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
  /**
   * A3: when true, worker runs clarify first and pauses at `awaiting_clarify`
   * with questions. Default false keeps single-shot Create.
   */
  planMode?: boolean;
}

/** Immediate accept of a create job (usually status `queued`). */
export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  /** ISO-8601 */
  createdAt: string;
  /** Echo quota after accept when available. */
  quota?: QuotaFields;
  /** Echo of planMode request flag. */
  planMode?: boolean;
}

// ---------------------------------------------------------------------------
// A3 — Clarify (planMode)
// ---------------------------------------------------------------------------

/** One option on a clarify question chip. */
export interface ClarifyOption {
  value: string;
  label: string;
  description?: string;
}

/** Agent-proposed question shown in Create UI. */
export interface ClarifyQuestion {
  /** Stable id (also preferred param name when axis). */
  id: string;
  prompt: string;
  options: ClarifyOption[];
  /** Allow multi-select answers. */
  multiSelect?: boolean;
  /** Offer "All options" → full enum param. Default true when options ≥ 2. */
  allowAllOptions?: boolean;
  /** Optional group label for Studio (e.g. "Shape", "Material"). */
  group?: string;
}

/**
 * Answer value for one question id.
 * - string: single option value or free text
 * - string[]: multi-select values
 * - { type: "all_options" }: expose full option list as enum
 */
export type ClarifyAnswerValue =
  | string
  | string[]
  | { type: "all_options" };

/** Forced enum axis derived from clarify answers (fed into plan). */
export interface ClarifyForcedEnum {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  default: string;
  group?: string;
  sourceQuestionId: string;
}

/** Structured outcome after answers are normalized. */
export interface ClarifyResult {
  /** Human-readable Q&A transcript for plan/codegen. */
  transcript: string;
  /** Enum params the plan **must** include (do not collapse). */
  forcedEnums: ClarifyForcedEnum[];
  /** Single-choice / free-text notes locked into the brief. */
  lockedNotes: string[];
  /** Optional one-line summary for "Build it" UI. */
  summary?: string;
}

/** Persisted + polled clarify bag on the job. */
export interface JobClarifyState {
  understanding?: string;
  questions?: ClarifyQuestion[];
  /** Raw answers as submitted (before/after normalize). */
  answers?: Record<string, ClarifyAnswerValue>;
  result?: ClarifyResult;
  /** True when user submitted answers and build may proceed. */
  answered?: boolean;
}

/**
 * POST /jobs/:jobId/clarify — submit answers and resume build.
 */
export interface ClarifyJobRequest {
  answers: Record<string, ClarifyAnswerValue>;
  /**
   * When true (default), re-queue the job for plan → codegen after normalize.
   * When false, store answers only (future approval step).
   */
  buildNow?: boolean;
}

export interface ClarifyJobResponse {
  jobId: string;
  status: JobStatus;
  clarify?: JobClarifyState;
  updatedAt?: string;
}

/**
 * GET job status — poll until terminal or awaiting_clarify.
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
  /** True when this job was started with planMode. */
  planMode?: boolean;
  /**
   * A3: present when status is awaiting_clarify (questions) or after answers.
   * Clients render chips from `clarify.questions`.
   */
  clarify?: JobClarifyState;
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
 * Route sketch for M1a/M3/A3 (paths may be prefixed with /api/v1):
 *
 * | Method | Path | Body / response |
 * |--------|------|-----------------|
 * | POST | /jobs | CreateJobRequest → CreateJobResponse |
 * | GET | /jobs/:jobId | → JobStatusResponse |
 * | GET | /jobs/:jobId/result | → JobResultResponse (succeeded only) |
 * | POST | /jobs/:jobId/clarify | ClarifyJobRequest → ClarifyJobResponse |
 *
 * Auth: session required. Unauthenticated → 401 UNAUTHORIZED.
 */
export const JOB_API_ROUTE_SKETCH = {
  create: "POST /api/v1/jobs",
  status: "GET /api/v1/jobs/:jobId",
  result: "GET /api/v1/jobs/:jobId/result",
  clarify: "POST /api/v1/jobs/:jobId/clarify",
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
