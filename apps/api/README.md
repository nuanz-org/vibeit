# Vibeit API (`apps/api`)

FastAPI backend for Create jobs, tools, assets, and (later) the LangGraph agent.

## Run

```bash
# from repo root
pnpm --filter @repo/api dev
# or
cd apps/api && uv run fastapi dev src/main.py --port 8000
```

Requires Postgres when using auth-protected routes (`DATABASE_URL`, default `postgresql://vibeit:vibeit@localhost:5432/vibeit`).

## Database setup

1. Start Postgres: `docker compose up -d` (repo root).
2. Apply **Better Auth** tables first (web owns auth schema):

```bash
cd apps/web && pnpm auth:migrate
```

3. Apply **product** tables (M1b):

```bash
# from repo root
pnpm --filter @repo/api db:migrate
# or
cd apps/api && uv run python scripts/migrate.py
```

Migrations are versioned SQL under `migrations/` (`001_product_tables.sql`, …), tracked in `schema_migrations`.  
Product FKs use Better Auth `"user".id` (**text**) — there is **no** second users table.

| Table | Purpose |
|-------|---------|
| `tools` | Owned tools; `draft` / `published` + gallery columns |
| `tool_versions` | Code, param schema, asset slots, plan |
| `generation_jobs` | Create job status machine (M0e) |
| `assets` | Inspiration / studio uploads (`export`/`thumb` reserved) |

Schema smoke:

```bash
cd apps/api && uv run python tests/test_schema_m1b.py
```

## Object storage (M1d)

Local filesystem by default — **no S3/R2 required** for the core loop.

| Env | Default | Notes |
|-----|---------|--------|
| `STORAGE_BACKEND` | `local` | Only `local` implemented; `s3`/`r2` reserved |
| `STORAGE_LOCAL_ROOT` | `apps/api/.data/uploads` | Gitignored |
| `API_PUBLIC_BASE_URL` | `http://localhost:8000` | Used in `get_url()` |
| `STORAGE_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Asset GET (anonymous) |

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `GET`/`HEAD` | `/api/v1/storage/objects/{key}` | None | Serve by storage key + CORS |
| `GET` | `/api/v1/assets/raw/{asset_id}` | None | Serve via DB `storage_key` + CORS |

Protocol: `adapters/storage/protocol.py` · local impl: `adapters/storage/local.py`.

Key layout: `{kind}/{user_id}/{asset_id}/{filename}` (e.g. `inspiration/u1/uuid/logo.png`).

```bash
cd apps/api && uv run python tests/test_storage_m1d.py
```

## Upload API (M1e)

Authenticated multipart upload (session cookie required):

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `POST` | `/api/v1/assets` | session | Form: `kind` (`inspiration`\|`studio`) + `file` |
| `GET` | `/api/v1/assets/{id}` | session (owner) | Metadata + URL |
| `DELETE` | `/api/v1/assets/{id}` | session (owner) | Storage + DB row |
| `GET` | `/api/v1/assets/raw/{id}` | none | Image bytes + CORS (canvas) |

Allowlist: `image/png`, `image/jpeg`, `image/webp` · max **10 MB**.

Service: `services/upload_asset.py` · response camelCase via `schemas/assets.py`.

```bash
cd apps/api && uv run python tests/test_upload_m1e.py
```

Web Create page includes an upload proof control (`credentials: "include"`).

## LLM / OpenRouter (M3b)

Create agent calls OpenRouter from the **API only** (never from Next).

### Env loading

`core/config.py` loads dotenv on import (via `python-dotenv`):

1. **Repo root** `.env` (preferred for monorepo secrets)
2. **`apps/api/.env`** (optional local override)

Shell / process env vars still win (`override=False`). See root `.env.example`.

| Env | Default | Notes |
|-----|---------|--------|
| `OPENROUTER_API_KEY` | _(empty)_ | **Required** for Create graph (M3c+) |
| `LLM_DEFAULT_MODEL` | `deepseek/deepseek-v4-flash` | ASAP **only** allowed model |
| `LLM_CODEGEN_MODEL` | same as default | Forced to Flash on ASAP path |
| `LLM_TIMEOUT_SECONDS` | `60` | Per completion |
| `LLM_HTTP_REFERER` | `http://localhost:3000` | Optional OpenRouter header |
| `LLM_APP_TITLE` | `Vibeit` | Optional OpenRouter `X-Title` |

| Path | Role |
|------|------|
| `adapters/llm/protocol.py` | `LLMClient` port + usage types |
| `adapters/llm/openrouter.py` | HTTP adapter |
| `adapters/llm/router.py` | Role → model (all → Flash) |
| `core/deps.py` → `get_llm_client` | FastAPI Depends |

```bash
# set OPENROUTER_API_KEY in repo root .env, then:
cd apps/api && uv run python tests/test_llm_m3b.py
```

## Create agent scaffold (M3c)

LangGraph Create pipeline:

```text
# Fixture (M3c, no LLM)
ingest → plan(noop) → load_fixture → validate → smoke → END

# Live (M3d, deepseek/deepseek-v4-flash)
ingest → plan(LLM) → codegen(LLM) → validate → smoke → END
```

| Path | Role |
|------|------|
| `agent/graphs/create.py` | Compiled `StateGraph` + `run_create_llm_pipeline` |
| `agent/nodes/plan.py` · `codegen.py` | OpenRouter via `LLMClient` |
| `agent/validators/` | Static hard rules + **AM2 real gates** (compile + host smoke) |
| `agent/fixtures.py` | Loads monorepo social-frame `tool.ts` |

