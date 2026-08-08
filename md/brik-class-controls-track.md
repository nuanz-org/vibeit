# Brik-class controls & creation track

**Status doc** for the workstream that closes the gap with Brik.space (sectioned controllers, clarify → multi-variant params, interactive tools, real Three.js, **vision-faithful craft**).

| | |
|--|--|
| **Owner track** | Track A (canvas2d + process) · Track B (real Three.js) · Track C (craft fidelity) · **Track D (perf craft — experimental)** |
| **Started** | 2026-08-08 |
| **Last updated** | 2026-08-08 (Track D experimental landed) |
| **Session plan** | Grok plan mode artifact (A1–A8 / B1–B5 / C1–C7) + experimental perf craft; this file is the **repo source of truth** for status |
| **Experimental** | **Track D (perf craft)** is experimental — thresholds, helpers, and lint rules may tighten or roll back without a major version bump |

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
| **PR-C1…C7** | Craft fidelity (Track C / “track 3”) | Brief lock, emblem defaults, goldens, motion, critic |
| **PR-D1** (**experimental**) | Perf craft: soft-glow helpers + lint + neon-trail golden | Keep kinetic/glow tools interactive on retina Studio |

They were introduced in the implementation plan for “Brik-class control surfaces & interactive tools,” then refined after capturing Brik’s Kinetic Cube Logo flow and a **sweeping-arc emblem** side-by-side (Vibeit vs Brik).

### What does “A1 and A2 completed” mean?

**Foundation only.** Not the full product experience.

| Claim | True after A1–A6? |
|-------|-------------------|
| Schema supports `group` / `uiHint` / plan `controlSurface.sections` | **Yes** |
| canvas2d tools can read `c.pointer` and use `drawImageCover` | **Yes** (harness + goldens + prompts) |
| Studio shows multi-section controllers like Brik | **Yes** — collapsible `group` sections |
| Agent designs multi-variant enums from clarify answers | **Yes** (A3 + A4 + A5 kinetic golden) |
| Create flow asks clarify questions | **Yes** — opt-in **Plan with me** (`planMode`) |
| Real Three.js materials / Scene harness | **Track B complete (B1–B5)** — enable via env after offline gates |
| Multi-variant controls *end-to-end* (canvas2d) | **Yes** (process + UI; quality depends on LLM) |

Correct reading after A1–A6:

| Capability | After A1–A6 | Fully done when |
|------------|-------------|-----------------|
| Multi-variant controls (shape × assembly × material) | **End-to-end on canvas2d** | Track B for real 3D materials |
| Real Three.js objects | **Not yet** | Track B (B1–B5) |
| Pointer-driven canvas2d effects | **Harness + proximity golden** | — |
| Sectioned Control UI | **Yes** | — |
| Clarify → “all options” as enums | **Yes** | — |
| First screenshot matches written vision (no invented brand/HUD) | **No** — needs **Track C** | Track C |

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

### Capture 3 — Sweeping arc emblem (canvas2d craft fidelity) — *Track C seed*

**Vision (shared):**  
*Looping animation of a circular emblem built from 8 thin arcs sweeping in and aligning into a ring, smooth ease-in-out motion, soft gradient background shifting from deep blue to mint green, 4-second loop.*

| | **Brik** | **Vibeit (observed)** |
|--|----------|----------------------|
| Background | Soft full-bleed blue → mint gradient | Dark void + neon HUD stack |
| Emblem | Thin light arcs, quiet ring, large negative space | Dense radar / sci-fi rings + grid + bloom |
| Copy | None (vision has no wordmark) | Invented **ECLIPSE** / SYS.LOCK chrome |
| Motion read | Choreographed assemble → ring | Often perpetual spiral / HUD spin |
| Canvas | Wide flat stage (~1200×800) | Phone bezel preview (presentation choice) |
| Controllers | Geometry + choreography + gradient colors (high leverage, fewer knobs) | Richer sections (Content / Structure / Motion / Look) but defaults pull off-brief |

**Honest read:** Track A **control UI** works (collapsible groups, segmented enums, sliders). The gap to Brik is **creative fidelity** — Brik stayed on-brief; Vibeit upgraded the brief into a different product (HUD lock). Track C is **not** “more sliders”; it is plan defaults, goldens, no invented copy, motion assemble-to-ring, and critic penalties for clutter.

### Architecture decisions (locked)

