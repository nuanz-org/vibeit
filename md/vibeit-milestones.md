# Vibeit — MVP milestones

**Source:** [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)  
**Status:** **Core-loop ASAP track** — aligned to consensus frozen v1  
**Date:** 2026-08-03 · **Revised:** 2026-08-04  
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
| Create API gate | ❌ Open | No protected jobs/create stub yet (M1a) |
| Product DB (tools/jobs/assets) | ❌ Open | M1b |
| Object storage + uploads | ❌ Open | M1c–M1d |
| VibeTool contract / skeletons | ❌ Open | M0 (thin freeze next) |
| Runtime host / Studio / agent | ❌ Open | M2+ |

**Auth for the core loop is unblocked.** Next bottleneck is **M0 thin freeze + remaining M1 (data/uploads) + canvas2d runtime**, not more auth work.

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
4. **Parallel after M0-thin:** M1b schema ∥ M1c storage; M5 Studio chrome against M2a fixtures while M3 agent is built.  
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

### M0-thin (core-loop exit) — do this first

Enough to unlock **M1-rest + M2a**. Mark M0 core-loop exit when these are checked; do not wait for full M0 polish.

- [ ] **VibeTool contract** (TS types + short markdown): `mount`, `update`, `setAssets?`, `getParamSchema`, `getDefaultParams`, `getAssetSlots`, `captureFrame` / `getCaptureStream?`, `dispose`
- [ ] **Param schema conventions** (colors, numbers, text, enums, asset-slot refs) — canvas2d-focused examples OK
- [ ] **Target registry IDs** frozen: `canvas2d` | `p5` | `three` (only **canvas2d** required to implement now)
- [ ] **canvas2d skeleton template** shape (model fills creative logic inside harness)
- [ ] **Plan JSON** schema (concept, aspect, motion, params, `target` — target fixed to `canvas2d` on ASAP path)
- [ ] **Job API** shapes: create job, status, result version, error codes, quota/budget fields (can use jsonb-friendly loose fields)
- [ ] **Provisional capture/CORS notes** for canvas2d (`crossOrigin`, storage headers) — tighten with M1c/M2a if needed

**M0-thin demo:** An engineer can implement a hand-authored canvas2d tool and a create-job API without reopening architecture.

**M0-thin exit (unblocks ASAP path):**

- VibeTool + param schema + canvas2d skeleton + plan/job shapes treated as source of truth for M1/M2a/M3
- p5/three may be named-only in the registry until M2b

### Full M0 deliverables (nice-to-have before M4; not blocking core loop)

- [ ] Full allowlisted lib rules for p5/three
- [ ] Per-target capture rules including WebGL `preserveDrawingBuffer`
- [ ] p5 + three skeleton template stubs
- [ ] LangGraph node I/O sketch for Control refine (types only)
- [ ] Monorepo env template (OpenRouter, DB, storage) + shared contract package if useful
- [ ] Thin PRD one-pagers (optional): Create · Studio · Export · Gallery

### Demo (full)

Docs + types only. An engineer can answer “what does a valid tool look like?” for all three targets without reading the brainstorm.

### Full exit criteria

- Contract + param schema + capture/CORS rules + skeletons + plan-JSON + job API reviewed as **source of truth**
- No product UI required

### Out of scope

- Real auth, DB, agent, sandbox implementation beyond stubs

### Depends on

- Consensus frozen v1 ✓
- **Auth already done** — M0 does not depend on finishing M1

---

## M1 — Auth + data model + uploads

**Why:** Create is auth-gated; tools, versions, assets, and inspiration images need persistence before generation.

**Progress (2026-08-04):**

| Slice | Status |
|-------|--------|
| Sign up / sign in / sign out (Better Auth API + web UI) | ✅ **Done** |
| Session validation on FastAPI (`/api/v1/auth/me`) | ✅ **Done** |
| Web gate on `/create` | ✅ **Done** (placeholder page) |
| **M1-rest** (API create gate, schema, storage, uploads, access rules) | ❌ **Open — this is the remaining M1 work** |

Auth is **not** on the critical path anymore. Treat **M1-rest** as the only M1 work left for the core loop.

### Deliverables

#### Auth (done — do not re-plan)

