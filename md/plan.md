# Vibeit — implementation plan

**Status:** Planning  
**Date:** 2026-08-04  
**Sources:**
- [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)
- [vibeit-milestones.md](./vibeit-milestones.md) (detail + exit criteria)

**North star:** Product like [brik.space](https://brik.space)  
**MVP goal:** Auth → Create → Studio → Export/share/embed → Publish gallery  

---

## Product (one line)

**Vibeit** turns a creative vision (+ optional inspiration screenshots) into a living, freeform-generated design tool you can control, drop own assets into, export (PNG + video), share/embed, and publish to a gallery.

---

## Stack (FE + BE)

| Layer | Tech |
|-------|------|
| Web (FE) | Next.js `apps/web` |
| API (BE) | FastAPI `apps/api` |
| Agent | LangGraph in API |
| LLM | OpenRouter → DeepSeek V4 Flash (+ vision route if needed) |
| Runtime | Sandboxed iframe + target registry (`canvas2d` / `p5` / `three`) |
| Storage | Postgres + object storage |

Milestones below cover **full stack** (frontend + backend + agent + storage), not FE-only or BE-only.

---

## Locked product rules (summary)

- **Create:** vision text required; inspiration screenshot(s) optional — not brand kit at create
- **Studio (after ready):** image asset slots + color overrides; schema-driven params; chat refine; view source (no download)
- **Generation:** freeform multi-target agent codegen (agent picks one target)
- **Auth:** required before Create (provider **not chosen yet**)
- **Export:** PNG + short client MediaRecorder video + share URL + iframe embed
- **Publish:** gallery only if valid/usable (system gates)
- **Deferred:** remix, multiplayer, browse-first discovery, server video farm, source download

---

## Milestones

```
M0  Contracts & platform skeleton
 ↓
M1  Auth + data model + uploads
 ↓
M2  Runtime host + hand-authored tools (all 3 targets stubbed)
 ↓
M3  Create agent (vision text → canvas2d tool)
 ↓
M4  Multi-target codegen + inspiration screenshots
 ↓
M5  Studio Control (params, assets, colors, view source)
 ↓
M6  Chat refine (Control LangGraph)
 ↓
M7  Export · share · embed
 ↓
M8  Publish + gallery + quality gates
 ↓
M9  Hardening, ops, launch polish
```

**Complete-loop MVP = M0–M8.**  
**M9** = launch readiness after the flow works in dev.

---

### M0 — Contracts & platform skeleton

Freeze shared contracts before building product UI or agent quality.

- VibeTool contract (`mount`, `update`, `setAssets`, schemas, capture, `dispose`)
- Param schema conventions + target registry (`canvas2d` | `p5` | `three`)
- LangGraph node I/O + job API shapes
- Monorepo env template / package layout

**Exit:** Contract + job API treated as source of truth.

---

### M1 — Auth + data model + uploads

Platform for owned tools and files.

- Auth on web + session validation on API (provider TBD)
- Login required before Create
- Postgres: users, tools, versions, jobs, assets
- Object storage + upload APIs (inspiration + studio assets)

**Exit:** Unauthenticated users cannot Create; upload round-trips work.

---

### M2 — Runtime host + hand-authored tools

Prove sandbox and contract **without** LLM.

- Sandboxed iframe host + allowlisted libs
- Reference tools for all three targets
- Minimal Studio shell: params / assets / capture smoke

**Exit:** All three targets mount, update, capture frame, dispose safely.

---

### M3 — Create agent (vision text → canvas2d)

First AI path (single target).

- LLM client / model router (DeepSeek V4 Flash via OpenRouter)
- LangGraph Create: ingest → plan → codegen → validate → sandbox → repair ≤ N → finalize
- Create UI + job status
- Token/cost logging

**Exit:** Sign in → describe vision → live canvas2d tool in Studio; failures never marked ready.

---

### M4 — Multi-target codegen + inspiration screenshots

Full Create per consensus.

- Agent selects one target (`canvas2d` | `p5` | `three`)
- Optional inspiration image upload + style extract (vision model if needed)
- Per-target prompts/validators; asset slots left for Studio

**Exit:** All three targets generatable; text-only Create still works.

---

### M5 — Studio Control

Personalization after tool is ready (no full regen).

- Schema-driven params + presets
- Image slots + color overrides → live preview
- View source read-only (no download)
- Persist draft params/assets

**Exit:** Colors + logo/media update live and survive reload.

---

### M6 — Chat refine

Structural/creative changes via agent.

- LangGraph Control refine: chat → patch code/params → validate → preview
- Budget caps + last-good rollback

**Exit:** Chat refine yields valid new version or clean failure.

---

### M7 — Export · share · embed

Outputs and public interactive access.

- PNG (`captureFrame`)
- Short video (client MediaRecorder, 3–6s)
- Public `/t/:publicId` (auth not required to view)
- Embed iframe snippet + share URL copy

**Exit:** PNG/video from Studio; public link + embed work without leaking owner-only APIs.

---

### M8 — Publish + gallery + quality gates

Complete consensus success path.

- Publish: title, description, tags, auto thumbnail
- Gates: preview + export smoke OK
- Gallery list/detail → open public tool
- Failed gens never published

**Exit:** Full real-user dry-run of the complete loop.

---

### M9 — Hardening & launch polish

Post complete-loop production readiness.

- Rate limits, cost budgets, observability
- Sandbox/security review, Three.js capture reliability
- Prompt/repair tuning, stronger model config slot
- Deploy runbook

**Exit:** Closed beta without manual DB surgery.

---

## Definition of “MVP done”

A real user can:

1. Sign in  
2. Describe a vision (optionally add inspiration screenshots)  
3. Get a live multi-target tool that runs  
4. In Studio: tweak params, upload own images, override colors, chat-refine  
5. Export PNG + short video  
6. Copy share link + embed code  
7. Publish to gallery where others open and use the tool  

…with failed generations never appearing as published tools.

That is **M8 exit**. Detail for each milestone lives in [vibeit-milestones.md](./vibeit-milestones.md).

---

## Open decisions

| Area | Status |
|------|--------|
| Auth provider (Clerk / Auth.js / Supabase / …) | **Not chosen** — pick before or during M1 |
| OpenRouter vision model fallback | Confirm when implementing M4 |
| Stronger model slot | Config-only until quality needs it |

---

## Next action

1. Lock this plan + milestones if the sequencing looks right.  
2. Choose auth provider.  
3. Start **M0** only when build is explicitly requested.
