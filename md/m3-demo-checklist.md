# M3 demo checklist (Create agent exit)

**Milestone:** M3h closes M3  
**Date:** 2026-08-04  
**Bar:** Sign in → vision text → job progress → canvas2d tool in Studio (or salvage/error); quota enforced; failed gens never published.

**Model:** `deepseek/deepseek-v4-flash` via OpenRouter only.

---

## Automated (CI / local API)

```bash
cd apps/api

# Eval set + gates (mock LLM — no API key)
uv run python scripts/eval_create.py

# Optional live eval (costs money)
# EVAL_LIVE=1 uv run python scripts/eval_create.py

# Sub-milestone smokes
uv run python tests/test_jobs_m3a.py
uv run python tests/test_llm_m3b.py
uv run python tests/test_agent_m3c.py
uv run python tests/test_agent_m3d.py
uv run python tests/test_create_m3e.py
uv run python tests/test_quota_m3f.py
uv run python tests/test_tools_m3g.py

# Rollup
uv run python tests/test_m3_demo_checklist.py
```

```bash
# Web
pnpm --filter web check-types
pnpm --filter web lint
```

| Check | Source |
|-------|--------|
| Eval suite ≥10 prompts | `evals/create/prompts.json` |
| Gates: first-pass ≥70% **or** after-repair ≥90% | `scripts/eval_create.py` (mock) |
| Job persist + status/result | M3a |
| LLM Flash-only | M3b |
| Validate + smoke | M3c |
| Plan + codegen | M3d |
| Repair + finalize/salvage + worker | M3e |
| Daily quota 10 + usage | M3f |
| Tools GET + Create UI path | M3g |

**Gates:** default ≥70% first-pass **or** ≥90% after-repair on the ~10-prompt set.

---

## Manual browser (once per machine / release)

Prereqs: Postgres + migrations, Better Auth user, `pnpm dev`, **`OPENROUTER_API_KEY`** in repo `.env` so the worker runs.

1. [ ] Sign in at `/login` (or sign up).
2. [ ] Open **[http://localhost:3000/create](http://localhost:3000/create)**.
3. [ ] Enter a simple vision (e.g. “purple pulsing orb with bold title”) → **Generate tool**.
4. [ ] Progress shows `queued` → `running` with phase (plan / codegen / validate / repair).
5. [ ] On success, redirect to **`/studio/{uuid}`** (not only `/studio/social-frame`).
6. [ ] Studio loads tool metadata; **View source** shows generated TypeScript.
7. [ ] Preview is live in the sandboxed host (params can be tweaked).
8. [ ] Quota line shows `createsUsed/createsLimit` after create.
9. [ ] (Optional) Burn quota or set `CREATE_QUOTA_PER_DAY=0` temporarily → submit blocked / **429 QUOTA_EXCEEDED**.
10. [ ] (Optional) Force failure path: confirm failed jobs are not “published”; salvage link if message includes `salvage_draft=true`.

### Negative / safety

11. [ ] Logged-out `/create` redirects to login.
12. [ ] Failed generation never has tool `status=published`.
13. [ ] Without `OPENROUTER_API_KEY`, job may stay `queued` (worker not auto-started) — expected.

---

## Exit criteria map

| Criterion | How verified |
|-----------|----------------|
| Happy path simple prompts | Manual + mock/live eval |
| Failed never ready/published | M3e salvage tests + manual |
| Repair stops at N | M3e + eval repair_count |
| Quota enforced | M3f tests + manual optional |
| Eval gates | `scripts/eval_create.py` exit 0 |

When automated checklist passes and manual list is green once → **M3 core-loop exit met** → start **M5** (full Control) or early **M7** PNG path.

---

## Related

- [vibeit-milestones.md](./vibeit-milestones.md) — M3a–M3h  
- [job-api.md](./contracts/job-api.md)  
- [plan-json.md](./contracts/plan-json.md)  
- Eval prompts: `apps/api/evals/create/prompts.json`  
- Eval runner: `apps/api/scripts/eval_create.py`