- [x] Create account (sign up) — Better Auth email/password API
- [x] Sign in — Better Auth API
- [x] Sign out — Better Auth API + UI
- [x] Auth provider on `apps/web` + session validation on `apps/api` (`GET /api/v1/auth/me`)

#### M1-rest (required for core loop)

- [ ] **Login required before Create** fully closed (web done; API still open)
  - [x] Web: `/create` proxy cookie gate + `requireSession()` page guard
  - [ ] API: protected create-stub (or jobs) endpoint returns **401** without session
- [ ] Postgres schema (minimal):
  - users → **use Better Auth `user` table** (do not duplicate); product tables FK to `user.id`
  - tools (owned, publicId, status draft/published)
  - tool_versions (code, target, param schema, defaults, asset slots, plan metadata)
  - generation_jobs (status, inputs ref, errors, token/cost fields, repair budget)
  - assets / uploads (inspiration + user studio assets)
  - publishes / gallery metadata (can be columns on tools for MVP)
- [ ] Object storage for inspiration screenshots + user images (+ later exports/thumbs) with **CORS headers** matching M0 policy
- [ ] Upload API: inspiration images (create) · user assets (studio)
- [ ] Public vs private access rules documented (gallery/share anonymous-readable)

### Demo

Sign in → hit a protected “create stub” endpoint → upload an image → see record in DB/storage.

### Exit criteria

- Unauthenticated user cannot start Create
- Authenticated user has a stable identity for owned tools
- File upload round-trips to object storage with DB metadata and correct CORS

### Out of scope

- Agent generation, Studio UI, gallery UX

### Depends on

- M0 (job/tool shapes at least drafted)

---

### M1 remaining — implementation plan (subparts)

Complete these **in order** unless noted as parallel. Each subpart has its own exit; do not claim M1 done until **M1e**.

| Subpart | Name | Depends on | Outcome |
|---------|------|------------|---------|
| **M1a** | Create API gate + identity | Auth done ✓ | Unauth cannot start Create on API; owner id stable |
| **M1b** | Postgres product schema | M1a (identity) | Tables + migrations + thin repos |
| **M1c** | Object storage adapter | M0 CORS notes (or provisional) | Upload/delete/signed-read via protocol |
| **M1d** | Upload API + DB metadata | M1b + M1c | Inspiration + studio asset round-trip |
| **M1e** | Access rules + M1 demo | M1a–M1d | Doc + verified end-to-end demo |

**Suggested effort:** M1a ~0.5d · M1b ~1–1.5d · M1c ~1d · M1d ~1d · M1e ~0.5d (≈4–5 focused days).

---

#### M1a — Create API gate + stable identity

**Goal:** Finish “login required before Create” on the **API** side (web gate already works).

**Tasks**

1. Add a protected **create stub** endpoint, e.g. `POST /api/v1/jobs` (stub body) or `POST /api/v1/create/stub`, using `Depends(get_current_user)`.
2. Return **401** when session cookie missing/invalid; **200/201** with `{ userId, … }` when valid.
3. Keep `/api/v1/auth/me` as the thin “who am I” check; create stub proves product gate.
4. Optional smoke test: HTTP test without cookie → 401; with valid session → success.
5. Web: no change required if `/create` already gated; optionally call create stub from Create placeholder to prove cookie forwarding (`credentials: "include"`).

**Touch (expected)**

- `apps/api/src/api/v1/` — new `jobs.py` or extend router
- `apps/api/src/api/v1/router.py`
- `apps/web/app/create/page.tsx` (optional client call)
- Tests under `apps/api` if present

**Exit**

- [ ] Unauthenticated `POST` create-stub → **401**
- [ ] Authenticated → success payload includes Better Auth `user.id`
- [ ] Deliverable checkbox “Login required before Create” can be marked complete

**Out of scope for M1a:** Real generation jobs, LangGraph, quotas.

---

#### M1b — Postgres product schema + repositories

**Goal:** Minimal durable model for tools, versions, jobs, and assets. Auth tables stay owned by Better Auth.

**Tasks**

1. Choose migration approach (Alembic **or** versioned SQL under `apps/api` — pick one and stick to it).
2. Create product tables (names can be snake_case in Postgres):

