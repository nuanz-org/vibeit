# Aiditr — Agent architecture (generation quality track)

**Status:** Proposal — targets the brik.space quality bar
**Date:** 2026-08-06
**Context:** Core loop (M0–M8) is complete on canvas2d. The remaining gap to brik.space-level output is **generation quality**, not product plumbing. This doc defines the agent roster, model routing, and quality gates needed to close it.
**Reference:** [aiditr-milestones.md](./aiditr-milestones.md) · brik.space pipeline analysis (two-pass `art_director` → design brief → tool calls → completion pass, Gemini 3.5 Flash, ~199s)

---

## Why agents (and why now)

Today the Create pipeline is **one model doing everything**:

```
ingest → plan → codegen → static_validate → structural_smoke → repair ×3 → finalize
         (DeepSeek V4 Flash for every role, hard-locked in adapters/llm/router.py)
```

Verified gaps in current code:

| Gap | Where | Consequence |
|-----|-------|-------------|
| Plan prompt is schema-only, zero art direction | `agent/prompts/create_plan.py` | Plans are generic; no composition/motion intent |
| Codegen prompt has contract rules but no craft, no examples | `agent/prompts/create_codegen.py` | Model guesses what "good" looks like (only ref: pulsing-circle stub) |
| Smoke is regex — never compiles, mounts, or renders | `agent/validators/sandbox_smoke.py` | Blank/ugly/runtime-broken tools can pass |
| Eval gates measure validity, not quality | `evals/create/prompts.json` · `scripts/eval_create.py` | No signal on aesthetic regressions; mock uses fixed `_GOOD_CODE` |
| Single model hard-locked for all roles | `adapters/llm/openrouter.py` `assert_allowed_model` | Can't use stronger codegen or vision models |
| No visual signal anywhere | whole pipeline | Repair loop fixes syntax, never design |

Brik's quality comes from **specialized stages** (art direction ≠ code writing ≠ controls schema) and **big creative-code budget**. We get there by splitting Create into role-specialized agents with per-role models and real gates.

---

## Agent roster

Six agents. Each is a LangGraph node (or node pair) under `apps/api/src/agent/nodes/` with its own prompt module under `agent/prompts/` and its own model role in `adapters/llm/router.py`.

### 1. Art Director (plan v2) — *new*

**Job:** Turn raw vision text (+ optional style notes) into a **design brief** a human could art-direct from — before any code exists.

| Aspect | Spec |
|--------|------|
| Input | `visionText`, optional style-extract notes, optional inspiration summaries |
| Output | **DesignBrief JSON**: concept, aspect, composition (layers, focal points, grid), palette with roles (bg/ink/accent/highlight), motion spec (easing, tempo, loop behavior), typography scale, control-surface intent (which params user should get), asset slots |
| Model role | `plan` — cheap/fast (DeepSeek V4 Flash or Gemini Flash) |
| Prompt home | `agent/prompts/create_plan.py` (replace schema-only prompt) |
| Gate | Brief JSON validates against extended plan schema; palette is valid hex; ≥3 params declared |

**Why:** Brik's `art_director` streams a planning brief *before* code. Separating "what it should look like" from "write TypeScript" lets each model do one job well, and the brief doubles as a user-visible progress artifact (two-pass UX later).

---

### 2. Style Extract (M4) — *new, vision*

**Job:** Convert inspiration screenshots into art-direction notes the Art Director can consume.

| Aspect | Spec |
|--------|------|
| Input | 1–3 inspiration images (uploaded asset URLs) |
| Output | Style notes JSON: palette (hex, roles), mood/energy, composition patterns, typography feel, motion hints. **Interpret style — never recreate copyrighted art 1:1** (consensus rule) |
| Model role | `vision` — vision-capable, cheap (Gemini 3.6/3.5 Flash or GPT-5.4-mini) |
| Prompt home | `agent/prompts/style_extract.py` (new) |
| Gate | Valid JSON; palette colors parse; runs only when inspiration assets exist (vision-only Create unaffected) |

**Why:** A large part of brik's "art-directed" look is style conditioning from references. This is the M4 deliverable; needs the `vision` role unlocked in the router first.

---

### 3. Boilerplate Retriever — *new, non-LLM*

