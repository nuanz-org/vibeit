# Aiditr — access rules (MVP)

**Milestone:** M1f  
**Status:** Frozen for ASAP core loop  
**Related:** [aiditr-milestones.md](./aiditr-milestones.md) · [backend-architecture.md](./backend-architecture.md) · [capture-cors.md](./contracts/capture-cors.md)

These rules prevent M7/M8 from inventing ownership later. Implementation may lag (e.g. share page lands in M7); **do not weaken** the table without a product decision.

---

## Matrix

| Resource | Anonymous | Authenticated owner | Other signed-in users |
|----------|-----------|---------------------|------------------------|
| Draft tool / private version | **No** | Full | **No** |
| Published tool / gallery item | **Read** (view / embed) | Full | **Read** |
| Share page `/t/:publicId` | **Read** interactive tool | — | **Read** |
| Source download | **Never** (product rule) | View-in-Studio only | **No** |
| Assets metadata (`GET /api/v1/assets/{id}`) | **No** (401) | Full | **No** |
| Asset raw bytes (canvas URL) | See [raw assets](#raw-asset-urls-canvas) | Full | Opaque UUID only |
| Create / upload / jobs APIs | **No** (401) | **Yes** | N/A |
| Sign up / sign in / sign out | Sign up / in only | Sign out | — |

---

## Identity

| Concept | Rule |
|---------|------|
| User id | Better Auth `"user".id` (**text**). Product tables FK to this. **No second users table.** |
| Tool ownership | `tools.owner_user_id` = that id |
| Asset ownership | `assets.owner_user_id` = that id |
| Job ownership | `generation_jobs.owner_user_id` = that id |

Session: browser cookie `better-auth.session_token` (or secure variant). API validates via shared Postgres (`GET /api/v1/auth/me`, `get_current_user`).

---

## Tools & `public_id`

| Field | Rule |
|-------|------|
| `public_id` | Generated at **draft tool create** time (`adapters/db/ids.new_public_id`, format `t_{token}`) |
| Uniqueness | DB unique on `tools.public_id` |
| Share / gallery | Public surfaces use `public_id`, never internal UUID alone for human URLs |
| Draft | Anonymous must not load draft by `public_id` until status is `published` (enforce in M7/M8 routes) |
| Published | Anonymous may view/embed; never download source |

**Source code:** Viewable in Studio for owner (and later as “view source” without download). **No source download** for anyone (product non-goal).

---

## Jobs (Create)

| Action | Anonymous | Owner |
|--------|-----------|-------|
| `POST /api/v1/jobs` | **401** | **201** (stub today; worker in M3) |
| Poll job status (M3) | **401** | Owner only |
| Failed jobs | Never become published / gallery-ready | — |

---

## Assets

### Metadata & mutation

| Action | Anonymous | Owner | Other users |
|--------|-----------|-------|-------------|
| `POST /api/v1/assets` (upload) | **401** | Yes | N/A |
| `GET /api/v1/assets/{id}` | **401** | Yes | **404**/deny |
| `DELETE /api/v1/assets/{id}` | **401** | Yes | **404**/deny |

Kinds for upload MVP: `inspiration` | `studio`. (`export` / `thumb` reserved.)

### Raw asset URLs (canvas)

Canvas export requires `crossOrigin = "anonymous"` ([capture-cors.md](./contracts/capture-cors.md)), so the browser **cannot** send session cookies on image loads.

**MVP decision (M1d/M1e):**

| Route | Auth | Access model |
|-------|------|----------------|
| `GET /api/v1/assets/raw/{id}` | **None** | Anyone who knows the UUID can GET bytes |
| `GET /api/v1/storage/objects/{key}` | **None** | Anyone who knows the storage key |

- Treat UUIDs / storage keys as **capability tokens** (unguessable).
- Do **not** list assets publicly.
- Response CORS: allowlisted web origins, **no credentials** (anonymous).
- **Later (prod harden):** signed short-lived URLs or same-origin media proxy; keep canvas-compatible.

Published gallery thumbs may use the same raw URL pattern deliberately (still no listing).

---

## Create surface (web)

| Path | Anonymous | Signed-in |
|------|-----------|-----------|
| `/create` | Redirect to login | Allowed (placeholder + M1 proofs) |
| `/login`, `/signup` | Allowed | — |

Cookie forwarding to API: `credentials: "include"`; API CORS allows web origin with credentials for **session** routes (not asset raw).

---

## What is intentionally deferred

| Capability | Milestone |
|------------|-----------|
| Public share page `/t/:publicId` | M7 |
| Gallery listing / publish gates | M8 |
| Studio param/asset binding | M5 |
| Signed asset URLs | M9 / prod harden |

---

## Enforcement checklist (for implementers)

When adding a new route, ask:

1. Does it need a session? → `Depends(get_current_user)`  
2. Does it touch a row with `owner_user_id`? → filter by owner (or 404)  
3. Is it a **public read** of a published tool? → require `status = published` (or equivalent)  
4. Is it an **image for canvas**? → CORS anonymous path; no credentialed image GET  
5. Does it expose **source download**? → **reject** (view-only at most)

---

## Demo alignment (M1)

See M1 demo checklist in [aiditr-milestones.md](./aiditr-milestones.md#m1f--public-vs-private-access-rules--m1-demo) and `apps/api/tests/` smokes.