| Table | Key columns (MVP) |
|-------|-------------------|
| `tools` | `id`, `public_id` (unique), `owner_user_id` → `user.id`, `status` (`draft` \| `published`), timestamps |
| `tool_versions` | `id`, `tool_id`, `target` (`canvas2d` \| `p5` \| `three`), `code`, `param_schema` (jsonb), `default_params` (jsonb), `asset_slots` (jsonb), `plan` (jsonb nullable), `created_at` |
| `generation_jobs` | `id`, `owner_user_id`, `tool_id` nullable, `status`, `vision_text`, `inspiration_asset_ids`, `error_code` / `error_message`, token/cost fields, `repair_budget` / `repairs_used`, timestamps |
| `assets` | `id`, `owner_user_id`, `kind` (`inspiration` \| `studio` \| later `export`/`thumb`), `storage_key`, `content_type`, `byte_size`, `original_filename`, optional `tool_id`, timestamps |
| publish/gallery | Prefer columns on `tools` for MVP: `published_at`, `title`, `description`, `thumbnail_asset_id` — full `publishes` table only if needed |

3. Indexes: `tools.owner_user_id`, `tools.public_id`, `assets.owner_user_id`, `generation_jobs.owner_user_id` + status.
4. Thin repositories under `apps/api/src/adapters/db/repositories/` (tools, jobs, assets) — no business logic in routers.
5. Wire pool/session in `adapters/db/session.py` (asyncpg already used for auth).

**Touch (expected)**

- `apps/api/src/adapters/db/` — models, session, repositories
- Migrations directory
- `apps/api/src/core/config.py` if needed

**Exit**

- [ ] Migrations apply cleanly on empty DB **and** existing Better Auth schema
- [ ] Can insert a draft tool owned by a real `user.id` and read it back
- [ ] No second `users` table competing with Better Auth

**Out of scope for M1b:** Agent writes to jobs, publish flow, Studio UI.

**Note:** If M0 job/tool JSON shapes are not fully frozen, still land columns as `jsonb` with loose validation; tighten in M3.

---

#### M1c — Object storage adapter + CORS

**Goal:** Swappable storage port so uploads work in local dev and later S3-compatible prod.

**Tasks**

1. Define `adapters/storage/protocol.py`: `put_object`, `delete_object`, `get_public_or_signed_url` (minimal surface).
2. Implement **local filesystem** adapter for dev (e.g. `.data/uploads/` or docker volume) **and/or** S3-compatible (MinIO/R2/S3) behind the same protocol.
3. Config via env: `STORAGE_BACKEND`, bucket/path, credentials, public base URL.
4. Apply **CORS / cache headers** consistent with M0 asset policy (if M0 not frozen yet, document a provisional policy and match it):
   - Browser must load images with `crossOrigin="anonymous"` without tainting canvas (M2 depends on this).
   - Prefer same-origin proxy **or** storage CORS allowing web origin + GET.
5. Key layout convention, e.g. `{user_id}/{asset_id}/{filename}` or `{kind}/{user_id}/{uuid}`.

**Touch (expected)**

- `apps/api/src/adapters/storage/`
- `apps/api/src/core/config.py`, env template / README
- Optional: `docker-compose.yml` MinIO service if using S3 locally

**Exit**

- [ ] Service can store bytes and return a URL the browser can fetch
- [ ] CORS (or same-origin proxy) verified with a sample image GET from `apps/web` origin
- [ ] Backend architecture layout for storage adapter present

**Out of scope for M1c:** Export video blobs, CDN, lifecycle rules (M7/M9).

**Parallelism:** Can start after M1a; merge before M1d.

---

#### M1d — Upload API (inspiration + studio assets)

**Goal:** Authenticated upload round-trip: file → storage → `assets` row → client sees metadata + URL.

**Tasks**

1. `POST /api/v1/assets` (multipart) or presigned PUT flow — pick **one** for MVP (multipart to API is simpler for local).
2. Auth required (`get_current_user`); reject unauthenticated uploads with **401**.
3. Validate: allowlisted MIME (`image/png`, `image/jpeg`, `image/webp`), max size (e.g. 5–10 MB), kind enum `inspiration` | `studio`.
4. Service `upload_asset`: write storage → insert `assets` row → return `{ id, kind, url, contentType, byteSize }`.
5. Optional: `GET /api/v1/assets/{id}` (owner-only) and `DELETE` for cleanup during dev.
6. Wire minimal UI on Create placeholder: file input → upload → show thumbnail/URL (proves M1 demo; full Create UI is M3/M4).