1. Stay on **VibeTool modules** + harness + iframe (do not copy freeform Brik globals / open esm.sh).
2. **Controls are data** (`group`, enums, ranges); Studio is schema-driven.
3. Clarify answers become **dimensions** (enums), not only a rewritten vision string.
4. **No traditional OS/container sandbox** — keep iframe + allowlist; Track B vendors three inside the product.
5. **Track A first** (process + controls on canvas2d); **Track B** for real three.js.
6. **Track C** (craft fidelity): controls can be richer than Brik; **defaults + first screenshot must match the written vision** (no invented brand/HUD when brief is minimal).

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
| **B1** | Design freeze: vendored three, not CDN | **Done** (2026-08-08) | Pin `three@0.185.1`; CSP unchanged |
| **B2** | Real three harness (scene/renderer/camera) | **Done** (2026-08-08) | Scene/WebGLRenderer/Camera + auto-render |
| **B3** | Frame + Studio mount for `three` | **Done** (2026-08-08) | version.target → mount (Studio + public) |
| **B4** | Agent target policy + three prompts | **Done** (2026-08-08) | Policy + plan/codegen/repair when enabled |
| **B5** | Three eval gates | **Done** (2026-08-08) | Offline suite green; default still off |

### Track C — craft fidelity / brief lock (“track 3”)

**Status:** Not started (opened 2026-08-08 from Capture 3 side-by-side).  
**Depends on:** Track A foundation (A1–A6) — already done. Independent of Track B.

| PR | Name | Status | Notes |
|----|------|--------|-------|
| **C1** | Vision lock in plan / clarify | Not started | Map brief → required params + defaults; no invented copy |
| **C2** | Emblem control surface defaults | Not started | Brik-like knobs first; Look modes optional, low defaults |
| **C3** | Sweeping-arc emblem golden | Not started | Few-shot: gradient + 8 thin arcs + assemble-to-ring |
| **C4** | Codegen motion craft | Not started | ease-in-out, loop phase, stagger, hold-at-ring |
| **C5** | Critic fidelity axes | Not started | Penalize HUD clutter / ignored gradient / invented text |
| **C6** | Studio stage framing (optional) | Not started | Flat stage vs phone bezel by aspect |
| **C7** | Fidelity eval / smoke vision | Not started | Fixed vision checklist vs Brik-class bar |

**Priority order for implementation**

1. **C1** Plan/codegen fidelity — no invented brand; gradient + 8 arcs + 4s as hard defaults from vision  
2. **C3** Golden for gradient sweeping-ring emblem (few-shot)  
3. **C2** Default control surface for emblem / motion-ring class  
4. **C4** Motion easing + assemble-to-ring craft  
5. **C5** Critic penalties for brief violations  
6. **C6** Studio stage framing (optional)  
7. **C7** Eval / regression smoke for the Capture 3 vision  

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

### B1 — Design freeze: vendored three, not CDN (2026-08-08)

**Why:** Brik loads three from esm.sh; Vibeit must keep iframe CSP + allowlist. Before a real harness (B2), freeze **supply** (pin + import surface) so product code never opens a CDN hole.

**What landed**

- Exact npm pin: `three@0.185.1` on `@repo/contracts` (lockfile-managed)
- Product vendor module: `@repo/contracts/skeletons/three-vendor` → `THREE`, `THREE_VIBEIT_PIN`
- Design doc: `md/contracts/skeletons/three.md` (who may import what, CSP, compile-size note for B2)
- Allowlist / static validate: block bare `three` / `three/*`, tool use of `three-vendor`, remote `https://` module URLs
- Codegen prompt: no CDN / three-vendor / bare three
- CSP **unchanged** — already forbids remote scripts (`script-src 'self' blob:`, `connect-src 'none'`)
- Stub harness **not** wired to real three yet (that is **B2**)

**Files**

- `packages/contracts/package.json` (+ lockfile)
- `packages/contracts/src/skeletons/three-vendor.ts`
- `packages/contracts/src/skeletons/three.ts` (comments)
- `packages/contracts/src/targets.ts`
- `apps/web/runtime/compile/allowlist.ts`, `cli-compile.mjs`
- `apps/web/runtime/targets/three/index.ts`, `runtime/README.md`
- `apps/web/public/runtime-frame.js` (regenerated registry string)
- `apps/api/src/agent/validators/static_validate.py`
- `apps/api/src/agent/prompts/create_codegen.py`
- `apps/api/tests/test_track_b1_three_vendor.py`
- `md/contracts/skeletons/three.md`, `targets.md`, `runtime-host.md`

