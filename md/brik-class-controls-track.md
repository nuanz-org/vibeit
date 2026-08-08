# Brik-class controls & creation track

**Status doc** for the workstream that closes the gap with Brik.space (sectioned controllers, clarify → multi-variant params, interactive tools, optional real Three.js).

| | |
|--|--|
| **Owner track** | Track A (canvas2d + process) first · Track B (real Three.js) later |
| **Started** | 2026-08-08 |
| **Last updated** | 2026-08-08 (A6) |
| **Session plan** | Grok plan mode artifact (A1–A8 / B1–B5); this file is the **repo source of truth** for status |

---

## Short answers (read this first)

### Where are A1, A2, A3… defined?

They are **PR / milestone labels** for this track only (not old AM1/AM2 agent milestones).

| Label | Full name | Meaning |
|-------|-----------|---------|
| **PR-A1** | Contract: groups + uiHint + control sections | Schema so params *can* carry section metadata |
| **PR-A2** | Runtime: pointer + image helpers | canvas2d harness exposes `c.pointer` and `drawImageCover` |
| **PR-A3** | Clarify flow | `planMode` questions; “all options” → enum params |
| **PR-A4** | Agent prompts / gates | Plan + codegen design multi-axis, wired controls |
| **PR-A5** | Golden tools | Few-shot exemplars (proximity card, kinetic logo 2d) |
| **PR-A6** | Studio Control UI | Collapsible sections, segmented enums, switch polish |
| **PR-A7** | Media library | Stock image picker for asset slots |
| **PR-A8** | Eval corpus | Quality metrics for control density |
| **PR-B1…B5** | Real Three.js track | Vendored three, real harness, agent target, gates |

They were introduced in the implementation plan for “Brik-class control surfaces & interactive tools,” then refined after capturing Brik’s Kinetic Cube Logo flow.

### What does “A1 and A2 completed” mean?

**Foundation only.** Not the full product experience.

| Claim | True after A1–A6? |
|-------|-------------------|
| Schema supports `group` / `uiHint` / plan `controlSurface.sections` | **Yes** |
| canvas2d tools can read `c.pointer` and use `drawImageCover` | **Yes** (harness + goldens + prompts) |
| Studio shows multi-section controllers like Brik | **Yes** — collapsible `group` sections |
| Agent designs multi-variant enums from clarify answers | **Yes** (A3 + A4 + A5 kinetic golden) |
| Create flow asks clarify questions | **Yes** — opt-in **Plan with me** (`planMode`) |
| Real Three.js / frosted glass / OrbitControls | **No** — needs **Track B** |
| Multi-variant controls *end-to-end* (canvas2d) | **Yes** (process + UI; quality depends on LLM) |

Correct reading after A1–A6:

| Capability | After A1–A6 | Fully done when |
|------------|-------------|-----------------|
| Multi-variant controls (shape × assembly × material) | **End-to-end on canvas2d** | Track B for real 3D materials |
| Real Three.js objects | **Not yet** | Track B (B1–B5) |
| Pointer-driven canvas2d effects | **Harness + proximity golden** | — |
| Sectioned Control UI | **Yes** | — |
| Clarify → “all options” as enums | **Yes** | — |
---

## Background (what we learned from Brik)

### Capture 1 — Proximity / distortion card (canvas2d class)

- Controllers: sections (Content, Distortion, Interaction, Card Styling), sliders, image picker, enums.
- Code: pointer distance → pixelation/distortion; `controls` schema separate from code.
- Process: Art Director → optional questions → brief with **Controls (Desired State)** → coding agent tools (`set_controls_schema`, `set_canvas_code`).

### Capture 2 — Kinetic Cube Logo / Chroma Cube Logo (Three.js class)

- Clarify even when vision is detailed.
- User says “all three variations” → **enum controls**, not one locked choice.
- Brief chooses **Three.js**; coding agent uses three boilerplate + esm.sh three.
- Combinatorial axes: Final Shape × Assembly Style × Material (+ colors, loop, easing).

### Architecture decisions (locked)

