# M8 demo checklist (Publish · gallery · quality gates exit)

**Milestone:** M8g closes M8 → **core loop complete** (canvas2d)  
**Date:** 2026-08-06  
**Bar:** Owner publishes a live tool with metadata + thumbnail through gates; another browser finds it in the gallery and runs it; unpublish hides public page + gallery; failed gens never appear as published; thin share remains separate from gallery.

---

## Automated (CI / local API)

```bash
cd apps/api

# M8 subpart smokes
uv run python tests/test_publish_m8a.py
uv run python tests/test_publish_gates_m8b.py
uv run python tests/test_thumbnail_m8c.py
uv run python tests/test_gallery_m8d.py
uv run python tests/test_gallery_ui_m8e.py
uv run python tests/test_unpublish_m8f.py

# M8 rollup checklist
uv run python tests/test_m8_demo_checklist.py

# Prior loop still green
uv run python tests/test_m7_demo_checklist.py
uv run python tests/test_public_tools_m7d.py
```

```bash
# Web
cd apps/web
npx tsc --noEmit -p tsconfig.json
# or monorepo:
# pnpm --filter web check-types
```

| Check | Source |
|-------|--------|
| Publish metadata + version freeze | M8a `test_publish_m8a.py` |
| Gallery gates structured 422 | M8b `test_publish_gates_m8b.py` |
| Thumb upload + attach + gate | M8c `test_thumbnail_m8c.py` |
| Gallery list excludes draft / thin share | M8d `test_gallery_m8d.py` |
| Gallery UI routes + surfaces | M8e `test_gallery_ui_m8e.py` |
| Unpublish hides public + gallery | M8f `test_unpublish_m8f.py` |
| No source download on tools / public | checklist inventory |
| Studio Publish panel exists | M8f + checklist |
| Failed / empty code cannot publish | M8a + M8b |

---

## Manual browser (once per machine / release)

Prereqs: Postgres + migrations (`004`–`005` applied), Better Auth user, API + web running, at least one **generated** canvas2d tool with version code (Create happy path). Prefer Chromium for export smoke.

### A — Thin share still works (M7 / not gallery)

1. [ ] Sign in → open generated `/studio/{uuid}`.
2. [ ] **Share:** **Make public link** → status **published** (not necessarily “In gallery”).
3. [ ] Incognito → `/t/{publicId}` **live**.
4. [ ] `/gallery` does **not** list this tool until gallery publish.

### B — Gallery publish (M8a–M8f)

5. [ ] **Export:** **Download PNG** once (or use Publish **Capture thumbnail**).
6. [ ] **Publish to gallery** section: set **title** (required), optional description/tags.
7. [ ] **Capture thumbnail** → preview appears; checklist shows title + thumb ready.
8. [ ] **Publish to gallery** → badge **In gallery**; links to gallery card + public page work.
9. [ ] Optional: force a gate fail (clear title or skip thumb) → UI shows structured gate codes (e.g. `GALLERY_TITLE_REQUIRED`, `GALLERY_THUMBNAIL_REQUIRED`).

### C — Anonymous gallery browse (M8d–M8e)

10. [ ] Incognito (logged out) → [http://localhost:3000/gallery](http://localhost:3000/gallery) lists the tool (thumb + title).
11. [ ] Open gallery card → **Open tool** → `/t/{publicId}` interactive, **no** Studio Control / source download.
12. [ ] Home **Browse gallery** / header Gallery link works.

### D — Unpublish (M8f)

13. [ ] Owner Studio → **Unpublish**.
14. [ ] Incognito: `/t/{publicId}` not found / private; `/gallery` no longer shows the card; gallery detail 404.
15. [ ] Thin re-publish (Make public link) can restore share without gallery until Publish again.

### E — Negatives

16. [ ] Tool with **no version / empty code** cannot publish (API 422 / UI blocked).
17. [ ] Public and gallery surfaces never offer source **download**.
18. [ ] Draft tools never appear in gallery list.

### F — Full loop dry-run (consensus path)

19. [ ] Sign in → Create vision text → live Studio tool → tweak params/assets if present → export PNG → share/embed OK → **Publish to gallery** → second browser finds tool in gallery and runs it.

---

## Exit criteria map

| Criterion | How verified |
|-----------|----------------|
| Metadata + version freeze on publish | Automated M8a + Manual B |
| Gates block broken gallery publish | Automated M8b + Manual B step 9 |
| Auto thumbnail | Automated M8c + Manual B |
| Gallery list API + UI → open public tool | Automated M8d/M8e + Manual C |
| Unpublish hides gallery + public | Automated M8f + Manual D |
| Failed gens never published | Automated M8a/M8b + Manual E |
| Thin share ≠ gallery | Manual A |
| Full canvas2d loop | Manual F |

When automated checklist passes and manual list is green once → **M8 core-loop exit met** → **core loop complete** on canvas2d → start **M9** (hardening) or fast-follows (M2b / M4 / M6) as product chooses.

---

## Related

- [aiditr-milestones.md](./aiditr-milestones.md) — M8a–M8g  
- [access-rules.md](./access-rules.md)  
- [m7-demo-checklist.md](./m7-demo-checklist.md)  
- Studio publish: `apps/web/features/studio/components/publish-panel.tsx`  
- Gallery UI: `apps/web/app/gallery/` · `apps/web/features/gallery/`  
- APIs:  
  - `POST /api/v1/tools/{id}/publish` (`forGallery`, `thumbnailAssetId`, …)  
  - `POST /api/v1/tools/{id}/unpublish`  
  - `GET /api/v1/public/gallery` · `GET /api/v1/public/gallery/{publicId}`  
  - `GET /api/v1/public/tools/{publicId}`  
