# Vibeit — Agent milestones (generation quality track)

**Source:** [agents.md](./agents.md) (agent roster, model routing, gates)
**Status:** AM1 in progress (craft floor landed in code; owner eyeball + pre-baseline still open)
**Date:** 2026-08-06
**Goal:** Raise Create output from "valid canvas2d tool" to **brik.space-level art-directed tools** by splitting Create into role-specialized agents with real gates.

**Prereq:** Core loop complete (M0–M8 ✅). This track is **M9-quality** work; AM5/AM6/AM7 are the agent-side deliverables of **M4 / M2b / M6**.

---

## How to read this

Same conventions as [vibeit-milestones.md](./vibeit-milestones.md):

| Term | Meaning |
|------|---------|
| **AM** | Agent milestone (AM1–AM7). Quality track — does not reopen product architecture |
| **Exit** | Hard criteria — do not start the next AM until met (unless marked parallel) |
| **Demo** | What you can show when the milestone is done |
| **Gate** | Numeric check that must pass (not vibes) |

**Principle:** Prompts and goldens before infra; gates before the critic; canvas2d quality proven before multi-target. **Every quality claim is backed by a live eval run** — mock eval is plumbing-only.

```
AM1  Craft floor (prompts + golden library)          ← start here, no new infra
 ↓
AM2  Real gates (esbuild compile + Playwright host smoke)
 ↓
AM3  Critic loop + quality evals (screenshot judge, calibration)
 ↓
AM4  Model routing + live A/B (unlock per-role models, set codegen default)
 ↓
┌────────────────────────────────────────────────────┐
│ Fast-follows (each gated on AM1–AM3 staying green) │
│  AM5  Style conditioning (inspiration images)  → M4 │
│  AM6  Multi-target goldens (p5/three)     → M4/M2b  │
│  AM7  Chat refine agents                   → M6     │
└────────────────────────────────────────────────────┘
```

**Rule:** Do not start AM5/AM6 before AM1–AM3 are green on canvas2d — multi-target amplifies whatever quality the canvas2d loop has.

### Suggested effort (order-of-magnitude, focused days)

| Milestone | Focus | ~Days |
|-----------|-------|------:|
| AM1 | Prompts + plan schema + 3 goldens | 2–3 |
| AM2 | Compile gate + host smoke | 2–3 |
| AM3 | Critic + eval corpus + calibration | 2–4 |
| AM4 | Router unlock + A/B + default pick | 1–2 |
| AM5 | Style extract + upload wiring | 2–3 |
| AM6 | p5/three goldens + target selection | 3–5 |
| AM7 | Chat refine patch agents | 3–5 |
| **Sum (AM1–AM4 core quality)** | | **~7–12** |

Numbers are planning aids, not commitments. Cut polish, not the path.

---

## AM1 — Craft floor (prompts + golden library)

**Why:** Cheapest, highest-leverage quality work. Today the plan prompt is schema-only and codegen's only reference is a pulsing-circle stub. No new infrastructure required — pure prompt/schema/library work, runnable on the existing Flash lock.

### Deliverables

- [x] **DesignBrief v2** plan schema — composition (layers/focal points), palette with roles, motion spec (easing/tempo/loop), typography scale, control-surface intent — extends `ToolPlan`, stays backward compatible
- [x] **Art Director prompt** rewrite (`create_plan.py`) — art-direction guidance, not just JSON schema
- [x] **Golden library** — 3 hand-authored canvas2d tools in `agent/golden/`: kinetic type, particle field, gradient/poster — static validate pass; human design review pending
- [x] **Boilerplate retriever** — tag-matched lookup (no LLM), injects 1–2 exemplars into codegen context
- [x] **Codegen prompt upgrade** — craft guidance (layered scenes, easing discipline, palette roles, param-driven behavior) + exemplar injection; repair prompt preserves craft
- [x] **Live eval baseline** — post-AM1 `EVAL_LIVE=1` committed (`evals/create/baselines/am1-after.json`); no pre-AM1 live baseline existed in repo

### Demo

Same 10 eval prompts through the live pipeline before vs after — visible composition/motion improvement on Flash alone, with numbers committed.

### Exit criteria

