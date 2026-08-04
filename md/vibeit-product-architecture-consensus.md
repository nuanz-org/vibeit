# Vibeit — product & architecture consensus (frozen v1)

**Status:** **Consensus frozen — v1** (Fable 5 finalization after Kimi K3 + DeepSeek V4 Flash + Grok review)  
**North star:** Product like [brik.space](https://brik.space)  
**Date:** 2026-08-03 · **Frozen:** 2026-08-04  
**Revision:** Create = vision + optional inspiration screenshot(s); own assets after tool is ready; canvas2d-first complete loop; skeleton codegen; chat refine = fast-follow

---

## One-line product

**Vibeit** turns a creative vision (+ optional inspiration screenshots) into a **living, freeform-generated design tool** you can control, drop your own assets into, export (PNG + video), share/embed, and publish to a gallery — aimed at motion/brand designers, marketers, and indie creators.

---

## Locked decisions

| Area | Decision |
|------|----------|
| Personas | Motion/brand designers · Marketers · Indie creators/devs |
| First complete flow | Create from blank → Control → Export/share/embed → Publish gallery |
| Deferred | Browse-first discovery, remix lineage, multiplayer |
| **Create inputs** | **Vision text required**; **inspiration screenshot(s) optional** — *not* brand kit at create |
| **Own assets (Studio)** | **After tool is ready** — image slots (logo/media) + **color overrides** (MVP) |
| Generation | **Skeleton-template freeform codegen** — model fills creative logic inside per-target harness; structured plan JSON |
| Targets (v1) | Registry frozen day one (`canvas2d` / `p5` / `three`); **complete loop on `canvas2d` first**; `p5` next; **`three` config-gated until eval pass rate ≥ threshold** |
| Orchestration | **LangGraph** linear Create + Repair; Control refine = **fast-follow** (not launch blocker) |
| LLM | **DeepSeek V4 Flash default via OpenRouter**; model router abstraction |
| Vision model | **Committed:** style-extract on designated vision-capable model via router; Flash stays codegen — wired **before M4** |
| Auth | **Required before Create** (anonymous try = post-M8 growth experiment, not MVP) |
| Cost controls | **Live with Create:** per-user generation quota + per-job repair budget (tokens + wall-time) |
| Export | **PNG + short video** + share URL + iframe embed |
| Video method | **Client MediaRecorder → WebM (MVP)**; optional async ffmpeg → MP4 (fast-follow); **PNG-sequence fallback in export DoD** |
| Source | **View-only in Studio** — no download |
| Quality bar | Publish only if **valid and usable** (system gates: validate + sandbox smoke + export smoke) |
| Generation UX | **Streamed progress** (plan → codegen → validate → repair); on repair exhaustion, **salvage best-valid draft** |
| Asset/capture | **Frozen in M0:** CORS / `crossOrigin` / storage headers / per-target capture rules; **M2 exit requires capture with real uploaded asset** |

---

## Complete user flow (MVP)

```
[Auth required]
    ↓
Create from blank
  - describe vision (text brief) — required
  - optional inspiration screenshot(s)  ← style / mood / composition reference
    ↓
Agent (LangGraph, linear):
  ingest vision + images
  → style extract (vision model when images present)
  → plan (structured JSON: concept, motion, params, target)
  → skeleton codegen → validate → sandbox preview → repair ≤ N
  → on exhaustion: salvage best-valid draft (not hard dead-end)
    ↓
Studio / Control  (tool is ready)
  - schema-driven parameters + presets
  - attach / swap own images (logo, media)
  - color overrides
  - view source (read-only)
  - chat refine → patch + re-preview   ← fast-follow, not required for loop complete
    ↓
Export / share
  - PNG (frame capture)
  - short video (MediaRecorder WebM; PNG-sequence fallback; MP4 async later)
  - public share link
  - embed snippet
    ↓
Publish to gallery
  - title, description, tags, auto thumbnail
  - gate: preview + export smoke OK
```

### Create vs Control — input split

| Stage | User provides | System uses for |
|-------|---------------|-----------------|
| **Create** | Vision text (required) | Intent, motion concept, param list |
| **Create** | Inspiration screenshot(s) (optional) | Style, palette cues, layout, mood (reference only) |
| **Control (after ready)** | Own images | Logo / media bound to asset slots |
| **Control (after ready)** | Color overrides | Brand/personal colors over inspiration defaults |
| **Control** | Param tweaks (+ chat later) | Refine motion, copy, layout |

**Principle:** Generation is *vision-led* (optionally *inspiration-led*); personalization is *asset- and color-led* once the tool exists. Chat refine is delight, not loop-critical.

---

## Agentic AI — opinion (confirmed)

**Yes, workflow-agentic freeform** — not a single prompt dump, not unconstrained ReAct forever.

- **User feels:** creative director agent  
- **System is:** LangGraph with tools, validation, sandbox, capped repair loops  
- **Publish rule:** model proposes; runtime accepts only contract-compliant tools  
- **Graph shape:** linear Create with one repair edge; no sub-graphs in v1  

### LangGraph Create (nodes)

1. **Ingest** — vision text + inspiration image(s) (multimodal when images present)  
2. **Style extract** (when images present) — palette hints, motion energy, composition notes via **vision model** (not necessarily Flash)  
3. **Plan** — structured JSON: concept, aspect ratio, motion style, param list, **target runtime**  
4. **Codegen** into **per-target skeleton template** (defaults may use extracted palette; asset *slots* left for user fills)  
5. **Static validate** — contract, schema, safety; param schema includes asset slots where relevant  
6. **Sandbox preview** smoke test + frame grab  
7. **Repair** (loop ≤ N; budget = tokens + wall-time) on failure  
8. **Finalize** version → open Studio; on exhaustion → **salvage best-valid candidate** as draft  

### LangGraph Control refine (fast-follow)

User chat and/or new assets → patch code and/or params → validate → preview  

**LangGraph is a firm yes** for Create; Control refine reuses the same infrastructure when shipped.

### Inspiration images — product rules

- Screenshots are **optional** and used as **reference for style**, not necessarily embedded into the tool  
- Vision text alone is enough to create  
- Agent should **not** require the user to own the IP in the screenshot; generated tool is original interpretation  
- Optional later: “use this image as texture/background” is an **asset** action in Control, not Create  

---

## Multi-target freeform — how to keep it usable

### Shared contract (all targets must implement)

```
VibeTool {
  mount(el, { params, assets })
  update(params)
  setAssets?(assets)          // logo, images, etc. after tool is ready
  getParamSchema()            // drives Control UI
  getDefaultParams()
  getAssetSlots()             // e.g. logo, background, product — declared by tool
  getCaptureStream()          // or captureFrame() for PNG + MediaRecorder
  dispose()
}
```

**Note:** Prefer **params + assets** (no brand kit required at create/mount):

- Params: colors, speed, text, intensity (schema-driven)  
- Assets: user uploads bound to named slots after ready  

### Target registry (not “any JS”)

| Target | When agent picks it | Libraries allowed | Launch status |
|--------|---------------------|-------------------|---------------|
| `canvas2d` | Kinetic type, 2D shapes, social frames | Browser canvas only | **Required for complete loop** |
| `p5` | Sketch-like motion, particles, type | p5 from allowlisted CDN/bundle | After canvas2d + evals |
| `three` | 3D / camera / material wow | three from allowlisted bundle | **Config-gated until eval ≥ threshold** |

**Hard rules:**

- Agent **selects one target** in Plan (not mix arbitrarily)  
- Codegen uses **per-target skeleton + validator**  
- Forbidden: arbitrary npm, remote code, parent window access, unrestricted fetch  
- Sandbox loads only allowlisted runtime libs  
- Same Control UI and export path for all targets via contract  
- Tools should expose **asset slots** when the vision implies logo/image use  
- **Numeric eval gates** per target (first-pass % and after-repair % on fixed prompt set)  

### Opinion

Multi-target is viable **if** targets are a closed registry with one contract — not “generate any website.” Prefer shipping the registry with 3 slots, excellent repair, and honest gating over open-ended frameworks. Complete the product loop on one target before expanding.

---

## Models — DeepSeek V4 Flash + OpenRouter

| Policy | Detail |
|--------|--------|
| Default | DeepSeek V4 Flash via OpenRouter |
| Multimodal | Style-extract on a **designated vision-capable model** via router; Flash for plan/codegen |
| Abstraction | `LLMClient` / model id from config — swap without rewrites |
| Launch | Flash codegen + separate vision route committed before inspiration screenshots (M4) |
| Ops | Log tokens/cost per generation; timeouts; **max repair budget (tokens + time)**; **per-user quota from Create live** |

**Opinion:** Flash + OpenRouter is a solid default for cost/speed. Skeleton templates + structured plan + repair gates matter more than upgrading the model on day one. Keep a config slot for a stronger model when needed.

---

## Own assets (after tool is ready) — MVP scope

Not brand kit at create — **Studio personalization**:

| Capability | MVP? | Use |
|------------|------|-----|
| Image slots (logo, media) | **Yes** | Upload PNG/JPG into slots declared by `getAssetSlots()` |
| Color overrides | **Yes** | Override palette params (defaults may come from vision/inspiration) |
| Fonts / full brand kit object | Later | Optional after complete loop |

**UX:**

1. Tool generates with defaults (from vision; palette may follow screenshot if provided)  
2. User opens Assets / Colors → upload images, override colors  
3. `setAssets` + param updates refresh live preview without full regenerate  
4. Hard regen only if chat asks for structural change (when chat refine ships)  

**Capture / CORS (frozen):**

- Asset origin policy, object-storage CORS, `crossOrigin="anonymous"` on images  
- Per-target capture rules (`preserveDrawingBuffer` for WebGL, etc.)  
- Verified with **real uploaded assets** before claiming capture works  

**Optional later:** save a reusable Brand Kit from Studio state — not required for complete loop.

---

## Export / embed / share

| Output | MVP approach |
|--------|----------------|
| PNG | `captureFrame` from tool canvas |
| Short video | **Client MediaRecorder → WebM** (3–6s); **PNG-sequence fallback** if MediaRecorder fails |
| MP4 | Optional async server **ffmpeg** transcode (fast-follow, not full headless farm) |
| Share | `/t/:publicId` — interactive tool, auth not required to view |
| Embed | iframe to public tool URL |
| Source | Readable in Studio only; **no download** |

**Note:** Full server headless (Playwright + ffmpeg farm) remains a non-goal for v1. WebM is acceptable MVP video; MP4 is a bounded upgrade.

---

## Auth

- **Login required before Create** (and thus before owning tools)  
- Public gallery + share/embed pages are anonymous-readable  
- Publish updates existing owned tool version (prefer version history for rollback)  
- Anonymous Create deferred to post-M8 growth experiment (would need guest claiming + abuse controls)

---

## Stack (maps to current monorepo)

| Layer | Tech |
|-------|------|
| Web | Next.js `apps/web` — auth, Create (vision + optional screenshots), Studio (params + assets + colors), Gallery, `/t/:id`, embed |
| API | FastAPI `apps/api` — auth, uploads, generation jobs, tools, assets, publish, quotas |
| Agent | LangGraph in API (linear Create; multimodal style-extract when images present) |
| LLM | OpenRouter → DeepSeek V4 Flash (+ vision model for style-extract) |
| Runtime | Sandboxed iframe + target registry (canvas2d / p5 / three) |
| Storage | Postgres + object storage (inspiration images, user assets, exports, thumbs) |

---

## Explicit non-goals (v1 complete loop)

- Remix / fork graph  
- Source download / CLI export of project  
- Team workspaces  
- Brand kit required at Create  
- Arbitrary npm/framework codegen  
- Server-side video farm (async MP4 only as optional fast-follow)  
- Browse-first growth loops (can follow immediately after)  
- Chat refine as launch blocker  
- Anonymous Create for MVP  

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Multi-target break rate | Closed registry + skeleton templates + per-target prompts + repair ≤ N + numeric eval gates + publish gates |
| `three` quality drags launch | Config gate; launch with canvas2d (+ p5 if ready); registry/contract unchanged |
| Vision model gaps | Style-extract on dedicated vision model before M4; Flash stays codegen |
| Screenshot copied too literally | Prompt: interpret style, do not recreate copyrighted art 1:1 |
| User assets don’t fit tool | Codegen declares asset slots; empty slots use generated placeholders |
| Tainted canvas from user assets | CORS/`crossOrigin` frozen M0; M2 exit tests capture with real upload |
| Three.js export hard | Canvas-backed capture / preserveDrawingBuffer |
| Unsafe generated JS | iframe sandbox, CSP, allowlisted libs only |
| MediaRecorder inconsistency | Document browsers; PNG-sequence fallback in M7 DoD |
| WebM weak for social | Document as MVP; optional async MP4 fast-follow |
| Repair exhaustion dead-end | Salvage best-valid draft; stream progress |
| Cost blowout | Quotas + repair budgets live from Create (M3), not only M9 |

---

## Success criteria for “flow is complete”

A real user can:

1. Sign in  
2. Describe a vision (optionally add inspiration screenshot(s) once M4 lands)  
3. Get a live **canvas2d** tool that runs (multi-target expands as gates pass)  
4. In Studio: tweak params/presets, upload own images, override colors (chat-refine optional fast-follow)  
5. Export PNG + short video (WebM; PNG-sequence fallback)  
6. Copy share link + embed code  
7. Publish to gallery where others open and use the tool  

…with failed generations never appearing as published tools.

**Complete-loop milestones:** M0 → M1 → M2 → M3 → M5 → M7 → M8 (canvas2d).  
**Fast-follows:** M4 (multi-target + screenshots), M6 (chat refine). **M9** = production hardening.

---

## Owner defaults (silence = accept)

Set at build start; adjustable without reopening architecture:

| Decision | Default |
|----------|---------|
| Eval gate | ≥70% first-pass **or** ≥90% after-repair on ~10-prompt set per target |
| Quota | 10 creates / user / day |
| Repair | N = 3; ~60s wall-time per job; token budget from config |
| Launch targets | canvas2d-only public launch OK if `three` (or even `p5`) misses gate |
| Video at launch | WebM-only OK |
| Gallery publish | Auto on gate pass + takedown switch |

---

## Freeze history

| Date | Event |
|------|-------|
| 2026-08-03 | Brainstorm locked (Create inputs revised) |
| 2026-08-04 | 3-way review: Kimi K3 + DeepSeek V4 Flash + Grok |
| 2026-08-04 | **Claude Fable 5 (OpenCode) finalization → consensus frozen v1** |

No further consensus edits after freeze except via a logged revision entry.

---

## Suggested next (when leaving planning)

1. Freeze **VibeTool contract** (params + asset slots + capture/CORS) + param schema + skeleton templates + plan-JSON schema  
2. Freeze **LangGraph** node I/O and job API (incl. multimodal ingest, quota, repair budget)  
3. Thin **PRD** for Create / Studio / Export / Gallery  
4. Implementation plan (schema, auth, agent, sandbox, Studio UI)  
5. Build  

**Milestones:** see [vibeit-milestones.md](./vibeit-milestones.md).

No implementation until explicitly requested.
