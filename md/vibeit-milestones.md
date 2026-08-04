# Vibeit — MVP milestones

**Source:** [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)  
**Status:** **Core-loop ASAP track** — aligned to consensus frozen v1  
**Date:** 2026-08-03 · **Revised:** 2026-08-04 (M0-thin done · **M1-rest M1a–M1f complete**)  
**Goal:** Ship the **canvas2d complete loop as soon as possible** — Auth → Create → Studio → Export/share/embed → Publish gallery  

---

## Current progress (2026-08-04)

| Area | Status | Notes |
|------|--------|-------|
| Product architecture | ✅ Frozen v1 | Consensus + plan + BE/FE architecture docs |
| **Sign up** | ✅ Done | Better Auth email/password (`apps/web` `/api/auth/*`) |
| **Sign in** | ✅ Done | Same session cookie path |
| **Sign out** | ✅ Done | Client `signOut` + UI |
| Session → API | ✅ Done | FastAPI `GET /api/v1/auth/me` validates Better Auth cookie |
| Web Create gate | ✅ Partial | `/create` proxy + `requireSession()` — page is placeholder only |
| Create API gate | ✅ **Done** | M1a — `POST /api/v1/jobs` 401/201 + Create proof |
| Product DB (tools/jobs/assets) | ✅ **Done** | M1b schema + **M1c** repos |
| Object storage + uploads | ✅ **Done** | M1d storage + **M1e** upload API |
| Access rules + M1 demo | ✅ **Done** | **M1f** — [access-rules.md](./access-rules.md) |
| **M0-thin contracts** | ✅ **Done** | M0a–M0f landed — see note below |
| Runtime host / Studio / agent | ❌ Open | M2+ |

**Auth, M0-thin, and M1-rest are unblocked.** Next bottleneck is **canvas2d runtime (M2a)**, not more platform foundation.

### M0-thin — done (polish later OK)

**Status: complete for the ASAP path.** Treat `@repo/contracts` + `md/contracts/` as the working source of truth and **move on to M1 / M2a**.

| Done (M0a–M0f) | Artifact |
|----------------|----------|
| VibeTool lifecycle | `packages/contracts` · `md/contracts/vibe-tool.md` |
| Param schema + asset slots | `param-schema.ts` · `md/contracts/param-schema.md` |
| Target registry + canvas2d skeleton | `targets.ts` · `skeletons/canvas2d` · docs |
| Plan JSON | `plan.ts` · `md/contracts/plan-json.md` |
| Job API shapes | `job-api.ts` · `md/contracts/job-api.md` |
| Capture + CORS provisional notes | `capture-cors.ts` · `md/contracts/capture-cors.md` |

**We can polish this again later** — tighten types, add p5/three harnesses, env templates, WebGL capture rules, PRD one-pagers, or richer validators. That is **full M0 / fast-follow polish**, not a blocker. Do **not** reopen architecture just to perfect docs before M1a/M2a.

**Not done (deferred polish — do not block core loop):** full p5/three allowlists & skeletons, WebGL `preserveDrawingBuffer`, Control refine I/O sketch, monorepo env template, optional PRDs (see “Full M0 deliverables” under M0).

---

## How to read this

| Term | Meaning |
|------|---------|
| **Milestone** | A vertical or foundation slice with a hard **exit criteria** — do not start the next until its **core-loop exit** is met |
| **Core-loop exit** | Minimum needed to keep moving toward Auth → Create → Studio → Export → Publish on **canvas2d** |
| **Full exit** | Complete milestone quality bar (may include p5/three stubs, polish) — do **not** block the core loop on full exit when a core-loop exit exists |
| **Demo** | What you can show end-to-end when the milestone is done |
| **Depends on** | Hard prerequisites |
| **Out of scope** | Explicitly deferred (even if tempting) |
| **Critical path** | Required for “flow is complete” |
| **Fast-follow** | Valuable, not required to claim complete loop |

**Principle (ASAP):** Prefer a **thin complete path** on **canvas2d only**. Freeze contracts just enough to code. Defer p5/three agent work, chat refine, inspiration screenshots, and production polish. Hand-authored canvas2d tool before LLM. Multi-target remains a v1 direction but is **not** on the ASAP critical path.

**Stack (from consensus):** Next.js `apps/web` · FastAPI `apps/api` · LangGraph in API · OpenRouter/DeepSeek · Postgres + object storage · sandboxed iframe runtime.

---

## ASAP critical path (core loop)

Do **not** wait for full multi-target or chat refine. Sequence:

```
DONE     Auth: sign up · sign in · sign out · session → API
   ↓
M0-thin  Contracts: VibeTool + param schema + canvas2d skeleton + plan/job JSON
   ↓
M1-rest  Product schema · storage · uploads · create API gate · access rules
   ↓
M2a      Runtime host + **canvas2d only** hand-authored tool + capture w/ real asset
         (p5/three stubs = M2b, parallel/later — not required for core loop)
   ↓
M3       Create agent: vision text → canvas2d + quota + repair + salvage
   ↓
M5       Studio Control (params, assets, colors, view source)
   ↓
M7       Export PNG + short video · share · embed
   ↓
M8       Publish + gallery + quality gates   ← “core loop complete”
   ↓
M9       Hardening / launch polish
```

```
FAST-FOLLOWS (off critical path — do not block M8):

M2b  p5 + three host stubs + reference tools
M4   Multi-target agent + inspiration screenshots
M6   Chat refine (Control LangGraph)
```

**Complete-loop MVP = M0-thin → M1-rest → M2a → M3 → M5 → M7 → M8** (canvas2d).  
**M2b, M4, M6** = fast-follows.  
**M9** = launch readiness (not required to claim “flow is complete” in dev).

### What “core loop complete” means (unchanged product bar)

A real user can: **sign in → describe vision → get a live canvas2d tool → tweak params/assets/colors → export PNG + short video → share/embed → publish to gallery**, and failed generations never appear as published tools.

### Speed rules (builders)

1. **canvas2d-only until M8** — agent never picks p5/three on the ASAP path.  
2. **M0-thin is enough to start M1/M2a** — provisional CORS/job shapes OK; tighten later.  
3. **M2a before M3** — if a hand-authored canvas2d tool cannot mount/update/capture, do not start the agent.  
4. **Parallel after M0-thin:** M1b schema ∥ M1d storage (after M1a); M1c repos after M1b; M5 Studio chrome against M2a fixtures while M3 agent is built.  
5. **M7 early prototype** on M2a fixtures (PNG capture) before agent is perfect.  
6. **Do not expand scope** into remix, brand kit at create, multiplayer, or source download.

### Suggested effort (order-of-magnitude, focused days)

| Slice | Focus | ~Days |
|-------|--------|------:|
| M0-thin | Contract types + canvas2d skeleton + plan/job shapes | 1–2 |
| M1-rest | Gate + schema + storage + upload + access rules | 3–5 |
| M2a | iframe host + one canvas2d ref tool + Studio shell + capture | 3–5 |
| M3 | LangGraph Create canvas2d + Create UI + jobs + quota | 5–8 |
| M5 | Full Control UI (may start earlier on fixtures) | 3–5 |
| M7 | PNG/video/share/embed | 2–4 |
| M8 | Publish gates + gallery | 2–3 |
| **Sum to core loop** | | **~19–32** |

Numbers are planning aids, not commitments. Cut polish, not the path.

---

## Full milestone map (reference)

```
CRITICAL PATH (complete loop, canvas2d):

M0  Contracts & platform skeleton          [use M0-thin for ASAP]
 ↓
M1  Auth + data model + uploads            [auth DONE; finish M1-rest]
 ↓
M2a Runtime host + canvas2d hand tool      [core-loop exit]
M2b p5/three stubs                         [fast-follow]
 ↓
M3  Create agent (vision text → canvas2d)
 ↓
M5  Studio Control
 ↓
M7  Export · share · embed
 ↓
M8  Publish + gallery + quality gates
 ↓
M9  Hardening, ops, launch polish

FAST-FOLLOWS:

M4  Multi-target codegen + inspiration screenshots
M6  Chat refine (Control LangGraph)
```

---

## M0 — Contracts & platform skeleton

