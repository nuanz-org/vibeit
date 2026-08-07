# AM3d — Human calibration for the Create critic

The judge is **advisory** until this calibration set is filled and correlation is documented.

## Goal

Owner rates ~20 Create outputs. Compare human overall scores to critic `overall`.  
Target: rank correlation (Spearman) **≥ 0.7** before setting `VIBEIT_CRITIC_ENFORCED=1`.

## Method

1. Run live eval with screenshots (host smoke on):

   ```bash
   cd apps/api
   EVAL_LIVE=1 uv run python scripts/eval_create.py --json --limit 20 \
     > evals/create/calibration/run-raw.json
   ```

2. For each result with `screenshot_path`, open the PNG and score **overall 1–5** in `human-scores.json` (template below).

3. Compute Spearman rank correlation between `human.overall` and `critique_score`.

4. Record the number, date, and decision in `notes.md`.

5. Only then enable enforcement:

   ```bash
   export VIBEIT_CRITIC_ENFORCED=1
   export VIBEIT_CRITIC_THRESHOLD=3.5   # optional
   ```

## Template — `human-scores.json`

```json
{
  "version": 1,
  "rater": "owner",
  "date": "YYYY-MM-DD",
  "scale": "1=broken craft, 3=acceptable, 5=brik-level",
  "ratings": [
    {
      "id": "orb-pulse",
      "overall": 3,
      "notes": "optional"
    }
  ]
}
```

## Invariants

- Critic failure must never hard-fail a job (gates-only finalize).
- Enforcement is opt-in via env; default remains advisory.
- Calibration ratings are human-only — do not invent scores.