**What users still cannot do**

- Real Three.js Scene / materials / OrbitControls (**B2**)
- Studio-worthy 3D tools from Create (**B2–B4**)
- Enable `three` by default (**B5** eval)

**Verification**

- `uv run python tests/test_track_b1_three_vendor.py`
- `packages/contracts` `tsc --noEmit`
- three-depth golden still compiles (stub path)

### B2 — Real three harness (2026-08-08)

**Why:** B1 only pinned supply. Creative tools still used raw WebGL; Brik-class materials/orbit need a real Scene loop owned by the harness.

**What landed**

- `createThreeTool` builds `THREE.Scene` + `WebGLRenderer` (`preserveDrawingBuffer`) + `PerspectiveCamera`
- `ThreeDrawContext`: `THREE`, `scene`, `camera`, `renderer`, `gl`, `setBackground`, `render`, time/params
- Harness auto-`render` after each `draw` (opt-out via `autoRender: false`)
- Re-export `THREE` / pin constants from `@repo/contracts/skeletons/three` for creative fill
- Golden `three-depth` rewritten: MeshStandardMaterial cube + rim light + satellite (no raw shaders)
- Compile: `minify: true`; `COMPILED_JS_MAX_CHARS` / `RUNTIME_MODULE_SOURCE_MAX_CHARS` → **1_500_000**
- Codegen prompt: three craft uses setup/draw scene APIs

**Files**

- `packages/contracts/src/skeletons/three.ts`
- `packages/contracts/src/skeletons/three-vendor.ts` (comments)
- `packages/contracts/src/targets.ts`
- `apps/api/src/agent/golden/three-depth.ts`
- `apps/web/runtime/compile/tool-module.ts`, `cli-compile.mjs`
- `apps/web/runtime/contract/messages.ts`
- `apps/api/src/agent/validators/compile_check.py`
- `apps/api/src/agent/prompts/create_codegen.py`
- `apps/api/tests/test_track_b2_three_harness.py` (+ B1 harness import test update)
- `md/contracts/skeletons/three.md`, `targets.md`

**What users still cannot do**

- Agent freely picking three on Create by default (**B4** prompts + **B5** gate; still `VIBEIT_TARGET_THREE_ENABLED`)
- Optional OrbitControls product re-export (follow-up)
- Guaranteed Studio polish edge-cases for three (**B3** if needed)

**Verification**

- `uv run python tests/test_track_b2_three_harness.py`
- `uv run python tests/test_track_b1_three_vendor.py`
- `uv run python tests/test_agent_am6.py`
- `packages/contracts` `tsc --noEmit`

### B3 — Frame + Studio mount for `three` (2026-08-08)

**Why:** B2 harness works in host smoke, but Studio/public always mounted `target: "canvas2d"`, so a three version would be mislabeled and harder to reason about. Mount must honor `tool_versions.target`.

**What landed**

- `resolveRuntimeTarget()` — coerce API target → `canvas2d` \| `p5` \| `three` (fallback canvas2d)
- Studio loader: `meta.target` from `version.target`
- Studio runtime: mount + remount pass resolved target (no hardcode)
- Public tool loader/shell/runtime: same target path
- Frame adapter: accepts multi-target on mount; tracks `this.target` for bookkeeping
- Fixture social-frame remains canvas2d; frame READY default still canvas2d

**Files**

- `apps/web/features/studio/lib/resolve-runtime-target.ts`
- `apps/web/features/studio/fixtures.ts`
- `apps/web/features/studio/components/studio-tool-loader.tsx`
- `apps/web/features/studio/components/studio-shell.tsx`
- `apps/web/features/studio/hooks/use-studio-runtime.ts`
- `apps/web/features/studio/components/view-source-panel.tsx`
- `apps/web/features/public-tool/components/public-tool-loader.tsx`
- `apps/web/features/public-tool/components/public-tool-shell.tsx`
- `apps/web/features/public-tool/hooks/use-public-tool-runtime.ts`
- `apps/web/runtime/targets/canvas2d/adapter.ts`
- `apps/web/runtime/frame/entry.ts`
- `apps/web/runtime/targets/three/index.ts`, `targets/index.ts`, `README.md`
- `apps/api/tests/test_track_b3_three_mount.py`
- `md/contracts/skeletons/three.md`, `runtime-host.md`

**What users still cannot do**

- Create agent freely choosing three without env flag (**B4** + **B5**)
- OrbitControls product re-export (optional polish)

