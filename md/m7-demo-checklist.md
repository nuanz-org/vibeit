# M7 demo checklist (Export · share · embed exit)

**Milestone:** M7g closes M7  
**Date:** 2026-08-06  
**Bar:** From Studio, download PNG + short video (or PNG-sequence fallback); make a public link; open `/t/{publicId}` without login; copy embed; never expose source download or draft personalization anonymously.

---

## Automated (CI / local API)

```bash
cd apps/api

# M7 public API + thin publish
uv run python tests/test_public_tools_m7d.py

# M7 rollup checklist
uv run python tests/test_m7_demo_checklist.py

# Related platform smokes still green
uv run python tests/test_m2a_demo_checklist.py
uv run python tests/test_m5_demo_checklist.py
```

```bash
# Web
pnpm --filter web check-types
pnpm --filter web lint
# If runtime frame source changed:
pnpm --filter web build:runtime-frame
```

| Check | Source |
|-------|--------|
| Public GET published 200; draft 404 | M7d `test_public_tools_m7d.py` |
| Publish requires version; non-owner 404 | M7d |
| No `/download` on tools / public_tools | checklist + M7d |
| Public response has no owner/draft bags | M7d |
| Export surfaces exist (PNG / video / sequence) | checklist inventory |
| Share + public page surfaces exist | checklist inventory |
| Browser support notes | `md/export-browser-support.md` |
| Capture real-asset CORS still valid | M2a checklist |

---

## Manual browser (once per machine / release)

Prereqs: Postgres + migrations, Better Auth user, API + web running (`pnpm dev` / api), at least one **generated** tool with version code (Create happy path).

### A — Export (fixture or generated)

1. [ ] Sign in → open **[http://localhost:3000/studio/social-frame](http://localhost:3000/studio/social-frame)** (or a generated `/studio/{uuid}`).
2. [ ] Wait until status is **live**.
3. [ ] **Download PNG** → browser saves a `.png` (header or Export section).
4. [ ] **Chromium:** **Download video (4s)** → countdown → `.webm` saves.
5. [ ] **Download PNG sequence** → `.zip` with `frames/frame-000.png`… (or confirm video auto-fallback message if MediaRecorder fails).
6. [ ] Optional: upload a real studio asset → **Prove real-asset PNG** / capture still works (M2a path).

### B — Share + public page (generated tool)

7. [ ] Open a generated tool Studio (`/studio/{uuid}`) with a `publicId`.
8. [ ] Share section shows link is **private** until public; Copy URL disabled (or clearly gated).
9. [ ] Click **Make public link** → status badge becomes **published**.
10. [ ] **Copy** share URL → open in a **private / incognito** window (logged out) → `/t/{publicId}` becomes **live** (interactive canvas, no Studio Control).
11. [ ] **Copy embed** → paste into a minimal static HTML file → iframe shows the tool.
12. [ ] **Open public page** from Studio opens `/t/...` in a new tab.

### C — Access negatives

13. [ ] Create or use a **draft** tool that was never published → anonymous `/t/{publicId}` shows not-found / private message.
14. [ ] Public page has **no** view-source download, no draft save, no owner param chrome.
15. [ ] Owner Studio still has view source **view-only** (M5); no source download endpoint.

### D — Docs

16. [ ] Skim [export-browser-support.md](./export-browser-support.md) for Chromium vs Safari notes.

---

## Exit criteria map

| Criterion | How verified |
|-----------|----------------|
| PNG export | Manual A + export panel / `downloadPng` |
| WebM on Chromium + sequence fallback | Manual A + M7b/M7c code + browser notes |
| Public page without login | Manual B + M7d API + M7e route |
| Share URL + embed | Manual B + Share panel |
| No source download / no draft leak | Automated + Manual C |

When automated checklist passes and manual list is green once → **M7 core-loop exit met** → start **M8** (publish + gallery).

---

## Related

- [vibeit-milestones.md](./vibeit-milestones.md) — M7a–M7g  
- [export-browser-support.md](./export-browser-support.md)  
- [access-rules.md](./access-rules.md)  
- Studio: `apps/web/features/studio/`  
- Public page: `apps/web/app/t/[publicId]/` · `apps/web/features/public-tool/`  
- Public API: `GET /api/v1/public/tools/{publicId}` · `POST /api/v1/tools/{id}/publish`  