**Why first:** Everything hangs on one shared `VibeTool` contract and job shapes. Freeze these before UI chrome or model tuning.

**Progress (2026-08-04):**

| Slice | Status |
|-------|--------|
| Consensus frozen v1 | ✅ Done |
| Auth (does not block M0) | ✅ Done |
| **M0-thin** (contracts for ASAP path) | ✅ **Done** (M0a–M0f) |
| Full M0 polish (p5/three, PRDs, env) | ❌ Deferred (not on ASAP critical path) |

### M0-thin (core-loop exit) — do this first

Enough to unlock **M1-rest + M2a**. Mark M0 core-loop exit when **M0a–M0f** are checked; do not wait for full M0 polish.

**High-level checklist** (detail lives in subparts below):

- [x] **VibeTool contract** (TS types + short markdown): `mount`, `update`, `setAssets?`, `getParamSchema`, `getDefaultParams`, `getAssetSlots`, `captureFrame` / `getCaptureStream?`, `dispose`
- [x] **Param schema conventions** (colors, numbers, text, enums, asset-slot refs) — canvas2d-focused examples OK
- [x] **Target registry IDs** frozen: `canvas2d` | `p5` | `three` (only **canvas2d** required to implement now)
- [x] **canvas2d skeleton template** shape (model fills creative logic inside harness)
- [x] **Plan JSON** schema (concept, aspect, motion, params, `target` — target fixed to `canvas2d` on ASAP path)
- [x] **Job API** shapes: create job, status, result version, error codes, quota/budget fields (can use jsonb-friendly loose fields)
- [x] **Provisional capture/CORS notes** for canvas2d (`crossOrigin`, storage headers) — tighten with M1d/M2a if needed

**M0-thin demo:** An engineer can implement a hand-authored canvas2d tool and a create-job API without reopening architecture.

**M0-thin exit (unblocks ASAP path):**

- VibeTool + param schema + canvas2d skeleton + plan/job shapes treated as source of truth for M1/M2a/M3
- p5/three may be named-only in the registry until M2b

### Depends on

- Consensus frozen v1 ✓
- **Auth already done** — M0 does not depend on finishing M1

### Out of scope (M0-thin)

- Real auth, DB, agent, sandbox implementation beyond contract stubs
- Product UI, Studio chrome, live LLM calls
- Full p5/three harnesses (named in registry only)

---

### M0-thin — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M0-thin done until **M0f**.

| Subpart | Name | Depends on | Outcome |
|---------|------|------------|---------|
| **M0a** | Contract home + VibeTool types | Consensus ✓ | ✅ Done — `@repo/contracts` + `md/contracts/vibe-tool.md` |
| **M0b** | Param schema + asset slots | M0a | ✅ Done — kinds + social-frame example + `param-schema.md` |
| **M0c** | Target registry + canvas2d skeleton | M0a (+ M0b preferred) | ✅ Done — `TargetId` + `createCanvas2dTool` harness/stub |
| **M0d** | Plan JSON schema | M0b + M0c | ✅ Done — `ToolPlan` + social-frame plan fixture |
| **M0e** | Job API shapes | M0d | ✅ Done — job DTOs + status machine + fixtures |
| **M0f** | Capture + CORS provisional notes | M0a | ✅ Done — `capture-cors.md` + policy constants |

**Suggested effort:** M0a ~0.25d · M0b ~0.25d · M0c ~0.5d · M0d ~0.25d · M0e ~0.5d · M0f ~0.25d (≈1–2 focused days).

**Parallelism:** After **M0a**, M0b and M0c can start in parallel if two people; otherwise stay sequential. **M0f** can draft alongside M0e.

**Where to put artifacts (default):**

| Artifact | Suggested path |
|----------|----------------|
| Short contract docs | `md/contracts/` (or `md/m0/`) |
| TS types (preferred) | `packages/contracts` (new shared package) **or** `apps/web` feature-local until package is worth it |
| Python mirrors (optional in thin) | `apps/api/src/` pydantic models matching job/plan DTOs — can land with M1a/M3 if TS is source of truth first |
| canvas2d skeleton | `md/contracts/skeletons/canvas2d.md` + later runtime file under `apps/web` in M2a |

Pick **one** types home in M0a and stick to it. Prefer a small `packages/contracts` if both web and docs will import; otherwise TS under web + markdown is fine for thin freeze.

---

#### M0a — Contract home + VibeTool types

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Freeze the shared runtime interface every target must implement. Types + short markdown only — no sandbox host yet.

**Decision:** Contract home = **`packages/contracts`** (`@repo/contracts`). Human docs = **`md/contracts/`**. Web depends on the workspace package for Studio later.

**Tasks**

1. Choose contract location (`packages/contracts` **or** `apps/web` + `md/contracts/`) and note it in the markdown.
2. Write short markdown `md/contracts/vibe-tool.md` (or equivalent) describing the contract and lifecycle: mount → update/setAssets → capture → dispose.
3. Define TypeScript types for:

```text
VibeTool {
  mount(el, { params, assets })
  update(params)
  setAssets?(assets)
  getParamSchema()
  getDefaultParams()
  getAssetSlots()
  captureFrame() | getCaptureStream?()
  dispose()
}
```

4. Define supporting types: `ToolParams` (record), `ToolAssets` (slot id → URL/blob ref), `MountOptions`.
5. Document hard rules (from consensus): no arbitrary npm, no parent `window`, no unrestricted fetch; host loads allowlisted runtime only.
6. Note: **params + assets** model — no brand kit required at create/mount.

**Touch (landed)**

- `md/contracts/vibe-tool.md`
- `packages/contracts/` (`@repo/contracts`) — `src/vibe-tool.ts`, `src/index.ts`
- `apps/web` depends on `@repo/contracts` (workspace)

**Exit**

- [x] Engineer can implement a hand-authored tool against the TS interface without guessing method names
- [x] Markdown answers “what is a valid VibeTool?” in one page
- [x] High-level checkbox **VibeTool contract** can be marked complete

**Out of scope for M0a:** iframe host, codegen, validators that execute code.

---

#### M0b — Param schema + asset slot conventions

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Schema-driven Control UI and codegen defaults. canvas2d-focused examples are enough.

**Tasks**

1. Define param field kinds for MVP:

| Kind | Purpose | Example keys |
|------|---------|--------------|
| `color` | Palette overrides | `bg`, `fg`, `accent` |
| `number` | Speed, intensity, scale (min/max/step) | `speed`, `intensity` |
| `text` | Labels, headlines | `title` |
| `enum` | Discrete modes | `layout`, `motionPreset` |
| `boolean` | Simple toggles (optional) | `showGrid` |
| `assetRef` | Points at a named asset slot | `logoSlot` |

2. Define param schema JSON shape (name, kind, label?, default, min/max/step?, options? for enum).
3. Define **asset slot** shape: `id`, `label`, `accept` (e.g. `image/*`), `required?`, optional aspect/hint.
4. Write one **canvas2d example** tool schema: 3–5 params + 1–2 asset slots (e.g. logo, background).
5. Document Control mapping: schema → UI controls; empty slots use generated placeholders until user uploads (Studio).

**Touch (landed)**

- `md/contracts/param-schema.md`
- `packages/contracts/src/param-schema.ts` — discriminated `ParamField` kinds + `AssetSlot`
- `packages/contracts/src/examples/canvas2d-social-frame.ts` (+ package export)
- `md/contracts/examples/canvas2d-social-frame.json`

**Exit**

- [x] Example schema is valid against the types
- [x] Asset slots and params are clearly separated (no brand kit object)
- [x] High-level checkbox **Param schema conventions** can be marked complete

**Out of scope for M0b:** Real Studio UI, upload binding, font/brand kit.

---

#### M0c — Target registry + canvas2d skeleton template

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Closed target set + one skeleton the Create agent (and hand tools) fill. Only **canvas2d** must be fully specified now.

**Tasks**

1. Freeze target registry IDs: `"canvas2d" | "p5" | "three"`.
2. Document launch status per target:

| Target | ASAP path | Libraries |
|--------|-----------|-----------|
| `canvas2d` | **Required** | Browser canvas only |
| `p5` | Named only until M2b | Allowlisted p5 (full rules later) |
| `three` | Named only; config-gated later | Allowlisted three (full rules later) |

