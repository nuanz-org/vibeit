# Brik-class controls & creation track

**Status doc** for the workstream that closes the gap with Brik.space (sectioned controllers, clarify → multi-variant params, interactive tools, optional real Three.js).

| | |
|--|--|
| **Owner track** | Track A (canvas2d + process) first · Track B (real Three.js) later |
| **Started** | 2026-08-08 |
| **Last updated** | 2026-08-08 (B5) |
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
| **B1** | Design freeze: vendored three, not CDN | **Done** (2026-08-08) | Pin `three@0.185.1`; CSP unchanged |
| **B2** | Real three harness (scene/renderer/camera) | **Done** (2026-08-08) | Scene/WebGLRenderer/Camera + auto-render |
| **B3** | Frame + Studio mount for `three` | **Done** (2026-08-08) | version.target → mount (Studio + public) |
| **B4** | Agent target policy + three prompts | **Done** (2026-08-08) | Policy + plan/codegen/repair when enabled |
| **B5** | Three eval gates | **Done** (2026-08-08) | Offline suite green; default still off |

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
| Real Three.js Scene / renderer / camera | **Yes** (B2 harness) | Yes | Yes |
| Real materials / mesh craft in goldens | **Yes** (`three-depth`) | Yes | Yes |
| Studio/public mount uses `version.target` | **Yes** (B3) | Yes | Yes |
| Agent three prompts + vision preference | **Yes** when env-enabled (B4) | Yes | Yes |
| Three offline eval gates | **Yes** (B5 green) | Yes | Yes |
| Three default-on in prod | **No** (opt-in env after green gates) | Optional | Opt-in |
| OrbitControls product re-export | No | Optional | Optional |
| three.js supply (product pin) | **Yes** — npm `0.185.1` (B1) | Yes | Yes |
| Open esm.sh from tool code | Forbidden | Forbidden | Still forbidden (vendored) |

---

## Recommended next steps

1. Opt-in three for demos: `VIBEIT_TARGET_THREE_ENABLED=1` after `scripts/eval_three.py` green  
2. Optional live Create smoke (kinetic / chroma cube logo vision)  
3. **A7** media library / **A8** eval when needed  
4. Optional OrbitControls product re-export

---

## Related docs in repo

| Doc | Role |
|-----|------|
| **This file** | Status + completed work for Brik-class track |
| `md/agent_milestone.md` | Older AM1–AM7 quality milestones (different numbering) |
| `md/contracts/param-schema.md` | Param kinds + group/uiHint |
| `md/contracts/plan-json.md` | ToolPlan + controlSurface |
| `md/contracts/skeletons/canvas2d.md` | Harness + pointer |
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

Do **not** renumber A1–A8 / B1–B5 mid-flight without a note — other chats may refer to them.
