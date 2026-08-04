# M5 demo checklist (Studio Control exit)

**Milestone:** M5f closes M5  
**Date:** 2026-08-05  
**Bar:** Personalize a tool (params, colors, assets) without LangGraph; draft state survives reload for the owner; view source is Studio-only with **no download**; capture still works after a real uploaded asset.

---

## Automated (CI / local API)

```bash
cd apps/api

# M5 draft persist + access
uv run python tests/test_tools_m5c.py

# M5 rollup checklist
uv run python tests/test_m5_demo_checklist.py

# Related platform smokes (capture / tools still green)
uv run python tests/test_m2a_demo_checklist.py
uv run python tests/test_tools_m3g.py
```

```bash
# Web
pnpm --filter web check-types
pnpm --filter web lint
```

| Check | Source |
|-------|--------|
| Draft params + assets PATCH/GET round-trip | M5c `test_tools_m5c.py` |
| Non-owner 404 on draft tool | M5c |
| Reject `data:` in draft_assets | M5c |
| Migration 003 draft columns | `migrations/003_tool_draft_state.sql` |
| No source download endpoint | checklist test + access-rules |
| View source UI is view-only | Studio `view-source-panel.tsx` |
| Capture real-asset CORS still valid | M2a checklist |

---

## Manual browser (once per machine / release)

Prereqs: Postgres + migrations (`003_tool_draft_state`), Better Auth user, `pnpm dev` (web + api).

### A — Fixture Control (no API draft)

1. [ ] Sign in → open **[http://localhost:3000/studio/social-frame](http://localhost:3000/studio/social-frame)**.
2. [ ] Status becomes **live**; sidebar says fixture mode (local only).
3. [ ] **Colors** group: change accent/bg → preview updates without remount/regen.
4. [ ] **Reset to defaults** restores palette/params live.
5. [ ] Empty slots show lettermark placeholders + loud **Add your logo** banner.
6. [ ] Upload logo → live `setAssets`; banner softens for filled slots.
7. [ ] **Capture PNG** still works; **Prove real-asset PNG** after http upload (M2a).
8. [ ] View source is view-only (**View only · no download**); no download button.

### B — Generated tool Control + persist (product path)

9. [ ] Create a tool (or open existing `/studio/{uuid}` from Create).
10. [ ] Header shows tool **draft** (or published) status + live.
11. [ ] Control uses version schema when present; empty schema does not crash.
12. [ ] Change colors + params → badge **Saved** (auto-save, no LangGraph).
13. [ ] Upload asset into a slot → **Saved**; preview updates.
14. [ ] Hard **reload** → same colors + asset bindings restored.
15. [ ] **View source** shows generated version code; policy “no download”.
16. [ ] Capture after real upload still works (Prove real-asset PNG or Capture PNG).

### Negative / safety

17. [ ] Non-owner cannot open another user’s draft tool (API 404).
18. [ ] No UI control downloads source; no `/api/v1/tools/.../download` route.
19. [ ] Fixture path never requires draft API to edit params.

---

## Exit criteria map

| Criterion | How verified |
|-----------|----------------|
| Personalization without LangGraph | Manual A/B + no job create on slider |
| Asset + color survive reload (owner) | Manual B + M5c API round-trip |
| Source Studio-only, no download | Manual + automated endpoint absence |
| Capture after real uploaded asset | Manual A/B + M2a checklist |

When automated checklist passes and manual list is green once → **M5 core-loop exit met** → start **M7** (export / share / embed).

---

## Related

- [vibeit-milestones.md](./vibeit-milestones.md) — M5a–M5f  
- [param-schema.md](./contracts/param-schema.md)  
- [access-rules.md](./access-rules.md) — source never downloadable  
- Studio: `apps/web/features/studio/`  
- Draft API: `PATCH /api/v1/tools/{id}/draft`
