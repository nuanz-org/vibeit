# Vibeit — MVP milestones

**Source:** [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)  
**Status:** **Aligned to consensus frozen v1** (2026-08-04)  
**Date:** 2026-08-03 · **Revised:** 2026-08-04  
**Goal:** Complete loop on canvas2d — Auth → Create → Studio → Export/share/embed → Publish gallery  

---

## How to read this

| Term | Meaning |
|------|---------|
| **Milestone** | A vertical or foundation slice with a hard **exit criteria** — do not start the next until exit is met |
| **Demo** | What you can show end-to-end when the milestone is done |
| **Depends on** | Hard prerequisites |
| **Out of scope** | Explicitly deferred (even if tempting) |
| **Critical path** | Required for “flow is complete” |
| **Fast-follow** | Valuable, not required to claim complete loop |

**Principle:** Prefer a thin complete path early (hand-authored tool + one target) before expanding multi-target and agent quality. Multi-target is a **v1 product direction**, but the **complete loop ships on canvas2d** first. Registry + contract still cover all three targets from M0/M2.

**Stack (from consensus):** Next.js `apps/web` · FastAPI `apps/api` · LangGraph in API · OpenRouter/DeepSeek · Postgres + object storage · sandboxed iframe runtime.

---

## Milestone map

```
CRITICAL PATH (complete loop, canvas2d):

M0  Contracts & platform skeleton
 ↓
M1  Auth + data model + uploads
 ↓
M2  Runtime host + hand-authored tools (all 3 targets stubbed; capture w/ real asset)
 ↓
M3  Create agent (vision text → canvas2d) + quota + repair budget + salvage UX
 ↓
M5  Studio Control (params, assets, colors, view source)
 ↓
M7  Export · share · embed (WebM + PNG-sequence fallback)
 ↓
M8  Publish + gallery + quality gates
 ↓
M9  Hardening, ops, launch polish

FAST-FOLLOWS (parallel after M5 / after M3 as noted):

M4  Multi-target codegen + inspiration screenshots
    M4a p5 · M4b three (config-gated until eval ≥ threshold)
M6  Chat refine (Control LangGraph)
```

**Complete-loop MVP = M0–M3, M5, M7, M8** (canvas2d).  
**M4, M6** = fast-follows (not launch blockers).  
**M9** = launch readiness (not required to claim “flow is complete” in dev).

---

## M0 — Contracts & platform skeleton

**Why first:** Everything hangs on one shared `VibeTool` contract and job shapes. Freeze these before UI chrome or model tuning.

### Deliverables

- [ ] Freeze **VibeTool contract** (TS types + short markdown spec)
  - `mount`, `update`, `setAssets?`, `getParamSchema`, `getDefaultParams`, `getAssetSlots`, `getCaptureStream` / `captureFrame`, `dispose`
- [ ] Freeze **param schema conventions** (colors, numbers, text, enums, asset-slot refs)
- [ ] Freeze **target registry** IDs: `canvas2d` | `p5` | `three` + allowlisted lib rules
- [ ] Freeze **asset CORS / crossOrigin / storage headers** and per-target **capture rules** (`preserveDrawingBuffer`, etc.)
- [ ] Freeze **per-target skeleton template** shape (model fills creative logic inside harness)
- [ ] Freeze **structured plan JSON** schema (concept, aspect, motion, params, target)
- [ ] Freeze **LangGraph node I/O** sketch (Create + Repair + Control refine) — types only; linear graph
- [ ] Freeze **job API** shapes: create job, status, result version, error codes, quota/budget fields
- [ ] Monorepo wiring: env template (OpenRouter, DB, storage), API package layout, shared types package or `packages/` contract module if useful
- [ ] Thin PRD one-pagers (optional but recommended): Create · Studio · Export · Gallery

### Demo

Docs + types only. An engineer can answer “what does a valid tool look like?” without reading the brainstorm.

### Exit criteria

- Contract + param schema + capture/CORS rules + skeleton + plan-JSON + job API reviewed and treated as **source of truth**
- No product UI required

### Out of scope

- Real auth, DB, agent, sandbox implementation beyond stubs