**Touch (expected)**

- `apps/api/src/api/v1/assets.py`, `schemas/assets.py`, `services/upload_asset.py`
- `apps/web` Create page or `features/create` upload control
- `lib/api` fetch helper with credentials if introduced

**Exit**

- [ ] Authenticated upload creates storage object + DB row
- [ ] Unauthenticated upload → **401**
- [ ] Returned URL loads the image (CORS-safe for later capture)
- [ ] Deliverables “Object storage…” and “Upload API…” can be checked

**Out of scope for M1d:** Binding assets to tool slots in Studio (M5), inspiration vision model (M4).

---

#### M1e — Public vs private access rules + M1 demo

**Goal:** Document access rules early so M7/M8 do not invent ownership later; prove the milestone demo.

**Tasks**

1. Write a short **Access rules** subsection (in this file or `md/` one-pager linked from here):

| Resource | Anonymous | Authenticated owner | Other signed-in users |
|----------|-----------|---------------------|------------------------|
| Draft tool / private version | No | Full | No |
| Published tool / gallery item | Read (view/embed) | Full | Read |
| Share page `/t/:publicId` | Read interactive tool | — | Read |
| Source download | Never (product rule) | View-in-Studio only | No |
| Assets (inspiration/studio) | No (unless published thumb via public URL) | Full | No |
| Create / upload / jobs | No (401) | Yes | N/A |

2. Define `public_id` generation (nanoid/ulid) at tool create time even if draft-only for now.
3. Run **M1 demo checklist** and record pass:

   - [ ] Sign up / sign in
   - [ ] Open `/create` while logged out → redirected to login
   - [ ] Hit create-stub without cookie → 401; with session → 200
   - [ ] Upload image → row in `assets` + file in storage
   - [ ] Fetch image URL from browser (CORS OK)

4. Mark all M1 deliverables complete only after checklist passes.

**Exit**

- [ ] Access rules written and linked
- [ ] Demo path works on a clean local stack (`docker compose` DB + web + api)
- [ ] M1 exit criteria satisfied

---

### M1 subpart sequencing diagram

```
Auth DONE (sign up / sign in / sign out / session→API)
                 │
                 ▼
M0-thin (can parallel start of M1a) ──► M1a Create API gate
                                           │
                                           ▼
                                        M1b Schema/repos ────────┐
                                           │                     │
                                           │    M1c Storage ─────┤ (parallel with M1b after M1a)
                                           ▼                     ▼
                                        M1d Upload API + Create upload UI
                                           │
                                           ▼
                                        M1e Access rules + demo  →  M1 COMPLETE → M2a
```

### M1 core-loop exit vs full exit

| | Required to leave M1 for ASAP path? |
|--|-------------------------------------|
| Auth (sign up/in/out) | ✅ Already done |
| M1a create API gate | **Yes** |
| M1b tools/versions/jobs/assets tables | **Yes** (jobs + tools at minimum before M3) |
| M1c + M1d storage/upload | **Yes** for M2a real-asset capture and M5 assets (local FS adapter OK) |
| M1e access rules + demo | **Yes** (short doc + checklist) |
| Inspiration-upload UI polish | No — minimal upload proof is enough |
| Gallery publish columns polish | Optional until M8 |

### M1 implementation notes (do not skip)

- **Users:** Better Auth owns `user` / `session`; product FKs use that string id. **Do not build a second users table.**
- **Layout:** Follow `md/backend-architecture.md` — routers thin, services own use-cases, adapters for DB/storage.
- **Cookies:** Browser → API must send session cookie (`credentials: "include"`); CORS already allows localhost:3000 with credentials.
- **M0 dependency:** Prefer M0-thin job/tool shapes; if slightly ahead of freeze, use jsonb + provisional CORS and tighten later.
- **Not M1:** LangGraph, OpenRouter, Studio shell, gallery UI, export.
- **Do not reopen auth** unless session cookie forwarding to API breaks.