```bash
cd apps/api && uv run python tests/test_agent_m3c.py
cd apps/api && uv run python tests/test_agent_m3d.py
cd apps/api && uv run python tests/test_agent_am2.py   # needs: uv run playwright install chromium
```

Smoke pipeline (AM2): **structural → esbuild compile → param coverage → Playwright host** (runtime-frame). Screenshots land in `apps/api/.data/smoke/`. Fail closed if Node/esbuild/Playwright/Chromium missing.

After gates pass, **AM3 critic** scores craft (advisory by default). Set `VIBEIT_CRITIC_ENFORCED=1` only after calibration (`evals/create/calibration/`).

Setup once:

```bash
cd apps/api && uv sync && uv run playwright install chromium
pnpm --filter web build:runtime-frame   # public/runtime-frame.js
```

## Create worker + repair (M3e)

After `POST /api/v1/jobs`, if `OPENROUTER_API_KEY` is set and `CREATE_WORKER_ENABLED` is not false, a **background task** runs:

```text
running → plan → codegen → validate ⇄ repair (≤ N) → smoke (compile+host) → finalize
```

| Env | Default | Notes |
|-----|---------|--------|
| `CREATE_REPAIR_MAX` | `3` | Repair attempts |
| `CREATE_WALL_TIME_SECONDS` | `120` | Job wall clock (AM2 host smoke needs headroom) |
| `VIBEIT_HOST_SMOKE_TIMEOUT_SECONDS` | `45` | Per host-smoke attempt |
| `VIBEIT_SMOKE_MIN_VARIANCE` | `5` | Blank-canvas luminance variance floor |
| `CREATE_WORKER_ENABLED` | `true` | Set `false` to only enqueue |

| Outcome | Job status | Tool |
|---------|------------|------|
| Smoke pass | `succeeded` | draft + `tool_versions` row |
| Exhausted | `failed` | optional salvage version on same draft tool |

```bash
cd apps/api && uv run python scripts/migrate.py   # includes 002_job_phase
cd apps/api && uv run python tests/test_create_m3e.py
```

## Create quota (M3f)

| Env | Default | Notes |
|-----|---------|--------|
| `CREATE_QUOTA_PER_DAY` | `10` | Accepted enqueues / user / UTC day |
| `CREATE_TOKEN_BUDGET` | _(empty)_ | Optional soft budget stored on job |
| `CREATE_COST_CENTS_PER_MILLION_TOKENS` | `15` | Rough cost log only |

- Over limit → **429** `{ errorCode: "QUOTA_EXCEEDED", quota: { createsUsed, createsLimit, resetsAt } }`
- Create + status responses include current `quota`
- Finalize writes `tokens_used` + `cost_cents` on the job row

```bash
cd apps/api && uv run python tests/test_quota_m3f.py
```

## Tools API (M3g)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `GET` | `/api/v1/tools/{toolId}` | owner session | Tool metadata + `latestVersion` (code, schema, plan) |

Used by Studio after Create redirects to `/studio/{toolId}`.

```bash
cd apps/api && uv run python tests/test_tools_m3g.py
```

## Create eval (M3h)

```bash
# Offline mock (CI) — 10 prompts, gates ≥70% first-pass OR ≥90% after-repair
uv run python scripts/eval_create.py

# Live OpenRouter (costs tokens)
EVAL_LIVE=1 uv run python scripts/eval_create.py

# Automated M3 exit rollup
uv run python tests/test_m3_demo_checklist.py
```

Prompts: `evals/create/prompts.json` · Manual: [md/m3-demo-checklist.md](../../md/m3-demo-checklist.md)

## Access rules + M1 demo (M1f)

Product access matrix: **[md/access-rules.md](../../md/access-rules.md)**.

Automated M1 exit checklist (jobs gate, schema, repos, storage CORS, upload):

```bash
cd apps/api && uv run python tests/test_m1_demo_checklist.py
```

## Repositories (M1c)

Thin asyncpg repositories under `src/adapters/db/repositories/`:

| Repo | Methods |
|------|---------|
| `ToolsRepository` | `create_draft_tool`, `get_tool_by_id`, `get_tool_by_public_id`, `create_tool_version`, `get_tool_version` |
| `JobsRepository` | `create_job`, `get_job`, `update_job_status` |
| `AssetsRepository` | `create_asset`, `get_asset_for_owner`, `delete_asset` |

Wire via FastAPI deps: `ToolsRepo`, `JobsRepo`, `AssetsRepo` in `src/core/deps.py`.

Requires at least one Better Auth user for the smoke test:

```bash
cd apps/api && uv run python tests/test_repos_m1c.py
```

## M1a — Create job gate

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `POST` | `/api/v1/jobs` | Better Auth session cookie | Stub: returns `queued` + `jobId` (no DB/worker yet) |
| `GET` | `/api/v1/auth/me` | session | Who am I |

Wire JSON is **camelCase** (see `src/schemas/jobs.py`, mirrors `@repo/contracts` job API).

### Smoke tests

```bash
cd apps/api && uv run python tests/test_jobs_m1a.py
```

### Manual curl

```bash
# 401 without cookie
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/jobs \
  -H 'Content-Type: application/json' \
  -d '{"visionText":"hello"}'

# 201 with session cookie from browser (copy better-auth.session_token)
curl -s -X POST http://localhost:8000/api/v1/jobs \
  -H 'Content-Type: application/json' \
  -b 'better-auth.session_token=...' \
  -d '{"visionText":"A kinetic social frame"}'
```

Web Create page (`apps/web`) calls the same endpoint with `credentials: "include"`. Set `NEXT_PUBLIC_API_URL` if the API is not at `http://localhost:8000`.
