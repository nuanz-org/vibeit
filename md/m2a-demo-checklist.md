# M2a demo checklist (core-loop exit)

**Milestone:** M2a6 closes M2a  
**Date:** 2026-08-04  
**Bar:** Sandboxed canvas2d host + social-frame tool + Studio + **PNG capture with a real uploaded asset** (not `data:` fixtures).  
**Constant:** `M2A_CAPTURE_REQUIRES_REAL_ASSET` in `@repo/contracts`

---

## Automated (CI / local API)

```bash
cd apps/api && uv run pytest tests/test_m2a_demo_checklist.py -q
```

| Check | Source |
|-------|--------|
| Storage CORS allowlists web origin, no credentials | M1d / checklist |
| Upload → `assets/raw` URL + CORS GET of PNG bytes | M1e / M2a6 |
| Contracts still declare real-asset capture requirement | doc + constant |
| Real-asset URL helper rejects `data:` / `blob:` | web pure logic (see tests below) |

Also:

```bash
pnpm --filter web build:runtime-frame
pnpm --filter web check-types
pnpm --filter web lint
```

---

## Manual browser (once per machine / release)

Prereqs: `pnpm dev` (or web + api + db), signed-in user.

1. [ ] Open **[http://localhost:3000/studio/social-frame](http://localhost:3000/studio/social-frame)** (auth required).
2. [ ] Status becomes **live** — kinetic social frame in sandboxed iframe.
3. [ ] Tweak **title / accent / motion** → preview updates without remount.
4. [ ] **Assets → Logo → Upload** a PNG/JPEG/WebP (studio kind).
5. [ ] UI shows **real asset bound** (http URL containing `/api/v1/assets/raw/`).
6. [ ] Logo appears on the canvas (not only empty orb).
7. [ ] Click **Prove real-asset PNG**.
8. [ ] Badge **M2a capture ✓** appears; capture preview shows non-empty PNG.
9. [ ] No error about tainted canvas / SecurityError / `CAPTURE_FAILED`.
10. [ ] View source is view-only (no download).

### Negative checks

11. [ ] Without upload, **Prove real-asset PNG** stays disabled or errors clearly.
12. [ ] Fixture-only paths (dev host data: logo) do **not** count as M2a exit.

---

## Exit criteria map

| Criterion | How verified |
|-----------|----------------|
| canvas2d reference tool under host | Studio live preview |
| PNG with **real uploaded** asset | Prove real-asset PNG + API CORS |
| Fixture cannot reach parent / arbitrary network | sandbox `allow-scripts` only + frame CSP |
| Studio good enough for M3 redirect | `/studio/:toolId` auth shell |

When all automated tests pass and the manual list is green once → **M2a core-loop exit met** → start **M3**.

---

## Related

- [capture-cors.md](./contracts/capture-cors.md)
- [runtime-host.md](./contracts/runtime-host.md)
- [access-rules.md](./access-rules.md) (anonymous asset GET)
- Studio: `apps/web/features/studio/`
- Helpers: `apps/web/runtime/capture/real-asset.ts`
