# Vibeit — backend architecture

**Status:** Locked recommendation for `apps/api`  
**Date:** 2026-08-04  
**Stack:** FastAPI · LangGraph · Postgres · object storage · OpenRouter  
**Related:**
- [vibeit-product-architecture-consensus.md](./vibeit-product-architecture-consensus.md)
- [plan.md](./plan.md)
- [vibeit-milestones.md](./vibeit-milestones.md)

---

## Decision

Use a **modular layered** architecture for the FastAPI backend.

| Approach | Decision |
|----------|----------|
| Full onion / clean architecture | **No** for MVP |
| Full hexagonal (ports everywhere) | **No** as the whole structure |
| NestJS-style `@Module()` DI modules | **No** — FastAPI has no Nest runtime |
| **Modular layered + selective ports** | **Yes** |

**Rationale:** Vibeit is early (thin API today). Hard parts are jobs, LangGraph, LLM, and storage — not deep enterprise domain modeling. Modular layers ship faster; we still isolate swap-prone infra so OpenRouter, auth, and object storage can change without rewriting routers.

---

## What “modular” means (Nest mental model)

**Same spirit as Nest feature modules, not Nest itself.**

| NestJS | Vibeit FastAPI |
|--------|----------------|
| `@Module({ controllers, providers })` | Feature folder + imports |
| `Controller` | `router.py` (FastAPI `APIRouter`) |
| `Service` | `service.py` (use-case / orchestration) |
| `Repository` / provider | `repository.py` or adapter under `adapters/` |
| DI container | FastAPI `Depends()` + explicit wiring in `core/deps.py` |

Modular = **code is grouped by product area** (jobs, tools, auth, assets, gallery), not one mega `routes.py`.

Layered = **inside each area, roles are separated**: HTTP → service → adapters.

---

## Layer rules

```
HTTP (api routers)
  ↓  auth, validation, status codes only
Services / use-cases
  ↓  product flows (“start create job”, “publish if gates pass”)
Domain (thin)
  ↓  enums, invariants, pure helpers
Adapters (infra)
  → Postgres, object storage, LLM, auth provider
```

### Must

1. **Routers** parse input, enforce auth, map errors to HTTP — call services only.
2. **Services** own business orchestration; no raw SQL/S3/OpenRouter in routers.
3. **LangGraph** lives under `agent/` as an application subsystem, not inline in route handlers.
4. **Adapters** implement I/O. Services depend on small protocols/interfaces for LLM, storage, auth, and DB access where useful.
5. **Domain stays thin** until real invariants appear (e.g. failed generation must never be `ready` / published).

### Must not

- Fat routers with DB + LLM + graph code mixed in.
- Four–five empty layers per CRUD feature before product feedback.
- Ports/interfaces for every internal helper (only for real boundaries).
- Running the full Create agent graph synchronously inside the HTTP request if a job + worker path is available.

---

## Selective hexagonal (ports only where they pay)

Define protocols (or thin abstract interfaces) for things that **will change or are shared**:

| Port | Why |
|------|-----|
| **LLM client / model router** | OpenRouter + DeepSeek V4 Flash; optional vision model; stronger model slot later |
| **Object storage** | Inspiration images, studio assets, thumbs, exports |
| **Auth session validation** | Provider not chosen yet (Clerk / Auth.js / Supabase / …) |
| **DB session / repositories** | Postgres; keep queries out of routers and graphs |

Do **not** invent ports for pure helpers, prompt string builders, or one-off validators unless a second implementation appears.

---

## Target package layout

Root package lives under `apps/api/src/` (adjust package name if/when `src` is made an installable package).

```text
apps/api/src/
  main.py                      # app factory, middleware, include routers
  core/
    config.py                  # pydantic-settings (env)
    deps.py                    # FastAPI Depends wiring
    security.py                # session / JWT validation helpers
    errors.py                  # domain/app errors → HTTP mapping
  api/
    v1/
      router.py                # aggregates v1 routers
      health.py
      auth.py
      tools.py
      jobs.py
      assets.py
      gallery.py
  schemas/                     # Pydantic request/response (API contracts)
    jobs.py
    tools.py
    assets.py
    gallery.py
    common.py
  services/                    # use-cases / orchestration (not HTTP)
    create_job.py
    refine_job.py
    publish_tool.py
    upload_asset.py
    get_tool.py
  agent/                       # LangGraph (application layer)
    graphs/
      create.py                # ingest → plan → codegen → validate → sandbox → repair → finalize
      control_refine.py
    nodes/
    prompts/
    validators/                # contract / per-target static checks
  domain/                      # thin pure rules
    job_status.py
    tool_contract.py           # server-side rules around VibeTool versions
    publish_gates.py
  adapters/
    db/
      session.py
      models.py                # SQLAlchemy / SQLModel
      repositories/
        users.py
        tools.py
        jobs.py
        assets.py
    storage/
      protocol.py              # upload / signed URL / delete
      s3.py                    # or local filesystem for dev
    llm/
      protocol.py
      openrouter.py
      router.py                # model id routing (codegen vs vision)
    auth/
      protocol.py
      provider.py              # concrete provider when chosen
  workers/                     # background generation (optional early, preferred for long jobs)
    generation.py
```

### Feature ownership (modular map)

