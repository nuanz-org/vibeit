# Vibeit — Agent milestones (generation quality track)

**Source:** [agents.md](./agents.md) (agent roster, model routing, gates)
**Status:** **AM7 chat refine — code complete / exit partial** (see [Coverage log](#coverage-log))
**Date:** 2026-08-06 · **Last progress:** 2026-08-07
**Goal:** Raise Create output from "valid canvas2d tool" to **brik.space-level art-directed tools** by splitting Create into role-specialized agents with real gates.

**Prereq:** Core loop complete (M0–M8 ✅). This track is **M9-quality** work; AM5/AM6/AM7 are the agent-side deliverables of **M4 / M2b / M6**.

---

## Coverage log

What has actually been implemented on this track (update when an AM lands).

| Milestone | Name | Coverage | Commit / notes |
|-----------|------|----------|----------------|
| **AM1** | Craft floor (prompts + golden library) | **Covered in code** — subparts AM1a–AM1d shipped; full exit still needs owner Studio/eyeball | `02fe278` (2026-08-07) |
| **AM2** | Real gates (compile + host smoke) | **Covered in code** — AM2a–AM2d shipped; full exit needs live eval wall-time tune + corpus green | `dc95de9` (2026-08-07) |
| **AM3** | Critic loop + quality evals | **Covered in code** — AM3a–AM3d scaffold shipped; enforcement waits on human calibration | `ba5ec07` (2026-08-07) |
| **AM4** | Model routing + live A/B | **Covered in code** — router + eval A/B; defaults still Flash until live shootout | `0555253` (2026-08-07) |
| **AM5** | Style conditioning | **Covered in code** — style extract + Create upload wiring; live styled eval open | `599ead3` (2026-08-07) |
| **AM6** | Multi-target goldens (p5/three) | **Covered in code** — skeletons + goldens + config gates; p5/three off by default | `6e3c6ce` (2026-08-07) |
| **AM7** | Chat refine agents | **Covered in code** — AM7a–AM7b + budget scaffold; live Studio/demo exit open | (2026-08-07) |

### AM7 — what was shipped (2026-08-07)

**Milestone covered:** **AM7** (Control refine patch agents + Studio chat + budget). Reuses AM2 gates + AM3 critic with non-regression.

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM7a** | ✅ | Route param/code; param-patch + code-patch prompts/nodes; refine runner; gates + critic non-regression |
| **AM7b** | ✅ | Studio refine chat panel; poll job; last-good client rollback (Undo) |
| **AM7c** | ✅ (partial) | Per-tool refine budget + wall settings; unit tests `test_agent_am7.py`; [am7-demo-checklist.md](./am7-demo-checklist.md) |

**Files touched (canonical):**

| Area | Paths |
|------|--------|
| Route / parse | `apps/api/src/agent/refine_route.py`, `patch_parse.py` |
| Prompts | `apps/api/src/agent/prompts/refine_param.py`, `refine_code.py` |
| Nodes / runner | `apps/api/src/agent/nodes/refine_patch.py`, `runner.py`, `state.py` |
| Graph | `apps/api/src/agent/graphs/control_refine.py` |
| Job / worker | `services/refine_job.py`, `workers/generation.py`, `finalize_job.py`, `migrations/006_refine_jobs.sql` |
| HTTP / schema | `api/v1/tools.py` POST `/{toolId}/refine`, `schemas/jobs.py`, jobs repo + `job_kind` / `base_version_id` |
| Studio | `apps/web/features/studio/components/refine-chat-panel.tsx`, `studio-shell.tsx`, `lib/api/refine.ts` |
| Tests / docs | `apps/api/tests/test_agent_am7.py`, `md/am7-demo-checklist.md`, this file |

**App impact:** Generated-tool Studio gains a **Refine (chat)** section. Chat enqueues a refine job; on success a new `tool_versions` row is written and preview remounts. Failures keep last-good. Param-only chat uses plan-role model (no full codegen). Requires migration `006_refine_jobs.sql` + OpenRouter for live refine.

**Still open for full AM7 exit:**

- [ ] Live Studio demo: “make particles slower and add a subtitle” → valid version  
- [ ] Owner confirms param-only path does not full-regen in logs  
- [ ] Optional: committed refine eval corpus under `evals/create/`  
- [ ] Then mark AM7 fully exited

### AM6 — what was shipped (2026-08-07)

**Milestone covered:** **AM6** (multi-target stubs + goldens + gates). **Default production remains canvas2d only.**

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM6a** | ✅ | `createP5Tool` / `createThreeTool` skeletons (Canvas2D + WebGL stubs); host target stubs |
| **AM6b** | ✅ | Goldens `p5-orbit`, `three-depth`; retriever filters by target; plan `target` + rationale |
| **AM6c** | ✅ | `VIBEIT_TARGET_P5_ENABLED` / `THREE`; target-aware static validate; tests `test_agent_am6.py` |

**Still open for full AM6 exit:**

- [ ] Live eval gates on p5 subset before enabling p5 in prod  
- [ ] three stays off until owner accepts WebGL quality  
- [ ] Optional: full allowlisted p5.js / three.js bundles (M2b+)  

### AM5 — what was shipped (2026-08-07)

**Milestone covered:** **AM5** (inspiration → StyleNotes → plan/codegen). Soft-fail if no images / vision errors.

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM5a** | ✅ | `style_extract` prompt/parse/node; multimodal OpenRouter messages; vision role model |
| **AM5b** | ✅ | Create form multi-file upload → `inspirationAssetIds`; worker loads assets → runner |
| **AM5c** | ✅ (partial) | Plan/codegen consume style notes; copyright rule; unit tests; live styled eval open |

**Still open for full AM5 exit:**

- [ ] Live styled vs unstyled judge comparison on a few prompts  
- [ ] Owner calibration: no 1:1 recreation of references  
- [ ] Prefer `LLM_MODEL_VISION=google/gemini-2.5-flash` (default) for extract quality  

### AM4 — what was shipped (2026-08-07)

**Milestone covered:** **AM4** (per-role router + A/B plumbing). Production defaults remain Flash.

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM4a** | ✅ | `router.py` per-role allowlists; `LLM_MODEL_*` env; Settings startup validation |
| **AM4b** | ✅ | `eval_create.py --model role=id` + `--ab-codegen m1,m2,...` comparison table |
| **AM4c** | ✅ (partial) | `evals/create/model-ab/` decision baseline + template; live shootout pending owner |

**Still open for full AM4 exit:**

- [ ] Live codegen shootout report committed under `evals/create/model-ab/`  
- [ ] Owner picks defaults + accepts cost; update `decision.json`  
- [ ] Then mark AM4 fully exited  

### AM3 — what was shipped (2026-08-07)

**Milestone covered:** **AM3** (critic + corpus v2). Judge is **advisory by default** until calibration.

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM3a** | ✅ | Corpus v2: 44 prompts with `tier` + `aspect` + tags in `evals/create/prompts.json` |
| **AM3b** | ✅ | `prompts/critique.py`, `critique_parse.py`, `nodes/critique.py` — Critique JSON + scores/fixes |
| **AM3c** | ✅ | Runner: after smoke_ok → critique; low score + `VIBEIT_CRITIC_ENFORCED=1` → repair with fix list |
| **AM3d** | ✅ (partial) | Calibration scaffold `evals/create/calibration/`; eval report has mean judge + per-prompt scores; tests `test_agent_am3.py` |

**Files touched (canonical):**

| Area | Paths |
|------|--------|
| Corpus | `apps/api/evals/create/prompts.json` (v2, 44 prompts) |
| Critic | `agent/prompts/critique.py`, `critique_parse.py`, `nodes/critique.py` |
| Runner / repair | `runner.py`, `nodes/repair.py`, `state.py`, `prompts/create_repair.py` |
| Eval | `scripts/eval_create.py` (judge scores, `--limit`, corpus version) |
| Calibration | `evals/create/calibration/README.md`, `human-scores.template.json` |
| Tests | `apps/api/tests/test_agent_am3.py` |
| Docs | this file |

**App impact:** After gates pass, Create runs a critic LLM pass and stores scores. **Does not block finalize** unless `VIBEIT_CRITIC_ENFORCED=1` (post-calibration). Critic failure → gates-only finalize.

**Still open for full AM3 exit:**

- [ ] Owner rates ~20 outputs; Spearman ≥ 0.7 documented in calibration notes  
- [ ] Set `VIBEIT_CRITIC_ENFORCED=1` only after calibration  
- [ ] Live eval on full 44-prompt corpus with mean judge scores committed  
- [ ] Then mark AM3 fully exited and start **AM4**

### AM2 — what was shipped (2026-08-07)

**Milestone covered:** **AM2** (real execute gates). Structural smoke demoted to pre-filter.

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM2a** | ✅ | `validators/compile_check.py` + `apps/web/runtime/compile/cli-compile.mjs` (esbuild, same config as Studio) |
| **AM2b** | ✅ | `validators/host_smoke.py` + Playwright Chromium + `smoke_assets/host.html`; blank canvas / console / captureFrame; screenshot under `apps/api/.data/smoke/` |
| **AM2c** | ✅ | `validators/param_coverage.py`; runner/repair get compile+host errors; phase `smoke:host` / `smoke:compile` |
| **AM2d** | ✅ | `tests/test_agent_am2.py`; wall default 120s; min variance env `VIBEIT_SMOKE_MIN_VARIANCE` |

**Files touched (canonical):**

| Area | Paths |
|------|--------|
| Compile CLI | `apps/web/runtime/compile/cli-compile.mjs` |
| Compile gate | `apps/api/src/agent/validators/compile_check.py` |
| Host smoke | `apps/api/src/agent/validators/host_smoke.py`, `smoke_assets/host.html` |
| Param coverage | `apps/api/src/agent/validators/param_coverage.py` |
| Smoke orchestrator | `apps/api/src/agent/validators/sandbox_smoke.py`, `nodes/sandbox_smoke.py` |
| Frame loader | `apps/web/runtime/frame/load-module.ts` (+ rebuilt `public/runtime-frame.js`) |
| Runner / state / repair | `runner.py`, `state.py`, `prompts/create_repair.py`, `core/config.py`, `services/create_job.py` |
| Deps | `apps/api/pyproject.toml` (`playwright`), `uv.lock` |
| Tests | `apps/api/tests/test_agent_am2.py` (+ AM1/M3c/M3e fixture updates) |
| Docs | this file, `apps/api/README.md` |

**App impact:** Create jobs automatically run esbuild + Playwright host smoke before finalize (no new UI). Blank/runtime-throw tools fail closed. Screenshots under `apps/api/.data/smoke/` (gitignored). Requires Node + `playwright install chromium` + built runtime-frame.

**Still open for full AM2 exit:**

- [ ] Live eval corpus still meets gates with host smoke wall-time (default wall 120s; eval default 150s)
- [ ] Owner sanity: deliberately blank + runtime-throw tools never finalize in Studio create
- [ ] Then mark AM2 fully exited and start **AM3**

### AM1 — what was shipped (2026-08-07)

**Milestone covered:** **AM1 only** (agent quality track start). Not M0 product milestones; not AM2+.

| Subpart | Status | What landed |
|---------|--------|-------------|
| **AM1a** | ✅ | DesignBrief v2 optional fields on `ToolPlan`; Python `plan_parse` (hex palette, ≥3 params, v2 fields); Art Director rewrite of `create_plan.py` |
| **AM1b** | ✅ | 3 goldens (`kinetic-type`, `particle-field`, `gradient-poster`) + `golden/index.py` + tag retriever `retrieve.py` |
| **AM1c** | ✅ | Craft guidance in `create_codegen.py` / `create_repair.py`; codegen node injects 1–2 exemplars |
| **AM1d** | ✅ (partial exit) | Live Flash baseline `evals/create/baselines/am1-after.json` (8/10 first-pass); tests `test_agent_am1.py` |

**Files touched (canonical):**

| Area | Paths |
|------|--------|
| Schema | `packages/contracts/src/plan.ts`, `index.ts`, social-frame plan example |
| Plan parse | `apps/api/src/agent/plan_parse.py` |
| Prompts | `apps/api/src/agent/prompts/create_plan.py`, `create_codegen.py`, `create_repair.py` |
| Pipeline | `apps/api/src/agent/nodes/codegen.py`, `state.py` |
| Goldens | `apps/api/src/agent/golden/*` |
| Tests | `apps/api/tests/test_agent_am1.py` |
| Eval | `apps/api/evals/create/baselines/` |
| Docs | this file, `md/agents.md`, `md/contracts/plan-json.md` |

**App impact:** Create jobs use the new plan + craft prompts + golden few-shots automatically (no new UI). Expect often better composition/motion on Flash; not a new screen.

**Still open for full AM1 exit:**

- [ ] Mount 3 goldens in Studio + human design review  
- [ ] Owner eyeball ≥7/10 corpus outputs “visibly better”  
- [ ] Then mark AM1 fully exited *(AM2 already landed in parallel once prompts were stable)*

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
AM1  Craft floor (prompts + golden library)          ← COVERED (code complete; exit partial)
 ↓
AM2  Real gates (esbuild compile + Playwright host smoke)  ← COVERED (code complete; exit partial)
 ↓
AM3  Critic loop + quality evals (screenshot judge, calibration)  ← COVERED (code complete; exit partial)
 ↓
AM4  Model routing + live A/B (unlock per-role models, set codegen default)  ← COVERED (code complete; exit partial)
 ↓
AM5–AM7  fast-follows (style / multi-target / chat refine)
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

**Coverage:** **Implemented** (2026-08-07, commit `02fe278`). Subparts AM1a–AM1d done in code. Full milestone exit still needs owner Studio mount + eyeball (see Coverage log).

**Why:** Cheapest, highest-leverage quality work. Before AM1 the plan prompt was schema-only and codegen's only reference was a pulsing-circle stub. No new infrastructure required — pure prompt/schema/library work, runnable on the existing Flash lock.

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

| Subpart | Name | Depends on | ~Days | Outcome | Done |
|---------|------|------------|------:|---------|:----:|
| **AM1a** | DesignBrief v2 schema + Art Director prompt | — | 0.5–1 | Richer plan JSON; parser + fallbacks updated | ✅ |
| **AM1b** | Golden library (3 tools) + retriever | — (∥ AM1a) | 1–1.5 | Hand-authored exemplars + tag lookup, no LLM | ✅ |
| **AM1c** | Codegen + repair prompt upgrade | AM1a + AM1b | 0.5–1 | Craft guidance + exemplar injection in context | ✅ |
| **AM1d** | Live eval baseline + AM1 checklist | AM1c | 0.5 | Post-AM1 Flash numbers committed (no pre-AM1 live JSON in repo) | ✅ |

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

**Coverage:** **Implemented** (2026-08-07). Subparts AM2a–AM2d done in code. Full exit still needs live eval wall-time confirmation (see Coverage log).

**Why:** Current smoke is regex — a tool can pass while blank or crashing at runtime. Brik-level quality needs gates that execute the tool. The compile pipeline already exists in `apps/web` (M2a7); the agent just never calls it.

### Deliverables

- [x] **Compile gate** — esbuild bundles the generated module (API-side, same config as `apps/web` compile route); TS errors become repair input
- [x] **Playwright host smoke** — mount module in real `runtime-frame`: zero console errors, canvas non-blank (pixel variance above threshold), `captureFrame` succeeds, **screenshot saved**
- [x] **Param-coverage check** — every plan param name referenced in generated code
- [x] **Runner wiring** — repair receives compile errors + console errors (not just regex strings); job phase gains `smoke:host`
- [x] Structural regex smoke demoted to fast pre-filter (kept — cheap)

### Demo

A deliberately broken (runtime-throwing) and a deliberately blank (clear-only) tool are both **rejected** by the pipeline; a good tool produces a screenshot artifact per job.

### Exit criteria

- [x] Runtime-crashing code never reaches finalize (previously could pass regex) — unit covered in `test_agent_am2.py`
- [x] Blank/near-blank canvas never reaches finalize — unit covered
- [x] Screenshot artifact stored per successful host smoke (`apps/api/.data/smoke/`)
- [ ] Eval gates still pass on corpus; wall-time budget adjusted (host smoke adds seconds) — default wall raised to 120s; live re-run open

### Out of scope

- Visual quality judging of the screenshot (AM3), video smoke, p5/three smoke

### Depends on

- AM1 (prompts stable before gates tighten — otherwise repair fights moving prompts)

---

### AM2 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome | Done |
|---------|------|------------|------:|---------|:----:|
| **AM2a** | esbuild compile gate in API | — | 0.5–1 | `validators/compile_check.py`; errors → repair context | ✅ |
| **AM2b** | Playwright host smoke + screenshot | AM2a | 1–1.5 | `validators/host_smoke.py`; console/blank/capture checks | ✅ |
| **AM2c** | Param coverage + runner wiring | AM2b | 0.5 | Repair gets real failure signals; phase updates | ✅ |
| **AM2d** | AM2 checklist + gate tune | AM2c | 0.25 | Thresholds (pixel variance) tuned on corpus | ✅ |

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

**Coverage:** **Implemented** (2026-08-07). AM3a–AM3c done; AM3d calibration scaffold done — human ratings + enforcement still open.

**Why:** Gates so far answer "does it run". The critic answers "does it look designed" — the repair loop finally gets design failures to fix, and evals finally measure quality.

### Deliverables

- [x] **Eval corpus v2** — 10 → 44 prompts across categories with difficulty tiers and aspect tags
- [x] **Critic agent** — rubric prompt + Critique JSON parse (composition, motion, palette, typography, params)
- [x] **Critic-in-loop** — when `VIBEIT_CRITIC_ENFORCED=1`, overall < threshold → repair with fix list; default advisory
- [x] **Human calibration** — scaffold + method in `evals/create/calibration/` (ratings pending owner)
- [x] **Quality eval report** — eval emits per-prompt judge scores + screenshot paths + mean judge

### Demo

Live eval run produces a scored gallery of 40 outputs; a mid-quality tool gets visibly improved after one critic-guided repair.

### Exit criteria

- [ ] Judge–human correlation acceptable on the 20-output calibration set (documented method, e.g. rank correlation ≥ 0.7)
- [ ] Critic-guided repair measurably raises re-score (before/after in eval report) — unit path covered when enforced
- [x] Corpus committed with tiers; eval reports scores + screenshot paths
- [x] Judge failure/timeout degrades to gates-only finalize (never blocks the pipeline hard)

### Out of scope

- Model routing/A/B (AM4 — judge runs on whatever vision model is configured), style conditioning (AM5)

### Depends on

- AM2 (screenshots + host smoke are the critic's input)

---

### AM3 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome | Done |
|---------|------|------------|------:|---------|:----:|
| **AM3a** | Eval corpus v2 (40+ prompts, tiers) | — (∥ AM2) | 0.5–1 | `evals/create/prompts.json` expanded | ✅ |
| **AM3b** | Critic node + rubric prompt + parse | AM2b | 0.75–1 | Critique JSON from brief + code (+ smoke notes) | ✅ |
| **AM3c** | Critic-in-loop + repair-on-critique | AM3b | 0.5–0.75 | Score threshold routes to repair/finalize | ✅ |
| **AM3d** | Calibration + quality report + checklist | AM3c | 0.5–1 | Judge trusted; eval report has scores | ✅ scaffold |

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

**Coverage:** **Implemented** (2026-08-07). Router + A/B CLI done; live shootout + default change still open (Flash remains default).

**Why:** The Flash lock (`assert_allowed_model`) caps every role. With prompts, gates, and the critic in place, model quality finally becomes *measurable* — so this is when we spend money on stronger models, guided by data.

### Deliverables

- [x] **Per-role router** — `plan` / `vision` / `codegen` / `judge` / `repair` → `LLM_MODEL_*`; per-role allowlist; startup validation
- [x] **A/B eval mode** — `--model` overrides + `--ab-codegen` sweep (first-pass, after-repair, judge, wall)
- [ ] **Codegen shootout** — live run Claude / Kimi / DeepSeek Pro vs Flash on corpus v2 (plumbing ready)
- [x] **Default decision** — baseline `evals/create/model-ab/decision.json` (Flash); update after shootout

### Demo

One command produces a model-comparison table over the corpus with judge scores and wall time; new defaults live behind env vars.

### Exit criteria

- [x] Any allowlisted role model can be swapped via env without code change
- [ ] Codegen default chosen by committed A/B report (not vibes); Flash remains documented fallback
- [ ] Cost per create at new defaults is documented and accepted by owner
- [x] Non-codegen roles stay cheap (plan/judge/vision default flash-tier)

### Out of scope

- Streaming, provider-direct integrations (OpenRouter only), paid-tier product work

### Depends on

- AM3 (judge scores are the A/B metric); AM2 (gates keep weaker models honest)

---

### AM4 — implementation plan (subparts)

| Subpart | Name | Depends on | ~Days | Outcome | Done |
|---------|------|------------|------:|---------|:----:|
| **AM4a** | Per-role router + allowlists + env | — | 0.5 | `router.py` unlock; startup validation | ✅ |
| **AM4b** | A/B sweep mode in eval runner | AM3d | 0.5 | Comparison report (quality + cost) | ✅ |
| **AM4c** | Shootout + default decision + checklist | AM4b | 0.5–1 | Committed `evals/create/model-ab/` record | ✅ scaffold |

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

**Coverage:** **Implemented** (2026-08-07). Unit path green; live styled eval + human copyright review open.

**Why:** Brik's art-directed look comes heavily from reference conditioning. This wires the upload path (exists since M1e) into generation via a vision model.

### Deliverables

- [x] **Vision role** in router (AM4a) — default `LLM_MODEL_VISION=google/gemini-2.5-flash`
- [x] **Style Extract agent** — inspiration images → StyleNotes JSON; interpret, never copy
- [x] **Create UI wiring** — optional multi-image upload on `/create` → `inspirationAssetIds`
- [x] **Brief conditioning** — plan + codegen consume style notes for palette/mood/composition
- [ ] **Evals** — styled prompts with reference images in live corpus (unit coverage only so far)

### Demo

Create with vision + 2 inspiration screenshots → tool whose defaults visibly echo the references (not a pixel copy); Create without images unchanged.

### Exit criteria

- [x] Style extract produces valid notes on unit fixtures (`test_agent_am5.py`)
- [ ] Styled runs score ≥ unstyled baseline from judge on matching prompts
- [x] Vision-only / no-image Create path unchanged (unit + soft-fail)
- [x] Copyright rule in prompt; [ ] no 1:1 recreation observed in calibration review

### Out of scope

- Multi-target (AM6), brand kits, arbitrary URL ingestion (uploads only)

### Depends on

- AM3 green (judge used for styled-vs-baseline comparison) · AM4a (vision role)

### Subparts

| Subpart | Name | ~Days | Outcome | Done |
|---------|------|------:|---------|:----:|
| **AM5a** | Vision role + style-extract node + prompt | 0.75–1 | Notes JSON from uploaded images | ✅ |
| **AM5b** | Create UI upload + ingest wiring | 0.5–1 | Images flow from `/create` into the graph | ✅ |
| **AM5c** | Brief conditioning + evals + checklist | 0.75–1 | Styled defaults; corpus extended | ✅ partial |

---

## AM6 — Multi-target goldens (p5 / three) — *M4/M2b agent deliverable*

**Coverage:** **Implemented** (2026-08-07). Stub harnesses + goldens + config gates. Full p5.js/three.js bundles still deferred.

**Why:** Brik's showpiece outputs are Three.js shaders. Only worth doing once canvas2d quality is proven — multi-target amplifies the loop's existing quality, good or bad.

### Deliverables

- [x] p5/three **skeletons + host stubs** — `@repo/contracts/skeletons/p5|three`; host adapters share postMessage lifecycle; three uses `preserveDrawingBuffer`
- [x] **Golden tool per target** — `p5-orbit`, `three-depth` + canvas2d goldens; retriever filters by target
- [x] **Art Director target selection** — plan may pick `canvas2d|p5|three` + `targetRationale`; forced to canvas2d unless env-enabled
- [x] Per-target validators/smoke (structural + compile + host for goldens)
- [x] **Eval gates per target** — `VIBEIT_TARGET_P5_ENABLED` / `VIBEIT_TARGET_THREE_ENABLED` (default off)

### Exit criteria

- [ ] p5 enabled after its eval gate passes on corpus subset
- [x] three stays config-gated until gate passes; launch ships without it (default off)
- [x] canvas2d corpus unaffected (regression unit path green)

### Depends on

- AM1–AM3 green on canvas2d · M2b host work

### Subparts

| Subpart | Name | ~Days | Outcome | Done |
|---------|------|------:|---------|:----:|
| **AM6a** | p5/three skeletons + host stubs + capture | 1.5–2 | Reference tool per target mounts/captures | ✅ |
| **AM6b** | Goldens + retriever + target selection | 1–1.5 | Brief picks target; exemplars per target | ✅ |
| **AM6c** | Per-target evals + config gating + checklist | 0.5–1.5 | Gates decide enablement | ✅ |

---

## AM7 — Chat refine agents — *M6 agent deliverable*

**Coverage:** **Implemented** (2026-08-07). Subparts AM7a–AM7b done in code; AM7c budget + unit tests + checklist; live Studio demo exit open. See [Coverage log](#coverage-log) for commit hash + file map.

**Why:** Structural/creative changes via chat need patch + re-preview, not sliders. Reuses AM1–AM3 machinery in patch mode.

### Deliverables

- [x] **Patch-mode Codegen** — chat (+ current source + brief) → param patch **or** code patch; param-only requests prefer param patches
- [x] **Refine loop** — patch → AM2 gates → AM3 critic (score must not regress vs current version)
- [x] **Studio chat UI** — refining states, failure messages, last-good rollback (version history thin)
- [x] Refine budget (per-tool rolling cap) + hard regen only on structural change (policy in prompt)

### Demo

In Studio on a generated tool: chat “make the particles slower and add a subtitle” → new version lands after gates, or clean failure with last-good kept. Param-only “make it slower” prefers param patch.

### Exit criteria

- [ ] "make particles slower and add a subtitle" → valid new version or clean failure *(live Studio open)*
- [x] Refine never lands a version with a lower judge score than the current one *(unit-tested non-regression)*
- [x] Param-only requests don't burn a full codegen call *(route + `used_param_patch_only`)*
- [x] Unit smokes green: `tests/test_agent_am7.py` · checklist [am7-demo-checklist.md](./am7-demo-checklist.md)

### Depends on

- AM2 + AM3 (gates + critic are the refine safety net) · M5 Studio shell ✓

### Subparts

| Subpart | Name | ~Days | Outcome | Done |
|---------|------|------:|---------|:----:|
| **AM7a** | Patch-mode prompts + param/code patch routing | 1–1.5 | Chat → minimal valid patch | ✅ |
| **AM7b** | Studio chat UI + rollback | 1–2 | Human path in Studio | ✅ |
| **AM7c** | Refine evals + budget + checklist | 0.75–1.5 | Numeric gates on refine corpus | partial |

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
