# AM7 — Chat refine agents — demo checklist

**Status:** In progress (AM7a–AM7b code landed; AM7c eval corpus optional)  
**Date:** 2026-08-07  
**Milestone:** [agent_milestone.md](./agent_milestone.md) · AM7 / product M6

## What to show

1. Open a **generated** tool in Studio (`/studio/{uuid}` with version code).
2. In **Refine (chat)**, send: `make particles slower and add a subtitle` (or similar).
3. Status shows refining → job phases → success or clean failure.
4. On success: preview remounts with new version; **Undo last refine** restores last-good client snapshot.
5. Param-only: `make it slower` → should use param path (no full rewrite) when schema has `speed`.

## Automated

```bash
cd apps/api
uv run pytest tests/test_agent_am7.py -q
```

## Manual gates

| Check | Pass? |
|-------|:-----:|
| Structural chat yields valid new version **or** clean failure | |
| Failed refine never replaces last-good preview | |
| Param-only chat does not require full codegen (server: `used_param_patch_only`) | |
| Critic non-regression rejects lower score vs base (unit-tested) | |
| Refine budget 429 after `AIDITR_REFINE_BUDGET_PER_TOOL` (default 20 / 24h) | |
| Create path / canvas2d corpus unaffected | |

## Env

| Variable | Default | Notes |
|----------|---------|--------|
| `AIDITR_REFINE_BUDGET_PER_TOOL` | 20 | Rolling window enqueues per tool |
| `AIDITR_REFINE_BUDGET_WINDOW_HOURS` | 24 | |
| `AIDITR_REFINE_WALL_TIME_SECONDS` | create wall | Refine runner wall |
| `OPENROUTER_API_KEY` | — | Required for live refine worker |

## Migration

```bash
cd apps/api && uv run python scripts/migrate.py
# applies 006_refine_jobs.sql (job_kind, base_version_id)
```

## API

```http
POST /api/v1/tools/{toolId}/refine
{ "message": "make particles slower", "baseVersionId": "…" }

GET /api/v1/jobs/{jobId}
GET /api/v1/jobs/{jobId}/result
```

## Files (canonical)

| Area | Paths |
|------|--------|
| Route / parse | `agent/refine_route.py`, `agent/patch_parse.py` |
| Prompts | `agent/prompts/refine_param.py`, `refine_code.py` |
| Nodes / runner | `agent/nodes/refine_patch.py`, `agent/runner.py` |
| Graph | `agent/graphs/control_refine.py` |
| Job / worker | `services/refine_job.py`, `workers/generation.py`, `migrations/006_refine_jobs.sql` |
| HTTP | `api/v1/tools.py` POST `/{toolId}/refine` |
| Studio | `features/studio/components/refine-chat-panel.tsx` |
| Tests | `tests/test_agent_am7.py` |
