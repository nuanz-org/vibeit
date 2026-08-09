# Local-first Studio assets

**Status:** Phase 1 implemented (Studio personalization).  
**Related plan:** local-first assets (browser IDB, no S3 for slot binds).

## Goal

Personalization media (logo, source photo, etc.) stays **on the owner’s device** by default. Studio does **not** POST those files to `/api/v1/assets` for normal bind.

| Path | Storage |
|------|---------|
| Studio slot bind / replace / clear | **IndexedDB** + ephemeral `blob:` URLs |
| Create inspiration images | Server upload (unchanged) |
| Gallery thumb | Server `kind=thumb` (unchanged) |
| Publish / public viewers | Phase 2: optional **promote** to server |

## Lifecycle

1. User picks a file in Assets panel.  
2. `LocalAssetStore.put(file)` → `localAssetId` + blob in IDB.  
3. `ProjectAssetMap` binds `(toolId, slotId) → localAssetId`.  
4. Resolver exposes `blob:` via `URL.createObjectURL`.  
5. Host `setAssets({ [slotId]: blobUrl })` → harness `c.images[slotId]`.  
6. Draft PATCH stores **`null` for local-only slots** (never `blob:` or base64).  
7. Reload: rehydrate map → object URLs → setAssets again.

## Draft API rule

Server `draft_assets` must not receive:

- `blob:` URLs  
- `data:` image payloads  

v1: local slots are serialized as **`null`**. Bindings live only in IDB.

## Opaque iframe constraint (critical)

Tool iframe sandbox is `allow-scripts` **without** `allow-same-origin` (opaque origin).

Parent-created `blob:` URLs **cannot** be loaded as `img.src` inside that frame.

**Fix (Phase 1.5):** `resolveAssetsForFrame` in the host bridge converts `blob:` → `data:` before postMessage. Studio UI still uses parent `blob:` for thumbnails; the frame receives `data:` only on the wire.

```text
Studio assets state:  blob:…  (parent, for thumb + IDB)
         ↓ resolveAssetsForFrame
Frame setAssets/mount: data:image/…;base64,…  (loadable in opaque origin)
```

## Capture policy

| URL kind | Product capture |
|----------|-----------------|
| `blob:` (user-local, Studio state) | **Eligible** |
| `https://…/assets/raw/…` | Eligible |
| Synthetic tiny `data:` fixtures | Not eligible as “user media” |
| Frame wire `data:` from local resolve | Loaded by harness; Studio gate uses parent `blob:` |

Harness: skip `crossOrigin = "anonymous"` for `blob:` / `data:` so loads are not broken.

## Publish (phase 2 — not required for phase 1)

Do not silently put local photos on public tools. On publish, either promote selected slots via existing studio upload API, or ship without those assets.

## UX copy

- Helper: **“Stays on this device”**  
- Empty: add image CTA  
- Other device: expected empty slots; re-add photo  

## Limits

- MIME: `image/png`, `image/jpeg`, `image/webp` (same as server studio uploads)  
- Max size: 10 MB  
- Video: out of scope for phase 1  

## Code map

| Module | Role |
|--------|------|
| `apps/web/features/studio/lib/local-asset-store.ts` | IDB bytes + object URL cache |
| `apps/web/features/studio/lib/project-asset-map.ts` | toolId+slotId → localAssetId |
| `apps/web/features/studio/components/asset-slots-panel.tsx` | Bind UI (no upload) |
| `apps/web/features/studio/lib/draft-assets.ts` | Strip non-http from draft bag |
| `packages/contracts/src/capture-cors.ts` | `isUserLocalAssetUrl`, fixture vs local |
| `packages/contracts/src/skeletons/canvas2d.ts` | `loadImage` CORS special-case |