3. Write **canvas2d skeleton template** markdown + code shape:
   - Harness owns: mount root, canvas sizing/aspect, rAF/loop hook, param apply, asset apply, capture, dispose
   - Model (or hand author) fills: draw/update creative logic only
   - Placeholders / TODO markers where codegen injects logic
4. Document forbidden patterns in skeleton comments (parent window, remote code, free npm).
5. Optional thin stub: empty `export function createTool(): VibeTool` skeleton file for M2a to copy (implementation can stay incomplete).

**Touch (landed)**

- `md/contracts/targets.md`
- `md/contracts/skeletons/canvas2d.md`
- `packages/contracts/src/targets.ts` — `TargetId`, `TARGET_REGISTRY`, `ASAP_TARGET`, guards
- `packages/contracts/src/skeletons/canvas2d.ts` — `createCanvas2dTool` harness + `createTool` stub
- Package export: `@repo/contracts/skeletons/canvas2d`

**Exit**

- [x] Registry IDs frozen and imported from one type
- [x] canvas2d skeleton clearly separates harness vs creative fill
- [x] High-level checkboxes **Target registry** + **canvas2d skeleton** can be marked complete

**Out of scope for M0c:** Working iframe host, p5/three skeleton bodies (full M0 / M2b), live preview.

---

#### M0d — Plan JSON schema

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Structured plan the Create agent produces before codegen. ASAP path fixes `target: "canvas2d"`.

**Tasks**

1. Define Plan JSON fields (names can refine; meaning must not):

| Field | Required | Notes |
|-------|----------|--------|
| `concept` | yes | Short description of the tool idea |
| `aspect` | yes | e.g. `1:1`, `9:16`, `16:9` |
| `motion` | yes | Motion style / energy notes |
| `params` | yes | Param list aligned with M0b schema (or defaults the tool will expose) |
| `assetSlots` | yes (may be empty) | Slots the tool will declare |
| `target` | yes | ASAP: always `"canvas2d"`; union still allows p5/three for later |
| `palette?` | no | Optional color hints from vision (M4) |
| `notes?` | no | Freeform agent notes |

2. TS type + example plan JSON for a simple kinetic-type / social-frame canvas2d tool.
3. Document: agent selects **one** target in Plan; ASAP path never picks p5/three.
4. Note linkage: Plan → codegen into skeleton (M3); Plan metadata may persist on `tool_versions.plan` (M1b).

**Touch (landed)**

- `md/contracts/plan-json.md`
- `packages/contracts/src/plan.ts` — `ToolPlan`, `AsapToolPlan`, `createAsapToolPlan`, `isAsapToolPlan`
- `packages/contracts/src/examples/canvas2d-social-frame-plan.ts`
- `md/contracts/examples/canvas2d-social-frame-plan.json`
- Package export: `@repo/contracts/examples/canvas2d-social-frame-plan`

**Exit**

- [x] Example plan validates against the type
- [x] ASAP rule documented: `target` fixed to `canvas2d` on critical path
- [x] High-level checkbox **Plan JSON** can be marked complete

**Out of scope for M0d:** LLM prompts, style-extract node, multi-target selection logic.

---

#### M0e — Job API shapes

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Freeze create-job / status / result / error / quota field shapes so M1a stubs and M3 worker do not invent parallel DTOs.

**Tasks**

1. Status machine (minimal): `queued → running → succeeded | failed`. Invariant: **failed never becomes ready/published**.
2. Define request/response shapes (jsonb-friendly; field names illustrative):

| Shape | Purpose | Key fields |
|-------|---------|------------|
| `CreateJobRequest` | Start Create | `visionText`, `inspirationAssetIds?[]`, optional client metadata |
| `CreateJobResponse` | Accept job | `jobId`, `status`, `createdAt` |
| `JobStatusResponse` | Poll | `jobId`, `status`, `phase?` (plan/codegen/validate/repair), `progress?`, `errorCode?`, `errorMessage?`, `quota?`, `repair?` |
| `JobResultResponse` | Success payload | `jobId`, `toolId`, `versionId`, `target`, `publicId?` (if any) |
| `QuotaFields` | Cost control (live from Create) | e.g. `createsUsed`, `createsLimit`, `resetsAt?` |
| `RepairBudgetFields` | Per-job budget | e.g. `maxRepairs`, `repairsUsed`, `tokenBudget?`, `wallTimeMs?` |

3. Provisional **error codes** (extend later, do not bikeshed):

| Code | When |
|------|------|
| `UNAUTHORIZED` | No/invalid session |
| `QUOTA_EXCEEDED` | Daily create quota hit |
| `VALIDATION_FAILED` | Bad input / contract fail |
| `GENERATION_FAILED` | Agent/runtime failure after repairs |
| `TIMEOUT` | Wall-time budget exceeded |
| `INTERNAL` | Unexpected |

4. Document polling as MVP (SSE optional later). Align names with M1b `generation_jobs` columns where possible.
5. Optional: mirror as Pydantic models in `apps/api` — not required for M0-thin if TS + markdown are source of truth; M1a may use a thin stub body first.

**Touch (landed)**

- `md/contracts/job-api.md`
- `packages/contracts/src/job-api.ts`
- `packages/contracts/src/examples/job-api-fixtures.ts`
- `md/contracts/examples/job-api-examples.json`
- Package export: `@repo/contracts/examples/job-api-fixtures`
- M1a cross-link: use these DTOs (see below + job-api.md)

**Exit**

- [x] Create/status/result/error/quota shapes written and typed
- [x] Status machine + failed≠published invariant documented
- [x] High-level checkbox **Job API shapes** can be marked complete

**Out of scope for M0e:** Real job worker, LangGraph graph, DB rows, rate-limit middleware.

---

#### M0f — Capture + CORS provisional notes

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Enough policy for M1d storage headers and M2a capture-with-real-asset. Tighten later; do not block on production-perfect CORS.

**Tasks**

1. Document canvas2d capture expectations:
   - PNG via `captureFrame()` (canvas → image)
   - Short video later via `getCaptureStream?()` / canvas stream + **client MediaRecorder** (M7)
2. Provisional asset/CORS rules:
   - User/inspiration images loaded with `crossOrigin = "anonymous"` where drawn to canvas
   - Object storage must emit CORS headers allowing the web origin to read images (exact header set can be finalized in M1d)
   - Same-origin or properly CORS-enabled asset URLs required before claiming export works
3. Note tainted-canvas failure mode and that **M2a exit** requires capture with a **real uploaded** asset (not only a data URL fixture).
4. Defer WebGL `preserveDrawingBuffer` detail to full M0 / M2b (three/p5).

**Touch (landed)**

- `md/contracts/capture-cors.md`
- `packages/contracts/src/capture-cors.ts` — `ASSET_CROSS_ORIGIN`, `PROVISIONAL_STORAGE_CORS`, capture MIME/duration constants, `CaptureFailureReason`
- Pointers from `vibe-tool.md`, `skeletons/canvas2d.md`, **M1d** (and M2a when implementing)

**Exit**

- [x] Engineer implementing storage or runtime knows default `crossOrigin` + CORS expectation
- [x] High-level checkbox **Provisional capture/CORS notes** can be marked complete

**Out of scope for M0f:** Live CORS verification, MediaRecorder implementation, server-side video.

---

### M0-thin checklist rollup

**All complete (2026-08-04).** Mark complete only when the matching subpart exit is done:

| High-level item | Subpart | Status |
|-----------------|---------|--------|
| VibeTool contract | **M0a** | ✅ |
| Param schema conventions | **M0b** | ✅ |
| Target registry IDs | **M0c** | ✅ |
| canvas2d skeleton template | **M0c** | ✅ |
| Plan JSON schema | **M0d** | ✅ |
| Job API shapes | **M0e** | ✅ |
| Provisional capture/CORS notes | **M0f** | ✅ |

**M0-thin exit met** — contracts are source of truth for M1-rest + M2a + M3.

---

### Full M0 deliverables (nice-to-have before M4; not blocking core loop)