**Verification**

- `uv run python tests/test_track_b3_three_mount.py`
- `uv run python tests/test_track_b2_three_harness.py`

### B4 — Agent target policy + three prompts (2026-08-08)

**Why:** Harness + Studio mount work, but Create still treated three as a footnote. When `VIBEIT_TARGET_THREE_ENABLED=1`, plan/codegen/repair must prefer real three craft for 3D visions (Brik Kinetic Cube class).

**What landed**

- `target_policy`: vision heuristics (`vision_prefers_three`), soft-upgrade `apply_vision_target_preference`, `enabled_targets_prompt_block`
- Plan prompts: live enabled-target block; three selection rules for materials / cube logos / WebGL
- Plan node: after parse, soft-upgrade canvas2d → three when enabled + strong vision signals
- Codegen: target-aware system prompts (`codegen_system_prompt`); full three setup/draw + MeshStandardMaterial craft
- Repair: three-specific system prompt; critique notes three materials
- Golden `three-depth` tags/description for material/cube/logo retrieval
- Still **config-gated** (default off) — B5 eval before product default-on

**Files**

- `apps/api/src/agent/target_policy.py`
- `apps/api/src/agent/prompts/create_plan.py`
- `apps/api/src/agent/prompts/create_codegen.py`
- `apps/api/src/agent/prompts/create_repair.py`
- `apps/api/src/agent/prompts/critique.py`
- `apps/api/src/agent/nodes/plan.py`, `codegen.py`, `repair.py`
- `apps/api/src/agent/golden/index.py`
- `apps/api/tests/test_track_b4_three_agent.py`

**What users still cannot do**

- Get three by default without env flag (**B5** gates before turning on in prod)
- Guaranteed live LLM quality for multi-axis three without running Create

**Verification**

- `uv run python tests/test_track_b4_three_agent.py`
- `uv run python tests/test_agent_a4.py`
- `uv run python tests/test_agent_am6.py`

### B5 — Three eval gates (2026-08-08)

**Why:** B1–B4 make three runnable, but product consensus keeps three **config-gated until quality gates pass**. Operators need a CI-safe suite before setting `VIBEIT_TARGET_THREE_ENABLED=1`.

**What landed**

- Offline gate runner: `agent/evals/three_gates.py` → `run_three_offline_gates()`
- CLI: `uv run python scripts/eval_three.py` (exit 0 = green; `--json` for machines)
- Corpus: `evals/create/three/prompts.json` (4 three visions + live advisory thresholds)
- Gates (all required, offline): policy default-off + enable, vendor pin, real harness, three-depth static/structural/compile/param_coverage/host, CDN/bare three blocked, B4 prompts, B3 Studio mount helper, corpus defined
- **Product default remains off** — green gates **recommend** enable; they do not auto-flip the env flag

**Files**

- `apps/api/src/agent/evals/__init__.py`
- `apps/api/src/agent/evals/three_gates.py`
- `apps/api/scripts/eval_three.py`
- `apps/api/evals/create/three/prompts.json`
- `apps/api/evals/create/three/README.md`
- `apps/api/tests/test_track_b5_three_gates.py`
- `md/contracts/skeletons/three.md`, `targets.md`, `apps/api/README.md`

**What users still cannot do**

- Get three without setting `VIBEIT_TARGET_THREE_ENABLED=1` (intentional)
- Guaranteed live LLM multi-axis three quality without a live shootout (offline suite covers path integrity)

**Verification**

- `uv run python scripts/eval_three.py` → 15/15 PASS
- `uv run python tests/test_track_b5_three_gates.py`

### Track C — opened (not coded yet)

**Why:** After A1–A6, Studio shows Brik-like **sections**, but Create can still invent a different product than the vision (e.g. HUD + wordmark instead of soft gradient + 8 arcs). That is a craft/fidelity track, not a missing Control UI track.

**What to land (see checklist C1–C7)** — no implementation yet; this section is the design freeze for Track C.

---

## Track C — craft fidelity detail (design freeze)

### Reference vision (Capture 3)

```text
Looping animation of a circular emblem built from 8 thin arcs sweeping in and
aligning into a ring, smooth ease-in-out motion, soft gradient background
shifting from deep blue to mint green, 4-second loop
```

### Brief → required plan surface

