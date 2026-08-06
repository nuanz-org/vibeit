# Vibeit — MVP milestones

**Source:** [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)  
**Status:** **Core-loop ASAP track** — aligned to consensus frozen v1  
**Date:** 2026-08-03 · **Revised:** 2026-08-06 (M0–M3 + M5 + M2a7 + **M7 complete** + **M8 complete** · **core loop complete** · next **M9** / fast-follows)  
**Goal:** Ship the **canvas2d complete loop as soon as possible** — Auth → Create → Studio → Export/share/embed → Publish gallery  

---

## Current progress (2026-08-06)

| Area | Status | Notes |
|------|--------|-------|
| Product architecture | ✅ Frozen v1 | Consensus + plan + BE/FE architecture docs |
| **Sign up** | ✅ Done | Better Auth email/password (`apps/web` `/api/auth/*`) |
| **Sign in** | ✅ Done | Same session cookie path |
| **Sign out** | ✅ Done | Client `signOut` + UI |
| Session → API | ✅ Done | FastAPI `GET /api/v1/auth/me` validates Better Auth cookie |
| Web Create gate | ✅ **Done** | M3g Create form + job poll + Studio redirect |
| Create API gate | ✅ **Done** | M1a–M3a + worker |
| Product DB (tools/jobs/assets) | ✅ **Done** | M1b schema + **M1c** repos |
| Object storage + uploads | ✅ **Done** | M1d storage + **M1e** upload API |
| Access rules + M1 demo | ✅ **Done** | **M1f** — [access-rules.md](./access-rules.md) |
| **M0-thin contracts** | ✅ **Done** | M0a–M0f landed — see note below |
| Runtime host / Studio / agent | ✅ **M2a + M3 done** | Host + Create agent |
| **M5 Studio Control** | ✅ **Done** | M5a–M5f · [m5-demo-checklist.md](./m5-demo-checklist.md) |
| **Generated tool live preview** | ✅ **Done** | **M2a7** — compile TS → ESM → `moduleSource` mount (not fixture-only) |
| **M7 Export · share · embed** | ✅ **Done** | M7a–M7g · [m7-demo-checklist.md](./m7-demo-checklist.md) |
| **M8 Publish · gallery · gates** | ✅ **Done** | M8a–M8g · [m8-demo-checklist.md](./m8-demo-checklist.md) |
| **Core loop (canvas2d)** | ✅ **Complete** | Auth → Create → Studio → Export/share → Publish gallery |

**Auth → M8 complete.** Core loop complete on canvas2d. Next: **M9** hardening, or fast-follows **M2b / M4 / M6**.

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
| M8 | Publish gates + gallery (**M8a–M8g**) | 2–3 |
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

- [x] Sandboxed iframe host (CSP, no parent access, allowlisted libs only) — M2a2
- [x] **canvas2d** target loader + host adapter calling `VibeTool` methods uniformly — M2a3
- [x] **1 hand-authored canvas2d reference tool** implementing the full contract — M2a4 social-frame
- [x] Minimal Studio shell: load fixture → `update` / `setAssets` → live preview — M2a5
- [x] Smoke tests: mount → update params → set asset → capture frame → dispose
- [x] **Capture with a real uploaded asset** on canvas2d — **M2a6** ([m2a-demo-checklist.md](./m2a-demo-checklist.md))

#### Demo

Open Studio on canvas2d fixture → tweak params → swap logo → live preview → PNG frame with uploaded logo.

#### Core-loop exit criteria (leave M2a → start M3)

- [x] canvas2d reference tool runs under the host
- [x] Capture path works for PNG-ready frames **with real uploaded asset**
- [x] Safety: fixture code cannot reach parent window or arbitrary network
- [x] Studio shell is good enough for M3 redirect target (`/studio/:toolId`)

**M2a exit met (2026-08-04).** Start **M3**.

#### M2a7 — Generated-code delivery (Studio sandbox)

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M2a ✓ · M3g ✓ (owner tool GET + `version.code`)

**Goal:** Studio mounts **generated** `tool_versions.code` in the existing sandboxed iframe — not always `fixture:social-frame`. Sandbox / bridge / adapter lifecycle stay; only the **code delivery path** changes.

**Why (product):** Until this lands, Create → Studio shows the social-frame fixture while View source shows real TS. Users never see their tool. M3g and M5e deliberately deferred this; M2a7 closes the gap.

**What shipped**

1. **Frame ESM** — `build:runtime-frame` `--format=esm` + `<script type="module">` so `import(blobUrl)` stays native (IIFE rewrote dynamic import).
2. **CSP** — `script-src 'self' blob:` in `sandbox.ts` + `runtime-frame.html` (keep in sync).
3. **Protocol** — optional `MountCommand.moduleSource` (precompiled ESM); `createMountCommand` must set the field explicitly (no silent drop).
4. **Adapter** — resolve factory: `moduleSource` → `toolId` fixture registry → `defaultToolId` (`fixture:social-frame` for bare `/dev/runtime-host` mount); cache **`activeFactory`** so pre-mount / post-dispose introspection never lies with the fixture schema after a generated load; revoke blob on remount + `stop()`.
5. **Compile** — `POST /api/runtime/compile` (auth via `getSession` → JSON 401, not redirect); allowlist (defense-in-depth) + esbuild full-bundle ESM; client `compileToolSource`.
6. **Studio** — thread `sourceCode` through shell → `useStudioRuntime` (via `hydrateOptsRef`); compile on READY; **no silent fixture fallback** on compile failure; empty `version.code` blocked in `StudioToolLoader` before shell mount.

**Touch (landed)**

- `apps/web/runtime/compile/*` · `app/api/runtime/compile/route.ts` · `lib/api/runtime-compile.ts`
- `runtime/frame/entry.ts` · `load-module.ts` · `targets/canvas2d/adapter.ts`
- `runtime/contract/messages.ts` · `guards.ts` · host bridge / `RuntimeHost`
- `features/studio/hooks/use-studio-runtime.ts` · `studio-tool-loader.tsx` · `studio-shell.tsx`
- `public/runtime-frame.js` (regenerated ESM — commit with frame source changes)
- Docs: [runtime-host.md](./contracts/runtime-host.md) · `apps/web/runtime/README.md`

**Exit**

- [x] Create → `/studio/{uuid}` runs **generated** canvas (not stock social-frame identity)
- [x] `/studio/social-frame` still fixture-only (no compile required)
- [x] `/dev/runtime-host` bare `mountTool(params)` uses `defaultToolId`
- [x] Compile failure surfaces error — does **not** silently fall back to social-frame
- [x] Empty version code → “No runnable source” (loader), not fixture mount
- [x] Smoke: `pnpm --filter web smoke:compile` · frame rebuild ESM

**Out of scope for M2a7:** Public `/t/:id` / embed delivery (M7 — reuse same path later); persist `code_js` on finalize; p5/three dynamic load.

**Supersedes notes on:** M3g “dynamic iframe load later”; M5e harness-only preview limitation; M5 “fixture + API schema path covers personalization without live generated JS.”

---

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

**Progress (start here after M2a):**

| Slice | Status |
|-------|--------|
| M0e job shapes + M1a create stub | ✅ Done (stub only — no worker) |
| M1b–M1c jobs/tools repos + tables | ✅ Done |
| M2a sandbox + Studio redirect target | ✅ Done |
| **M3-rest** (M3a→M3h) | ✅ **Done** — see [m3-demo-checklist.md](./m3-demo-checklist.md) |

### Deliverables (high-level)

- [x] `LLMClient` / model router abstraction (`deepseek/deepseek-v4-flash` only) — **M3b**
- [x] LangGraph / runner **Create** graph — **M3c–M3e**:
  1. Ingest (text)
  2. Plan (structured JSON; target forced `canvas2d`)
  3. Codegen into **canvas2d skeleton template**
  4. Static validate (contract, schema, safety)
  5. Sandbox smoke (structural)
  6. Repair loop ≤ N (token + wall-time budget)
  7. Finalize → tool version → open Studio; **salvage best-valid** on exhaustion
- [x] Create UI: vision textarea, submit, **polled job progress**, redirect to Studio — **M3g**
- [x] Job status API (polling) — **M3a**
- [x] **Per-user generation quota** (default 10/day) + token/cost logging + repair budget — **M3f**
- [x] Small **eval set** (~10 prompts) with numeric gates — **M3h**

### Demo

Sign in → describe a vision in text → see progress stream → get a live canvas2d tool in Studio (or salvage draft if repairs exhaust).

### Exit criteria

- [x] ≥ one reliable happy path on simple prompts (eval + Create UI path)
- [x] Failed generations never become published (salvage is draft + job failed)
- [x] Repair stops at N with salvage or clear error state in UI
- [x] Quota enforced

**M3 exit met (2026-08-04).** Start **M5** (full Control) or early **M7**. See [m3-demo-checklist.md](./m3-demo-checklist.md).

### Out of scope

- Inspiration screenshots, p5/three agent selection, chat refine, export, gallery

### Depends on

- M1-rest (auth already done; need jobs + tools + storage)  
- **M2a** sandbox + canvas2d host (not M2b)

### ASAP note

Force/prefer `target: canvas2d` in Plan. Do not spend M3 calendar time on multi-target selection or inspiration images (M4).

### Defaults (consensus freeze)

| Knob | MVP default |
|------|-------------|
| Codegen model | DeepSeek V4 Flash via OpenRouter (`LLM_DEFAULT_MODEL`) |
| Daily create quota | **10** / user / UTC day |
| Repair attempts | **N = 3** |
| Wall-time budget | **~60s** per job (config) |
| Eval gate | ≥70% first-pass **or** ≥90% after-repair on ~10 prompts |
| Target | Always `canvas2d` on ASAP path |
| Transport | Client **polls** `GET /api/v1/jobs/{id}` (SSE later) |

---

### M3 — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M3 done until **M3h**.

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **M3a** | Job persist + status/result API | M1a–M1c ✓ · M0e ✓ | 0.75–1 | Create writes `generation_jobs`; client can poll full lifecycle |
| **M3b** | LLM port + OpenRouter adapter | Config secrets | 0.5–0.75 | Services can call models without hardcoding HTTP in routers |
| **M3c** | Agent scaffold + validate + sandbox smoke | M3a · M2a ✓ | 1–1.5 | Fixture code path: validate + host smoke without LLM |
| **M3d** | Plan + codegen nodes (canvas2d) | M3b · M3c · M0c/M0d ✓ | 1–1.5 | Vision text → plan JSON → creative fill source |
| **M3e** | Repair loop + finalize / salvage | M3d | 1–1.5 | Bounded repair; ready version only if smoke passes; salvage = draft |
| **M3f** | Quota + budgets + token/cost logging | M3a · M3e | 0.5–0.75 | 10/day + N + wall-time enforced; costs logged |
| **M3g** | Create UI + progress + Studio redirect | M3a · M3e–M3f | 1–1.5 | End-to-end product path for a human |
| **M3h** | Eval set + M3 demo checklist | M3e–M3g | 0.5–1 | Numeric gates + exit doc |

**Suggested effort:** ≈5–8 focused days total (matches ASAP table).

**Parallelism:** After **M3a**, **M3b** can start while **M3c** uses fixtures (no live LLM). **M3g** UI chrome can start on stub job status once M3a lands (progress phases fake until worker is real). Do **not** start M4/M6.