> **Note:** M0-thin (M0a–M0f) is already **done**. Items below are **optional polish** — pick them up later if useful; they must not delay M1-rest or M2a.

- [ ] Full allowlisted lib rules for p5/three
- [ ] Per-target capture rules including WebGL `preserveDrawingBuffer`
- [ ] p5 + three skeleton template stubs
- [ ] LangGraph node I/O sketch for Control refine (types only)
- [ ] Monorepo env template (OpenRouter, DB, storage) — shared contract package already exists (`@repo/contracts`)
- [ ] Thin PRD one-pagers (optional): Create · Studio · Export · Gallery

### Demo (full)

Docs + types only. An engineer can answer “what does a valid tool look like?” for all three targets without reading the brainstorm.

### Full exit criteria

- Contract + param schema + capture/CORS rules + skeletons + plan-JSON + job API reviewed as **source of truth**
- No product UI required

---

## M1 — Auth + data model + uploads

**Why:** Create is auth-gated; tools, versions, assets, and inspiration images need persistence before generation.

**Progress (2026-08-04):**

| Slice | Status |
|-------|--------|
| Sign up / sign in / sign out (Better Auth API + web UI) | ✅ **Done** |
| Session validation on FastAPI (`/api/v1/auth/me`) | ✅ **Done** |
| Web gate on `/create` | ✅ **Done** (placeholder page) |
| **M1-rest** (M1a→M1f) | ✅ **Done** | M1a–M1f complete — start **M2a** |

Auth is **not** on the critical path anymore. Treat **M1-rest** as the only M1 work left for the core loop.

### Deliverables

#### Auth (done — do not re-plan)

- [x] Create account (sign up) — Better Auth email/password API
- [x] Sign in — Better Auth API
- [x] Sign out — Better Auth API + UI
- [x] Auth provider on `apps/web` + session validation on `apps/api` (`GET /api/v1/auth/me`)

#### M1-rest (required for core loop)

- [x] **Login required before Create** fully closed
  - [x] Web: `/create` proxy cookie gate + `requireSession()` page guard
  - [x] API: protected create-stub `POST /api/v1/jobs` → **401** without session; **201** with session → **M1a**
- [x] Postgres schema (minimal) → **M1b**
  - users → **use Better Auth `user` table** (do not duplicate); product tables FK to `user.id`
  - tools (owned, publicId, status draft/published)
  - tool_versions (code, target, param schema, defaults, asset slots, plan metadata)
  - generation_jobs (status, inputs ref, errors, token/cost fields, repair budget)
  - assets / uploads (inspiration + user studio assets)
  - publishes / gallery metadata (can be columns on tools for MVP)
- [x] Thin repositories (tools, jobs, assets) → **M1c**
- [x] Object storage for inspiration + studio images (+ later exports/thumbs) with **CORS** matching M0f → **M1d**
- [x] Upload API: inspiration images (create) · user assets (studio) → **M1e**
- [x] Public vs private access rules documented + M1 demo → **M1f**

### Demo

Sign in → hit a protected “create stub” endpoint → upload an image → see record in DB/storage.

**Verified (2026-08-04):** Automated via `apps/api/tests/test_m1_demo_checklist.py` + prior auth/web gates. Access rules: [access-rules.md](./access-rules.md).

### Exit criteria

- [x] Unauthenticated user cannot start Create
- [x] Authenticated user has a stable identity for owned tools
- [x] File upload round-trips to object storage with DB metadata and correct CORS

### Out of scope

- Agent generation, Studio UI, gallery UX

### Depends on

- M0-thin (job/tool shapes frozen) ✓
- Auth done ✓

---

### M1-rest — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M1 done until **M1f**.

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **M1a** | Job DTOs + Create API gate | Auth ✓ · M0e ✓ | 0.5 | Unauth cannot start Create on API; owner id stable |
| **M1b** | Migration tooling + product tables | M1a (identity) | 0.75–1 | Tables migrated alongside Better Auth schema |
| **M1c** | Thin repositories + draft-tool smoke | M1b | 0.5 | Insert/read draft tool by real `user.id` |
| **M1d** | Object storage adapter + CORS serve | M0f ✓ (∥ M1b after M1a) | 0.75–1 | put/delete/URL; browser can load image |
| **M1e** | Upload API + Create proof UI | M1c + M1d | 0.75–1 | Inspiration + studio asset round-trip |
| **M1f** | Access rules + M1 demo | M1a–M1e | 0.5 | Doc + verified end-to-end demo |

**Suggested effort:** ≈4–5 focused days total.

**Parallelism:** After **M1a**, start **M1b** and **M1d** in parallel if two people; otherwise sequential M1b → M1c, and land M1d before **M1e**. **M1e** needs both repos (M1c) and storage (M1d).

**Where code lands (defaults from backend architecture):**

| Concern | Path |
|---------|------|
| HTTP routers | `apps/api/src/api/v1/` (`jobs.py`, `assets.py`, …) |
| Pydantic API shapes | `apps/api/src/schemas/` |
| Use-cases | `apps/api/src/services/` |
| DB session / repos | `apps/api/src/adapters/db/` |
| Storage port | `apps/api/src/adapters/storage/` |
| Depends wiring | `apps/api/src/core/deps.py` |
| Migrations | `apps/api/migrations/` (or Alembic package layout — pick in M1b) |
| Web proof UI | `apps/web/app/create/` · `apps/web/features/create/` |

**Codebase baseline (do not re-build):**

| Already exists | Use it |
|----------------|--------|
| `get_current_user` / session cookie | `apps/api/src/core/security.py` |
| `GET /api/v1/auth/me` | `apps/api/src/api/v1/auth.py` |
| asyncpg pool on lifespan | `apps/api/src/main.py` · `core/deps.py` |
| Job DTO contracts (TS) | `packages/contracts/src/job-api.ts` · `md/contracts/job-api.md` |
| CORS provisional policy | `packages/contracts/src/capture-cors.ts` · `md/contracts/capture-cors.md` |
| Web `/create` gate | `apps/web/app/create/page.tsx` + proxy/session |

---

#### M1a — Job DTOs + Create API gate

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Finish “login required before Create” on the **API** side (web gate already works). Land Pydantic mirrors of M0e so later worker/UI do not invent parallel fields.

**Use M0e shapes:** [job-api.md](./contracts/job-api.md) · `@repo/contracts` `CreateJobRequest` / `CreateJobResponse` / status machine. Stub may return `status: "queued"` without a worker or DB row.

**Decision:** Wire JSON is **camelCase** (Pydantic aliases); Python fields are snake_case. Stub response may include `userId` for local debug (not required by TS contract).

**Tasks**

1. **Pydantic DTOs** under `apps/api/src/schemas/jobs.py` matching M0e (camelCase aliases if web expects TS names — pick one style and document it):
   - `CreateJobRequest`: `visionText` (required), `inspirationAssetIds?`, `clientMetadata?`
   - `CreateJobResponse`: `jobId`, `status`, `createdAt`, optional `quota`
   - Reuse error code strings from M0e (`UNAUTHORIZED`, …) where useful
2. **Router** `apps/api/src/api/v1/jobs.py`:
   - `POST /api/v1/jobs` with `Depends(get_current_user)`
   - No session → **401** (existing dependency behavior)
   - Valid session → **201** with stub body (`jobId` = uuid, `status` = `"queued"`, `createdAt` = now ISO)
   - Stub **does not** require DB tables yet (in-memory / uuid only is fine)
3. Wire into `api/v1/router.py` (`include_router`).
4. Optional stub field `userId` (or include in response meta) for local debugging — remove or hide before any external beta.
5. **Smoke check** (curl or pytest):
   - no cookie → 401
   - valid Better Auth session cookie → 201 + body shape
6. **Optional web proof:** from Create placeholder, `fetch` create stub with `credentials: "include"` and show jobId (proves cookie cross-origin to API). Full Create UI is M3.

**Touch (landed)**