---

## M2 — Runtime host + hand-authored tools

**Why:** Prove the contract, sandbox, and Control surface **without** LLM noise. If hand-authored tools cannot mount/update/capture, freeform codegen will fail.

**ASAP split:** **M2a = core-loop exit (canvas2d only).** **M2b = p5/three stubs (fast-follow).** Do **not** block M3/M5/M7 on M2b.

### M2a — canvas2d host (core-loop exit) ✅ required for ASAP

#### Deliverables

- [ ] Sandboxed iframe host (CSP, no parent access, allowlisted libs only)
- [ ] **canvas2d** target loader + host adapter calling `VibeTool` methods uniformly
- [ ] **1 hand-authored canvas2d reference tool** implementing the full contract:
  - param schema + defaults
  - at least one asset slot (e.g. logo)
  - `captureFrame` (and stream if easy) working
- [ ] Minimal Studio shell: load tool version (fixture or DB) → `update` / `setAssets` → live preview
- [ ] Smoke tests: mount → update params → set asset → capture frame → dispose
- [ ] **Capture with a real uploaded asset** on canvas2d (depends on M1d; placeholders OK only for early host bring-up)

#### Demo

Open Studio on canvas2d fixture → tweak params → swap logo → live preview → PNG frame with uploaded logo.

#### Core-loop exit criteria (leave M2a → start M3)

- canvas2d reference tool runs under the host
- Capture path works for PNG-ready frames **with real uploaded asset** (or clear residual only if M1d not merged yet — must close before M5/M7)
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
- M1d for real-asset capture demo (fixtures can bootstrap host earlier)
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
| **Platform rest** | M1-rest (M1a→M1e) | Create gate, product DB, uploads, access rules |
| **Runtime** | **M2a** | canvas2d host + hand tool + capture (+ Studio shell) |
| **First magic** | M3 | Vision text → live canvas2d tool + quotas + repair |
| **Control** | M5 | Params, assets, colors, view source (start on M2a fixtures early) |
| **Distribute** | M7 → M8 | Export, share, publish → **core loop complete** |
| **Expand later** | M2b, M4, M6 | p5/three host · multi-target agent · chat refine |
| **Ship** | M9 | Beta-ready |

**Parallelism notes (speed):**

- **Auth is done** — do not wait on more auth features.  
- M0-thin and M1a can start immediately (even same day).  
- After M1a: M1b schema ∥ M1c storage.  
- M2a host can start on fixtures as soon as M0-thin lands; wire real uploads when M1d lands.  
- M5 Studio UI against M2a fixtures **in parallel** with M3 agent.  
- M7 PNG capture prototype on M2a fixtures early; public share routes need M1 publicId + access rules.  
- M2b / M4 / M6 **must not** block M7/M8.

---

## Definition of “MVP done”

Matches consensus success criteria (canvas2d-first):

> A real user can sign in, create from vision, control the tool (params, assets, colors), export PNG + short video, share/embed, and publish to a gallery — and failed generations never appear as published tools.

That is **M8 exit** on the critical path. Screenshots, multi-target, and chat refine improve the product but are **not** required to claim the loop complete.

**M9** is production hardening.

---

## Next action (start here)

Auth is complete. To get the core loop ASAP, execute in this order:

1. **M0-thin** — freeze VibeTool + param schema + canvas2d skeleton + plan/job JSON (provisional CORS OK).  
2. **M1a** — protected create/jobs stub → **401** without session; **200** with Better Auth user id.  
3. **M1b + M1c in parallel** — product tables/repos + object storage adapter (local FS fine).  
4. **M1d → M1e** — upload round-trip + access rules + M1 demo checklist.  
5. **M2a** — sandbox host + canvas2d hand-authored tool + minimal Studio + capture with real asset.  
6. **M3** — LangGraph Create (vision → canvas2d) + progress UX + quota/repair/salvage.  
7. **M5 → M7 → M8** — full Studio personalization → export/share/embed → publish/gallery.

**Do not start next:** p5/three agent work, chat refine, inspiration vision pipeline, or M9 polish until M8 is green (unless explicitly pulled forward for learning only).

When you say **build**, start at **M0-thin + M1a**.