1. Stay on **VibeTool modules** + harness + iframe (do not copy freeform Brik globals / open esm.sh).
2. **Controls are data** (`group`, enums, ranges); Studio is schema-driven.
3. Clarify answers become **dimensions** (enums), not only a rewritten vision string.
4. **No traditional OS/container sandbox** — keep iframe + allowlist; Track B vendors three inside the product.
5. **Track A first** (process + controls on canvas2d); **Track B** for real three.js.

---

## Progress checklist

### Track A — canvas2d + process + Studio

| PR | Name | Status | Notes |
|----|------|--------|-------|
| **A1** | Contract groups / uiHint / controlSurface.sections | **Done** (2026-08-08) | See “Completed work” below |
| **A2** | canvas2d pointer + drawImageCover/Contain | **Done** (2026-08-08) | Harness-owned pointer |
| **A3** | Clarify API + UI (`planMode`) | **Done** (2026-08-08) | Answers → enum axes |
| **A4** | Plan / codegen / repair prompts | **Done** (2026-08-08) | Multi-axis + wire every param |
| **A5** | Goldens (proximity + kinetic-2d) | **Done** (2026-08-08) | Few-shot craft |
| **A6** | Studio sections + widget polish | **Done** (2026-08-08) | User-visible Brik-like panel |
| **A7** | Media library | Not started | Optional polish |
| **A8** | Eval / metrics | Not started | Control density gates |

### Track B — real Three.js

| PR | Name | Status | Notes |
|----|------|--------|-------|
| **B1** | Design freeze: vendored three, not CDN | Not started | CSP + pin version |
| **B2** | Real three harness (scene/renderer/camera) | Not started | Replace stub WebGL-only harness |
| **B3** | Frame + Studio mount for `three` | Not started | |
| **B4** | Agent target policy + three prompts | Not started | |
| **B5** | Three eval gates | Not started | Config-gated until green |

---

## Completed work (detail)

### A1 — Contract (2026-08-08)

**Why:** Studio and agent need a shared shape for sectioned controllers before UI or prompts.

**What landed**

- `ParamFieldBase.group?: string`
- `ParamFieldBase.uiHint?: "slider" | "segmented" | "select" | "switch" | "hidden"`
- `PlanControlSection` + `PlanControlSurface.sections?`
- Python `plan_parse` normalizes `group`, `uiHint`, `sections` (invalid uiHint stripped)
- Docs: `md/contracts/param-schema.md`, `plan-json.md`
- Test: `test_param_group_ui_hint_and_control_sections` in `apps/api/tests/test_agent_am1.py`

**Files**

- `packages/contracts/src/param-schema.ts`
- `packages/contracts/src/plan.ts`
- `packages/contracts/src/index.ts`
- `apps/api/src/agent/plan_parse.py`
- `apps/api/tests/test_agent_am1.py`
- `md/contracts/param-schema.md`
- `md/contracts/plan-json.md`

**What users still cannot do**

- (A6 landed — Studio renders collapsible `group` sections)
- Have the agent invent rich grouped schemas automatically (A4 not done)

### A2 — canvas2d pointer + helpers (2026-08-08)

**Why:** Brik interaction tools need pointer distance; Vibeit draw context had only time/params/images.

**What landed**

- `Canvas2dDrawContext.pointer: { x, y, isOver }` (CSS px, harness pointer events)
- `drawImageCover(ctx, img, x, y, w, h)`
- `drawImageContain(ctx, img, x, y, w, h)`
- Docs: `md/contracts/skeletons/canvas2d.md`

**Files**

- `packages/contracts/src/skeletons/canvas2d.ts`
- `md/contracts/skeletons/canvas2d.md`

**What users still cannot do**

- Get proximity-card tools from Create automatically (codegen not taught yet — A4/A5)
- Get real 3D (Track B)

**Verification**

- `packages/contracts` `tsc --noEmit` passed
- Manual plan_parse normalization check passed
- Full pytest suite: pytest not installed in env at time of A1/A2; new test is in tree

### A3 — Clarify API + UI (2026-08-08)