**Job:** Pick the 1–2 most relevant **golden tools** from a hand-authored library and inject them into codegen context (brik's `get_boilerplate`).

| Aspect | Spec |
|--------|------|
| Input | DesignBrief (tags: kinetic-type, particles, gradient, badge, story…) |
| Output | Full source of 1–2 golden canvas2d tools (hand-crafted, ~150–300 lines each) formatted as few-shot exemplars |
| Implementation | Plain Python — tag-matched lookup over `agent/golden/` library. **No LLM call.** |
| Library home | `agent/golden/` (new) — 3–5 hand-written tools: kinetic type, particle field, gradient mesh, logo badge, story slide |
| Gate | Every golden tool itself passes compile + host smoke + human design review before entering the library |

**Why:** The single biggest quality lift. Today the model's only reference is the skeleton stub (a pulsing circle). Golden exemplars teach composition, layering, easing, and param wiring by example.

---

### 4. Codegen — *exists, needs upgrade*

**Job:** DesignBrief + golden exemplars → complete canvas2d TS module.

| Aspect | Spec |
|--------|------|
| Input | DesignBrief JSON, original vision, golden exemplar source, skeleton contract |
| Output | `export const createTool = () => createCanvas2dTool({...})` module |
| Model role | `codegen` — **strongest available model** (A/B: Claude Sonnet 5 / Kimi K2.7 Code / DeepSeek V4 Pro; Flash stays fallback) |
| Prompt home | `agent/prompts/create_codegen.py` — add craft guidance (layered scenes, easing discipline, palette roles, typography hierarchy, param-driven behavior) + exemplars |
| Gate | static_validate → **esbuild compile** → **host smoke** (see Quality gates) |

**Current state note:** node at `agent/nodes/codegen.py` runs `temperature=0.4`. Craft-prompt upgrade was attempted in a prior session but never landed — must be redone and committed.

---

### 5. Critic / Visual Judge — *new, vision*

**Job:** Look at a rendered screenshot of the tool and produce scores + a concrete fix list. This is the designer-review step brik gets implicitly from its design-brief loop.

| Aspect | Spec |
|--------|------|
| Input | Screenshot PNG (from host smoke capture), DesignBrief, generated source |
| Output | Critique JSON: scores 1–5 per axis (composition, motion design, color/palette discipline, typography, param usefulness), overall, plus ordered fix list ("focal element competes with title", "no easing — motion feels linear") |
| Model role | `judge` — vision-capable (Gemini 3.6 Flash / GPT-5.4-mini; calibrate against human scores) |
| Prompt home | `agent/prompts/critique.py` (new) — rubric-based, calibrated |
| Gate | Judge output parses; overall score feeds pipeline decision (see Quality gates) |

**Why:** Today the repair loop only sees regex errors. The critic gives it *design* failures to fix — the difference between "valid tool" and "brik-looking tool".

---

### 6. Repair — *exists, needs better inputs*

**Job:** Fix the module using **real failure signals**, preserving craft.

| Aspect | Spec |
|--------|------|
| Input | Current source + compile errors / runtime console errors / critic fix list (not just regex strings) |
| Output | Full fixed module |
| Model role | `repair` — mid-tier (DeepSeek V4 Pro or Kimi K2.7 Code) |
| Prompt home | `agent/prompts/create_repair.py` — add "preserve composition and param surface; fix only what's listed" |
| Gate | Same compile + host smoke + judge re-score; bounded N=3 + wall time (existing) |

---

## Target pipeline

```
ingest
  ↓
Style Extract        (only if inspiration images; vision role)
  ↓
Art Director         (plan role → DesignBrief JSON; gate: schema valid)
  ↓
Boilerplate Retrieve (no LLM — golden library lookup by brief tags)
  ↓
Codegen              (codegen role → TS module)
  ↓
┌─ validate loop (≤3 repairs, wall-time budget) ────────────────┐
│  static validate (regex, exists)                              │
│    ↓                                                          │
│  compile gate (esbuild — reuse apps/web compile pipeline)     │
│    ↓                                                          │
│  host smoke (Playwright: mount, 0 console errors,             │
│              non-blank pixel check, screenshot)               │
│    ↓                                                          │
│  Critic (judge role: rubric scores + fix list)                │
│    ↓ score < threshold                                        │
│  Repair (repair role) ──────────────────────► loop            │
└───────────────────────────────────────────────────────────────┘
  ↓ score ≥ threshold
finalize → tool version → Studio   (salvage path unchanged)
```

---

## Model routing

Unlock `assert_allowed_model` (single-model lock in `adapters/llm/openrouter.py`) into a **per-role allowlist + env config**. `router.py` already has the role concept — extend it.

| Role | Default (proposal) | Fallback | Why |
|------|--------------------|----------|-----|
| `plan` (Art Director) | `deepseek/deepseek-v4-flash` | `google/gemini-3.5-flash` | Structured JSON, cheap, fast |
| `vision` (Style Extract) | `google/gemini-3.6-flash` | `gpt-5.4-mini` | Cheap multimodal |
| `codegen` | A/B: `anthropic/claude-sonnet-5` · `moonshotai/Kimi-K2.7-Code` · `deepseek/deepseek-v4-pro` | `deepseek/deepseek-v4-flash` | **Quality-critical** — pick by live eval, not vibes |
| `judge` (Critic) | `google/gemini-3.6-flash` | `gpt-5.4-mini` | Vision + rubric following |
| `repair` | `deepseek/deepseek-v4-pro` | `moonshotai/Kimi-K2.7-Code` | Good at targeted fixes, mid cost |

Rules:
- Role → model map is **env-configurable** (`LLM_MODEL_PLAN`, `LLM_MODEL_CODEGEN`, …); defaults live in `core/config.py`.
- Allowlist per role, not global — a misconfigured role fails loud at startup.
- **No default change without a live eval A/B** showing improvement on the expanded corpus.
- Keep `reasoning: {effort: "none"}` handling per-model (Flash quirk — see openrouter adapter).

---

## Quality gates (how we know an agent is good enough)

Per-stage, in pipeline order:

| Stage | Gate | Threshold |
|-------|------|-----------|
| Art Director | Brief JSON schema-valid, palette hex-valid, ≥3 params | 100% (parse retry ×1) |
| Codegen | static_validate | 0 errors |
| Compile | esbuild bundles module | 0 TS errors |
| Host smoke | Playwright mount: no console errors, canvas non-blank (pixel variance), `captureFrame` succeeds | all pass |
| Critic | Rubric overall score | ≥ 3.5/5 to finalize; else repair with fix list |
| Param coverage | Every plan param referenced in generated code | 100% |
| Pipeline | Repair budget / wall time | N=3, ~90s (existing) |

Eval discipline:

- **Corpus:** expand `evals/create/prompts.json` 10 → 40+ prompts across categories (type, particles, grids, badges, stories) with difficulty tiers.
- **Two eval modes:** mock stays CI-only (plumbing regression); `EVAL_LIVE=1` + screenshots + judge scores is the real quality signal. Mock can never measure quality (it uses fixed `_GOOD_CODE`).
- **Human calibration:** owner rates ~20 outputs 1–5; judge must correlate before it gates the pipeline.
- **A/B everything:** prompt or model change merges only if live eval improves (first-pass rate, judge score, salvage rate).
- **Production telemetry:** salvage rate, repair-count histogram, publish rate per model — feed real prompts back into the corpus.

---

## Phasing (maps to milestones)

| Phase | Agents | Milestone hook |
|-------|--------|----------------|
| **P1 — craft floor** | Art Director (richer plan prompt), Codegen prompt upgrade, Boilerplate library (first 3 goldens) | M9 quality track; no new infra |
| **P2 — real gates** | Compile gate + Playwright host smoke; param-coverage check | M9 hardening |
| **P3 — critic loop** | Critic + Repair-on-critique; judge calibration; expanded eval corpus | M9 quality track |
| **P4 — model routing** | Per-role router unlock; live A/B; set codegen default | M9 / config |
| **P5 — style conditioning** | Style Extract + inspiration upload wiring | **M4** |
| **P6 — multi-target** | Same agent topology, p5/three skeletons + goldens | **M4/M2b** (eval-gated) |
| **P7 — chat refine** | Reuse Codegen + Critic as patch-mode agents | **M6** |

**Do not** start P5/P6 before P1–P3 are green on canvas2d — multi-target amplifies whatever quality the canvas2d loop has.

---

## Non-goals

- No autonomous browsing / remix agents (consensus: deferred).
- No mega-prompt single-agent rewrite — specialization is the point.
- No server render farm for the judge — screenshots come from the existing host smoke path.
- No model default changes without eval evidence.