| Feature area | HTTP | Service | Notes |
|--------------|------|---------|--------|
| Health | `api/v1/health.py` | — | Liveness only |
| Auth | `api/v1/auth.py` | (thin) | Validate sessions; provider in adapters |
| Jobs / Create / Refine | `api/v1/jobs.py` | `create_job`, `refine_job` | Enqueue; agent runs in service/worker |
| Tools / versions | `api/v1/tools.py` | `get_tool`, version finalize | Owned tools + Studio state |
| Assets / uploads | `api/v1/assets.py` | `upload_asset` | Inspiration + studio slots |
| Gallery / publish | `api/v1/gallery.py` | `publish_tool` | Gates before public |

Shared infrastructure (`adapters/`, `core/`, `agent/`) is not a Nest “global module” — it is imported where services need it via `deps.py`.

---

## Request flow (happy paths)

### Authenticated Create job

```text
POST /api/v1/jobs (vision text, optional image refs)
  → router: auth + validate body
  → services.create_job: persist job=queued, store inspiration refs
  → worker/service: agent.graphs.create.run(...)
  → on success: tool version ready; job=succeeded
  → on failure: job=failed; never mark tool ready/publishable
  → client polls GET /api/v1/jobs/{id} (or SSE later)
```

### Publish

```text
POST /api/v1/tools/{id}/publish
  → router: auth + ownership
  → services.publish_tool: domain.publish_gates
  → if OK: mark public + gallery fields
  → if not: 4xx with clear gate failures
```

### Public share (no owner APIs)

```text
GET public tool by publicId (web may proxy or call a public API)
  → no source download
  → no owner-only draft/params mutation
```

---

## Agent placement

LangGraph is a **firm product choice** (Create + Control refine). Treat it as:

- **Application orchestration**, not transport.
- Invoked from **services** or **workers**, never as business logic inside router functions.
- Input/output shapes frozen in M0 (job API + node I/O) — see plan/milestones.

Suggested node pipeline (Create) stays as in product consensus:

1. Ingest  
2. Style extract (optional, when screenshots present)  
3. Plan (incl. target runtime)  
4. Codegen  
5. Static validate  
6. Sandbox preview smoke  
7. Repair loop ≤ N  
8. Finalize version  

---

## Async jobs

Long Create/Refine runs should not block HTTP.

| Pattern | Use |
|---------|-----|
| Job row + status API | MVP default (poll) |
| SSE / websocket status | Optional later |
| In-process background task | Dev / early M3 only if careful |
| Dedicated worker process | Preferred once jobs are real |

Status machine (minimal):

```text
queued → running → succeeded | failed
```

Invariant: **`failed` generations never become `ready` or published tools.**

---

## Config & secrets

- All env via `core/config.py` (pydantic-settings).
- Never hardcode OpenRouter keys, DB URLs, or storage credentials.
- Model ids and repair budgets are config, not scattered literals.

Suggested config groups (names illustrative):

- `DATABASE_URL`
- `STORAGE_*`
- `OPENROUTER_API_KEY`, `LLM_DEFAULT_MODEL`, `LLM_VISION_MODEL`
- `AUTH_*` (once provider chosen)
- `AGENT_MAX_REPAIR`, `AGENT_TIMEOUT_S`

---

## Testing strategy (aligned to layers)

| Layer | What to test |
|-------|----------------|
| Domain | Pure gates/status transitions |
| Services | Use-cases with fakes for LLM/storage/DB |
| Agent nodes | Validators and prompt contract fixtures; graph with mocked LLM |
| Adapters | Optional integration tests against real/local infra |
| API | HTTP tests: auth, status codes, job shapes |

Prefer fakes at ports over mocking every SQLAlchemy session in unit tests.

---

## Mapping to milestones

| Milestone | Architecture focus |
|-----------|-------------------|
| **M0** | Folder skeleton, job API schemas, agent I/O shapes, config template |
| **M1** | `adapters/db`, `adapters/storage`, `adapters/auth`, tools/jobs models |
| **M2** | Mostly web runtime; API may only serve static/reference tool metadata if needed |
| **M3** | `agent/graphs/create`, `services/create_job`, LLM adapter, job worker path |
| **M4** | Multi-target validators/prompts, vision route in LLM router |
| **M5** | Tools/assets services for params + slots persistence |
| **M6** | `agent/graphs/control_refine`, refine job service |
| **M7** | Public read paths; no source download endpoints |
| **M8** | `publish_tool` + gallery + gates |
| **M9** | Rate limits, cost logs, observability around adapters/workers |

---

## When to evolve toward heavier hexagonal / onion

Only if pain shows up:

- Multiple production LLM or storage backends at once  
- Same use-cases invoked from API + worker + CLI with divergent copies  
- Domain rules grow past job state machine + publish gates  
- Team thrash from missing boundaries  

Until then, **do not** add layers “for purity.”

---

## Explicit non-goals (backend structure)

- Microservices split for MVP  
- NestJS or another DI framework required on day one  
- Full DDD aggregate modeling for every table  
- Generating arbitrary server-side user code outside the sandboxed tool contract  
- Server video farm in v1 (export is client MediaRecorder per product consensus)

---

## Summary

| Question | Answer |
|----------|--------|
| Architecture name | **Modular layered** |
| Nest-like? | **Feature modules as folders**, not Nest DI |
| Onion / full hex? | **No** for MVP |
| Ports? | **LLM, storage, auth, DB** only |
| Agent? | **`agent/` under application layer** |
| HTTP? | **Thin routers → services → adapters** |

This is the default backend shape for Vibeit until a later ADR supersedes it.
