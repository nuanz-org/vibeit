# Vibeit — frontend architecture

**Status:** Locked recommendation for `apps/web`  
**Date:** 2026-08-04  
**Stack:** Next.js (App Router) · React · monorepo `packages/ui` · FastAPI client  
**Related:**
- [backend-architecture.md](./backend-architecture.md)
- [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)
- [plan.md](./plan.md)
- [vibeit-milestones.md](./vibeit-milestones.md)

---

## Decision

Use a **modular feature architecture** on the **Next.js App Router**.

| Approach | Decision |
|----------|----------|
| Full clean / hexagonal frontend | **No** for MVP |
| Feature-Sliced Design (full FSD bureaucracy) | **No** for MVP |
| Everything in fat `app/**/page.tsx` files | **No** |
| Next as full BFF (reimplement API/agent) | **No** — FastAPI owns jobs, tools, agent |
| Next as thin BFF only for auth/cookies if needed | **Maybe**, once auth provider is chosen |
| **Modular features + thin routes + runtime subsystem** | **Yes** |

**Rationale:** Vibeit web is a product UI shell. Hard frontend work is **Studio**, **sandboxed multi-target runtime**, and **client export** (PNG + MediaRecorder) — not enterprise domain modeling. Feature folders ship faster and mirror the modular backend. Generation AI stays on the API (LangGraph), not in Next.

---

## Parallel to backend

Same modular spirit as [backend-architecture.md](./backend-architecture.md).

| Backend (`apps/api`) | Frontend (`apps/web`) |
|----------------------|------------------------|
| `api/v1/*.py` routers | `app/**/page.tsx` routes (thin) |
| `services/*` | feature hooks / screens / small action helpers |
| `agent/` | `runtime/` (iframe host, targets, capture) |
| `adapters/*` | `lib/api` (FastAPI client), `lib/auth` |
| Thin domain | Shared types / VibeTool contract types only |
| FastAPI `Depends()` DI | React props, hooks, context — no IoC container |

**Modular** = group by product area (auth, create, studio, gallery, export, jobs).  
**Layered** = route → feature UI/hooks → API client → FastAPI; plus a first-class runtime host.

---

## Product surfaces (owned by features)

| Surface | Auth | Notes |
|---------|------|--------|
| Landing | Public | Marketing / entry |
| Login | Public | Provider TBD |
| Create | Required | Vision text required; inspiration screenshots optional |
| Studio / Control | Owner | Params, assets, colors, chat refine, view source (no download) |
| Export / share / embed | Owner + public view | PNG + short client video; share URL; iframe snippet |
| Public tool `/t/:publicId` | Public | Interactive tool; no owner-only APIs; no source download |
| Embed | Public | Minimal chrome |
| Gallery | Public list/detail | Publish only after system gates |

Complete loop: **Auth → Create → Studio → Export/share/embed → Publish gallery**.

---

## Layer rules

```
app/ routes (URL, layout, guards)
  ↓  compose only
features/* (screens, feature components, hooks)
  ↓  product UI + orchestration
lib/api + lib/auth (HTTP / session)
  ↓
FastAPI (apps/api)

runtime/* (sandboxed tool host — parallel subsystem)
  ↔ Studio / public tool / embed / export capture
```

### Must

1. **Routes** stay thin: layout, metadata, auth redirect, compose feature screens.
2. **Features** own product UI and feature-local state; call `lib/api` for server data.
3. **Runtime** owns mount/update/dispose, target registry, sandbox, capture — not marketing chrome.
4. **API client** is the single place for base URL, auth headers, and error mapping to FastAPI.
5. **Generation / LangGraph / LLM** remain on the backend; Next only starts jobs and shows status.
6. **Public and embed** routes must not expose owner-only APIs or source download.

### Must not

- Fat `page.tsx` files with fetch + iframe + form + export mixed together.
- Call OpenRouter or run agent graphs from the browser.
- Load arbitrary npm / remote code into the tool sandbox.
- Dump product features into `packages/ui` (primitives only).
- Introduce Redux/Zustand “because architecture” before Studio state pain appears.
- Put secrets (API keys) in the Next client bundle.

---

## Target package layout

