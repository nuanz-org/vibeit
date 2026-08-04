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
