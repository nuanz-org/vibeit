# AM4 — Model routing + A/B decision record

## Defaults (until a shootout report is committed)

| Role | Default model | Notes |
|------|---------------|--------|
| plan | `deepseek/deepseek-v4-flash` | Keep cheap |
| codegen | `deepseek/deepseek-v4-flash` | Baseline; change only after A/B |
| repair | same as codegen (or `LLM_MODEL_REPAIR`) | |
| judge | `deepseek/deepseek-v4-flash` | Cheap unless calibration needs vision |
| vision | `deepseek/deepseek-v4-flash` | Reserved |

**Invariant:** Do not change production defaults without a committed comparison under this directory.

## Env knobs

```bash
LLM_MODEL_PLAN=deepseek/deepseek-v4-flash
LLM_MODEL_CODEGEN=deepseek/deepseek-v4-flash
LLM_MODEL_REPAIR=deepseek/deepseek-v4-flash
LLM_MODEL_JUDGE=deepseek/deepseek-v4-flash
LLM_MODEL_VISION=deepseek/deepseek-v4-flash

# Widen allowlist (comma-separated OpenRouter ids)
LLM_ALLOWLIST_EXTRA=provider/model-id
# Or replace one role’s list entirely:
# LLM_ALLOWLIST_CODEGEN=deepseek/deepseek-v4-flash,anthropic/claude-sonnet-4.5
```

Misconfigured ids **fail at Settings startup** (not mid-job).

## Run a codegen shootout

```bash
cd apps/api
EVAL_LIVE=1 uv run python scripts/eval_create.py \
  --ab-codegen deepseek/deepseek-v4-flash,anthropic/claude-sonnet-4.5,deepseek/deepseek-v4-pro \
  --limit 20 \
  --json > evals/create/model-ab/shootout-$(date +%Y%m%d).json
```

Suggested full candidates (doc names → set real OpenRouter ids in allowlist):

- DeepSeek V4 Flash (baseline)
- DeepSeek V4 Pro
- Claude Sonnet 4.5 / Sonnet 5 when listed on OpenRouter
- Kimi K2.x Code (`moonshotai/kimi-k2.5` placeholder — confirm id)

## Decision template

Copy `decision.template.json` → `decision.json` after reviewing the shootout.  
Record: chosen codegen default, cost estimate, date, rater, link to shootout JSON.
