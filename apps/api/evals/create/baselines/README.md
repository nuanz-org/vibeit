# Create eval baselines (AM1)

Live quality baselines for the Create pipeline. Mock eval is plumbing-only; **live** numbers are the craft signal.

## Record a baseline

From `apps/api` with `OPENROUTER_API_KEY` set:

```bash
# After AM1 (or any craft change)
EVAL_LIVE=1 uv run python scripts/eval_create.py \
  --out evals/create/baselines/am1-after.json

# Optional: capture notes alongside JSON
# See notes-am1.md for human eyeball scores
```

## Files

| File | Meaning |
|------|---------|
| `am1-after.json` | Live eval after AM1 craft floor (prompts + goldens) |
| `notes-am1.md` | Owner notes / eyeball scores (≥7/10 visibly better) |

## Gates

Inherited from `evals/create/prompts.json`:

- `minFirstPassRate` ≥ 0.7
- `minAfterRepairRate` ≥ 0.9

First-pass rate after AM1 must not be worse than the pre-AM1 baseline when one exists.