```text
apps/web/
  app/                             # App Router — routing + layouts only
    layout.tsx
    page.tsx                       # landing
    globals.css
    (auth)/
      login/page.tsx
    create/page.tsx
    studio/[toolId]/page.tsx
    gallery/
      page.tsx
      [publicId]/page.tsx         # or gallery detail shape as product decides
    t/[publicId]/page.tsx           # public interactive tool
    embed/[publicId]/page.tsx       # minimal iframe host page
    api/                           # only if needed (auth callbacks, rare BFF)

  features/                        # product modules
    auth/
      components/
      hooks/
      ...
    create/
      components/                  # vision form, screenshot upload
      hooks/
      ...
    jobs/
      hooks/                       # useJob poll (SSE later)
      components/                  # status UI
    studio/
      components/                  # params, assets, colors, chat, view source
      hooks/
      ...
    gallery/
      components/
      hooks/
    export/
      components/                  # PNG, video, share/embed copy UI
      hooks/

  runtime/                         # first-class subsystem (like agent/ on API)
    host/                          # sandboxed iframe host + postMessage bridge
    contract/                      # VibeTool types, message protocol
    targets/                       # canvas2d | p5 | three allowlisted loaders
    capture/                       # captureFrame + MediaRecorder helpers

  components/                      # shared app chrome only (shell, nav, providers)
  lib/
    api/                           # typed FastAPI client (jobs, tools, assets, gallery)
    auth/                          # session helpers once provider chosen
    config.ts                      # public env (API base URL, etc.)
  hooks/                           # cross-feature hooks only
  types/                           # shared FE types if not yet in a package

packages/
  ui/                              # dumb primitives (Button, Card, …)
  # optional later: shared contracts (VibeTool / job DTOs) if FE+BE need one source
```

### Feature ownership map

| Product area | Feature folder | Primary API |
|--------------|----------------|-------------|
| Login / session | `features/auth` | Auth provider + API session validation |
| Vision + screenshots | `features/create` | Uploads, `POST` create job |
| Job status | `features/jobs` | `GET` job status (poll; SSE later) |
| Params, assets, colors, chat, source | `features/studio` | Tools, assets, refine job |
| PNG / video / share / embed UI | `features/export` | Public URLs; capture is local |
| Gallery list/detail / publish entry | `features/gallery` | Publish + gallery endpoints |

Shared infrastructure (`lib/`, `runtime/`, `components/`) is imported by features — not a Nest global module.

---

## Runtime subsystem

The tool runtime is the frontend counterpart to the backend **agent** boundary: isolated, contract-driven, allowlisted.

### VibeTool contract (all targets)

```text
VibeTool {
  mount(el, { params, assets })
  update(params)
  setAssets?(assets)
  getParamSchema()
  getDefaultParams()
  getAssetSlots()
  getCaptureStream() | captureFrame()
  dispose()
}
```

### Target registry (closed set)

| Target | Role |
|--------|------|
| `canvas2d` | Kinetic type, 2D shapes, social frames |
| `p5` | Sketch-like motion, particles |
| `three` | 3D / camera / materials |

**Hard rules:**

- Agent selects **one** target per tool; host loads only that target’s allowlisted runtime.
- Forbidden in sandbox: arbitrary npm, remote code, parent `window` access, unrestricted fetch.
- Same Control UI and export path for all targets via the contract.
- Source is **view-only in Studio** — no download on public/embed.

### Capture / export (MVP)

| Output | Where |
|--------|--------|
| PNG | Client `captureFrame` from tool canvas/stream |
| Short video (3–6s) | Client **MediaRecorder** |
| Share | Public `/t/:publicId` |
| Embed | iframe → embed/public tool URL |

Server headless video is **out of scope** for v1 (see product consensus).

---

## Rendering model

| Surface | Preferred model |
|---------|-----------------|
| Landing, gallery list | Server Components OK; light client islands |
| Create | Client-heavy (form, uploads, job status) |
| Studio | Mostly **client** (live params, assets, chat, iframe host) |
| Public `/t/:id`, embed | Thin shell + `runtime` host; no owner mutations |
| Export video | **Client** MediaRecorder |

Default: **server for static/SEO surfaces; client for interactive Studio and runtime.**

---

## Data fetching & state

| Need | Approach |
|------|----------|
| Server data (tool, gallery) | RSC fetch and/or feature hooks via `lib/api` |
| Job progress | `features/jobs` hook — poll MVP; SSE optional later |
| Studio params / assets | Local React state; persist through API |
| Auth session | Provider SDK + thin `lib/auth` |
| Global client store (Zustand/Redux) | **Only if** Studio cross-tree state becomes painful |

### API client rules