| Brief item | Plan / param expectation |
|------------|---------------------------|
| soft gradient deep blue → mint | Required `gradientStart` / `gradientEnd` (or paletteRoles); defaults match vision hexes |
| 8 arcs | `arcCount` default **8**, range ~4–16 |
| thin arcs | Low `strokeWidth` default |
| align into a ring | End-state / assembly = closed ring (not permanent HUD) |
| 4s loop | `loopDuration` default **4** |
| ease-in-out | `motionSpec` + codegen smoothstep / ease-in-out |
| no logo copy in brief | **No** center title / brand chrome unless vision says so |

### Controller guidance (Brik-like leverage vs optional Look)

**Emphasize (high leverage):**

| Control | Why |
|---------|-----|
| Arc count | Geometry of the emblem |
| Ring radius | Scale in frame |
| Stroke width | “Thin arcs” |
| Arc length / gap | Open vs closed ring |
| Loop duration | Explicit 4s |
| Sweep / stagger | “Sweeping in” choreography |
| Rotation amount | Spin vs settle |
| Arc color | Usually white / light |
| Gradient start / end | Blue → mint |
| Gradient shift speed | Soft living background |

**Optional secondary (mode, not default product):**

- Arc rendering (Clean / Filament / Dual Neon / Dotted) — default **Clean Line**
- Glow bloom — default **low** (0–0.2) for minimal briefs
- Gradient aura presets — OK as shortcuts; custom start/end wins
- Center text — **empty by default** when vision has no wordmark

**Suggested sections:**

```text
Emblem     — count, radius, stroke, arc length, style
Motion     — loop duration, sweep, rotation, stagger, easing
Background — gradient start/end, shift speed
Accent     — arc color, optional bloom (low default)
Content    — only if text is in the brief
```

### Visual craft bar (codegen / golden)

1. Full-bleed soft gradient — not dark plate + neon stack  
2. One ring system (~8 arcs) — not many concentric HUD layers  
3. White / near-white thin strokes; optional slight blur  
4. Assembly story: dispersed → ease-in-out → settle into ring; loop may reverse or re-sweep  
5. Large negative space around the ring  
6. No type unless requested  
7. Aspect: square or 16:9 stage for emblem posters; phone frame is presentation, not art direction  

### Motion craft bar

- Normalized loop `t = (time % loopDur) / loopDur`  
- Ease-in-out on arc angle / radius / opacity  
- Stagger by arc index (cascading join)  
- Optional hold at “closed ring” before restart  
- Avoid constant full-speed spiral as default  

### “Is this Brik-class?” checklist (Capture 3)

- [ ] Background is soft blue→mint (or user-tunable to that)  
- [ ] ~8 thin light arcs, not a radar stack  
- [ ] Loop feels ease-in-out, ~4s  
- [ ] First load needs **no** text to look complete  
- [ ] Controllers change geometry / motion / colors first; neon/HUD is a mode, not the default  

### C1–C7 acceptance sketches

| PR | Acceptance (sketch) |
|----|---------------------|
| **C1** | Plan from Capture 3 vision includes arcCount=8, loopDuration=4, gradient ends, empty/absent text; codegen system/user forbids invented wordmarks when vision has none |
| **C2** | Emblem-class plans use Emblem/Motion/Background sections; Look neon enums optional with low defaults |
| **C3** | Golden `sweeping-arc-emblem` (or similar) registers, compiles, retrieves on gradient/ring/arc tags |
| **C4** | Codegen prompt requires ease-in-out + assemble-to-ring for emblem motions |
| **C5** | Critic scores low for invented copy, missing gradient, HUD clutter on minimal ring briefs |
| **C6** | Studio can present flat stage for non-9:16 (optional polish) |
| **C7** | Fixed vision smoke or checklist documents pass/fail vs Capture 3 bar |

---

## Capability matrix (honest)

