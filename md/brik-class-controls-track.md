# Brik-class controls & creation track

**Status doc** for the workstream that closes the gap with Brik.space (sectioned controllers, clarify → multi-variant params, interactive tools, optional real Three.js).

| | |
|--|--|
| **Owner track** | Track A (canvas2d + process) first · Track B (real Three.js) later |
| **Started** | 2026-08-08 |
| **Last updated** | 2026-08-08 |
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

| Claim | True after A1+A2? |
|-------|-------------------|
| Schema supports `group` / `uiHint` / plan `controlSurface.sections` | **Yes** |
| canvas2d tools can read `c.pointer` and use `drawImageCover` | **Yes** (in hand-written or future codegen code) |
| Studio shows multi-section controllers like Brik | **No** — needs **A6** |
| Agent designs multi-variant enums from clarify answers | **No** — needs **A3 + A4** |
| Create flow asks clarify questions | **No** — needs **A3** |
| Real Three.js / frosted glass / OrbitControls | **No** — needs **Track B** |
| Multi-variant controls *end-to-end* | **No** — needs A3–A6 (and B for real 3D) |

So the earlier status table was **roadmap vs status**, not “everything in the Yes column is live.”  
Correct reading after A1+A2:

| Capability | After A1+A2 | Fully done when |
|------------|-------------|-----------------|
| Multi-variant controls (shape × assembly × material) | **Not yet** | A3 + A4 + A6 (+ A5 golden) |
| Real Three.js objects | **Not yet** | Track B (B1–B5) |
| Pointer-driven canvas2d effects (possible in code) | **Harness ready** | A4/A5 teach codegen to use it |
| Sectioned Control UI | **Schema ready** | A6 renders `group` |

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
| **A3** | Clarify API + UI (`planMode`) | Not started | Answers → enum axes |
| **A4** | Plan / codegen / repair prompts | Not started | Multi-axis + wire every param |
| **A5** | Goldens (proximity + kinetic-2d) | Not started | Few-shot craft |
| **A6** | Studio sections + widget polish | Not started | User-visible Brik-like panel |
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

- See groups in Studio (A6 not done)
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

---

## Capability matrix (honest)

| Capability | Today (after A1+A2) | Track A complete | Track B complete |
|------------|---------------------|------------------|------------------|
| Param `group` / `uiHint` in schema | Yes | Yes | Yes |
| Plan `controlSurface.sections` | Yes | Yes | Yes |
| `c.pointer` in canvas2d | Yes | Yes | N/A (three has own input) |
| `drawImageCover` | Yes | Yes | Optional |
| Clarify questions in Create | No | Yes | Yes |
| “All three options” → enums | No | Yes | Yes |
| Codegen multi-branch enums | Rare / weak | Strong | Strong + three |
| Studio collapsible sections | No (flat Colors/Params) | Yes | Yes |
| Image library | No | Optional (A7) | Optional |
| Real Three.js materials / orbit | No (stub only) | No | Yes |
| Open esm.sh from tool code | Forbidden | Forbidden | Still forbidden (vendored) |

---

## Recommended next steps

1. **A4 (prompts)** and/or **A6 (Studio groups)** for visible wins without job-API redesign  
2. **A3 (clarify)** for Brik-like create process  
3. **A5 goldens** once A2 is available for pointer tools  
4. **Track B** only when real 3D is required for demos like Chroma Cube Logo  

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