- `apps/api/src/schemas/jobs.py` — Create/status/result/error Pydantic mirrors
- `apps/api/src/api/v1/jobs.py` — `POST /api/v1/jobs` stub
- `apps/api/src/api/v1/router.py` — jobs router included
- `apps/api/tests/test_jobs_m1a.py` — 401 / 201 / empty-vision 422
- `apps/web/lib/api/config.ts`, `apps/web/lib/api/jobs.ts`
- `apps/web/features/create/components/create-job-stub.tsx` + Create page wire-up
- Contract ref: `md/contracts/job-api.md`, `packages/contracts/src/job-api.ts`

**Exit**

- [x] Unauthenticated `POST /api/v1/jobs` → **401**
- [x] Authenticated → **201** with M0e-shaped body including stable Better Auth `user.id` available to the handler
- [x] Pydantic models live in one place (not invented inline in the route forever)
- [x] High-level checkbox “API: protected create-stub” can be marked complete

**Out of scope for M1a:** Persist job to `generation_jobs`, LangGraph, quotas enforcement, status polling worker.

---

#### M1b — Migration tooling + product tables

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Minimal durable Postgres model for tools, versions, jobs, and assets. Auth tables stay owned by Better Auth — **no second users table**.

**Decision:** Versioned **raw SQL** under `apps/api/migrations/` + `scripts/migrate.py` (asyncpg). No Alembic/SQLAlchemy for MVP — stack already uses asyncpg for auth; repositories (M1c) will use the same pool. Track applied files in `schema_migrations`.

**Tasks**

1. **Pick migration approach** and stick to it:
   - **Preferred for FastAPI:** Alembic + SQLAlchemy/SQLModel models, **or**
   - Versioned raw SQL under `apps/api/migrations/` applied by a small script
   - Document the command in `apps/api/README.md` (e.g. `uv run alembic upgrade head`)
2. Add `adapters/db/session.py` helpers if useful (pool already on `app.state`; keep queries out of routers).
3. Create product tables (snake_case in Postgres):

| Table | Key columns (MVP) |
|-------|-------------------|
| `tools` | `id` (uuid/text PK), `public_id` (unique, short), `owner_user_id` → `user.id`, `status` (`draft` \| `published`), `title?`, `description?`, `thumbnail_asset_id?`, `published_at?`, timestamps |
| `tool_versions` | `id`, `tool_id` FK, `target` (`canvas2d` \| `p5` \| `three`), `code` (text), `param_schema` (jsonb), `default_params` (jsonb), `asset_slots` (jsonb), `plan` (jsonb nullable), `created_at` |
| `generation_jobs` | `id`, `owner_user_id`, `tool_id` nullable, `status` (`queued`/`running`/`succeeded`/`failed`), `vision_text`, `inspiration_asset_ids` (jsonb/array), `error_code`, `error_message`, token/cost fields, `repair_budget`, `repairs_used`, timestamps |
| `assets` | `id`, `owner_user_id`, `kind` (`inspiration` \| `studio` \| later `export`/`thumb`), `storage_key`, `content_type`, `byte_size`, `original_filename`, optional `tool_id`, timestamps |

4. **Indexes:** `tools.owner_user_id`, `tools.public_id`, `assets.owner_user_id`, `generation_jobs.owner_user_id`, `generation_jobs.status`.
5. **FK policy:** `owner_user_id` references Better Auth `"user".id` (text). Confirm type matches Better Auth (usually text id).
6. Publish/gallery: **columns on `tools`** for MVP — no separate `publishes` table unless needed later.
7. Apply migration on empty DB **and** on DB that already has Better Auth tables (dev reality).

**Touch (landed)**

- `apps/api/migrations/001_product_tables.sql`
- `apps/api/scripts/migrate.py` — `uv run python scripts/migrate.py` / `pnpm db:migrate`
- `apps/api/src/adapters/db/session.py` — pool helper
- `apps/api/src/adapters/db/schema_notes.py` — table/status constants
- `apps/api/tests/test_schema_m1b.py`
- `apps/api/README.md` — DB setup order (auth migrate → product migrate)
- `apps/api/package.json` — `db:migrate` script

**Exit**

- [x] One documented migrate command applies cleanly with Better Auth present
- [x] All four product tables exist with indexes
- [x] No competing `users` / `user` product table
- [x] High-level “Postgres schema” checkbox can be marked complete (repos still M1c)

**Out of scope for M1b:** Repository methods, agent writes, publish flow, Studio UI.

**Note:** jsonb columns may stay loosely validated until M3; align names with M0e/M0d where easy.

---

#### M1c — Thin repositories + draft-tool smoke

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Read/write product rows through repositories — no business logic in routers. Prove ownership FK works with a real Better Auth user.

**Tasks**

1. Create `adapters/db/repositories/`:
   - `tools.py` — `create_draft_tool`, `get_tool_by_id`, `get_tool_by_public_id` (stubs OK if not all used yet)
   - `jobs.py` — `create_job`, `get_job`, `update_job_status` (enough for M3 later)
   - `assets.py` — `create_asset`, `get_asset_for_owner`, `delete_asset`
2. Keep SQL/ORM **only** inside repositories; services will call these in M1e/M3.
3. **Smoke path** (script, pytest, or temporary admin-only route removed before merge):
   - Resolve a real `user.id` from Better Auth (or insert fixture user only if unavoidable — prefer real sign-up id)
   - Insert draft `tools` row with generated `public_id` (nanoid/ulid)
   - Optional: insert empty `tool_versions` row with `target='canvas2d'` and placeholder code
   - Read back by id / public_id
4. Wire repository factories in `core/deps.py` if useful (pool → repo).

**Touch (landed)**

- `apps/api/src/adapters/db/types.py` — row dataclasses
- `apps/api/src/adapters/db/ids.py` — `new_public_id`
- `apps/api/src/adapters/db/repositories/tools.py`
- `apps/api/src/adapters/db/repositories/jobs.py`
- `apps/api/src/adapters/db/repositories/assets.py`
- `apps/api/src/core/deps.py` — `ToolsRepo` / `JobsRepo` / `AssetsRepo`
- `apps/api/tests/test_repos_m1c.py`

**Exit**

- [x] Can insert a draft tool owned by a real `user.id` and read it back
- [x] Job + asset repository surfaces exist (even if only create/get)
- [x] High-level “Thin repositories” checkbox complete

**Out of scope for M1c:** HTTP upload endpoints, storage bytes, agent, publish.

**Depends on:** M1b tables.

---

#### M1d — Object storage adapter + CORS serve

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Swappable storage port so uploads work in local dev and later S3-compatible prod. Images must be browser-readable with `crossOrigin="anonymous"` (M0f / M2a).

**Use M0f policy:** [capture-cors.md](./contracts/capture-cors.md) · `PROVISIONAL_STORAGE_CORS` in `@repo/contracts`.

**Decision:** **Local filesystem** adapter + **Option A** API serve (`GET /api/v1/storage/objects/{key}` and `GET /api/v1/assets/raw/{id}`) with M0f CORS (no credentials). S3/R2 not required for core loop; protocol is ready for a later backend.

**Tasks**

1. Define `adapters/storage/protocol.py` (Protocol / ABC):
   - `put_object(key, data, content_type) -> None`
   - `delete_object(key) -> None`
   - `get_url(key) -> str` (public or signed; for local, API-served URL is fine)
2. Implement **local filesystem** adapter for dev:
   - Root e.g. `.data/uploads/` (gitignored) or docker volume
   - Key layout: `{kind}/{user_id}/{asset_id}/{safe_filename}` (or `{user_id}/{asset_id}/…`)
3. Config via env: `STORAGE_BACKEND=local|s3`, `STORAGE_LOCAL_ROOT`, optional S3 bucket/credentials/public base URL (S3 impl can be stubbed or deferred if local works).
4. **Serve path for local assets** (pick one and document):
   - **A (recommended for MVP):** `GET /api/v1/assets/raw/{asset_id}` or static mount under API with correct `Access-Control-Allow-Origin` for web origin + `GET`/`HEAD` (credentials **false** for asset GET — matches anonymous)
   - **B:** Next.js rewrite/proxy same-origin so canvas never goes cross-origin
5. Align response CORS headers with M0f provisional policy for the asset GET path.
6. Optional: MinIO in `docker-compose.yml` only if implementing S3 now — **not required** for M1 exit if local FS works.

**Touch (landed)**

