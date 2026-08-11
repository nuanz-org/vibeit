# Aiditr consensus freeze v1 — finalization record

**Date:** 2026-08-04  
**Status:** Applied to consensus + milestones  
**Models:** Kimi K3 + DeepSeek V4 Flash + Grok (review) → **Claude Fable 5 via OpenCode** (finalize)

---

## Verdict

**READY TO FREEZE: yes** — applied.

- Spine of original brainstorm **kept**
- Small revisions from 3-way review **accepted** (see below)
- Contested auth timing: **auth-before-Create kept** for MVP

---

## Accepted revisions

1. Asset CORS / crossOrigin / capture rules in M0; M2 real-upload capture exit  
2. Skeleton templates + structured plan JSON + numeric eval gates; `three` config-gated  
3. Video: MediaRecorder WebM MVP + PNG-sequence fallback; async MP4 optional  
4. Critical path = canvas2d complete loop; M4 multi-target + M6 chat refine = fast-follows  
5. Auth-before-Create (reject anonymous Create for MVP)  
6. Vision model committed separate from Flash codegen before M4  
7. Quotas + repair budgets live with Create (M3)  
8. Streamed progress + salvage best-valid on repair exhaustion  

---

## Owner defaults (silence = accept)

| # | Decision | Default |
|---|----------|---------|
| 1 | Eval gate | ≥70% first-pass or ≥90% after-repair on ~10 prompts |
| 2 | Quota / repair | 10 creates/day; N=3; ~60s wall |
| 3 | Launch without three | Yes, OK |
| 4 | Video at launch | WebM-only OK |
| 5 | Publish | Auto on gate pass + takedown switch |

---

## Files updated

- [aiditr-product-architecture-consensus.md](./aiditr-product-architecture-consensus.md) — status **Consensus frozen — v1**
- [aiditr-milestones.md](./aiditr-milestones.md) — critical path + fast-follows

---

## Freeze checklist

- [x] Fable 5 finalization produced  
- [x] Revision delta applied to consensus  
- [x] Milestone reordering applied  
- [x] Freeze record written  
- [ ] Owner confirms or overrides the 5 defaults  
- [ ] Explicit “build” to start M0  

No further consensus edits after freeze except via a logged revision entry.