- One module (`lib/api`) owns paths, credentials mode, and error normalization.
- Mirror backend resources: auth session, jobs, tools, assets, gallery/publish.
- Do not scatter raw `fetch(process.env...)` across features.

### Auth

- Login **required before Create** (route guard + API will 401 create endpoints).
- Public gallery + share/embed remain anonymous-readable.
- Provider **not chosen yet** (Clerk / Auth.js / Supabase / …) — isolate behind `lib/auth` and `features/auth`.

---

## Request flows (frontend view)

### Create

```text
Create screen
  → optional upload inspiration images (API / storage flow)
  → POST create job (vision text + asset refs)
  → features/jobs polls status
  → on succeeded: navigate to Studio with tool/version id
  → on failed: show error; never treat as ready tool
```

### Studio control

```text
Studio screen
  → load tool version + param schema + asset slots
  → runtime.host mounts tool in sandbox
  → param/color changes → tool.update
  → asset uploads → API + tool.setAssets
  → chat refine → POST refine job → poll → remount/update on new version
  → view source read-only (owner only)
```

### Export / publish

```text
Export UI → runtime.capture (PNG / MediaRecorder)
Share/embed → copy public URLs (no source)
Publish → API publish with gates; gallery lists only valid tools
```

---

## Monorepo boundaries

| Package / app | Role |
|---------------|------|
| `apps/web` | Product UI: routes, features, runtime, API client |
| `apps/docs` | Separate docs site — not product features |
| `apps/api` | Backend; source of truth for jobs, tools, agent |
| `packages/ui` | Shared **dumb** primitives only |
| Shared contracts package | Optional later for VibeTool / job DTO types |

Do **not** move Studio or runtime into `packages/ui`.

---

## Env & config

- Public Next env only for browser-safe values (e.g. `NEXT_PUBLIC_API_BASE_URL`).
- No OpenRouter keys, DB URLs, or storage secrets in the web app.
- Auth public keys (if any) stay in documented env templates; secrets stay server-side.

---

## Testing strategy (aligned to layers)

| Layer | What to test |
|-------|----------------|
| `runtime/contract` | Message protocol, schema assumptions |
| `runtime/host` | Mount/update/dispose with stub tools |
| `runtime/capture` | Frame/stream helpers where automatable |
| Feature hooks | Job polling, form validation, API error mapping (mocked `lib/api`) |
| Critical pages | Auth gate on Create; public page does not call owner APIs |

Prefer stub VibeTools over loading full p5/three in unit tests.

---

## Mapping to milestones

| Milestone | Frontend focus |
|-----------|----------------|
| **M0** | Folder skeleton, shared contract types, empty feature shells, env template |
| **M1** | Auth UI + route guards; upload UI wired to API |
| **M2** | `runtime` host + hand-authored tools for all 3 targets; minimal Studio shell |
| **M3** | Create UI + job status → open Studio on canvas2d success |
| **M4** | Inspiration screenshots in Create; multi-target ready tools in Studio |
| **M5** | Full Studio: schema params, assets, colors, view source |
| **M6** | Chat refine UI + refine job polling |
| **M7** | Export PNG/video, share URL, embed page/snippet |
| **M8** | Publish flow + gallery list/detail |
| **M9** | Polish, empty/error states, perf, browser export quirks |

---

## When to evolve

Move to heavier structure only if pain shows up:

- Studio state shared across many distant trees → consider a small store
- Duplicated DTO drift with API → shared contracts package
- Auth requires cookie BFF → limited `app/api` routes, still no agent in Next
- Multiple apps need the same runtime host → extract `packages/runtime` carefully

Until then, **do not** add layers “for purity.”

---

## Explicit non-goals (frontend structure)

- Micro-frontends for MVP  
- Full FSD / clean architecture folder ceremony  
- Running LangGraph or LLM calls in Next  
- Source download from Studio public paths  
- Server-side video farm UI as MVP requirement  
- Remix / multiplayer clients (deferred product)

---

## Summary

| Question | Answer |
|----------|--------|
| Architecture name | **Modular features + thin App Router** |
| Like backend? | **Yes — same modular idea** |
| Special subsystem | **`runtime/`** (sandbox, targets, capture) |
| Where is AI generation? | **FastAPI / LangGraph**, not Next |
| State default | **React local + API**; store only if needed |
| `packages/ui` | **Primitives only** |

This is the default frontend shape for Vibeit until a later ADR supersedes it.
