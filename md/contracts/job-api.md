# Job API shapes

**Milestone:** M0e  
**TS source of truth:** `@repo/contracts` → `packages/contracts/src/job-api.ts`  
**Example fixtures:** `@repo/contracts/examples/job-api-fixtures` · [`examples/job-api-examples.json`](./examples/job-api-examples.json)  
**Related:** [plan-json.md](./plan-json.md) (agent plan inside the worker) · M1a (auth-gated stub) · M1b (`generation_jobs`) · M3 (worker)

---

## Purpose

Freeze **create / status / result / error / quota** DTOs so:

1. **M1a** can stub `POST` create without inventing fields  
2. **M3** worker updates the same status machine  
3. **Web Create UI** polls one status shape  

No real worker, DB, or rate-limit middleware in M0e — types + docs only.

---

## Status machine

```text
queued ──► running ──► succeeded
                   └──► failed
```

| Status | Meaning |
|--------|---------|
| `queued` | Accepted; not started (or waiting for worker) |
| `running` | Plan / codegen / validate / repair in progress |
| `succeeded` | Tool version ready — **only** path that may publish later |
| `failed` | Terminal failure |

### Invariants

1. **Failed never becomes ready/published.**  
   `jobMayBecomePublished(status)` is true only for `"succeeded"`.  
2. Terminal states do not leave the machine (`succeeded` / `failed` stay put).  
3. `resultReady` on status may be `true` only when `status === "succeeded"`.  
4. Failed jobs **must not** return a publishable `JobResultResponse`.

Helpers: `isTerminalJobStatus`, `jobMayBecomePublished`.

---

## Running phases (optional)

While `status === "running"`, `phase` may be:

| Phase | Stage |
|-------|--------|
| `plan` | Structured `ToolPlan` (M0d) |
| `codegen` | Fill canvas2d skeleton (M0c) |
| `validate` | Contract / runtime checks |
| `repair` | Bounded repair attempt |

MVP clients may ignore `phase` and only watch `status`.

---

## Error codes (provisional)

| Code | When |
|------|------|
| `UNAUTHORIZED` | No/invalid session |
| `QUOTA_EXCEEDED` | Daily create quota hit |
| `VALIDATION_FAILED` | Bad input / contract fail |
| `GENERATION_FAILED` | Agent/runtime failure after repairs |
| `TIMEOUT` | Wall-time budget exceeded |
| `INTERNAL` | Unexpected |

Extend later; do not bikeshed renames on the ASAP path.

---

## DTO reference

### `CreateJobRequest` — start Create

| Field | Required | Notes |
|-------|----------|--------|
| `visionText` | yes | User prompt |
| `inspirationAssetIds` | no | Asset ids from prior upload |
| `clientMetadata` | no | jsonb-friendly bag; no secrets |

### `CreateJobResponse` — accept job

| Field | Notes |
|-------|--------|
| `jobId` | Opaque id |
| `status` | Usually `queued` |
| `createdAt` | ISO-8601 |
| `quota?` | Snapshot after accept |

### `JobStatusResponse` — poll

| Field | Notes |
|-------|--------|
| `jobId` | |
| `status` | Status machine |
| `phase?` | plan / codegen / validate / repair |
| `progress?` | Fraction **0–1** |
| `errorCode?` / `errorMessage?` | On failure |
| `quota?` | `createsUsed`, `createsLimit`, `resetsAt?` |
| `repair?` | `maxRepairs`, `repairsUsed`, token/wall budgets |
| `updatedAt?` | ISO-8601 |
| `resultReady?` | Only when succeeded |

### `JobResultResponse` — success only

| Field | Notes |
|-------|--------|
| `jobId` | |
| `toolId` | Created/updated tool |
| `versionId` | New tool version |
| `target` | `TargetId` (ASAP: `canvas2d`) |
| `publicId?` | Often unset until publish (M8) |
| `completedAt?` | ISO-8601 |

### `QuotaFields` / `RepairBudgetFields`

See TS for full optional token/wall fields. Live quota is enforced from Create; repair budget is per job.

### `JobErrorBody`

HTTP/error envelope: `errorCode`, `errorMessage`, optional `jobId`, `quota`.

---

## HTTP surface (MVP = polling)

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/api/v1/jobs` | `CreateJobResponse` |
| `GET` | `/api/v1/jobs/:jobId` | `JobStatusResponse` |
| `GET` | `/api/v1/jobs/:jobId/result` | `JobResultResponse` (succeeded only) |

- **Auth required** on all three (Better Auth session → API). Unauthenticated → **401** + `UNAUTHORIZED`.  
- **Polling:** Create UI uses `refetchInterval` (or equivalent) on status until `isTerminalJobStatus`.  
- **SSE:** optional later — do not block M1/M3 on streams.  
- Result endpoint: **404** or **409** if job not succeeded (implementation choice in M1a/M3; contract forbids a fake success body).

```ts
import type {
  CreateJobRequest,
  CreateJobResponse,
  JobStatusResponse,
  JobResultResponse,
} from "@repo/contracts";
import {
  isTerminalJobStatus,
  jobMayBecomePublished,
  JOB_API_ROUTE_SKETCH,
} from "@repo/contracts";
```

---

## Alignment with `generation_jobs` (M1b)

Wire JSON is **camelCase**. Suggested Postgres columns:

| Column | DTO field |
|--------|-----------|
| `id` | `jobId` |
| `status` | `status` |
| `vision_text` | `visionText` |
| `inspiration_asset_ids` | `inspirationAssetIds` |
| `error_code` / `error_message` | `errorCode` / `errorMessage` |
| `tool_id` | result `toolId` |
| `repair_budget` / `repairs_used` | `repair.maxRepairs` / `repair.repairsUsed` |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` |

Token/cost columns stay jsonb-friendly extras on the row; expose via `repair` when useful.

Constant: `GENERATION_JOB_COLUMN_MAP` in TS.

---

## M1a cross-link

When implementing **M1a** (auth-gated create stub):

1. Use **`CreateJobRequest` / `CreateJobResponse`** (or a thin subset) — do not invent parallel field names.  
2. Unauthenticated `POST` → **401** `UNAUTHORIZED`.  
3. Authenticated stub may return `status: "queued"` without a real worker.  
4. Full status machine + result land with **M3**; types are ready now.

---

## Example fixtures

See [`examples/job-api-examples.json`](./examples/job-api-examples.json) and:

```ts
import {
  exampleCreateJobRequest,
  exampleJobStatusRunning,
  exampleJobStatusSucceeded,
  exampleJobResult,
} from "@repo/contracts/examples/job-api-fixtures";
```

---

## Out of scope (M0e)

- Real job worker / LangGraph  
- DB migrations / rows  
- Rate-limit middleware  
- SSE implementation  
- Python Pydantic (optional with M1a; TS is enough for thin freeze)

---

## Import

```ts
import type {
  JobStatus,
  JobPhase,
  JobErrorCode,
  CreateJobRequest,
  CreateJobResponse,
  JobStatusResponse,
  JobResultResponse,
  QuotaFields,
  RepairBudgetFields,
  JobErrorBody,
} from "@repo/contracts";
```