- `apps/api/src/adapters/storage/protocol.py`
- `apps/api/src/adapters/storage/local.py` · `cors.py` · `create_storage`
- `apps/api/src/api/v1/storage.py` — serve by key
- `apps/api/src/api/v1/assets.py` — `GET /raw/{id}`
- `apps/api/src/core/config.py` — storage env
- `apps/api/src/core/deps.py` · `main.py` lifespan
- `.gitignore` — `.data/`
- `apps/api/tests/test_storage_m1d.py`
- `apps/api/README.md`

**Exit**

- [x] Service can store bytes under a key and return a URL the browser can fetch
- [x] CORS (or same-origin proxy) verified: sample image GET from `http://localhost:3000` context does not taint a canvas draw (or at least returns ACAO allowing web origin)
- [x] Storage adapter layout matches backend architecture

**Out of scope for M1d:** Export video blobs, CDN, lifecycle rules (M7/M9), upload multipart API (M1e).

**Parallelism:** Can start after M1a in parallel with M1b; **must merge before M1e**.

---

#### M1e — Upload API + Create proof UI

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Authenticated upload round-trip: file → storage → `assets` row → client sees metadata + URL. Minimal Create UI proof (not full Create product).

**Tasks**

1. **Schemas** `apps/api/src/schemas/assets.py`: response `{ id, kind, url, contentType, byteSize, originalFilename? }`.
2. **Service** `services/upload_asset.py`:
   - Validate MIME allowlist: `image/png`, `image/jpeg`, `image/webp`
   - Max size (e.g. 5–10 MB)
   - `kind` ∈ `inspiration` | `studio`
   - `put_object` → `assets` repo insert → return DTO with `get_url`
3. **Router** `POST /api/v1/assets` (multipart) — pick multipart-to-API for local MVP (presigned PUT can wait).
   - Auth required; unauthenticated → **401**
4. Optional: `GET /api/v1/assets/{id}` (owner-only metadata), `DELETE` for dev cleanup.
5. **Web proof on Create placeholder:**
   - File input + kind select (or fixed `inspiration`)
   - `fetch` with `credentials: "include"` to API
   - Show thumbnail via returned URL + asset id
   - Full vision→agent Create UI is **M3** — do not build it here
6. Optional: after upload works, optionally persist M1a create-stub jobs into `generation_jobs` (nice-to-have; not required if still uuid-only stub).

**Touch (landed)**

- `apps/api/src/schemas/assets.py`
- `apps/api/src/services/upload_asset.py`
- `apps/api/src/api/v1/assets.py` — POST / GET / DELETE + raw
- `apps/api/src/adapters/db/repositories/assets.py` — optional `asset_id` on create
- `apps/web/lib/api/assets.ts`
- `apps/web/features/create/components/upload-asset-stub.tsx`
- `apps/web/app/create/page.tsx`
- `apps/api/tests/test_upload_m1e.py`

**Exit**

- [x] Authenticated upload creates storage object + DB row
- [x] Unauthenticated upload → **401**
- [x] Returned URL loads the image (CORS-safe for later M2a capture)
- [x] High-level “Object storage…” and “Upload API…” checkboxes complete

**Out of scope for M1e:** Binding assets to tool slots in Studio (M5), inspiration vision model (M4), polished Create UX.

**Depends on:** M1c (assets repo) + M1d (storage + serve URL).

---

#### M1f — Public vs private access rules + M1 demo

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Document access rules early so M7/M8 do not invent ownership later; prove the milestone demo end-to-end.

**Tasks**

1. Write short **Access rules** doc — **[access-rules.md](./access-rules.md)**:

| Resource | Anonymous | Authenticated owner | Other signed-in users |
|----------|-----------|---------------------|------------------------|
| Draft tool / private version | No | Full | No |
| Published tool / gallery item | Read (view/embed) | Full | Read |
| Share page `/t/:publicId` | Read interactive tool | — | Read |
| Source download | Never (product rule) | View-in-Studio only | No |
| Assets (inspiration/studio) | No (unless published thumb via deliberate public URL) | Full | No |
| Create / upload / jobs | No (401) | Yes | N/A |

2. Confirm `public_id` generation strategy at tool create — **done in M1c** (`adapters/db/ids.new_public_id` → `t_{token}`; unique on `tools.public_id`). Documented in access-rules.
3. Run **M1 demo checklist** on local stack (`docker compose` DB + web + api):

   **Automated** (`apps/api/tests/test_m1_demo_checklist.py`):

   - [x] `POST /api/v1/jobs` without cookie → 401; with session → 201
   - [x] Upload image → row in `assets` + file in storage
   - [x] Fetch image URL with CORS ACAO for web origin
   - [x] Product schema + draft tool FK to real Better Auth user
   - [x] Access-rules doc present; `public_id` helper stable

   **Manual (browser — product UX; gates already code-complete):**

   - [x] Sign up / sign in — Better Auth path (shipped earlier; re-verify if env changes)
   - [x] Open `/create` while logged out → redirected to login (`requireSession`)
   - [ ] Optional live pass: `/create` upload + create-job with a real browser session

4. Update **Current progress** table at top of this file when done.

**Touch (landed)**

- `md/access-rules.md` — matrix, identity, tools, jobs, assets, raw URL exception, enforcement checklist
- `apps/api/tests/test_m1_demo_checklist.py` — automated M1 exit smokes
- Cross-links from this file + API README

**Exit**

- [x] Access rules written and linked
- [x] Demo checklist passes on local stack (automated + prior auth gates)
- [x] M1 exit criteria satisfied (unauth blocked, stable owner identity, upload round-trip + CORS)

**Out of scope for M1f:** Gallery UI, share page implementation (M7/M8), Studio.

---

### M1-rest checklist rollup

Mark complete only when the matching subpart exit is done:

| High-level item | Subpart | Status |
|-----------------|---------|--------|
| API create gate (401 / 201) | **M1a** | ✅ |
| Postgres product tables + migrations | **M1b** | ✅ |
| Thin repositories + draft tool smoke | **M1c** | ✅ |
| Object storage + CORS serve | **M1d** | ✅ |
| Upload API + Create proof UI | **M1e** | ✅ |
| Access rules + M1 demo | **M1f** | ✅ |

**M1-rest exit met** — all six ✅. Start **M2a**.

---

### M1 subpart sequencing diagram

```
Auth DONE (sign up / sign in / sign out / session→API)
                 │
                 ▼
M0-thin DONE ──► M1a  Job DTOs + Create API gate     ✅ DONE
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       M1b Schema ✅       M1d Storage + CORS ✅
       migrations             adapter
          │                   │
          ▼                   │
       M1c Repos ✅           │
       + draft smoke          │
          │                   │
          └─────────┬─────────┘
                    ▼
                 M1e Upload API + Create proof UI  ✅
                    │
                    ▼
                 M1f Access rules + demo  ✅  →  M1 COMPLETE → M2a  ← START HERE
```

### M1 core-loop exit vs full exit

| | Required to leave M1 for ASAP path? |
|--|-------------------------------------|
| Auth (sign up/in/out) | ✅ Already done |
| M1a create API gate | **Yes** |
| M1b product tables | **Yes** (jobs + tools at minimum before M3) |
| M1c repositories | **Yes** |
| M1d + M1e storage/upload | **Yes** for M2a real-asset capture and M5 assets (local FS adapter OK) |
| M1f access rules + demo | **Yes** (short doc + checklist) |
| Inspiration-upload UI polish | No — minimal upload proof is enough |
| Gallery publish columns polish | Optional until M8 |
| S3/MinIO production backend | No — local FS adapter OK for core loop |

### M1 implementation notes (do not skip)

- **Users:** Better Auth owns `user` / `session`; product FKs use that string id. **Do not build a second users table.**
- **Layout:** Follow `md/backend-architecture.md` — routers thin, services own use-cases, adapters for DB/storage.
- **Cookies:** Browser → API must send session cookie (`credentials: "include"`); CORS already allows localhost:3000 with credentials on the API.
- **Asset CORS ≠ API credential CORS:** session routes use credentials; asset image GETs should work with `crossOrigin="anonymous"` (M0f).
- **M0 dependency:** Job/tool shapes are frozen (M0-thin done); use them.
- **Not M1:** LangGraph, OpenRouter, Studio shell, gallery UI, export.
- **Do not reopen auth** unless session cookie forwarding to API breaks.
- **Order for a solo builder:** M1a → M1b → M1c → M1d → M1e → M1f (or M1d right after M1a if storage is clearer first).