**Where code lands (backend architecture):**

| Concern | Path |
|---------|------|
| Job HTTP | `apps/api/src/api/v1/jobs.py` |
| Job/tool Pydantic | `apps/api/src/schemas/jobs.py` (+ tools if needed) |
| Create use-case | `apps/api/src/services/create_job.py` |
| LangGraph Create | `apps/api/src/agent/graphs/create.py` |
| Nodes / prompts / validators | `apps/api/src/agent/nodes/` · `prompts/` · `validators/` |
| LLM port | `apps/api/src/adapters/llm/` (`protocol.py`, `openrouter.py`) |
| Worker / background | `apps/api/src/workers/generation.py` (or asyncio task early) |
| Domain invariants | `apps/api/src/domain/job_status.py` (failed ≠ ready) |
| Web Create | `apps/web/app/create/` · `apps/web/features/create/` · `features/jobs/` |
| Studio redirect | `/studio/{toolId}` (M2a5) — load **real** tool version when API ready |

**Codebase baseline (do not re-build):**

| Already exists | Use it |
|----------------|--------|
| `POST /api/v1/jobs` stub (auth + DTO) | `apps/api/src/api/v1/jobs.py` · `schemas/jobs.py` |
| Jobs / tools / assets repos | `adapters/db/repositories/` |
| Product tables | `migrations/001_product_tables.sql` |
| Job TS contracts | `packages/contracts` · `md/contracts/job-api.md` |
| Plan JSON | `packages/contracts` · `md/contracts/plan-json.md` |
| canvas2d skeleton + social-frame | `@repo/contracts/skeletons/canvas2d` · `runtime/fixtures/social-frame` |
| Runtime host (sandbox smoke target) | `apps/web/runtime/` |
| Create page + job client stub | `apps/web/app/create/` · `lib/api/jobs.ts` |
| Studio shell | `apps/web/features/studio/` |

**Invariants (every subpart):**

1. **`failed` never becomes ready/published** — only `succeeded` + validated version is Studio-ready.  
2. **Salvage** produces an explicit **draft** (not `ready` / not publishable).  
3. **Target forced `canvas2d`** in Plan and codegen.  
4. **No OpenRouter keys in web** — server-only.  
5. Graph runs in **service/worker**, never fat logic in the router.

---

#### M3a — Job persist + status/result API

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Replace the M1a in-memory create stub with durable `generation_jobs` rows and pollable status/result so the worker and Create UI share one machine.

**Use:** [job-api.md](./contracts/job-api.md) · existing `JobsRepository` · M0e phases (`plan` | `codegen` | `validate` | `repair`).

**Tasks**

1. **Service** `services/create_job.py` (or expand jobs service):
   - Auth user required
   - Validate `visionText` non-empty
   - Insert `generation_jobs` with `status=queued`, store vision + optional metadata
   - Optionally create draft `tools` row up-front or only on finalize (pick one; document — **prefer draft tool at enqueue** so Studio id is stable)
2. **Upgrade** `POST /api/v1/jobs` to call the service (still 401 without session; 201 with real `jobId`).
3. **`GET /api/v1/jobs/{jobId}`** — owner-only status body: `status`, optional `phase`, `error`, `quota?`, `resultReady`, progress fields from M0e.
4. **`GET /api/v1/jobs/{jobId}/result`** — only when `succeeded` (or document salvage draft path separately); return tool/version ids for Studio redirect.
5. **Status transitions** helpers: `queued → running → succeeded | failed` only; refuse illegal jumps.
6. **Smoke tests:** create → row exists; get status; unauth 401; non-owner 404/403.

**Touch (landed)**

- `apps/api/src/services/create_job.py` — enqueue draft tool + job; status/result helpers
- `apps/api/src/domain/job_status.py` — status machine transitions
- `apps/api/src/api/v1/jobs.py` — POST persist + GET status + GET result
- `apps/api/src/adapters/db/repositories/jobs.py` — `get_job_for_owner`, default repair_budget=3
- `apps/api/src/adapters/db/repositories/tools.py` — `get_latest_tool_version`
- `apps/api/tests/test_jobs_m3a.py`
- `apps/web/lib/api/jobs.ts` — `getJobStatus` / `getJobResult`

**Exit**

- [x] Authenticated create persists job and returns M0e-shaped 201
- [x] Poll status reflects DB (`queued` until worker exists)
- [x] Result endpoint does not leak publishable payloads for `failed` (409 until succeeded)
- [x] High-level checkbox “Job status API” can be marked complete (worker still stub OK)

**Out of scope for M3a:** LLM calls, graph, quota enforcement (return stub quota fields OK).

---

#### M3b — LLM port + OpenRouter adapter

**Status:** ✅ **Done** (2026-08-04)

**Goal:** One swappable LLM client so Create graph nodes do not call raw OpenRouter HTTP.

**Decision:** ASAP uses **only** OpenRouter model id `deepseek/deepseek-v4-flash`. Any other model id is rejected at the adapter.

**Tasks**

1. **Protocol** `adapters/llm/protocol.py`: `complete(messages, *, model, response_format?, temperature?) → text + usage`.
2. **OpenRouter adapter** `adapters/llm/openrouter.py` using `OPENROUTER_API_KEY`.
3. **Model router** `adapters/llm/router.py`: all roles → `deepseek/deepseek-v4-flash`.
4. **Config** in `core/config.py`: `openrouter_api_key`, `llm_default_model`, `llm_codegen_model`, timeouts.
5. **Depends** wiring in `core/deps.py` → `get_llm_client` / `LLM`.
6. **Smoke:** unit test with httpx mock — no live key required in CI.

**Touch (landed)**

- `apps/api/src/adapters/llm/protocol.py` · `openrouter.py` · `router.py`
- `apps/api/src/core/config.py` · `deps.py`
- `apps/api/tests/test_llm_m3b.py`
- `apps/api/README.md` — env table

**Exit**

- [x] Services/nodes can obtain an `LLMClient` via Depends
- [x] Default / only model is `deepseek/deepseek-v4-flash`
- [x] Missing API key fails clearly (`LLMConfigError`)
- [x] Mocked completion returns text + usage

**Out of scope for M3b:** Full Create graph, streaming tokens to browser (optional later).

---

#### M3c — Agent scaffold + static validate + sandbox smoke

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Stand up `agent/graphs/create` skeleton and **prove the non-LLM gates** with the hand-authored social-frame so validate + sandbox work before model noise.

**Decision (smoke):** M3c uses **structural contract smoke** in Python (export factory + harness/VibeTool surface + non-trivial draw + no network). Fail closed. Real Playwright/iframe host smoke can replace `run_sandbox_smoke` later without changing graph wiring.

**Tasks**

1. **Package layout:** `agent/graphs/create.py`, `agent/nodes/`, `agent/validators/`, `agent/prompts/`.
2. **Graph state** typed (`CreateGraphState`).
3. **Static validate** — forbid parent/top/eval/fetch/require/non-@repo imports; require factory + draw/mount.
4. **Sandbox smoke** — structural gate (see decision above).
5. **Ingest** — normalize vision; reject empty.
6. **Fixture run** — load `apps/web/runtime/fixtures/social-frame/tool.ts` → validate + smoke.
7. **LangGraph** linear: `ingest → load_fixture → validate → smoke → END`.

**Touch (landed)**

- `apps/api/src/agent/**` (state, nodes, validators, fixtures, graphs/create.py)
- `apps/api/tests/test_agent_m3c.py`
- `langgraph` dependency in `apps/api`

**Exit**

- [x] Fixture social-frame passes validate + smoke via LangGraph
- [x] Intentionally broken code fails validate or smoke
- [x] Graph skeleton is the single place Create stages will plug into (M3d plan/codegen next)

**Out of scope for M3c:** Live OpenRouter calls, repair loop, Create UI.

---

#### M3d — Plan + codegen nodes (canvas2d only)

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Vision text → structured Plan JSON → creative fill / tool source for canvas2d skeleton.

**Use:** [plan-json.md](./contracts/plan-json.md) · [skeletons/canvas2d.md](./contracts/skeletons/canvas2d.md) · M0b param examples.  
**Model:** `deepseek/deepseek-v4-flash` only (M3b adapter).

**Tasks**

1. **Plan node:** LLM → ToolPlan JSON; **force `target: "canvas2d"`**.
2. **Codegen node:** LLM → `export const createTool` + `createCanvas2dTool` module.
3. **Prompts** in `agent/prompts/create_plan.py` · `create_codegen.py`.
4. **Parse** plan JSON (fences + one retry) · extract TS module from fences.
5. **Graph:** live `ingest → plan → codegen → validate → smoke`; fixture still `… → load_fixture → …`.
6. Mocked end-to-end graph test (no live key required).

**Touch (landed)**

- `agent/nodes/plan.py`, `codegen.py`
- `agent/plan_parse.py`, `codegen_parse.py`
- `agent/prompts/create_plan.py`, `create_codegen.py`
- `agent/graphs/create.py` — dual fixture/live routes + `run_create_llm_pipeline`
- `apps/api/tests/test_agent_m3d.py`

**Exit**

- [x] Mocked LLM path produces plan with `target: canvas2d` only (even if model says p5)
- [x] Mocked codegen passes validate + structural smoke
- [x] No p5/three branches on ASAP path

**Out of scope for M3d:** Multi-target, inspiration images (M4), chat refine (M6), repair loop (M3e).

---

#### M3e — Repair loop + finalize / salvage

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Bounded repair on validate/smoke failure; finalize ready tool version only on full pass; salvage best-valid as draft on exhaustion.

**Decisions:**
- Repair budget **N=3** (`CREATE_REPAIR_MAX`), wall **~60s** (`CREATE_WALL_TIME_SECONDS`).
- On exhaust: job **`failed`** + optional **salvage** `tool_versions` from `best_valid_code`; `error_message` includes `salvage_draft=true toolId=… versionId=…`. Tool stays **draft** (never published).
- Worker: in-process `BackgroundTasks` when `OPENROUTER_API_KEY` set; fixture tests call worker with `use_fixture_code=True`.
- Phase column on `generation_jobs` (migration `002_job_phase.sql`) for status poll.

**Tasks**

1. **Repair node** + prompt — LLM fixes code; increments `repair_count`.
2. **Runner** `agent/runner.py` — plan → codegen → validate/smoke/repair loop.
3. **Finalize** — success version + `succeeded`; fail + optional salvage version.
4. **Worker** — phase updates while running; finalize at end.
5. **POST /jobs** enqueues background worker when API key present.

**Touch (landed)**

- `agent/nodes/repair.py` · `agent/runner.py` · `agent/prompts/create_repair.py`
- `services/finalize_job.py` · `workers/generation.py`
- `migrations/002_job_phase.sql` · jobs repo phase helpers
- `api/v1/jobs.py` — BackgroundTasks enqueue
- `tests/test_create_m3e.py`

**Exit**

- [x] Happy path: fixture worker → `succeeded` + draft tool version
- [x] Validate failure → repair then success (mocked LLM)
- [x] Salvage: failed job + draft version; tool not published
- [x] Phases written during worker run (poll `phase`)

**Out of scope for M3e:** Quota (M3f), polished Create UI (M3g).

---