**Why:** Brik process asks clarify questions; “all options” must become **enum control axes**, not a single locked choice.

**What landed**

- Job status `awaiting_clarify` + transitions `running → awaiting_clarify → queued`
- `CreateJobRequest.planMode`; DB `plan_mode` + `clarify` jsonb (migration 008)
- Clarify LLM prompt/node + parse; answer normalization (`all_options` → forced enums)
- Plan prompt consumes clarify transcript; forced enums hard-merged into plan params
- `POST /api/v1/jobs/:jobId/clarify` with `buildNow` (default true)
- Create UI: “Plan with me” checkbox, question chips, “Build it”
- Poll pauses at `awaiting_clarify` (`isJobPollPaused`)

**Files**

- `packages/contracts/src/job-api.ts`, `index.ts`
- `apps/api/migrations/008_job_clarify.sql`
- `apps/api/src/domain/job_status.py`
- `apps/api/src/agent/prompts/create_clarify.py`, `clarify_parse.py`, `nodes/clarify.py`
- `apps/api/src/agent/prompts/create_plan.py`, `nodes/plan.py`, `runner.py`, `state.py`
- `apps/api/src/services/clarify_job.py`, `create_job.py`
- `apps/api/src/api/v1/jobs.py`, `schemas/jobs.py`, `workers/generation.py`
- `apps/api/src/adapters/db/*` (types, jobs repo, mapping, schema_notes)
- `apps/web/lib/api/jobs.ts`, `features/create/*`, `features/jobs/hooks/use-job.ts`
- `apps/api/tests/test_clarify_a3.py`
- `md/contracts/job-api.md`

**What users still cannot do** (updated after A4)

- Optional approval step as a separate status (answers + `buildNow` resumes immediately)
- (A5 goldens landed — proximity + kinetic-logo-2d inject via tag retrieval)

**Verification**

- Unit: `test_clarify_a3.py` (parse, all_options → enums, merge into plan, status machine)
- Apply migration 008 before exercising planMode against a live DB

### A4 — Plan / codegen / repair multi-axis (2026-08-08)

**Why:** Clarify can force enums into the plan, but codegen still hardcodes one look unless prompts + gates demand every branch and every param.

**What landed**

- Plan prompt: 6–14 params for interactive tools; `group` + `uiHint` + `controlSurface.sections`; forced enums never collapsed
- Codegen prompt: wire every param; visible enum branches; loop `t = (c.time % loopDuration) / loopDuration`; pointer + `drawImageCover` craft
- Codegen user: multi-axis enum checklist from plan + A3 `clarify_result`
- Repair: preserve enum switches; param_coverage guidance; enum axes listed in user prompt
- Critique: penalize ignored enum options; list axes in judge context
- Param coverage gate remains hard (no soft-fail)

**Files**

- `apps/api/src/agent/prompts/create_plan.py`
- `apps/api/src/agent/prompts/create_codegen.py`
- `apps/api/src/agent/prompts/create_repair.py`
- `apps/api/src/agent/prompts/critique.py`
- `apps/api/src/agent/nodes/codegen.py` (pass `clarify_result`)
- `apps/api/src/agent/nodes/repair.py` (pass plan for enum hints)
- `apps/api/tests/test_agent_a4.py`

**What users still cannot do** (updated after A5/A6)

- Guaranteed live LLM multi-enum quality without running Create (prompts only; live eval optional)
- Stock media library (**A7** optional)

**Verification**

- `uv run python tests/test_agent_a4.py` — prompt content, enum checklist, param_coverage hard gate

### A5 — Goldens proximity + kinetic-2d (2026-08-08)

**Why:** Few-shot exemplars teach codegen pointer distortion, image cover, grouped schema, and multi-enum isometric logos without real Three.js.

**What landed**

- `proximity-pixel-card.ts` — `c.pointer` falloff → pixelation/warp; `drawImageCover`; groups Content / Distortion / Interaction / Card Styling; photo asset slot
- `kinetic-logo-2d.ts` — enums `finalShape` × `assemblyStyle` × `cubeMaterial`; loop `t = (c.time % loopDur) / loopDur`; isometric/hex/pyramid branches
- Manifest tags: `card`, `interaction`, `proximity`, `logo`, `loop`, `parametric`, …
- Retriever picks A5 goldens by those tags/concept keywords