---


## M2 — Runtime host + hand-authored tools

**Why:** Prove the contract, sandbox, and Control surface **without** LLM noise. If hand-authored tools cannot mount/update/capture, freeform codegen will fail.

**ASAP split:** **M2a = core-loop exit (canvas2d only).** **M2b = p5/three stubs (fast-follow).** Do **not** block M3/M5/M7 on M2b.

### M2a — canvas2d host (core-loop exit) ✅ required for ASAP

**Capture/CORS contract:** [capture-cors.md](./contracts/capture-cors.md) (M0f) — harness uses `crossOrigin="anonymous"`; **exit requires PNG capture with a real uploaded asset**, not only `data:` fixtures (`M2A_CAPTURE_REQUIRES_REAL_ASSET`).

#### Deliverables

- [ ] Sandboxed iframe host (CSP, no parent access, allowlisted libs only)
- [ ] **canvas2d** target loader + host adapter calling `VibeTool` methods uniformly
- [ ] **1 hand-authored canvas2d reference tool** implementing the full contract:
  - param schema + defaults
  - at least one asset slot (e.g. logo)
  - `captureFrame` (and stream if easy) working
- [ ] Minimal Studio shell: load tool version (fixture or DB) → `update` / `setAssets` → live preview
- [ ] Smoke tests: mount → update params → set asset → capture frame → dispose
- [ ] **Capture with a real uploaded asset** on canvas2d (depends on M1e upload; placeholders OK only for early host bring-up)

#### Demo

Open Studio on canvas2d fixture → tweak params → swap logo → live preview → PNG frame with uploaded logo.

#### Core-loop exit criteria (leave M2a → start M3)

- canvas2d reference tool runs under the host
- Capture path works for PNG-ready frames **with real uploaded asset** (or clear residual only if M1e not merged yet — must close before M5/M7)
- Safety: fixture code cannot reach parent window or arbitrary network
- Studio shell is good enough for M3 redirect target

### M2b — p5 + three stubs *(fast-follow; not on ASAP critical path)*

#### Deliverables

- [ ] Target loaders for `p5` and `three` (allowlisted bundles/CDN)
- [ ] Hand-authored reference tool per target (full contract + capture notes)
- [ ] Capture with real uploaded asset on each target (`preserveDrawingBuffer` for three)

#### Exit criteria

- All three targets run a reference tool under the same host
- Capture proven per target

### Out of scope (M2)

- LangGraph, OpenRouter, publish, export video UI polish, chat refine

### Depends on

- M0-thin contract (full M0 not required)
- M1e for real-asset capture demo (fixtures can bootstrap host earlier)
- Wire tools to DB before or during M3 finalize

---

## M3 — Create agent (vision text → canvas2d)

**Why:** First AI path. Constrain to **vision text + `canvas2d` only** so repair/validation can be tuned without multi-target variance.

### Deliverables

- [ ] `LLMClient` / model router abstraction (config model id; default DeepSeek V4 Flash via OpenRouter)
- [ ] LangGraph **Create** graph (linear):
  1. Ingest (text)
  2. Plan (structured JSON; target forced/preferred `canvas2d`)
  3. Codegen into **canvas2d skeleton template**
  4. Static validate (contract, schema, safety)
  5. Sandbox preview smoke + frame grab
  6. Repair loop ≤ N (token + wall-time budget)
  7. Finalize → tool version → open Studio; **salvage best-valid** on exhaustion
- [ ] Create UI: vision textarea (required), submit, **streamed job progress**, redirect to Studio on success
- [ ] Job status API (polling or SSE)
- [ ] **Per-user generation quota** (default 10/day) + token/cost logging + timeouts + repair budget
- [ ] Small **eval set** (~10 prompts) with numeric gates (default: ≥70% first-pass or ≥90% after-repair)

### Demo

Sign in → describe a vision in text → see progress stream → get a live canvas2d tool in Studio (or salvage draft if repairs exhaust).

### Exit criteria

- ≥ one reliable happy path on simple prompts (kinetic type / simple motion)
- Failed generations never become “ready” versions without passing validate + sandbox smoke (salvage is explicitly draft)
- Repair stops at N with salvage or clear error state in UI
- Quota enforced

### Out of scope

- Inspiration screenshots, p5/three agent selection, chat refine, export, gallery

### Depends on

- M1-rest (auth already done; need jobs + tools + storage)  
- **M2a** sandbox + canvas2d host (not M2b)

### ASAP note

Force/prefer `target: canvas2d` in Plan. Do not spend M3 calendar time on multi-target selection or inspiration images (M4).

---

## M4 — Multi-target codegen + inspiration screenshots *(fast-follow)*

**Why:** Expand beyond canvas2d and add optional inspiration images. **Not required for complete loop.**

### Deliverables

- [ ] Plan node **selects one target** (`canvas2d` | `p5` | `three`) with explicit rationale
- [ ] Per-target skeleton templates + codegen prompts + validators
- [ ] Create UI: optional multi-image inspiration upload
- [ ] Multimodal ingest / **style extract** step (palette, energy, composition notes)
  - **Vision model via router** committed before this milestone starts; Flash for codegen
- [ ] Prompts: interpret style — do not recreate copyrighted art 1:1
- [ ] Codegen leaves **asset slots** empty/placeholder when vision implies logo/media
- [ ] Evaluation set: ~10 prompts × targets; track first-pass vs after-repair success
- [ ] **M4a:** enable `p5` when eval gate passes  
- [ ] **M4b:** enable `three` behind config flag until eval gate passes  

### Demo

Create with vision + 1–2 screenshots → agent picks target → tool opens in Studio with style-influenced defaults (not a pixel copy).

### Exit criteria

- Targets that pass eval gates can be produced by the agent on appropriate prompts
- Vision-only Create still works without images
- `three` remains gated if below threshold (launch may ship without it)

### Out of scope

- Full Studio personalization UX (basic preview OK), publish, export polish

### Depends on

- M3 Create path solid on canvas2d

**Note:** M4 is **not** a prerequisite of M7/M8.

---

## M5 — Studio Control (params, assets, colors, source)

**Why:** Personalization is **after tool is ready** — asset slots + color overrides without full regen.

### Deliverables

- [ ] Schema-driven Control UI from `getParamSchema()` + presets
- [ ] **Assets panel:** upload/swap images into `getAssetSlots()` → `setAssets` live
- [ ] **Color overrides:** edit palette-related params (defaults may come from vision/inspiration)
- [ ] Live preview refresh without regenerate
- [ ] **View source** read-only (no download)
- [ ] Persist param + asset bindings on tool version / draft state
- [ ] Empty slots use generated placeholders (no crash)
- [ ] Loud affordance when tool has empty asset slots (“add your logo”)

### Demo

Open generated tool → change colors → upload logo into slot → motion updates live → view source (read-only).

### Exit criteria

- Personalization path works without invoking LangGraph
- Asset + color changes survive reload for the owner
- Source is visible in Studio only; no download endpoint
- Capture still works after setting a real uploaded asset

### Out of scope

- Chat refine, fonts/full brand kit object, Brand Kit save-for-reuse

### Depends on

- M2 host contract  
- M3 produced tools with real schemas/slots (M4 tools when available)

---

## M6 — Chat refine (Control LangGraph) *(fast-follow)*

**Why:** Structural/creative changes need patch + re-preview, not only sliders. **Not required for complete loop.**

### Deliverables

- [ ] LangGraph **Control refine**: user chat (± new assets) → patch code and/or params → validate → preview
- [ ] Studio chat UI with clear “refining…” states and failure messages
- [ ] Cap repair/refine budget; version history or at least last-good rollback
- [ ] Hard regen only when structural change required (prompt/policy)

### Demo

In Studio: “make the particles slower and add a subtitle” → tool updates and stays valid.