- [x] DesignBrief v2 validates (schema + hex palette + ≥3 params), parse retry ×1
- [ ] 3 goldens pass static validate + compile + mount manually in Studio *(static validate ✅; Studio mount / human design review open)*
- [ ] Live eval: first-pass rate not worse than baseline; owner eyeballs ≥7/10 outputs as "visibly better" *(live 8/10 first-pass committed; eyeball open)*
- [x] All M3c/M3d/M3e agent tests still pass *(AM1 + M3d smoke green)*

### Out of scope

- Host smoke / Playwright (AM2), critic (AM3), model changes (AM4)

### Depends on

- Nothing new — works on current pipeline + Flash lock

---

### AM1 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **AM1a** | DesignBrief v2 schema + Art Director prompt | — | 0.5–1 | Richer plan JSON; parser + fallbacks updated |
| **AM1b** | Golden library (3 tools) + retriever | — (∥ AM1a) | 1–1.5 | Hand-authored exemplars + tag lookup, no LLM |
| **AM1c** | Codegen + repair prompt upgrade | AM1a + AM1b | 0.5–1 | Craft guidance + exemplar injection in context |
| **AM1d** | Live eval baseline + AM1 checklist | AM1c | 0.5 | Before/after Flash numbers committed |

**Where code lands:**

| Concern | Path |
|---------|------|
| Plan schema (TS) | `packages/contracts/src/plan.ts` (+ `md/contracts/plan-json.md` update) |
| Plan mirror (Py) | `apps/api/src/agent/plan_parse.py` |
| Prompts | `apps/api/src/agent/prompts/create_plan.py` · `create_codegen.py` · `create_repair.py` |
| Goldens | `apps/api/src/agent/golden/*.ts` + `golden/index.py` (manifest + tags) |
| Retriever | `apps/api/src/agent/golden/retrieve.py` — called from `nodes/codegen.py` |
| Eval baselines | `apps/api/evals/create/baselines/` (JSON + notes) |

**Invariants (every subpart):**

1. **Target stays `canvas2d`** — no multi-target logic sneaks in with the richer brief.
2. **Goldens obey the same hard rules** as generated code (no fetch/eval/parent) — they are injected into prompts verbatim.
3. **Backward-compatible plan parse** — old 10-prompt eval corpus still runs.
4. **Commit the baseline** — no "it looked better" without a committed `EVAL_LIVE=1` JSON.

---

## AM2 — Real gates (compile + host smoke)

**Why:** Current smoke is regex — a tool can pass while blank or crashing at runtime. Brik-level quality needs gates that execute the tool. The compile pipeline already exists in `apps/web` (M2a7); the agent just never calls it.

### Deliverables

- [ ] **Compile gate** — esbuild bundles the generated module (API-side, same config as `apps/web` compile route); TS errors become repair input
- [ ] **Playwright host smoke** — mount module in real `runtime-frame`: zero console errors, canvas non-blank (pixel variance above threshold), `captureFrame` succeeds, **screenshot saved**
- [ ] **Param-coverage check** — every plan param name referenced in generated code
- [ ] **Runner wiring** — repair receives compile errors + console errors (not just regex strings); job phase gains `smoke:host`
- [ ] Structural regex smoke demoted to fast pre-filter (kept — cheap)

### Demo

A deliberately broken (runtime-throwing) and a deliberately blank (clear-only) tool are both **rejected** by the pipeline; a good tool produces a screenshot artifact per job.

### Exit criteria

- [ ] Runtime-crashing code never reaches finalize (previously could pass regex)
- [ ] Blank/near-blank canvas never reaches finalize
- [ ] Screenshot artifact stored per eval run (feeds AM3 critic)
- [ ] Eval gates still pass on corpus; wall-time budget adjusted (host smoke adds seconds)

### Out of scope

- Visual quality judging of the screenshot (AM3), video smoke, p5/three smoke

### Depends on

- AM1 (prompts stable before gates tighten — otherwise repair fights moving prompts)

---

### AM2 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **AM2a** | esbuild compile gate in API | — | 0.5–1 | `validators/compile_check.py`; errors → repair context |
| **AM2b** | Playwright host smoke + screenshot | AM2a | 1–1.5 | `validators/host_smoke.py`; console/blank/capture checks |
| **AM2c** | Param coverage + runner wiring | AM2b | 0.5 | Repair gets real failure signals; phase updates |
| **AM2d** | AM2 checklist + gate tune | AM2c | 0.25 | Thresholds (pixel variance) tuned on corpus |