**Files**

- `apps/api/src/agent/golden/proximity-pixel-card.ts`
- `apps/api/src/agent/golden/kinetic-logo-2d.ts`
- `apps/api/src/agent/golden/index.py`
- `apps/api/tests/test_agent_a5.py` (+ AM1 retrieve assertions)

**What users still cannot do**

- Real Three.js materials / orbit (needs **Track B**)

**Verification**

- `uv run python tests/test_agent_a5.py` — register, tags, static, esbuild compile, retrieve, param_coverage

### A6 — Studio sections + widget polish (2026-08-08)

**Why:** Schema already carries `group` / `uiHint` (A1); users still saw flat Colors/Params until Studio rendered sections.

**What landed**

- Collapsible Control sections from `field.group` (first-seen order); ungrouped → Params
- Legacy fallback when no groups: Colors / Params / Linked slots
- Enum **segmented** (≤4 options or `uiHint: "segmented"`); larger → select
- Boolean **switch**; number **slider** polish; `uiHint: "hidden"` omitted
- assetRef stays inside its group (Content co-locates photo slot)

**Files**

- `apps/web/features/studio/lib/group-params.ts`
- `apps/web/features/studio/components/param-controls.tsx`
- `apps/web/features/studio/styles.module.css`
- `apps/api/tests/test_studio_a6_group_params.py`
- `md/contracts/param-schema.md`

**What users still cannot do**

- Stock media library for slots (optional **A7**)
- Control-density eval metrics (**A8**)
- Real Three.js materials / orbit (**Track B**)

**Verification**

- `uv run python tests/test_studio_a6_group_params.py`
- `apps/web` `tsc --noEmit`

---

## Capability matrix (honest)

| Capability | Today (after A1–A6) | Track A complete | Track B complete |
|------------|---------------------|------------------|------------------|
| Param `group` / `uiHint` in schema | Yes | Yes | Yes |
| Plan `controlSurface.sections` | Yes | Yes | Yes |
| `c.pointer` in canvas2d | Yes | Yes | N/A (three has own input) |
| `drawImageCover` | Yes | Yes | Optional |
| Clarify questions in Create | Yes (`planMode`) | Yes | Yes |
| “All three options” → enums | Yes (forced into plan) | Yes | Yes |
| Codegen multi-branch enums | Prompted + goldens | Strong | Strong + three |
| Studio collapsible sections | **Yes** | Yes | Yes |
| Image library | No | Optional (A7) | Optional |
| Real Three.js materials / orbit | No (stub only) | No | Yes |
| Open esm.sh from tool code | Forbidden | Forbidden | Still forbidden (vendored) |

---

## Recommended next steps

1. Optional live Create smoke — planMode multi-enum + open Studio (sectioned panel)  
2. **A7** media library / **A8** eval when needed  
3. **Track B** only when real 3D is required for demos like Chroma Cube Logo  

---

## Related docs in repo

| Doc | Role |
|-----|------|
| **This file** | Status + completed work for Brik-class track |
| `md/agent_milestone.md` | Older AM1–AM7 quality milestones (different numbering) |
| `md/contracts/param-schema.md` | Param kinds + group/uiHint |
| `md/contracts/plan-json.md` | ToolPlan + controlSurface |
| `md/contracts/skeletons/canvas2d.md` | Harness + pointer |
| `md/contracts/targets.md` | canvas2d ASAP; three config-gated |
| `md/agents.md` | Agent specialization map |

---

## How to update this file

After each PR in this track:

1. Set the PR row **Status** to Done / In progress / Not started  
2. Append a **Completed work** subsection with date, files, and “what users still cannot do”  
3. Refresh the capability matrix if needed  
4. Bump **Last updated** at the top  

Do **not** renumber A1–A8 / B1–B5 mid-flight without a note — other chats may refer to them.