#### M3f — Quota + budgets + token/cost logging

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Enforce product defaults so free OpenRouter spend and abuse stay bounded.

**Decisions:**
- Count **accepted enqueues** per user per **UTC calendar day**.
- On exceed: **HTTP 429** + `errorCode: QUOTA_EXCEEDED` + `quota` body.
- Cost estimate: rough `cost_cents` from tokens × `CREATE_COST_CENTS_PER_MILLION_TOKENS` (not billing-grade).

**Tasks**

1. **Quota** default 10/day — enforced in `enqueue_create_job`.
2. Count enqueues via `count_jobs_for_owner_since`.
3. Repair N + wall-time already from config (M3e); surfaced on status `repair.wallTimeMs`.
4. **Token/cost** on finalize → `tokens_used` + `cost_cents`.
5. **quota** on create + status responses.
6. Tests: service block + HTTP 429.

**Touch (landed)**

- `services/quota.py` · `services/create_job.py` · `services/finalize_job.py`
- `api/v1/jobs.py` · jobs repo count/usage helpers
- `core/config.py` — `CREATE_QUOTA_PER_DAY`, cost env
- `tests/test_quota_m3f.py`

**Exit**

- [x] Quota enforced server-side
- [x] Create/status show remaining (createsUsed / createsLimit / resetsAt)
- [x] Usage/cost logged on finalize path

**Out of scope for M3f:** Billing, paid tiers, soft-throttle UX polish.

---

#### M3g — Create UI + progress + Studio redirect

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Replace Create stubs with the real vision → job → Studio path.

**Tasks**

1. **Create form** — vision textarea → `POST /jobs`.
2. **Progress** — TanStack Query poll status every 1.2s until terminal.
3. **Success** — `GET /jobs/{id}/result` → redirect `/studio/{toolId}`.
4. **Failure / salvage** — parse `salvage_draft=true toolId=` → link to Studio draft.
5. **Quota UI** — show used/limit; block submit on `QUOTA_EXCEEDED` / 429.
6. **Auth** — `/create` still gated.
7. Debug stubs demoted to collapsible upload section.
8. **`GET /api/v1/tools/{id}`** owner read + Studio UUID loader.

**Note (at M3g ship, 2026-08-04):** Sandbox preview still mounted the canvas2d host harness (fixture runtime); **View source** showed generated version code. Dynamic iframe code load was deferred.