**Where code lands:**

| Concern | Path |
|---------|------|
| Compile gate | `apps/api/src/agent/validators/compile_check.py` (esbuild subprocess or web compile service) |
| Host smoke | `apps/api/src/agent/validators/host_smoke.py` (Playwright + `apps/web` runtime-frame) |
| Runner | `apps/api/src/agent/runner.py` · `nodes/sandbox_smoke.py` |
| Screenshot artifacts | `apps/api/.data/smoke/` (gitignored) or storage `kind=export` |
| Tests | `apps/api/tests/test_agent_am2.py` |

**Invariants:**

1. **Fail closed** — if Playwright/esbuild is unavailable in an environment, jobs fail with a clear config error, never silently skip the gate (eval/dev must have it).
2. **Bounded time** — host smoke has its own timeout inside the job wall-time budget.
3. **No new trust surface** — host smoke runs in the same sandboxed frame as Studio; CSP unchanged.
4. **Repair sees real errors** — compile diagnostics and console messages replace regex strings in the repair prompt.

---

## AM3 — Critic loop + quality evals

**Why:** Gates so far answer "does it run". The critic answers "does it look designed" — the repair loop finally gets design failures to fix, and evals finally measure quality.

### Deliverables

- [ ] **Eval corpus v2** — 10 → 40+ prompts across categories (kinetic type, particles, grids, badges, stories, posters) with difficulty tiers and expected-aspect tags
- [ ] **Critic agent** — rubric prompt: scores 1–5 per axis (composition, motion design, palette discipline, typography, param usefulness) + ordered fix list; parses to Critique JSON
- [ ] **Critic-in-loop** — overall < 3.5 → repair with fix list (counts against repair budget); ≥ 3.5 → finalize
- [ ] **Human calibration** — owner rates ~20 outputs; judge correlation checked before judge gates the pipeline
- [ ] **Quality eval report** — live eval emits per-prompt judge scores + screenshots, not just pass/fail

### Demo

Live eval run produces a scored gallery of 40 outputs; a mid-quality tool gets visibly improved after one critic-guided repair.

### Exit criteria

- [ ] Judge–human correlation acceptable on the 20-output calibration set (documented method, e.g. rank correlation ≥ 0.7)
- [ ] Critic-guided repair measurably raises re-score (before/after in eval report)
- [ ] Corpus committed with tiers; live eval runs end-to-end with screenshots
- [ ] Judge failure/timeout degrades to gates-only finalize (never blocks the pipeline hard)

### Out of scope

- Model routing/A/B (AM4 — judge runs on whatever vision model is configured), style conditioning (AM5)

### Depends on

