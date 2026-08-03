# Vibeit — product & architecture consensus (brainstorm)

**Status:** Brainstorm locked (revised Create inputs) — ready for detailed PRD / implementation planning when you say build  
**North star:** Product like [brik.space](https://brik.space)  
**Date:** 2026-08-03  
**Revision:** Create = vision + optional inspiration screenshot(s); own assets after tool is ready (not brand kit at create)

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
| Generation | **Freeform agent codegen** (multi-target) |
| Targets (v1) | **Multi-target from day one** — Canvas 2D, p5.js, Three.js (agent chooses) |
| Orchestration | **LangGraph** Create + Repair (+ Control refine) |
| LLM | **DeepSeek V4 Flash default via OpenRouter**; model router abstraction |
| Auth | **Required before Create** |
| Export | **PNG + short video** + share URL + iframe embed |
| Video method | **Client MediaRecorder** on canvas/stream (MVP) |
| Source | **View-only in Studio** — no download |
| Quality bar | Publish only if **valid and usable** (system gates) |

---

## Complete user flow (MVP)

```
[Auth required]
    ↓
Create from blank
  - describe vision (text brief) — required
  - optional inspiration screenshot(s)  ← style / mood / composition reference
    ↓
Agent (LangGraph):
  ingest vision + images
  → plan (concept, motion, params, target runtime)
  → codegen → validate → sandbox preview → repair loop
    ↓
Studio / Control  (tool is ready)
  - schema-driven parameters + presets
  - attach / swap own images (logo, media)
  - color overrides
  - chat refine → patch + re-preview
  - view source (read-only)
    ↓
Export / share
  - PNG (frame capture)
  - short video (MediaRecorder)
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
| **Control** | Param tweaks + chat | Refine motion, copy, layout |

**Principle:** Generation is *vision-led* (optionally *inspiration-led*); personalization is *asset- and color-led* once the tool exists.

---

## Agentic AI — opinion (confirmed)

**Yes, workflow-agentic freeform** — not a single prompt dump, not unconstrained ReAct forever.

- **User feels:** creative director agent  
- **System is:** LangGraph with tools, validation, sandbox, capped repair loops  
- **Publish rule:** model proposes; runtime accepts only contract-compliant tools  

### LangGraph Create (nodes)

1. **Ingest** — vision text + inspiration image(s) (multimodal when images present)  
2. **Style extract** (optional structured step) — palette hints, motion energy, composition notes from screenshots  
3. **Plan** — concept, aspect ratio, motion style, param list, **target runtime**  
4. **Codegen** for chosen target (defaults may use extracted palette; asset *slots* left for user fills)  
5. **Static validate** — contract, schema, safety; param schema includes asset slots where relevant  
6. **Sandbox preview** smoke test + frame grab  
7. **Repair** (loop ≤ N) on failure  
8. **Finalize** version → open Studio  

### LangGraph Control refine

User chat and/or new assets → patch code and/or params → validate → preview  

**LangGraph is a firm yes** for this path.

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

| Target | When agent picks it | Libraries allowed |
|--------|---------------------|-------------------|
| `canvas2d` | Kinetic type, 2D shapes, social frames | Browser canvas only |
| `p5` | Sketch-like motion, particles, type | p5 from allowlisted CDN/bundle |
| `three` | 3D / camera / material wow | three from allowlisted bundle |

**Hard rules:**

- Agent **selects one target** in Plan (not mix arbitrarily)  
- Codegen prompt + validator are **per-target**  
- Forbidden: arbitrary npm, remote code, parent window access, unrestricted fetch  
- Sandbox loads only allowlisted runtime libs  
- Same Control UI and export path for all targets via contract  
- Tools should expose **asset slots** when the vision implies logo/image use (so Control can inject user assets without regen)  

### Opinion

Multi-target is viable **if** targets are a closed registry with one contract — not “generate any website.” Without that, gallery quality will collapse. Prefer shipping the registry with 3 targets and excellent repair over open-ended frameworks.

---

## Models — DeepSeek V4 Flash + OpenRouter

| Policy | Detail |
|--------|--------|
| Default | DeepSeek V4 Flash via OpenRouter |
| Multimodal | Optional screenshots need **vision** when provided — confirm Flash vision support on OpenRouter; if not, route image→style step to a vision-capable model, keep Flash for codegen |
| Abstraction | `LLMClient` / model id from config — swap without rewrites |
| Launch | Flash-only OK if vision works when needed; else small vision model + Flash codegen |
| Ops | Log tokens/cost per generation; timeouts; max repair budget |

**Opinion:** Flash + OpenRouter is a solid default for cost/speed. Freeform multi-target will stress quality — repair loops + contract matter more than upgrading the model on day one. Keep a config slot for a stronger model when needed. Keep model router so image understanding and codegen can use different models if needed.

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
4. Hard regen only if chat asks for structural change  

**Optional later:** save a reusable Brand Kit from Studio state — not required for complete loop.

---

## Export / embed / share

| Output | MVP approach |
|--------|----------------|
| PNG | `captureFrame` from tool canvas |
| Short video | **Client MediaRecorder** on canvas/capture stream (3–6s) |
| Share | `/t/:publicId` — interactive tool, auth not required to view |
| Embed | iframe to public tool URL |
| Source | Readable in Studio only; **no download** |

**Note:** MediaRecorder quality varies by browser; acceptable for loop-complete MVP. Server headless (Playwright + ffmpeg) is a later upgrade for consistent MP4s.

---

## Auth

- **Login required before Create** (and thus before owning tools)  
- Public gallery + share/embed pages are anonymous-readable  
- Publish updates existing owned tool version  

---

## Stack (maps to current monorepo)

| Layer | Tech |
|-------|------|
| Web | Next.js `apps/web` — auth, Create (vision + optional screenshots), Studio (params + assets + colors), Gallery, `/t/:id`, embed |
| API | FastAPI `apps/api` — auth, uploads, generation jobs, tools, assets, publish |
| Agent | LangGraph in API (multimodal ingest when images present) |
| LLM | OpenRouter → DeepSeek V4 Flash (+ vision route if needed) |
| Runtime | Sandboxed iframe + target registry (canvas2d / p5 / three) |
| Storage | Postgres + object storage (inspiration images, user assets, exports, thumbs) |

---

## Explicit non-goals (v1 complete loop)

- Remix / fork graph  
- Source download / CLI export of project  
- Team workspaces  
- Brand kit required at Create  
- Arbitrary npm/framework codegen  
- Server-side video farm  
- Browse-first growth loops (can follow immediately after)  

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Multi-target break rate | Closed registry + per-target prompts + repair ≤ N + publish gates |
| Vision model gaps | Style-extract step; fallback vision model via OpenRouter |
| Screenshot copied too literally | Prompt: interpret style, do not recreate copyrighted art 1:1 |
| User assets don’t fit tool | Codegen declares asset slots; empty slots use generated placeholders |
| Three.js export hard | Canvas-backed capture / preserveDrawingBuffer |
| Unsafe generated JS | iframe sandbox, CSP, allowlisted libs only |
| MediaRecorder inconsistency | Document browsers; PNG sequence fallback |

---

## Success criteria for “flow is complete”

A real user can:

1. Sign in  
2. Describe a vision (optionally add inspiration screenshot(s))  
3. Get a live multi-target tool that runs  
4. In Studio: tweak params/presets, upload own images, override colors, chat-refine  
5. Export PNG + short video  
6. Copy share link + embed code  
7. Publish to gallery where others open and use the tool  

…with failed generations never appearing as published tools.

---

## Suggested next (when leaving pure brainstorm)

1. Freeze **VibeTool contract** (params + asset slots) + param schema conventions  
2. Freeze **LangGraph** node I/O and job API (incl. multimodal ingest)  
3. Thin **PRD** for Create / Studio / Export / Gallery  
4. Implementation plan (schema, auth, agent, sandbox, Studio UI)  
5. Build  

**Milestones:** see [vibeit-milestones.md](./vibeit-milestones.md) (M0–M9; complete loop = M0–M8).

No implementation until explicitly requested.
