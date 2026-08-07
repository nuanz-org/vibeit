# AM1 live baseline notes

**Date:** 2026-08-07  
**Mode:** `EVAL_LIVE=1` · model `deepseek/deepseek-v4-flash`  
**Artifact:** [`am1-after.json`](./am1-after.json)

## Numbers (post AM1 craft floor)

| Metric | Value | Gate |
|--------|------:|------|
| Total prompts | 10 | — |
| First-pass | 8/10 (**80%**) | ≥70% |
| After-repair | 8/10 (**80%**) | ≥90% (OR with first-pass in runner) |
| Gates | **PASS** (first-pass gate) | |

## Pre-AM1 baseline

No committed pre-AM1 live JSON was in repo at start of AM1. Treat `am1-after.json` as the **post-craft-floor** reference. Re-run before the next prompt/model change to detect regressions.

## Owner eyeball (≥7/10 visibly better)

- [ ] Pending human design review of Studio mounts for the 10 corpus outputs and the 3 goldens
- Goldens pass static validate; Studio mount review still open

## What changed under the numbers

- DesignBrief v2 plan fields + Art Director prompt
- 3 goldens + tag retriever injected into codegen
- Craft guidance in codegen/repair prompts