**Update (2026-08-06):** Dynamic load is **done** as **[M2a7](#m2a7--generated-code-delivery-studio-sandbox)** — Studio compiles `version.code` and mounts via `moduleSource`.

**Touch (landed)**

- `features/create/components/create-form.tsx` · `job-progress.tsx`
- `features/jobs/hooks/use-job.ts`
- `app/create/page.tsx` · `lib/api/jobs.ts` · `lib/api/tools.ts`
- `api/v1/tools.py` · `schemas/tools.py`
- `features/studio/components/studio-tool-loader.tsx`
- `tests/test_tools_m3g.py`

**Exit**

- [x] Human path: sign in → vision → progress → Studio (generated tool id)
- [x] Happy path does not require `/studio/social-frame` slug
- [x] Create UI checkbox complete

**Out of scope for M3g (at ship):** Inspiration screenshots (M4), chat refine (M6), full Control chrome (M5). ~~Dynamic iframe code injection~~ → **M2a7 ✅**.

---

#### M3h — Eval set + M3 demo checklist

**Status:** ✅ **Done** (2026-08-04)

**Goal:** Numeric gate + documented exit so M3 is not “vibes only.”

**Tasks**

1. **Eval set** — 10 prompts in `apps/api/evals/create/prompts.json`.
2. **Runner** — `scripts/eval_create.py` (mock default; `EVAL_LIVE=1` for OpenRouter).
3. **Gates** — ≥70% first-pass **or** ≥90% after-repair (mock: 80% / 100%).
4. **Checklist** — [m3-demo-checklist.md](./m3-demo-checklist.md) + `tests/test_m3_demo_checklist.py`.
5. High-level M3 deliverables marked complete.

**Touch (landed)**

- `apps/api/evals/create/prompts.json`
- `apps/api/scripts/eval_create.py`
- `apps/api/tests/test_m3_demo_checklist.py`
- `md/m3-demo-checklist.md`

**Exit**

- [x] Eval set committed and runnable
- [x] Documented happy-path demo (manual list in checklist)
- [x] Quota + fail-closed + salvage covered by automated smokes
- [x] **M3 core-loop exit met** → start M5 (or M7 prototype in parallel)

**Out of scope for M3h:** Production SLOs, multi-target evals (M4).

---

### M3 subpart sequencing diagram

```
M2a COMPLETE
    │
    ▼
M3a  Job persist + GET status/result
    │
    ├──────────────────┐
    ▼                  ▼
M3b  LLM adapter    M3c  Validate + sandbox smoke (fixtures)
    │                  │
    └────────┬─────────┘
             ▼
M3d  Plan + codegen (canvas2d)
             │
             ▼
M3e  Repair + finalize / salvage + worker
             │
             ▼
M3f  Quota + budgets + usage logs
             │
             ▼
M3g  Create UI → poll → Studio redirect
             │
             ▼
M3h  Eval set + demo checklist  →  M3 COMPLETE → M5 / M7
```

### M3 checklist rollup

| Subpart | Name | Done |
|---------|------|------|
| M3a | Job persist + status/result API | ✅ |
| M3b | LLM port + OpenRouter (`deepseek/deepseek-v4-flash` only) | ✅ |
| M3c | Agent scaffold + validate + sandbox (LangGraph) | ✅ |
| M3d | Plan + codegen canvas2d (Flash) | ✅ |
| M3e | Repair + finalize / salvage + worker | ✅ |
| M3f | Quota + budgets + logging | ✅ |
| M3g | Create UI + progress + redirect | ✅ |
| M3h | Eval set + demo checklist | ✅ |

**M3h exit met — M3 complete.**

### M3 implementation notes (do not skip)

- **Poll first, SSE later** — M0e transport MVP is polling; do not block M3g on EventSource.
- **In-process worker OK for early M3** — dedicated worker process when jobs are slow/flaky.
- **Sandbox smoke is the quality gate** — static validate alone is not enough to mark ready.
- **Studio must load generated code** — owner tool GET landed in M3g; **live generated preview** landed in **M2a7** (do not re-hardcode `fixture:social-frame` for generated tools).
- **Secrets:** `OPENROUTER_API_KEY` only in API env; never `NEXT_PUBLIC_*`.
- **Do not open M4/M6** while M3 is red unless for learning spikes.

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

- [x] Schema-driven Control UI from `getParamSchema()` + presets
- [x] **Assets panel:** upload/swap images into `getAssetSlots()` → `setAssets` live
- [x] **Color overrides:** edit palette-related params (defaults may come from vision/inspiration)
- [x] Live preview refresh without regenerate
- [x] **View source** read-only (no download)
- [x] Persist param + asset bindings on tool version / draft state
- [x] Empty slots use generated placeholders (no crash)
- [x] Loud affordance when tool has empty asset slots (“add your logo”)

### Demo

Open generated tool → change colors → upload logo into slot → motion updates live → view source (read-only).

### Exit criteria

- [x] Personalization path works without invoking LangGraph
- [x] Asset + color changes survive reload for the owner
- [x] Source is visible in Studio only; no download endpoint
- [x] Capture still works after setting a real uploaded asset (M2a path retained; manual confirm in checklist)

### Out of scope

- Chat refine, fonts/full brand kit object, Brand Kit save-for-reuse
- ~~Dynamic sandbox eval of generated JS~~ — **not** required for original M5 exit; **shipped later as M2a7** (generated tools now run live in the sandbox)
- Export / share / publish (M7 / M8)

### Depends on

- M2 host contract  
- M3 produced tools with real schemas/slots (M4 tools when available)

### M5 baseline already landed (do not re-build)

| Already exists | Use it |
|----------------|--------|
| Studio shell + fixture route | `apps/web/features/studio/` · `/studio/social-frame` |
| Schema param widgets (color/number/text/enum/boolean) | `param-controls.tsx` |
| Asset upload → `setAssets` live | `asset-slots-panel.tsx` · `use-studio-runtime.ts` |
| Live preview without remount | `host.updateParams` / `host.setAssets` |
| View source (read-only, no download button) | `view-source-panel.tsx` |
| Real-asset PNG capture | M2a6 · `proveRealAssetCapture` |
| Owner tool read API | `GET /api/v1/tools/{id}` · `studio-tool-loader.tsx` |
| Param / asset contracts | `@repo/contracts` · `md/contracts/param-schema.md` |
| Upload API | `POST /api/v1/assets` (M1e) |

**Gaps to close in M5 (at plan time):** presets, empty-slot loud UX, **persist** params/assets so reload survives, hydrate Studio from saved draft state, owner-only source discipline, demo checklist. Generated tools then still mounted the canvas2d harness for preview (M3g note) — personalization via schema + host updates; full generated-code iframe injection was **not** the M5 exit gate.

**Update (2026-08-06):** Live generated preview is **[M2a7](#m2a7--generated-code-delivery-studio-sandbox)** ✅ — Studio compiles and mounts `version.code` via `moduleSource`.

---

### M5 — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M5 done until **M5f**.

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **M5a** | Control polish (schema + presets + colors) | M2a ✓ · M3g ✓ | 0.5–0.75 | Complete schema-driven UI; Reset defaults; color group |
| **M5b** | Empty-slot affordances | M5a | 0.25–0.5 | Loud “add your logo” + safe empty placeholders |
| **M5c** | Draft state persist API | M1b/c ✓ · M3g ✓ | 0.75–1 | Owner PATCH params + asset bindings; reload-ready GET |
| **M5d** | Studio hydrate + auto-save | M5a–M5c | 0.75–1 | Changes survive reload for real tools |
| **M5e** | Generated-tool Control path | M5d · M3g ✓ | 0.5–0.75 | `/studio/{uuid}` uses version schema/defaults + source |
| **M5f** | Capture regression + M5 demo checklist | M5b–M5e | 0.25–0.5 | Exit doc + smokes; **M5 complete** |

**Suggested effort:** ≈3–4.5 focused days total.

**Parallelism:** After **M5a**, **M5c** (API) can start while **M5b** finishes UI polish. **M5d** needs both M5b UX and M5c API. Do **not** start M6 chat refine.

**Where code lands:**

| Concern | Path |
|---------|------|
| Param / color / presets UI | `apps/web/features/studio/components/param-controls.tsx` (+ new preset bar) |
| Assets + empty-slot banner | `asset-slots-panel.tsx` · `studio-shell.tsx` |
| Runtime live state | `hooks/use-studio-runtime.ts` |
| Persist hydrate / save | `hooks/use-studio-draft-state.ts` (new) · `lib/api/tools.ts` |
| View source | `view-source-panel.tsx` |
| Generated tool load | `studio-tool-loader.tsx` |
| Draft state columns / API | `migrations/003_*.sql` · `api/v1/tools.py` · `schemas/tools.py` · `repositories/tools.py` |
| Services | `services/update_tool_draft.py` (or thin repo + router) |
| Demo | `md/m5-demo-checklist.md` · `tests/test_m5_demo_checklist.py` |

**Invariants (every subpart):**

1. **No LangGraph** on Control path — sliders/uploads only; refine is M6.  
2. **No source download** — view-only in Studio; no `Content-Disposition: attachment` for code.  
3. **Params ≠ assets** — colors/numbers/text in params; images via slots + `setAssets`.  
4. **Owner-only** draft state mutations; non-owner → 404 hide.  
5. **Empty slots never crash** capture or mount — placeholders OK.  
6. Prefer **update existing draft version state** over spawning a new `tool_versions` row on every slider tick.

---

#### M5a — Control polish (schema + presets + colors)

**Status:** ✅ **Done** (2026-08-05)

**Goal:** Finish schema-driven Control so every M0b kind feels product-ready on the social-frame fixture, with presets and a clear color override group.

**Use:** [param-schema.md](./contracts/param-schema.md) · existing `ParamControls` · social-frame fixture.

**Tasks**

1. **Audit widgets** — color / number / text / enum / boolean solid; `assetRef` focuses or deep-links the matching Assets row (no image bytes in params).
2. **Color overrides section** — group `kind === "color"` fields under a “Colors” heading (palette first); other params under “Params” or by schema order with color cluster preferred.
3. **Presets**
   - **Reset to defaults** — restore `getDefaultParams()` (or version `defaultParams`) and call `updateParams`.
   - Optional thin preset chips if schema/fixture defines them; otherwise **Reset** alone satisfies “+ presets” for MVP.
4. **Live path** — every change still goes host `updateParams` without remount or job create.
5. **Busy/disabled** states when host not mounted.
6. Smoke on `/studio/social-frame`: tweak colors, speed, title, enum, boolean → live preview.

**Touch (landed)**

- `apps/web/features/studio/components/param-controls.tsx` — Colors / Params / Linked slots + Reset chip
- `apps/web/features/studio/components/studio-shell.tsx` — Control section + assetRef scroll/focus
- `apps/web/features/studio/components/asset-slots-panel.tsx` — highlightSlotId
- `apps/web/features/studio/hooks/use-studio-runtime.ts` — `defaultParams`, `resetParams`, `applyParams`
- `apps/web/features/studio/styles.module.css` — preset/group styles

**Exit**

- [x] All non-assetRef kinds editable from schema on fixture
- [x] Colors grouped / labeled as overrides
- [x] Reset to defaults works live
- [x] No API required for M5a (fixture-only OK)

**Out of scope for M5a:** Persist, empty-slot banner (M5b), generated tool hydrate (M5e).

---

#### M5b — Empty-slot affordances

**Status:** ✅ **Done** (2026-08-05) · **Depends on:** M5a ✓

**Goal:** Empty asset slots are obvious and safe — no crash; loud product affordance to personalize.

**Tasks**

1. **Empty placeholder tile** — lettermark / color block when slot empty (not a broken `<img>`).
2. **Loud banner** when any slot empty (especially `required` or first logo-like slot): e.g. “Add your logo to personalize this tool.”
3. **Per-slot empty CTA** — “Upload” / “Add image” stronger than muted “Empty”.
4. **Clear / replace** still works; after clear, placeholders return; tool keeps running.
5. Confirm mount + capture still work with zero real assets (capture may be non-M2a-exit path).

**Touch (landed)**

- `apps/web/features/studio/components/empty-slots-banner.tsx` — loud banner + primary empty slot pick
- `apps/web/features/studio/components/asset-slots-panel.tsx` — lettermark placeholders, primary CTAs
- `apps/web/features/studio/components/studio-shell.tsx` — banner wired into Assets section
- `apps/web/features/studio/styles.module.css` — banner / placeholder / primary file label

**Exit**

- [x] Empty slots never crash preview (placeholder tiles; no broken img)
- [x] Loud affordance visible when slots empty (“Add your logo” for logo-like slots)
- [x] Upload fills slot → live `setAssets` → banner softens/clears for filled slots
- [x] Clear restores placeholder + banner; Capture PNG still available without real asset

**Out of scope for M5b:** Persist bindings (M5c/d).

---

#### M5c — Draft state persist API

**Status:** ✅ **Done** (2026-08-05) · **Depends on:** M1b/c ✓ · M3g ✓

**Goal:** Owner can save **current params** + **asset slot → URL bindings** so personalization survives reload. No LangGraph.

**Design (landed):**

Store draft personalization on the **tool** row — not a new version per slider move:

| Field | Type | Notes |
|-------|------|--------|
| `tools.draft_params` | jsonb default `{}` | Full param bag (colors, numbers, …) |
| `tools.draft_assets` | jsonb default `{}` | `{ [slotId]: httpUrl \| null }` — rejects `data:`/`blob:` |

Codegen baseline stays on `tool_versions.default_params` / `asset_slots`.

**Tasks**

1. **Migration** `003_tool_draft_state.sql` — jsonb defaults `{}`.
2. **Repo** — `update_tool_draft_state(tool_id, params?, assets?)` · columns on all tool SELECTs.
3. **Schemas** — `ToolDraftPatchRequest`; `ToolResponse.draftParams` + `draftAssets`.
4. **`PATCH /api/v1/tools/{toolId}/draft`** — owner-only; **full replace** per present bag; 64KB soft cap; validate assets are http(s).
5. **`GET /api/v1/tools/{toolId}`** — returns draft fields for owner Studio hydrate.
6. **Tests** — owner patch + get round-trip; non-owner 404; invalid body 422; reject data: URLs.

**Touch (landed)**

- `apps/api/migrations/003_tool_draft_state.sql`
- `adapters/db/types.py` · `repositories/_mapping.py` · `repositories/tools.py`
- `services/update_tool_draft.py`
- `api/v1/tools.py` · `schemas/tools.py`
- `tests/test_tools_m5c.py`
- `apps/web/lib/api/tools.ts` — `patchToolDraft` + draft fields on `ToolResponse`

**Exit**

- [x] Owner can PATCH draft params + asset URLs
- [x] GET returns them
- [x] Non-owner cannot read/write draft tool (404)
- [x] No new `tool_versions` row per save

**Out of scope for M5c:** Web auto-save UI (M5d); publish (M8).

---

#### M5d — Studio hydrate + auto-save

**Status:** ✅ **Done** (2026-08-05) · **Depends on:** M5a ✓ · M5c ✓ · M5b ✓

**Goal:** Real tool Studio loads saved personalization and writes changes back without regenerate.

**Tasks**

1. **Hydrate order** on mount (generated tools):
   1. Mount host → introspection schema/defaults  
   2. Apply `defaultParams` from version  
   3. Overlay `draftParams` / `draftAssets` from tool GET  
   4. `updateParams` + `setAssets` so preview matches saved state  
2. **Auto-save** — debounce ~600ms after param/asset change → `PATCH draft`; show subtle “Saved” / “Saving…” / error.
3. **Manual Save** button optional fallback.
4. **Fixture path** (`/studio/social-frame`) — no API persist required; local-only OK.
5. **Reload** — change color + upload logo → refresh → same state for owner.
6. Link uploaded studio assets to `tool_id` when possible (`assets.tool_id` via optional form `toolId`).

**Touch (landed)**

- `apps/web/features/studio/hooks/use-studio-runtime.ts` — hydrate + `hydrated` gate
- `apps/web/features/studio/hooks/use-studio-draft-persist.ts` — debounced PATCH, Save now, unload flush
- `apps/web/features/studio/lib/draft-assets.ts` — bag convert/snapshot helpers
- `studio-shell.tsx` · `studio-tool-loader.tsx` · `asset-slots-panel.tsx`
- `apps/web/lib/api/assets.ts` · `apps/api` upload `toolId` form field

**Exit**

- [x] Asset + color changes survive reload for owner (API-backed tool via draft GET + PATCH)
- [x] Personalization never calls Create/LangGraph
- [x] Fixture Studio still works offline of draft API (local-only note in UI)

**Out of scope for M5d:** Version history / rollback (M6-ish); brand kit.

---

#### M5e — Generated-tool Control path

**Status:** ✅ **Done** (2026-08-05) · **Depends on:** M5d ✓

**Goal:** Product path “Create → Studio UUID” is first-class Control, not a second-class social-frame-only shell.

**Tasks**

1. **Pass version metadata** into shell: `paramSchema`, `defaultParams`, `assetSlots`, `code` (source), `versionId`.
2. Prefer **API schema** for Control labels when host introspection differs; host still drives live preview.
3. **View source** shows generated `version.code`; ensure **no download** control or endpoint.
4. Title / description from tool row; status badge draft vs ready.
5. Empty schema/slots → graceful empty Control (no crash).
6. At M5e ship: document M3g limitation (preview harness may still be social-frame creative). **Superseded by M2a7** — live preview now runs generated code.

**Touch (landed)**

- `lib/version-metadata.ts` — parse API schema/slots safely
- `use-studio-runtime.ts` — prefer version schema/slots for Control
- `studio-tool-loader.tsx` — full version metadata (+ later M2a7 empty-code gate)
- `studio-shell.tsx` — tool status badge, empty schema handling
- `view-source-panel.tsx` — view-only policy chrome (no download)

**Exit**

- [x] Open `/studio/{toolUuid}` → schema controls + assets + source
- [x] Demo path works on a tool produced by M3 Create (API load + Control + persist)
- [x] Source view-only; no download affordance
- [x] Preview harness limitation documented at M5e ship (UI note removed after **M2a7**)

**Out of scope for M5e:** Public `/t/:publicId` (M7); chat refine (M6). ~~Dynamic generated-code iframe eval~~ → **[M2a7](#m2a7--generated-code-delivery-studio-sandbox) ✅**.

---

#### M5f — Capture regression + M5 demo checklist

**Status:** ✅ **Done** (2026-08-05) · **Depends on:** M5b–M5e ✓

**Goal:** Prove M5 exit criteria with automated smokes + a short manual demo list.

**Tasks**

1. **Checklist doc** [m5-demo-checklist.md](./m5-demo-checklist.md)
2. **API tests** — draft round-trip; no download endpoint; surface inventory
3. **Web** — typecheck Studio paths
4. Mark high-level M5 deliverables complete
5. Update **Current progress** + **Next action**

**Touch (landed)**

- `md/m5-demo-checklist.md`
- `apps/api/tests/test_m5_demo_checklist.py`
- This file’s checkboxes / progress table

**Exit**

- [x] All M5 exit criteria demonstrable (automated + manual list)
- [x] Capture path retained (M2a checklist + Studio capture chrome)
- [x] **M5 core-loop exit met** → start **M7** (export/share)

**Out of scope for M5f:** M7 video/share, M8 publish.

---

### M5 subpart sequencing diagram

```
M2a + M3 COMPLETE
        │
        ▼
M5a  Control polish (schema + presets + colors)
        │
        ├──────────────────┐
        ▼                  ▼
M5b  Empty-slot UX     M5c  Draft persist API
        │                  │
        └────────┬─────────┘
                 ▼
M5d  Studio hydrate + auto-save
                 │
                 ▼
M5e  Generated-tool Control path
                 │
                 ▼
M5f  Demo checklist + capture regression  →  M5 COMPLETE → M7
```

### M5 checklist rollup

| # | Item | Subpart |
|---|------|---------|
| 1 | Schema-driven Control + presets | M5a |
| 2 | Color overrides section | M5a |
| 3 | Live preview without regenerate | M5a (exists; keep) |
| 4 | Assets upload/swap → setAssets | M5b (exists; polish) |
| 5 | Empty slots + loud affordance | M5b |
| 6 | Persist params + asset bindings | M5c + M5d |
| 7 | Survive reload (owner) | M5d |
| 8 | View source read-only | M5e (exists; harden) |
| 9 | Capture after real asset | M5f |
| 10 | No LangGraph on Control path | all |

### M5 implementation notes (do not skip)

1. **Debounce saves** — never write DB on every `input` event without debounce.  
2. **http(s) asset URLs only** in `draft_assets` for capture CORS path (reject `data:` in persisted state if easy).  
3. **Do not** create a new tool version per param tweak — that is refine/codegen territory (M6).  
4. **Fixtures** remain the fastest Control dev loop; generated UUID path is the product demo (**M2a7** mounts real `version.code`).  
5. Keep Studio state in **local React state** → runtime; TanStack Query for tool GET + draft mutation invalidation only.  
6. **Do not** re-hardcode `runtimeToolId: "fixture:social-frame"` for generated tools — that regressed the product to a demo harness (fixed in M2a7).

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

**Progress:** ✅ **Complete** — **M7a–M7g** (export · share · embed · public page). See [m7-demo-checklist.md](./m7-demo-checklist.md).

### Deliverables

- [x] **PNG** export via `captureFrame` — **M7a**
- [x] **Short video** (3–6s) via client **MediaRecorder** on canvas/capture stream → **WebM** — **M7b**
- [x] **PNG-sequence fallback** if MediaRecorder fails or is unsupported — **M7c**
- [x] Public page `/t/:publicId` — interactive tool, **auth not required** to view — **M7e**
- [x] **Embed** snippet (`iframe` to public tool URL) — **M7f**
- [x] Share URL copy in Studio — **M7f**
- [x] Browser support notes for MediaRecorder — **M7c** · [export-browser-support.md](./export-browser-support.md)
- [ ] Optional later (not DoD): async ffmpeg WebM → MP4

### Demo

From Studio: download PNG, record short WebM (or PNG sequence), open share link in private window, paste embed into a static HTML test page.

### Exit criteria

- [x] PNG works on canvas2d (and any enabled targets) for reference + generated tools — **M7a**
- [x] Video path works on at least Chromium; fallback documented and functional — **M7b + M7c**
- [x] Public tool runs without leaking owner-only APIs or source download — **M7d + M7e**

### Out of scope

- Full server headless Playwright/ffmpeg farm, source download/CLI
- Gallery list / SEO / tags polish (**M8**)
- Chat refine (**M6**), multi-target / screenshots (**M4**)

### Depends on

- M2 capture contract (+ **M2a7** live generated code in sandbox)  
- M1 `public_id` + [access-rules.md](./access-rules.md)  
- M5 Studio chrome enough to trigger export  

### M7 baseline already landed (do not re-build)

| Already exists | Use it |
|----------------|--------|
| `captureFrame` host bridge + wire format | `apps/web/runtime/host` · `runtime/capture/` · `CaptureFrameWire` |
| Real-asset PNG capture path | M2a6 · Studio “Capture PNG” / prove real-asset |
| CORS + `crossOrigin` policy | `md/contracts/capture-cors.md` · M1d storage headers |
| `tools.public_id` at create (`t_…`) | `adapters/db/ids.new_public_id` · M1b/c |
| Access matrix (draft private; published readable; **no source download**) | [access-rules.md](./access-rules.md) |
| Studio shell + live generated preview | `features/studio/` · **M2a7** `moduleSource` |
| Draft personalization (params/assets) | M5 draft GET/PATCH — public page should apply **published/default + optional frozen public bindings** (see M7d) |

**Gaps to close in M7:** product export chrome (PNG download + video), fallback when MediaRecorder missing, **anonymous public tool API + `/t/:publicId` page**, Studio share/embed UI, thin “make public link” (status → published without gallery), demo checklist.

---

### M7 — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M7 done until **M7g**.

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **M7a** | Studio PNG export (download) | M2a ✓ · M5 ✓ · M2a7 ✓ | 0.25–0.5 | One-click PNG download from fixture + generated tools |
| **M7b** | Short video export (WebM) | M7a | 0.75–1.25 | 3–6s MediaRecorder WebM download on Chromium |
| **M7c** | PNG-sequence fallback + browser notes | M7b | 0.25–0.5 | Usable export when MediaRecorder fails; short support doc |
| **M7d** | Public tool read API + access | M1f ✓ · M5 ✓ | 0.75–1 | Anonymous GET by `publicId` for shareable tools; no owner leaks |
| **M7e** | Public page `/t/:publicId` | M7d · M2a7 ✓ | 0.75–1 | Interactive tool mounts without login |
| **M7f** | Studio share + embed chrome | M7e | 0.25–0.5 | Copy share URL + iframe snippet; thin “make public link” |
| **M7g** | M7 demo checklist + regression | M7a–M7f | 0.25–0.5 | Exit doc + smokes; **M7 complete** → start M8 |

**Suggested effort:** ≈3–5 focused days total (matches ~2–4 planning band if parallelized).

**Parallelism:** After **M7a**, **M7d** (API) can start while **M7b/c** finish video. **M7e** needs M7d. **M7f** needs M7e. Do **not** start full gallery (**M8**) or chat refine (**M6**) inside M7.

**Where code lands:**

| Concern | Path (suggested) |
|---------|------------------|
| PNG / video export UI | `apps/web/features/studio/components/` (export panel) · `studio-shell.tsx` |
| Capture helpers (record, sequence) | `apps/web/runtime/capture/` (extend) or `features/studio/lib/export-*` |
| Browser support notes | `md/contracts/capture-cors.md` or `md/export-browser-support.md` |
| Public tool API | `apps/api/src/api/v1/tools.py` (or `public_tools.py`) · schemas · services |
| Thin publish-for-share | `PATCH`/`POST` owner “make public” → `tools.status = published` (no gallery UI) |
| Public page | `apps/web/app/t/[publicId]/page.tsx` (+ lightweight public host shell) |
| Share / embed UI | Studio header actions (copy URL, copy iframe) |
| Demo | `md/m7-demo-checklist.md` · `apps/api/tests/test_m7_demo_checklist.py` |

**Invariants (every subpart):**

1. **No source download** — public/embed never exposes a download of `version.code`; Studio view-source remains view-only.  
2. **Anonymous public view ≠ owner APIs** — no draft PATCH, no job create, no asset metadata of other users.  
3. **Draft stays private** — anonymous `/t/:publicId` only when tool is **shareable** (MVP: `status === published`; see M7d/M7f).  
4. **Export is client-side** — PNG/WebM in the browser; no Playwright/ffmpeg farm in M7.  
5. **CORS-safe assets** — real http(s) asset URLs only for capture (M2a/M5 path retained).  
6. **canvas2d first** — exit on canvas2d fixture + at least one generated tool; p5/three not required.

---

#### M7a — Studio PNG export (download)

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M2a ✓ · M5 ✓ · M2a7 ✓

**Goal:** Product-grade **Download PNG** from Studio for fixture and generated tools (not only “Capture PNG” debug chrome).

**Tasks**

1. **Export action** in Studio (header or Export section): “Download PNG”.
2. Call host `captureFrame()` → blob → trigger browser download with a sensible filename (`{tool-slug-or-id}-{timestamp}.png`).
3. Works on **`/studio/social-frame`** and **`/studio/{uuid}`** after tool is live.
4. Busy / error states if host not mounted or capture fails; keep existing real-asset gate messaging when relevant.
5. Reuse `CaptureFrameWire` / blob helpers; do not invent a second capture path.

**Touch (landed)**

- `apps/web/features/studio/lib/export-download.ts` — slugify + `buildPngExportFilename` + `downloadBlob`
- `apps/web/features/studio/hooks/use-studio-runtime.ts` — `downloadPng(filenameBase)` (captureFrame → PNG → download)
- `apps/web/features/studio/components/export-panel.tsx` — Export section UI
- `apps/web/features/studio/components/studio-shell.tsx` — Export panel + header “Download PNG”

**Exit**

- [x] Owner can download a PNG of the current preview (fixture + generated)
- [x] Capture still works after real uploaded asset (M2a path retained — Capture section unchanged)
- [x] No server upload of export required for MVP

**Out of scope for M7a:** Video, public page, share links.

---

#### M7b — Short video export (WebM)

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M7a ✓

**Goal:** Record a **short (3–6s) WebM** in the browser via **MediaRecorder** and download it.

**Tasks**

1. Prefer tool `getCaptureStream?()` when implemented; else `canvas.captureStream` / host-provided stream path (document which surface M2 host exposes).
2. **MediaRecorder** → WebM; default duration ~3–6s (constant; user-visible countdown or progress).
3. Download `.webm` with sensible filename.
4. Primary target: **Chromium**; fail with clear message if unsupported (fallback is **M7c**).
5. Do not block UI forever — cancel / timeout path.

**Design (landed):** MediaStream cannot cross postMessage. Host sends `recordVideo` → frame calls `getCaptureStream()` + MediaRecorder → returns base64 **wire** (same shape as PNG). Timeout = duration + 12s buffer.

**Touch (landed)**

- `apps/web/runtime/capture/record-video.ts` — MediaRecorder helper + duration clamp
- `apps/web/runtime/contract/messages.ts` — `recordVideo` command + result
- `apps/web/runtime/targets/canvas2d/adapter.ts` — in-frame record
- `apps/web/runtime/host/bridge.ts` · `RuntimeHost.tsx` — `recordVideo()`
- `apps/web/features/studio/hooks/use-studio-runtime.ts` — `downloadVideo` + countdown
- `apps/web/features/studio/components/export-panel.tsx` — Download video button
- `apps/web/features/studio/lib/export-download.ts` — `.webm` filename
- `public/runtime-frame.js` — rebuilt via `build:runtime-frame`

**Exit**

- [x] On Chromium: record short WebM and download from Studio
- [x] Duration and mime type documented (constants: `@repo/contracts` CAPTURE_VIDEO_* + `record-video.ts`)
- [x] Clear error when MediaRecorder unavailable (handoff to M7c)

**Out of scope for M7b:** MP4/ffmpeg, server-side recording, multi-target polish, PNG-sequence fallback (M7c).

---

#### M7c — PNG-sequence fallback + browser support notes

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M7b ✓

**Goal:** If MediaRecorder fails or is unsupported, user still gets a usable motion export path; document browser reality.

**Tasks**

1. **PNG-sequence fallback** — sample N frames over ~3–6s via repeated `captureFrame` (or timed captures) → zip of PNGs **or** sequential downloads (pick one simple UX; zip preferred if a tiny client zip lib is acceptable).
2. Wire Export UI: try WebM → on failure offer / auto-run sequence fallback.
3. **Browser support notes** — short markdown (MediaRecorder WebM: Chromium good; Safari/Firefox caveats; fallback behavior).
4. Manual smoke once on Chromium + note one non-Chromium path if available.

**Design (landed):**

- Sample at **4 fps** over clamped 3–6s (default 4s) → ~16 frames.
- Pack into uncompressed **ZIP** (minimal store writer — no new npm dep).
- **Download video** auto-falls back when MediaRecorder missing or `recordVideo` fails.
- Explicit **Download PNG sequence** always available.

**Touch (landed)**

- `apps/web/features/studio/lib/export-png-sequence.ts`
- `apps/web/features/studio/lib/zip-store.ts` — store-only ZIP
- `apps/web/features/studio/hooks/use-studio-runtime.ts` — `downloadPngSequence` + video auto-fallback
- `apps/web/features/studio/components/export-panel.tsx`
- `md/export-browser-support.md`
- Link from `md/contracts/capture-cors.md`

**Exit**

- [x] Fallback produces a downloadable multi-frame export when WebM cannot run
- [x] Support notes exist and are linked (`md/export-browser-support.md`)
- [x] Video path + fallback satisfy M7 exit “fallback documented and functional”

**Out of scope for M7c:** Perfect cross-browser video, MP4.

---

#### M7d — Public tool read API + access

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M1f ✓ · M5 ✓ · M2a7 ✓

**Goal:** Anonymous (and any signed-in non-owner) can load **enough to run** a shareable tool by `publicId`, without owner-only leaks.

**Design (MVP):**

| Rule | Behavior |
|------|----------|
| Shareable | `tools.status === 'published'` (draft remains private) |
| Lookup | By `public_id` only (never require internal UUID on public surface) |
| Payload | Target, param schema / defaults, asset slot URLs needed to mount, **code for sandbox run**, public title/description |
| Forbidden | Owner draft write APIs, job APIs, source **download** (`Content-Disposition: attachment`), other users’ private assets metadata |
| Personalization | Public run uses **version defaults** (+ optional published snapshot later). Owner **draft_params** stay private unless explicitly frozen into published version in M8 — **do not** leak draft-only state anonymously in M7 unless product decides otherwise |

**Tasks**

1. **`GET /api/v1/public/tools/{publicId}`** (or equivalent) — no auth required; **404** if missing or not published.
2. Response shaped for the public host (camelCase; no owner user id required in client).
3. Enforce [access-rules.md](./access-rules.md): draft → 404 for anonymous; published → read.
4. **Thin owner action** (can land with M7f): “Make public link” sets `status = published` + `published_at` **without** gallery UI (M8 adds gallery list/metadata polish/gates).
5. Tests: published 200; draft 404; no download endpoint; response has no secrets.

**Touch (landed)**

- `apps/api/src/api/v1/public_tools.py` — `GET /api/v1/public/tools/{publicId}`
- `apps/api/src/api/v1/tools.py` — `POST /api/v1/tools/{toolId}/publish`
- `apps/api/src/services/public_tool.py`
- `apps/api/src/schemas/tools.py` — `PublicToolResponse` (no owner/draft)
- `apps/api/src/adapters/db/repositories/tools.py` — `get_published_tool_by_public_id`, `set_tool_published`
- `apps/api/tests/test_public_tools_m7d.py`
- `apps/web/lib/api/tools.ts` — `getPublicTool`, `publishTool`

**Exit**

- [x] Anonymous can GET a published tool by `publicId`
- [x] Draft tools are not readable anonymously
- [x] No source download route; code only as needed to run in sandbox (same product rule as Studio)

**Out of scope for M7d:** Gallery listing, tags, quality gates (M8). Public page UI is **M7e**.

---

#### M7e — Public page `/t/:publicId`

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M7d ✓ · M2a7 ✓

**Goal:** Anyone with the link can open an **interactive** tool without signing in.

**Tasks**

1. Route **`/t/[publicId]`** (App Router) — fetch public tool API, mount sandbox host with `moduleSource` / target (reuse Studio runtime stack, thinner chrome).
2. **No auth required** to view; no Studio Control (params/assets owner chrome optional later — MVP: run with published defaults).
3. Safe empty/error states: not found, not published, load/mount failure.
4. Must not offer source download or owner draft controls.
5. Prove in private/incognito window.

**Design (landed):**

- Page is **outside** `proxy.ts` matcher (`/create`, `/studio` only) — no cookie gate.
- Client loads `GET /api/v1/public/tools/{publicId}` with `credentials: "omit"`.
- Compile uses **`POST /api/runtime/compile-public`** `{ publicId }` — server re-fetches published source (no arbitrary TS; no session).
- Mount via same `RuntimeHost` + `moduleSource` path as Studio (M2a7).
- Version **defaultParams** only (no draft overlay).

**Touch (landed)**

- `apps/web/app/t/[publicId]/page.tsx` · `not-found.tsx`
- `apps/web/features/public-tool/` — loader, shell, runtime hook, styles
- `apps/web/app/api/runtime/compile-public/route.ts`
- `apps/web/lib/api/runtime-compile.ts` — `compilePublicTool`

**Exit**

- [x] Private window can open `/t/{publicId}` for a published tool and see live canvas2d
- [x] 404/friendly error for draft or unknown id
- [x] No owner-only API calls from the public page

**Out of scope for M7e:** Embed snippet UI (M7f), gallery (M8), public param editing (optional later).

---

#### M7f — Studio share + embed chrome

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M7e ✓

**Goal:** From Studio, owner can **copy share URL** and **embed snippet**, and enable the public link if the tool is still draft.

**Tasks**

1. **Share URL** — `origin + /t/ + publicId`; one-click copy; show “link private until public” when draft.
2. **Make public link** (thin) — owner control → `status = published` (API from M7d); success enables anonymous `/t/...`.
3. **Embed snippet** — copyable `<iframe src="…/t/{publicId}" …></iframe>` (sensible default size; document `allow` if needed).
4. Optional: open public page in new tab for smoke.
5. Do **not** build gallery browse UI here.

**Touch (landed)**

- `apps/web/features/studio/lib/share-links.ts` — share URL + embed + clipboard
- `apps/web/features/studio/components/share-panel.tsx` — Make public · Copy URL · Copy embed · Open public page
- `apps/web/features/studio/components/studio-shell.tsx` — Share section + live status badge
- `apps/web/features/studio/styles.module.css` — share field styles
- Uses `publishTool()` from M7d (`POST /api/v1/tools/{id}/publish`)

**Exit**

- [x] Owner can copy share URL and iframe embed from Studio
- [x] After make-public, private window loads the tool
- [x] Draft remains unreadable anonymously until make-public

**Out of scope for M7f:** Gallery, tags, SEO, unpublish UX polish (M8 can own takedown switch fully).

---

#### M7g — M7 demo checklist + regression

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M7a–M7f ✓

**Goal:** Prove M7 exit criteria with automated smokes + a short manual demo list; update progress docs.

**Tasks**

1. **Checklist doc** `md/m7-demo-checklist.md` (PNG, WebM or fallback, public page, embed, access negatives).
2. **API tests** — public GET published/draft; no download; optional make-public.
3. **Web** — typecheck public + Studio export paths.
4. Capture regression: PNG still works after real asset (M2a).
5. Mark high-level M7 deliverables complete; update **Current progress** + **Next action** → **M8**.

**Touch (landed)**

- `md/m7-demo-checklist.md`
- `apps/api/tests/test_m7_demo_checklist.py`
- This file’s checkboxes / progress table

**Exit**

- [x] All M7 exit criteria demonstrable (automated + manual list)
- [x] **M7 core-loop exit met** → start **M8** (publish + gallery)

**Out of scope for M7g:** Gallery UI, publish quality gates beyond thin make-public (M8).

---

### M7 subpart sequencing diagram

```
M5 + M2a7 COMPLETE
        │
        ▼
M7a  Studio PNG export (download)
        │
        ├──────────────────────────┐
        ▼                          ▼
M7b  Short video (WebM)      M7d  Public tool API + access
        │                          │
        ▼                          │
M7c  PNG-sequence fallback         │
        │                          │
        └──────────┬───────────────┘
                   ▼
            M7e  Public page /t/:publicId
                   │
                   ▼
            M7f  Studio share + embed chrome
                   │
                   ▼
            M7g  Demo checklist + regression  →  M7 COMPLETE → M8
```

### M7 checklist rollup

| # | Criterion | Subpart |
|---|-----------|---------|
| 1 | Download PNG from Studio | M7a |
| 2 | Short WebM via MediaRecorder (Chromium) | M7b |
| 3 | PNG-sequence fallback + browser notes | M7c |
| 4 | Anonymous public tool API by publicId | M7d |
| 5 | Interactive `/t/:publicId` without login | M7e |
| 6 | Copy share URL + embed snippet | M7f |
| 7 | Thin make-public (no gallery) | M7d + M7f |
| 8 | No source download / no draft leak | all |
| 9 | Demo checklist + exit | M7g |

### M7 implementation notes (do not skip)

1. **Reuse M2a7 delivery** for public mount — same `moduleSource` / host path as Studio; do not invent a second sandbox.  
2. **Published ≠ gallery** — M7 only needs a shareable public URL; M8 adds list, tags, thumbnails, export smoke gates.  
3. **Prefer client exports** — keep bytes in the browser; optional later: upload export assets to storage.  
4. **Filename + UX** — export should feel product-ready (not a bare console blob dump).  
5. **Access rules are law** — if unsure, 404 hide over 403 reveal for private tools.  
6. ~~**Do not** start M8 gallery while M7 public page is red.~~ — M7 complete; M8 is next.

---

## M8 — Publish + gallery + quality gates

**Why:** Complete the consensus success path — others can open and use published tools.

**Progress:** ✅ **Done** (2026-08-06) — **M8a–M8g** · **core loop complete** on canvas2d.

### Deliverables (rollup)

- [x] Publish flow: title, description, tags, auto thumbnail (from frame grab) — **M8a + M8c + M8f**
- [x] **Gates:** preview smoke + export smoke OK before publish — **M8b**
- [x] Gallery list + detail → open public tool — **M8d + M8e**
- [x] Publish creates/updates owned published version; failed gens never appear as published — **M8a**
- [x] Anonymous browse of published gallery + public tools — **M8d + M8e**
- [x] Takedown / unpublish switch for owner or ops — **M8f**
- [x] Full-loop demo checklist + regression — **M8g**

### Demo

Full success criteria path (canvas2d):

1. Sign in  
2. Vision (screenshots optional if M4 done)  
3. Live tool  
4. Studio: params, assets, colors  
5. Export PNG + short video  
6. Share link + embed  
7. Publish (metadata + gates + thumb) → another browser session finds it in gallery and uses it  
8. Owner can unpublish → gallery + public page hide it  

### Exit criteria

- [x] Consensus **“flow is complete”** checklist passes (automated M8g + manual list in [m8-demo-checklist.md](./m8-demo-checklist.md))
- [x] Gate failures block publish with actionable errors
- [x] No unpublished/broken jobs in gallery
- [x] **M8g** complete → **core loop complete**

### Out of scope

- Browse-first growth loops, remix/fork graph, team workspaces, SEO/growth polish beyond basic gallery
- Chat refine (M6) and multi-target (M4) unless already shipped
- Server-side headless export farm, MP4 transcode (M9 optional)

### Depends on

- M3, M5, M7 (not M4/M6)

### M8 baseline already landed (do not re-build)

| Already exists | Use it |
|----------------|--------|
| Thin make-public | `POST /api/v1/tools/{id}/publish` · `publish_tool_for_share` · Studio “Make public link” |
| Public tool read API | `GET /api/v1/public/tools/{publicId}` · M7d |
| Public page `/t/:publicId` | M7e · `features/public-tool/` |
| Share / embed chrome | M7f · `share-panel.tsx` |
| Tool gallery columns | `tools.title`, `description`, `thumbnail_asset_id`, `published_at`, `status` |
| Asset kind `thumb` | Reserved in schema (`ASSET_KINDS`) — wire upload in M8c |
| PNG capture + download | M7a · host `captureFrame` |
| Access matrix | [access-rules.md](./access-rules.md) — published readable; failed never gallery-ready |

**Gaps to close in M8:** publish **metadata** (title/desc/tags) + **version freeze**, **quality gates** before gallery, **auto thumbnail**, **gallery list API + UI**, **unpublish**, upgrade thin make-public into a real publish flow without breaking share.

---

### M8 — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M8 (or core loop) done until **M8g**.

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **M8a** | Publish metadata + version freeze | M7 ✓ | 0.5–0.75 | title/desc/tags on publish; freeze published version; failed gens blocked |
| **M8b** | Publish quality gates | M8a | 0.5–1 | preview + export smoke must pass; actionable gate errors |
| **M8c** | Auto thumbnail (frame grab) | M8a · M7a ✓ | 0.25–0.5 | thumb asset from capture; stored on tool |
| **M8d** | Gallery list API | M8a | 0.5–0.75 | anonymous list of published tools (public_id + cards) |
| **M8e** | Gallery web UI | M8d · M7e ✓ | 0.5–1 | `/gallery` list + detail → open `/t/:publicId` |
| **M8f** | Studio publish panel + unpublish | M8a · M8b · M8c | 0.5–0.75 | full publish UX; owner takedown switch |
| **M8g** | M8 demo checklist + core-loop exit | M8a–M8f | 0.25–0.5 | dry-run passes → **core loop complete** |

**Suggested effort:** ≈2.5–4 focused days total (matches ~2–3 planning band if parallelized).

**Parallelism:** After **M8a**, run **M8b ∥ M8c ∥ M8d**. **M8e** needs M8d. **M8f** needs M8a + M8b + M8c (can start UI shell earlier). **M8g** last. Do **not** ship gallery cards that skip gates or show failed gens.

**Where code lands:**

| Concern | Path (suggested) |
|---------|------------------|
| Tags / publish metadata schema | `apps/api/migrations/` · `adapters/db/types.py` · tools repo |
| Publish service + gates | `apps/api/src/services/publish_tool.py` · `domain/publish_gates.py` |
| Upgrade publish route | `apps/api/src/api/v1/tools.py` (extend M7 thin publish) · schemas |
| Gallery list API | `apps/api/src/api/v1/gallery.py` (or `public_gallery.py`) · services |
| Thumbnail upload | asset `kind=thumb` · storage path · link `tools.thumbnail_asset_id` |
| Studio publish UI | `apps/web/features/studio/components/` (publish panel) |
| Gallery web | `apps/web/app/gallery/` · `features/gallery/` |
| Demo | `md/m8-demo-checklist.md` · `apps/api/tests/test_m8_demo_checklist.py` |

**Invariants (every subpart):**

1. **Failed generations never published** — no `status=published` / gallery row without a succeeded version.  
2. **Published ≠ “in gallery” without gates** — thin M7 share may still set published for `/t/...`; **gallery listing** requires gate pass (document clearly in M8b/M8d).  
3. **No source download** — gallery/public never expose download of `version.code`.  
4. **Anonymous gallery read only** — list/detail for published tools; no owner draft PATCH.  
5. **public_id in human URLs** — never internal UUID alone for gallery/share links.  
6. **canvas2d first** — exit on canvas2d; p5/three not required.  
7. **Access rules are law** — 404 hide over 403 reveal for private tools.

---

#### M8a — Publish metadata + version freeze

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M7 ✓

**Goal:** Upgrade thin make-public into a **metadata-aware publish** that freezes a public version snapshot and never publishes failed gens.

**Tasks**

1. **Schema** — add `tags` if missing (`text[]` or `jsonb` string array on `tools`). Confirm `title`, `description`, `thumbnail_asset_id`, `published_at` usable for gallery cards.
2. **Publish request body** — owner may send `title`, `description`, `tags` (required title for gallery; sensible defaults from vision/title if empty).
3. **Version freeze** — on publish, freeze the version the public page will run: latest ready version + optional snap of defaults (do **not** leak live owner `draft_params` unless product freezes them into published defaults — document choice in service).
4. **Failed gens blocked** — reject publish if no succeeded version / tool not ready; tests prove failed jobs never become published.
5. Keep M7 thin path working: publish without gallery fields still sets `status=published` for share **or** require metadata only when “Publish to gallery” (prefer one service with optional gallery flag — see M8b).
6. Tests: metadata round-trip; failed job cannot publish; draft remains private until publish.

**Design (landed)**

| Rule | Behavior |
|------|----------|
| Thin share | `POST /publish` with empty body still works (M7 “Make public link”) |
| Metadata | Optional `title`, `description`, `tags` (normalized lowercase, max 20×48 chars) |
| Version freeze | Always set `published_version_id` to the public-run version |
| Draft leak | Default: public uses version `default_params` only (draft stays private) |
| `freezeDraft: true` | New version with `default_params = merge(version, draft_params)`, then pin it |
| Ready check | No version or empty code → **422** `NO_VERSION` (failed gens never published) |
| Public GET | Prefer frozen `published_version_id`; fall back to latest |

**Touch (landed)**

- `apps/api/migrations/004_publish_metadata.sql` — `tags text[]`, `published_version_id`
- `apps/api/src/adapters/db/types.py` · `_mapping.py` · `repositories/tools.py`
- `apps/api/src/services/public_tool.py` — metadata + freeze + normalize_tags
- `apps/api/src/schemas/tools.py` — `ToolPublishRequest`; tags/published fields on responses
- `apps/api/src/api/v1/tools.py` — optional publish body
- `apps/web/lib/api/tools.ts` — `ToolPublishRequest` + optional body on `publishTool`
- `apps/api/tests/test_publish_m8a.py`

**Exit**

- [x] Owner can set title/description/tags on publish (API)
- [x] Published tool has a stable version for public run
- [x] Failed generation cannot become `status=published` (no/empty version blocked)
- [x] M7 share/public page still works

**Out of scope for M8a:** Gate smokes, thumbnail capture, gallery list UI, unpublish.

---

#### M8b — Publish quality gates

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M8a ✓

**Goal:** Block **gallery publish** unless preview + export smoke pass; return actionable errors.

**Tasks**

1. **`domain/publish_gates`** (or service helper) — ordered checks, each with code + human message.
2. **Preview smoke** — tool has runnable published version (target + code + mountable contract); optional lightweight “last preview OK” flag from Studio if easy, else server-side readiness checks (version exists, target allowed, code non-empty, param schema valid).
3. **Export smoke** — client-side: successful `captureFrame` (or PNG export) within the publish flow before calling gallery publish; server may require a recent smoke token / thumb upload as proof.
4. **API** — gallery publish returns **4xx** with structured gate failures (not a silent 200). Thin “make public link” for share may stay lighter **or** share the same gates — prefer: **share can stay thin; gallery requires gates** (document in access/publish notes).
5. Tests: each gate failure blocks gallery listing eligibility; pass path succeeds.

**Design (landed)**

| Mode | Behavior |
|------|----------|
| Thin share (`forGallery` omitted/false) | `status=published` only; **no** gallery gates; `galleryReady` stays false |
| Gallery publish (`forGallery: true`) | Run `domain.publish_gates`; pass → `galleryReady=true` + `exportSmokeAt` |
| Gate fail | **422** `{ code: GATES_FAILED, gates: [{code, message}, …] }` — tool not published / not gallery-ready |

**Gallery gates (ordered):**

| Code | Check |
|------|--------|
| `PREVIEW_NO_VERSION` | No tool_versions row |
| `PREVIEW_EMPTY_CODE` | Code empty/whitespace |
| `PREVIEW_TARGET` | Target missing or not in canvas2d/p5/three |
| `PREVIEW_PARAM_SCHEMA` | paramSchema present but not a list |
| `GALLERY_TITLE_REQUIRED` | No non-empty title (request or existing) |
| `EXPORT_SMOKE_REQUIRED` | `exportSmokeOk` not true (client must prove capture/PNG) |

Export smoke is **client-asserted** for MVP (Studio sets `exportSmokeOk` after successful `captureFrame` / Download PNG — wire in M8f). No headless farm.

**Touch (landed)**

- `apps/api/migrations/005_publish_gates.sql` — `gallery_ready`, `export_smoke_at`
- `apps/api/src/domain/publish_gates.py` — pure gate evaluator
- `apps/api/src/services/public_tool.py` — `PublishGateError`, gallery path
- `apps/api/src/schemas/tools.py` · `api/v1/tools.py` · tools repo/types
- `apps/web/lib/api/tools.ts` — `forGallery`, `exportSmokeOk`, `PublishGatesError`
- `apps/api/tests/test_publish_gates_m8b.py`

**Exit**

- [x] Gate failures block gallery publish with actionable errors
- [x] Happy path: preview + export smoke OK → publish allowed (`galleryReady`)
- [x] No broken/missing-version tools appear as gallery-eligible

**Out of scope for M8b:** Full SEO, multi-browser export matrix, server video farm.

---

#### M8c — Auto thumbnail (frame grab)

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M8a · M7a ✓ · M8b ✓

**Goal:** On publish (or pre-publish step), grab a frame and store it as the gallery thumbnail.

**Tasks**

1. Studio (or publish panel): `captureFrame` → blob → upload asset with `kind=thumb` (or dedicated thumb endpoint).
2. Set `tools.thumbnail_asset_id` on successful publish / thumb attach.
3. Public gallery cards resolve a **CORS-safe** thumb URL (raw asset pattern OK per access-rules; no private asset listing).
4. Fallback: placeholder thumb if capture fails but gates otherwise allow (product choice: prefer **block gallery publish** if no thumb when gate requires export smoke — align with M8b).
5. Tests: publish with thumb id; public list includes thumb URL or id.

**Design (landed)**

| Piece | Behavior |
|-------|----------|
| Upload | `POST /api/v1/assets` `kind=thumb` (also allows `export`); max 2MB; optional `toolId` |
| Studio | **Save gallery thumbnail** → `captureFrame` → upload → preview in Export panel |
| Publish | `thumbnailAssetId` on body → validates owner + kind ∈ {thumb, export} → `tools.thumbnail_asset_id` |
| Gallery gate | `GALLERY_THUMBNAIL_REQUIRED` when `forGallery` and no thumb; thumb also satisfies export smoke |
| Public URL | `thumbnailUrl` = `/api/v1/assets/raw/{id}` (anonymous CORS, no session) |

**Touch (landed)**

- `apps/api/src/services/upload_asset.py` — thumb/export kinds
- `apps/api/src/domain/publish_gates.py` — `has_thumbnail` / `GALLERY_THUMBNAIL_REQUIRED`
- `apps/api/src/services/public_tool.py` — resolve + attach thumb; public response URLs
- `apps/api/src/api/v1/tools.py` · `public_tools.py` · schemas
- `apps/web/lib/api/assets.ts` · `tools.ts`
- `apps/web/features/studio/lib/upload-thumbnail.ts`
- `use-studio-runtime.captureAndUploadThumbnail` · Export panel · Studio shell
- `apps/api/tests/test_thumbnail_m8c.py`

**Exit**

- [x] Published gallery item can show an auto (or owner-confirmed) thumbnail
- [x] Thumb uses reserved `thumb` kind / `thumbnail_asset_id`
- [x] No session-required image load that breaks canvas/gallery CORS

**Out of scope for M8c:** Multi-frame animated thumbs, CDN image transforms.

---

#### M8d — Gallery list API

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M8a · M8b · M8c ✓

**Goal:** Anonymous clients can list published, gallery-eligible tools for browse.

**Tasks**

1. **`GET /api/v1/public/gallery`** (or `/api/v1/gallery`) — no auth; returns cards: `publicId`, `title`, `description`, `tags`, `thumbnailUrl`/`thumbnailAssetId`, `publishedAt`.
2. **Eligibility filter** — only `status=published` **and** gallery-ready (gates passed / not unpublished from gallery). Do not list drafts or failed gens.
3. Pagination (`limit`/`cursor` or offset); stable sort (`published_at DESC`).
4. Optional: `GET .../gallery/{publicId}` detail metadata (not full Studio) if list is thin.
5. Tests: draft excluded; published included; pagination; no owner/draft fields leaked.

**Design (landed)**

| Endpoint | Behavior |
|----------|----------|
| `GET /api/v1/public/gallery?limit=&offset=` | Anonymous list; `limit` 1–100 (default 24); `hasMore` via limit+1 fetch |
| `GET /api/v1/public/gallery/{publicId}` | One card; **404** if draft, thin-share only, or unknown |
| Eligibility | `status=published` **AND** `gallery_ready=true` |
| Sort | `published_at DESC NULLS LAST`, then `public_id ASC` |
| Card fields | `publicId`, `title`, `description`, `tags`, `thumbnailAssetId`, `thumbnailUrl`, `publishedAt` |
| Leaks | No owner, draft, code, internal UUID |

Thin share (`status=published`, `galleryReady=false`) still works on `/public/tools/{id}` and `/t/...` but **not** in gallery list.

**Touch (landed)**

- `apps/api/src/adapters/db/repositories/tools.py` — `list_gallery_tools`, `get_gallery_tool_by_public_id`
- `apps/api/src/services/gallery.py` · `schemas/gallery.py`
- `apps/api/src/api/v1/public_gallery.py` · router include
- `apps/web/lib/api/gallery.ts` — `listGallery`, `getGalleryItem`
- `apps/api/tests/test_gallery_m8d.py`

**Exit**

- [x] Anonymous list returns only published gallery tools
- [x] Card payload enough for UI without owner APIs
- [x] Failed/draft tools never listed

**Out of scope for M8d:** Search/rank algorithms, follow graph, SEO sitemaps.

---

#### M8e — Gallery web UI

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M8d · M7e ✓

**Goal:** Anyone can browse the gallery and open a public tool.

**Tasks**

1. Routes: **`/gallery`** list; optional **`/gallery/[publicId]`** detail card before run.
2. List cards: title, description snippet, tags, thumbnail, link to **`/t/{publicId}`** (reuse M7e public run page — do not fork a second sandbox).
3. Empty / error / loading states; works in private/incognito (no login).
4. Basic responsive layout; no growth SEO pack required.
5. Nav entry from app chrome (header link) when signed in or marketing home — keep thin.

**Design (landed)**

| Route | Behavior |
|-------|----------|
| `/gallery` | Grid of cards from `listGallery` (infinite load-more) |
| `/gallery/[publicId]` | Detail card + **Open tool** → `/t/{publicId}` (M7e host) |
| Auth | None — outside proxy matcher |
| Empty | Friendly empty state + Create CTA |
| Not in gallery | Friendly error + back to gallery |

**Nav:** Home header + “Browse gallery” CTA · Studio header · Public tool header · Gallery shell (Browse / Create).

**Touch (landed)**

- `apps/web/app/gallery/page.tsx` · `app/gallery/[publicId]/page.tsx`
- `apps/web/features/gallery/` — shell, card, list, detail, styles
- Home / Studio / public-tool nav links
- `apps/api/tests/test_gallery_ui_m8e.py`

**Exit**

- [x] Anonymous user browses gallery and opens a tool to a live public page
- [x] Detail/list never offers source download or owner controls
- [x] canvas2d published tool runs after click-through (`/t/:publicId`)

**Out of scope for M8e:** Remix/fork buttons, related tools, infinite social feed.

---

#### M8f — Studio publish panel + unpublish

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M8a · M8b · M8c ✓

**Goal:** Owner completes publish from Studio (metadata + gates + thumb) and can take a tool down.

**Tasks**

1. **Publish panel** in Studio: edit title, description, tags; show gate status; trigger export/preview smoke; publish to gallery.
2. Wire to upgraded publish API + thumb upload; success shows “In gallery” + link to gallery card / public page.
3. **Unpublish / takedown** — owner control sets tool back to non-gallery (MVP: `status=draft` or `published` with `gallery_visible=false` — pick one and document; **must** hide from M8d list and anonymous `/t/...` if full takedown).
4. Prefer **404 hide** for unpublished (access-rules).
5. Ops note: same unpublish path is enough for MVP ops (no separate admin UI required).
6. Keep share URL / embed working when still public; clarify copy when unpublished.

**Design (landed)**

| Surface | Behavior |
|---------|----------|
| **Share panel** | Thin make-public only (`status=published`, no gallery gates) |
| **Publish panel** | Title / description / tags · capture thumb · checklist · `forGallery` publish |
| Gate errors | Structured `PublishGatesError` list in UI |
| **Unpublish** | `POST /tools/{id}/unpublish` → `status=draft`, `gallery_ready=false`, `published_at=null` |
| Hide | Public `/t` + gallery 404; thumb kept for re-publish |
| Ops | Same owner unpublish path (no admin UI) |

**Touch (landed)**

- `apps/api/src/adapters/db/repositories/tools.py` — `set_tool_unpublished`
- `apps/api/src/services/public_tool.py` — `unpublish_tool`
- `apps/api/src/api/v1/tools.py` — `POST .../unpublish`
- `apps/web/lib/api/tools.ts` — `unpublishTool`
- `apps/web/features/studio/components/publish-panel.tsx`
- Studio shell + tool loader wiring; Share copy clarifies thin vs gallery
- `apps/api/tests/test_unpublish_m8f.py`

**Exit**

- [x] Owner can publish with metadata + see gate feedback in Studio
- [x] Owner (or ops via same owner path) can unpublish; gallery + public page stop showing the tool
- [x] Thin share flow remains understandable (published for link vs in gallery)

**Out of scope for M8f:** Admin moderation console, report abuse workflow, team roles.

---

#### M8g — M8 demo checklist + core-loop exit

**Status:** ✅ **Done** (2026-08-06) · **Depends on:** M8a–M8f ✓

**Goal:** Prove full success path; mark **core loop complete**.

**Tasks**

1. Checklist doc **`md/m8-demo-checklist.md`** (publish metadata, gates fail/pass, thumb, gallery list, open tool, unpublish, failed gen never listed).
2. API tests for gallery list, publish gates, unpublish, failed-never-published.
3. Web typecheck gallery + Studio publish paths.
4. One real-user dry-run of consensus path on canvas2d.
5. Update **Current progress** + **Next action** → M9 (or fast-follows); check all M8 deliverable boxes.

**Touch (landed)**

- `md/m8-demo-checklist.md` — automated + manual full-loop path
- `apps/api/tests/test_m8_demo_checklist.py` — inventory + re-runs M8a–M8f smokes
- This file: M8 deliverables checked; **core loop complete**

**Exit**

- [x] All M8 exit criteria demonstrable (automated + manual list)
- [x] **Core loop complete** on canvas2d (Auth → Create → Studio → Export/share → Publish gallery)
- [x] Gate failures and unpublish verified (automated M8b/M8f)

**Out of scope for M8g:** M9 hardening, M4/M6 polish.

---

### M8 subpart sequencing diagram

```
M7 COMPLETE (thin make-public · /t/:publicId · export)
        │
        ▼
M8a  Publish metadata + version freeze
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
M8b  Quality gates   M8c  Auto thumbnail   M8d  Gallery list API
        │                  │                  │
        └────────┬─────────┘                  │
                 ▼                            ▼
          M8f  Studio publish + unpublish   M8e  Gallery web UI
                 │                            │
                 └────────────┬───────────────┘
                              ▼
                       M8g  Demo + core-loop exit
                              │
                              ▼
                    CORE LOOP COMPLETE → M9 / fast-follows
```

### M8 checklist rollup

| # | Criterion | Subpart |
|---|-----------|---------|
| 1 | title / description / tags on publish | M8a · M8f |
| 2 | Freeze published version; failed gens never published | M8a |
| 3 | Preview + export smoke gates | M8b ✅ |
| 4 | Auto thumbnail from frame grab | M8c ✅ |
| 5 | Anonymous gallery list API | M8d ✅ |
| 6 | Gallery UI → open `/t/:publicId` | M8e ✅ |
| 7 | Studio publish panel + unpublish | M8f ✅ |
| 8 | Full dry-run + exit docs | M8g ✅ |

### M8 implementation notes (do not skip)

1. **Reuse M7 public run** — gallery opens existing `/t/:publicId`; do not invent a second host.  
2. **Thin share vs gallery** — M7 “Make public link” can remain for share; gallery eligibility is gated (M8b). Document the difference in UI copy.  
3. **Prefer client export smoke** — no Playwright farm in M8.  
4. **Tags stay simple** — string list, case-normalized; no taxonomy service.  
5. **Unpublish is required for exit** — not optional polish.  
6. **Do not start M9 / M4 / M6** until M8g is green (unless explicit learning spike).

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

**Core loop complete** on canvas2d (Auth → Create → Studio → Export/share → Publish gallery).

1. ~~**M0-thin**~~ — **done** (M0a–M0f).  
2. ~~**M1a–M1f**~~ — **done**. **M1 complete.**  
3. ~~**M2a**~~ — **done**. See [m2a-demo-checklist.md](./m2a-demo-checklist.md).  
4. ~~**M3**~~ — **done** (M3a–M3h). See [m3-demo-checklist.md](./m3-demo-checklist.md).  
5. ~~**M5a–M5f**~~ — **done**. See [m5-demo-checklist.md](./m5-demo-checklist.md).  
5b. ~~**M2a7** generated-code delivery~~ — **done**. Studio runs generated tools live.  
6. ~~**M7a–M7g**~~ — **done**. Export · share · embed · public `/t/:publicId`. See [m7-demo-checklist.md](./m7-demo-checklist.md).  
7. ~~**M8a–M8g**~~ — **done**. Publish · gallery · gates. See [m8-demo-checklist.md](./m8-demo-checklist.md).  
8. **← start here: M9** — hardening & launch polish (or pull forward **M2b / M4 / M6** fast-follows).

**Optional once:** run the manual list in [m8-demo-checklist.md](./m8-demo-checklist.md) on a real browser if not already done.

When you say **build**, start **M9** (rate limits, observability, deploy runbook, sandbox review) unless you explicitly want a fast-follow.