- AM2 (screenshots + host smoke are the critic's input)

---

### AM3 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **AM3a** | Eval corpus v2 (40+ prompts, tiers) | — (∥ AM2) | 0.5–1 | `evals/create/prompts.json` expanded |
| **AM3b** | Critic node + rubric prompt + parse | AM2b | 0.75–1 | Critique JSON from screenshot + brief |
| **AM3c** | Critic-in-loop + repair-on-critique | AM3b | 0.5–0.75 | Score threshold routes to repair/finalize |
| **AM3d** | Calibration + quality report + checklist | AM3c | 0.5–1 | Judge trusted; eval report has scores |

**Where code lands:**

| Concern | Path |
|---------|------|
| Critic node | `apps/api/src/agent/nodes/critique.py` |
| Rubric prompt | `apps/api/src/agent/prompts/critique.py` |
| Corpus | `apps/api/evals/create/prompts.json` (+ `evals/create/calibration/`) |
| Eval report | `apps/api/scripts/eval_create.py` — scores + artifact paths |
| Runner | `agent/runner.py` — critic branch between smoke and repair |

**Invariants:**

1. **Judge is advisory until calibrated** — calibration doc lands before the judge can block finalize.
2. **Judge failure ≠ job failure** — timeout/parse failure falls back to gates-only path.
3. **Critic sees the brief** — scoring is against the DesignBrief, not generic taste.
4. **Repair budget is shared** — critic-guided repairs count toward N=3 + wall time (no infinite polish loops).

---

## AM4 — Model routing + live A/B

**Why:** The Flash lock (`assert_allowed_model`) caps every role. With prompts, gates, and the critic in place, model quality finally becomes *measurable* — so this is when we spend money on stronger models, guided by data.

### Deliverables

- [ ] **Per-role router** — `plan` / `vision` / `codegen` / `judge` / `repair` roles → model id; env-configurable (`LLM_MODEL_*`); per-role allowlist; misconfiguration fails loud at startup
- [ ] **A/B eval mode** — eval runner sweeps model assignments over the corpus and emits a comparison report (first-pass, after-repair, judge score, cost, wall time)
- [ ] **Codegen shootout** — Claude Sonnet 5 vs Kimi K2.7 Code vs DeepSeek V4 Pro (Flash baseline) on corpus v2
- [ ] **Default decision** — committed record of chosen defaults per role + reasoning; cost-per-create estimate update

### Demo

One command produces a model-comparison table over the 40-prompt corpus with judge scores and costs; new defaults live behind env vars.

### Exit criteria

- [ ] Any allowlisted role model can be swapped via env without code change
- [ ] Codegen default chosen by committed A/B report (not vibes); Flash remains documented fallback
- [ ] Cost per create at new defaults is documented and accepted by owner
- [ ] Non-codegen roles stay cheap (plan/judge/vision on flash-tier unless A/B says otherwise)

### Out of scope

- Streaming, provider-direct integrations (OpenRouter only), paid-tier product work

### Depends on

- AM3 (judge scores are the A/B metric); AM2 (gates keep weaker models honest)

---

### AM4 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome |
|---------|------|------------|------:|---------|
| **AM4a** | Per-role router + allowlists + env | — | 0.5 | `router.py` unlock; startup validation |
| **AM4b** | A/B sweep mode in eval runner | AM3d | 0.5 | Comparison report (quality + cost) |
| **AM4c** | Shootout + default decision + checklist | AM4b | 0.5–1 | Committed `evals/create/model-ab/` record |

**Where code lands:**

| Concern | Path |
|---------|------|
| Router | `apps/api/src/adapters/llm/router.py` · `openrouter.py` (replace single-model assert) |
| Config | `apps/api/src/core/config.py` — `LLM_MODEL_PLAN/CODEGEN/REPAIR/JUDGE/VISION` |
| A/B | `apps/api/scripts/eval_create.py` — `--model role=id` overrides, sweep report |
| Decision record | `apps/api/evals/create/model-ab/` (JSON + short md) |

**Invariants:**

1. **Allowlist per role, not global** — a typo'd model id fails at startup, not mid-job.
2. **No default change without a committed A/B report.**
3. **Secrets stay server-side** — model ids may be logged; keys never (existing rule holds).
4. **Per-model quirks handled in the adapter** — e.g. Flash `reasoning: {effort: "none"}` stays model-scoped, not global.

---

## AM5 — Style conditioning (inspiration images) — *M4 agent deliverable*

**Why:** Brik's art-directed look comes heavily from reference conditioning. This wires the upload path (exists since M1e) into generation via a vision model.

### Deliverables

- [ ] **Vision role** in router (from AM4a — cheap multimodal default: Gemini Flash)
- [ ] **Style Extract agent** — inspiration images → style notes JSON (palette with roles, mood/energy, composition patterns, typography feel, motion hints); **interpret, never copy** (consensus copyright rule)
- [ ] **Create UI wiring** — optional inspiration upload on `/create` (asset ids already supported in `CreateJobRequest`)
- [ ] **Brief conditioning** — Art Director consumes style notes; defaults (palette/params) influenced by references
- [ ] **Evals** — corpus adds styled prompts with reference images; vision-only path regression-checked

### Demo

Create with vision + 2 inspiration screenshots → tool whose defaults visibly echo the references (not a pixel copy); Create without images unchanged.

### Exit criteria

- [ ] Style extract produces valid notes on the test image set
- [ ] Styled runs score ≥ unstyled baseline from judge on matching prompts
- [ ] Vision-only Create passes existing corpus unchanged
- [ ] Copyright rule in prompt; no 1:1 recreation observed in calibration review

### Out of scope

- Multi-target (AM6), brand kits, arbitrary URL ingestion (uploads only)

### Depends on

- AM3 green (judge used for styled-vs-baseline comparison) · AM4a (vision role)

### Subparts

| Subpart | Name | ~Days | Outcome |
|---------|------|------:|---------|
| **AM5a** | Vision role + style-extract node + prompt | 0.75–1 | Notes JSON from uploaded images |
| **AM5b** | Create UI upload + ingest wiring | 0.5–1 | Images flow from `/create` into the graph |
| **AM5c** | Brief conditioning + evals + checklist | 0.75–1 | Styled defaults; corpus extended |

---

## AM6 — Multi-target goldens (p5 / three) — *M4/M2b agent deliverable*

**Why:** Brik's showpiece outputs are Three.js shaders. Only worth doing once canvas2d quality is proven — multi-target amplifies the loop's existing quality, good or bad.

### Deliverables

- [ ] p5/three **skeletons + host stubs** completed (M2b scope: loaders, `preserveDrawingBuffer` capture)
- [ ] **Golden tool per target** (hand-authored, reviewed) + retriever tag support
- [ ] **Art Director target selection** — brief picks `canvas2d | p5 | three` with rationale (canvas2d still default)
- [ ] Per-target validators/smoke (WebGL console + blank checks)
- [ ] **Eval gates per target** — `three` config-gated until its gate passes (consensus freeze)

### Exit criteria

- [ ] p5 enabled after its eval gate passes on corpus subset
- [ ] three stays config-gated until gate passes; launch can ship without it
- [ ] canvas2d corpus unaffected (regression run green)

### Depends on

- AM1–AM3 green on canvas2d · M2b host work

### Subparts

| Subpart | Name | ~Days | Outcome |
|---------|------|------:|---------|
| **AM6a** | p5/three skeletons + host stubs + capture | 1.5–2 | Reference tool per target mounts/captures |
| **AM6b** | Goldens + retriever + target selection | 1–1.5 | Brief picks target; exemplars per target |
| **AM6c** | Per-target evals + config gating + checklist | 0.5–1.5 | Gates decide enablement |

---

## AM7 — Chat refine agents — *M6 agent deliverable*

**Why:** Structural/creative changes via chat need patch + re-preview, not sliders. Reuses AM1–AM3 machinery in patch mode.

### Deliverables

- [ ] **Patch-mode Codegen** — chat (+ current source + brief) → param patch **or** code patch; param-only requests prefer param patches
- [ ] **Refine loop** — patch → AM2 gates → AM3 critic (score must not regress vs current version)
- [ ] **Studio chat UI** — refining states, failure messages, last-good rollback (version history thin)
- [ ] Refine budget (per-session cap) + hard regen only on structural change (policy in prompt)

### Exit criteria

- [ ] "make particles slower and add a subtitle" → valid new version or clean failure
- [ ] Refine never lands a version with a lower judge score than the current one
- [ ] Param-only requests don't burn a full codegen call

### Depends on

- AM2 + AM3 (gates + critic are the refine safety net) · M5 Studio shell ✓

### Subparts

| Subpart | Name | ~Days | Outcome |
|---------|------|------:|---------|
| **AM7a** | Patch-mode prompts + param/code patch routing | 1–1.5 | Chat → minimal valid patch |
| **AM7b** | Studio chat UI + rollback | 1–2 | Human path in Studio |
| **AM7c** | Refine evals + budget + checklist | 0.75–1.5 | Numeric gates on refine corpus |

---

## Cross-cutting invariants (all AMs)

1. **Failed never published** — existing M3/M8 invariant holds through every new gate.
2. **Mock eval is CI-only** — quality claims require `EVAL_LIVE=1` artifacts committed under `evals/create/`.
3. **canvas2d-first discipline** — no AM may regress the canvas2d corpus to enable another target.
4. **Salvage path unchanged in spirit** — on exhaustion, best-valid draft only; never ready/published.
5. **Budgets hold** — repair N=3 and wall time apply to critic-guided repairs too; new stages justify their seconds inside the budget or the budget is re-documented.
6. **Prompts are code** — prompt changes land with an eval run attached to the PR/commit note.

## Demo checklist convention

Each AM ships a `md/am{N}-demo-checklist.md` + automated smokes in `apps/api/tests/`, matching the M-series pattern (e.g. [m3-demo-checklist.md](./m3-demo-checklist.md)).