### Depends on

- Consensus frozen v1 ✓

---

## M1 — Auth + data model + uploads

**Why:** Create is auth-gated; tools, versions, assets, and inspiration images need persistence before generation.

### Deliverables

- [ ] Auth provider integrated on `apps/web` + session validation on `apps/api`
- [ ] **Login required before Create** (route guard + API 401 on create endpoints)
- [ ] Postgres schema (minimal):
  - users
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

## M2 — Runtime host + hand-authored tools

**Why:** Prove the contract, sandbox, and Control surface **without** LLM noise. If hand-authored tools cannot mount/update/capture, freeform codegen will fail.

### Deliverables

- [ ] Sandboxed iframe host (CSP, no parent access, allowlisted libs only)
- [ ] Target loaders for `canvas2d`, `p5`, `three` (bundles/CDN allowlist)
- [ ] Host adapter that calls `VibeTool` methods uniformly
- [ ] **3 hand-authored reference tools** (one per target) implementing the full contract:
  - param schema + defaults
  - at least one asset slot (e.g. logo)
  - `captureFrame` / `getCaptureStream` working
- [ ] Minimal Studio shell that loads a tool version by id and drives `update` / `setAssets`
- [ ] Smoke tests: mount → update params → set asset → capture frame → dispose
- [ ] **Capture with a real uploaded asset** (not only placeholders) on each target

### Demo

Open Studio on a fixture tool → tweak params → swap logo → see live preview update (no AI) → export PNG of scene with uploaded logo.

### Exit criteria

- All three targets run a reference tool under the same host
- Capture path works for PNG-ready frames on each target **with real user-uploaded asset** (note Three.js `preserveDrawingBuffer` / canvas pitfalls)
- Safety: generated/fixture code cannot reach parent window or arbitrary network

### Out of scope

- LangGraph, OpenRouter, publish, export video UI polish

### Depends on

- M0 contract  
- M1 optional for fixtures (can use local fixtures first; wire to DB before M3)

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

- M1 auth + jobs + storage  
- M2 sandbox + canvas2d host

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
| Auth before Create | M1 |
| Create: vision text | M3 |
| Create: optional screenshots | M4 (fast-follow) |
| LangGraph Create + repair + salvage | M3 |
| Skeleton templates + plan JSON | M0 (freeze), M3 (use) |
| Multi-target registry | M0 (freeze), M2 (host), M4 (agent, fast-follow) |
| VibeTool contract / sandbox / CORS capture | M0, M2 |
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

## Suggested sequencing for builders

| Phase | Milestones | Outcome |
|-------|------------|---------|
| **Freeze** | M0 | No ambiguous contracts |
| **Platform** | M1 → M2 | Auth, data, runnable tools without AI; real-asset capture proven |
| **First magic** | M3 | Text → live canvas2d tool + quotas |
| **Control** | M5 | Personalize without agent |
| **Distribute** | M7 → M8 | Export, share, publish → **flow complete** |
| **Expand** | M4, M6 | Multi-target + screenshots; chat refine |
| **Ship** | M9 | Beta-ready |

**Parallelism notes:**

- After M0: contract docs and M1 schema can start together.  
- M2 reference tools can be built while M1 auth lands (merge before M3).  
- M5 Studio UI can start against M2 fixtures in parallel with M3 agent work.  
- M7 capture/export can be prototyped on M2 fixtures early; public routes need M1.  
- M4 and M6 can start after M5 without blocking M7/M8.

---

## Definition of “MVP done”

Matches consensus success criteria (canvas2d-first):

> A real user can sign in, create from vision, control the tool (params, assets, colors), export PNG + short video, share/embed, and publish to a gallery — and failed generations never appear as published tools.

That is **M8 exit** on the critical path. Screenshots, multi-target, and chat refine improve the product but are **not** required to claim the loop complete.

**M9** is production hardening.

---

## Next action

When leaving planning:

1. Owner accepts defaults in consensus (eval gates, quota, launch targets, WebM, auto-publish) or overrides them.  
2. Optionally write thin PRDs per M3/M5/M7/M8.  
3. Start **M0** only when you explicitly say build.