### Exit criteria

- Refine produces a new valid version or clean failure
- Param-only requests prefer param patches over full rewrite when possible (best-effort)

### Out of scope

- Multiplayer, remix lineage

### Depends on

- M5 Studio shell  
- M3 (and optionally M4) agent infrastructure

---

## M7 — Export · share · embed

**Why:** Creators need outputs outside the app and a public interactive link.

### Deliverables

- [ ] **PNG** export via `captureFrame`
- [ ] **Short video** (3–6s) via client **MediaRecorder** on canvas/capture stream → **WebM**
- [ ] **PNG-sequence fallback** if MediaRecorder fails or is unsupported
- [ ] Public page `/t/:publicId` — interactive tool, **auth not required** to view
- [ ] **Embed** snippet (`iframe` to public tool URL)
- [ ] Share URL copy in Studio
- [ ] Browser support notes for MediaRecorder
- [ ] Optional later (not DoD): async ffmpeg WebM → MP4

### Demo

From Studio: download PNG, record short WebM (or PNG sequence), open share link in private window, paste embed into a static HTML test page.

### Exit criteria

- PNG works on canvas2d (and any enabled targets) for reference + generated tools
- Video path works on at least Chromium; fallback documented and functional
- Public tool runs without leaking owner-only APIs or source download

### Out of scope

- Full server headless Playwright/ffmpeg farm, source download/CLI

### Depends on

- M2 capture contract  
- M1 publicId + access rules  
- M5 enough Studio chrome to trigger export

---

## M8 — Publish + gallery + quality gates

**Why:** Complete the consensus success path — others can open and use published tools.

### Deliverables

- [ ] Publish flow: title, description, tags, auto thumbnail (from frame grab)
- [ ] **Gates:** preview smoke + export smoke OK before publish
- [ ] Gallery list + detail → open public tool
- [ ] Publish creates/updates owned published version; failed gens never appear as published
- [ ] Anonymous browse of published gallery + public tools
- [ ] Takedown / unpublish switch for owner or ops

### Demo

Full success criteria path (canvas2d):

1. Sign in  
2. Vision (screenshots optional if M4 done)  
3. Live tool  
4. Studio: params, assets, colors  
5. Export PNG + short video  
6. Share link + embed  
7. Publish → another browser session finds it in gallery and uses it  

### Exit criteria

- Consensus **“flow is complete”** checklist passes with a real user dry-run on canvas2d
- Gate failures block publish with actionable errors
- No unpublished/broken jobs in gallery

### Out of scope

- Browse-first growth loops, remix/fork graph, team workspaces, SEO/growth polish beyond basic gallery
- Chat refine (M6) and multi-target (M4) unless already shipped

### Depends on

- M3, M5, M7 (not M4/M6)

---

## M9 — Hardening & launch polish (post complete-loop)

**Why:** Flow can be complete in dev while still fragile in production.

### Deliverables

- [ ] Cost/token dashboards; per-job budgets enforced (already wired in M3 — harden)
- [ ] Rate limits on Create / refine
- [ ] Stronger sandbox review (CSP, allowlist, XSS from tool params)
- [ ] Three.js capture reliability pass (if three enabled)
- [ ] Prompt + repair tuning from real failure corpus
- [ ] Config slot for stronger model when Flash quality is insufficient
- [ ] Basic observability: job failure reasons, target break rates
- [ ] Production deploy runbook (web, api, db, storage, secrets)
- [ ] Optional: async WebM → MP4 transcode job

### Exit criteria

- Known risks from consensus have an owner and mitigation in place
- Can run a closed beta without manual DB surgery

### Out of scope (still deferred per consensus)

- Remix / fork graph  
- Source download / CLI  
- Team workspaces  
- Brand kit required at Create  
- Arbitrary npm/framework codegen  
- Server-side video farm  
- Multiplayer  
- Anonymous Create (growth experiment only)

---

## Mapping: consensus → milestones

| Consensus area | Milestone(s) |
|----------------|--------------|
| Auth before Create | M1 (**auth done**; finish API gate + data) |
| Create: vision text | M3 |
| Create: optional screenshots | M4 (fast-follow) |
| LangGraph Create + repair + salvage | M3 |
| Skeleton templates + plan JSON | M0 (freeze), M3 (use) |
| Multi-target registry | M0 (IDs), **M2a canvas2d host**, M2b p5/three, M4 (agent, fast-follow) |
| VibeTool contract / sandbox / CORS capture | M0-thin, M2a |
| Own assets + color overrides | M5 |
| Chat refine | M6 (fast-follow) |
| PNG + MediaRecorder WebM + PNG-sequence fallback | M7 |
| Share URL + iframe embed | M7 |
| View source, no download | M5, M7 |
| Publish gates + gallery | M8 |
| Quotas + repair budgets | M3 (+ M9 harden) |
| DeepSeek / OpenRouter / vision router | M3 (+ vision route M4) |
| Non-goals (remix, multiplayer, …) | Explicitly excluded through M9 |

---

## Suggested sequencing for builders (ASAP core loop)

| Phase | Milestones | Outcome |
|-------|------------|---------|
| **Done** | Auth | Sign up · sign in · sign out · session → API |
| **Freeze (thin)** | M0-thin | canvas2d contract + plan/job shapes — no multi-target polish required |
| **Platform rest** | M1-rest (M1a→M1f) | Create gate, product DB, uploads, access rules |
| **Runtime** | **M2a** | canvas2d host + hand tool + capture (+ Studio shell) |
| **First magic** | M3 | Vision text → live canvas2d tool + quotas + repair |
| **Control** | M5 | Params, assets, colors, view source (start on M2a fixtures early) |
| **Distribute** | M7 → M8 | Export, share, publish → **core loop complete** |
| **Expand later** | M2b, M4, M6 | p5/three host · multi-target agent · chat refine |
| **Ship** | M9 | Beta-ready |

**Parallelism notes (speed):**

- **Auth is done** — do not wait on more auth features.  
- **M0-thin is done** — start **M1a** immediately.  
- After M1a: **M1b schema ∥ M1d storage**; M1c repos after M1b; M1e needs M1c + M1d.  
- M2a host can start on fixtures as soon as M0-thin lands; wire real uploads when **M1e** lands.  
- M5 Studio UI against M2a fixtures **in parallel** with M3 agent.  
- M7 PNG capture prototype on M2a fixtures early; public share routes need M1 publicId + access rules (M1f).  
- M2b / M4 / M6 **must not** block M7/M8.

---

## Definition of “MVP done”

Matches consensus success criteria (canvas2d-first):

> A real user can sign in, create from vision, control the tool (params, assets, colors), export PNG + short video, share/embed, and publish to a gallery — and failed generations never appear as published tools.

That is **M8 exit** on the critical path. Screenshots, multi-target, and chat refine improve the product but are **not** required to claim the loop complete.

**M9** is production hardening.

---

## Next action (start here)

Auth + **M0-thin are complete.** To get the core loop ASAP, execute in this order:

1. ~~**M0-thin**~~ — **done** (M0a–M0f).  
2. ~~**M1a**~~ — **done** (Pydantic job DTOs + `POST /api/v1/jobs` gate + Create proof).  
3. ~~**M1b**~~ — **done** (versioned SQL product tables + migrate script).  
4. ~~**M1c**~~ — **done** (thin repositories + draft-tool smoke).  
5. ~~**M1d**~~ — **done** (local storage + CORS serve).  
6. ~~**M1e**~~ — **done** (upload API + Create proof UI).  
7. ~~**M1f**~~ — **done** (access rules + demo checklist). **M1 complete.**  
8. **M2a** — sandbox host + canvas2d hand-authored tool (M0c skeleton) + minimal Studio + capture with real asset. **← start here**  
9. **M3** — LangGraph Create (vision → canvas2d) + progress UX + quota/repair/salvage.  
10. **M5 → M7 → M8** — full Studio personalization → export/share/embed → publish/gallery.

**Do not start next:** p5/three agent work, chat refine, inspiration vision pipeline, or M9 polish until M8 is green (unless explicitly pulled forward for learning only).

When you say **build**, start at **M2a** (canvas2d runtime host + hand-authored tool).
