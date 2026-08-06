/**
 * Example Job API payloads (M0e fixtures).
 * Illustrative only — not live API responses.
 */

import type {
  CreateJobRequest,
  CreateJobResponse,
  JobErrorBody,
  JobResultResponse,
  JobStatusResponse,
} from "../job-api";

export const exampleCreateJobRequest = {
  visionText:
    "A kinetic 9:16 social frame with bold headline, purple accent pulse, and a logo slot",
  inspirationAssetIds: ["asset_insp_01"],
  clientMetadata: { uiSource: "create-page", locale: "en" },
} as const satisfies CreateJobRequest;

export const exampleCreateJobResponse = {
  jobId: "job_01HZXEXAMPLE000000000001",
  status: "queued",
  createdAt: "2026-08-04T12:00:00.000Z",
  quota: {
    createsUsed: 3,
    createsLimit: 20,
    resetsAt: "2026-08-05T00:00:00.000Z",
  },
} as const satisfies CreateJobResponse;

export const exampleJobStatusRunning = {
  jobId: "job_01HZXEXAMPLE000000000001",
  status: "running",
  phase: "codegen",
  progress: 0.55,
  updatedAt: "2026-08-04T12:00:12.000Z",
  quota: {
    createsUsed: 3,
    createsLimit: 20,
    resetsAt: "2026-08-05T00:00:00.000Z",
  },
  repair: {
    maxRepairs: 2,
    repairsUsed: 0,
    tokenBudget: 80_000,
    tokensUsed: 12_400,
    wallTimeMs: 120_000,
    wallTimeUsedMs: 8_200,
  },
  resultReady: false,
} as const satisfies JobStatusResponse;

export const exampleJobStatusSucceeded = {
  jobId: "job_01HZXEXAMPLE000000000001",
  status: "succeeded",
  progress: 1,
  updatedAt: "2026-08-04T12:00:28.000Z",
  resultReady: true,
  quota: {
    createsUsed: 3,
    createsLimit: 20,
    resetsAt: "2026-08-05T00:00:00.000Z",
  },
  repair: {
    maxRepairs: 2,
    repairsUsed: 1,
    tokensUsed: 41_200,
    wallTimeUsedMs: 27_500,
  },
} as const satisfies JobStatusResponse;

export const exampleJobStatusFailed = {
  jobId: "job_01HZXEXAMPLE000000000002",
  status: "failed",
  phase: "repair",
  errorCode: "GENERATION_FAILED",
  errorMessage: "Tool failed validation after repair budget exhausted",
  updatedAt: "2026-08-04T12:01:10.000Z",
  resultReady: false,
  repair: {
    maxRepairs: 2,
    repairsUsed: 2,
  },
} as const satisfies JobStatusResponse;

export const exampleJobResult = {
  jobId: "job_01HZXEXAMPLE000000000001",
  toolId: "tool_01HZXEXAMPLE0000000000A",
  versionId: "ver_01HZXEXAMPLE0000000000B",
  target: "canvas2d",
  publicId: undefined,
  completedAt: "2026-08-04T12:00:28.000Z",
} as const satisfies JobResultResponse;

export const exampleQuotaExceeded = {
  errorCode: "QUOTA_EXCEEDED",
  errorMessage: "Daily create quota reached",
  quota: {
    createsUsed: 20,
    createsLimit: 20,
    resetsAt: "2026-08-05T00:00:00.000Z",
  },
} as const satisfies JobErrorBody;