| Capability | Today | Track A | Track B | Track C |
|------------|-------|---------|---------|---------|
| Param `group` / `uiHint` in schema | Yes | Yes | Yes | Yes |
| Plan `controlSurface.sections` | Yes | Yes | Yes | Yes |
| `c.pointer` in canvas2d | Yes | Yes | N/A | Yes |
| `drawImageCover` | Yes | Yes | Optional | Yes |
| Clarify questions in Create | Yes (`planMode`) | Yes | Yes | Yes |
| “All three options” → enums | Yes | Yes | Yes | Yes |
| Codegen multi-branch enums | Prompted + goldens | Strong | Strong + three | Strong |
| Studio collapsible sections | **Yes** | Yes | Yes | Yes |
| Image library | No | Optional (A7) | Optional | Optional |
| Real Three.js Scene / renderer / camera | **Yes** (B2) | — | Yes | — |
| Real materials / mesh craft in goldens | **Yes** (`three-depth`) | — | Yes | — |
| Studio/public mount uses `version.target` | **Yes** (B3) | — | Yes | — |
| Agent three prompts + vision preference | Env-enabled (B4) | — | Yes | — |
| Three offline eval gates | **Yes** (B5) | — | Yes | — |
| Three default-on in prod | No (opt-in) | — | Opt-in | — |
| three.js supply (product pin) | **Yes** `0.185.1` | — | Yes | — |
| Open esm.sh from tool code | Forbidden | Forbidden | Forbidden | Forbidden |
| First screenshot matches minimal vision | **Weak** | — | — | **Target** |
| No invented brand copy by default | **Weak** | — | — | **Target** |
| Emblem assemble-to-ring + soft gradient craft | **Weak** | Partial | — | **Target** |
| Emblem-class control defaults (Brik leverage) | Partial | Partial | — | **Target** |
| Soft-glow helpers + `perf:` lint (Track D) | **Yes (experimental)** | — | — | — |
| Neon-trail efficient golden | **Yes (experimental)** | — | — | — |
| Studio rAF-coalesced param updates | **Yes** | — | — | — |

---

## Track D — perf craft (**experimental**)

**Status:** Landed as an **experimental** slice (2026-08-08). Not a frozen product contract.

Goal: stop Studio lag on neon/trail/particle tools without banning legitimate still craft.

| Piece | What shipped | Experimental note |
|-------|--------------|-------------------|
| `strokeSoftGlow` / `fillSoftDisc` | canvas2d helpers (multi-width alpha, no `shadowBlur`) | API surface may gain opts or rename |
| `maxDpr` default **2** | canvas2d / p5 / three harness + runtime-frame | Was effective cap 3; tune if export sharpness regresses |
| `perf_lint` | Flags `shadowBlur` / `filter` **inside** loops (`perf:` errors) | Heuristic brace matcher — false positives/negatives possible |
| Prompts | `perf_craft.py` injected into plan/codegen/repair/refine/critique | Copy may change as we learn from live Create |
| Golden `neon-trail` | Few-shot efficient infinity glow | Tags/retrieval weights may adjust |
| Studio param coalesce | rAF-batch `updateParams` while sliders stay snappy | Host-only; no contract change |

**Not experimental forever:** if live eval stays green for a milestone, promote helpers into the stable canvas2d docs checklist and drop the experimental banner here.

**Out of scope for D1:** WebGL bloom paths, worker offload, automatic rewrite of all old goldens.

---

## Recommended next steps

1. **Track C** — start **C1** (vision lock) then **C3** (sweeping-arc golden)  
2. Smoke **Track D** live: glow/trail vision → confirm no `perf:` false-fail storm; retina Studio stays interactive  
3. Opt-in three for demos: `VIBEIT_TARGET_THREE_ENABLED=1` after `scripts/eval_three.py` green  
4. Optional live Create smoke (kinetic / chroma cube logo vision)  
5. **A7** media library / **A8** eval when needed  
6. Optional OrbitControls product re-export

---

## Related docs in repo

| Doc | Role |
|-----|------|
| **This file** | Status + completed work for Brik-class track |
| `md/agent_milestone.md` | Older AM1–AM7 quality milestones (different numbering) |
| `md/contracts/param-schema.md` | Param kinds + group/uiHint |
| `md/contracts/plan-json.md` | ToolPlan + controlSurface |
| `md/contracts/skeletons/canvas2d.md` | Harness + pointer + experimental soft-glow helpers |
| `md/contracts/skeletons/three.md` | B1 vendor pin + three harness roadmap |
| `md/contracts/targets.md` | canvas2d ASAP; three config-gated |
| `md/agents.md` | Agent specialization map |

---

## How to update this file

After each PR in this track:

1. Set the PR row **Status** to Done / In progress / Not started  
2. Append a **Completed work** subsection with date, files, and “what users still cannot do”  
3. Refresh the capability matrix if needed  
4. Bump **Last updated** at the top  

Do **not** renumber A1–A8 / B1–B5 / C1–C7 mid-flight without a note — other chats may refer to them.  
**Track C** = craft fidelity (“track 3”); do not confuse with Track B three.js.  
**Track D** = perf craft (**experimental**); may change without renumbering A/B/C.
