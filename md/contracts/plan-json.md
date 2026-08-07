# Plan JSON schema

**Milestone:** M0d + **AM1 DesignBrief v2**  
**TS source of truth:** `@repo/contracts` → `packages/contracts/src/plan.ts`  
**Example:** `@repo/contracts/examples/canvas2d-social-frame-plan` · [`examples/canvas2d-social-frame-plan.json`](./examples/canvas2d-social-frame-plan.json)  
**Related:** [targets.md](./targets.md) · [param-schema.md](./param-schema.md) · [skeletons/canvas2d.md](./skeletons/canvas2d.md) · [agent_milestone.md](../agent_milestone.md)

---

## Purpose

The Create agent produces a **structured plan** *before* writing tool code.

```text
vision text (+ optional inspiration later)
        │
        ▼
   ToolPlan  (this document)
        │
        ├─► codegen into canvas2d skeleton (M3 / M0c)
        └─► may persist as tool_versions.plan (M1b)
```

Plan answers: *what are we building, at what aspect, with what motion, params, slots, and which single target?*

---

## Fields

| Field | Required | Type | Notes |
|-------|----------|------|--------|
| `concept` | **yes** | string | Short description of the tool idea |
| `aspect` | **yes** | string | e.g. `1:1`, `9:16`, `16:9`, `4:5` |
| `motion` | **yes** | string | Motion style / energy notes for codegen |
| `params` | **yes** | `ParamSchema` | M0b param fields; Art Director prefers **≥3** |
| `assetSlots` | **yes** | `AssetSlots` | May be `[]` |
| `target` | **yes** | `TargetId` | **ASAP: always `"canvas2d"`** |
| `palette` | no | `string[]` | Optional `#rrggbb` hints; not a brand kit |
| `notes` | no | string | Freeform agent notes |
| `composition` | no | object | AM1: `layers`, `focalPoints`, `grid` |
| `paletteRoles` | no | object | AM1: `bg` / `ink` / `accent` / `highlight` hex |
| `motionSpec` | no | object | AM1: `summary`, `easing`, `tempo`, `loop` |
| `typography` | no | object | AM1: `scale`, `hierarchy` |
| `controlSurface` | no | object | AM1: `intent`, `primaryParams` |
| `tags` | no | `string[]` | AM1: golden retrieval tags |

Legacy plans without DesignBrief v2 fields remain valid. Python `plan_parse.normalize_asap_plan` accepts both.

### TypeScript

```ts
import type { ToolPlan, AsapToolPlan, PlanComposition } from "@repo/contracts";
import {
  ASAP_TARGET,
  createAsapToolPlan,
  isAsapToolPlan,
} from "@repo/contracts";

interface ToolPlan {
  concept: string
  aspect: PlanAspect
  motion: string
  params: ParamSchema
  assetSlots: AssetSlots
  target: TargetId
  palette?: readonly string[]
  notes?: string
  // DesignBrief v2 (AM1) — all optional
  composition?: PlanComposition
  paletteRoles?: { bg?: string; ink?: string; accent?: string; highlight?: string }
  motionSpec?: { summary?: string; easing?: string; tempo?: string; loop?: string }
  typography?: { scale?: string; hierarchy?: readonly string[] }
  controlSurface?: { intent?: string; primaryParams?: readonly string[] }
  tags?: readonly string[]
}
```

Helpers:

| Helper | Role |
|--------|------|
| `AsapToolPlan` | `ToolPlan` with `target: "canvas2d"` |
| `createAsapToolPlan(plan)` | Build plan with `target` fixed to `ASAP_TARGET` |
| `isAsapToolPlan(plan)` | Guard for ASAP path |

---

## ASAP target rule

| Rule | Detail |
|------|--------|
| One target per plan | Never mix canvas2d + p5/three in one tool |
| Critical path | `target` **must** be `"canvas2d"` (`ASAP_TARGET`) |
| Multi-target selection | Deferred to **M4** — do not implement picker logic in M0d/M3 ASAP graph |
| Named IDs only | `p5` / `three` remain valid `TargetId` values for later plans |

```ts
// Preferred on ASAP Create path
const plan = createAsapToolPlan({
  concept: "...",
  aspect: "9:16",
  motion: "...",
  params: [/* ParamField */],
  assetSlots: [/* AssetSlot */],
});
// plan.target === "canvas2d"
```

---

## Linkage to the rest of the stack

| Downstream | How Plan is used |
|------------|------------------|
| **M0c skeleton** | `aspect` → harness options; `params` / `assetSlots` → creative schema; codegen fills `draw` from `concept` + `motion` |
| **M1b DB** | Persist plan JSON on `tool_versions.plan` (or equivalent) for Studio / remix later |
| **M3 Create agent** | Plan node output → validate → codegen node input |
| **M5 Control** | Runtime schema still comes from the *tool* (`getParamSchema`); plan is the design-time source that codegen should honor |
| **M0e jobs** | Job result may reference version that embeds plan; job DTOs do not replace Plan — see [job-api.md](./job-api.md) ✅ |

---

## Example: social-frame plan (canvas2d)

See full JSON: [`examples/canvas2d-social-frame-plan.json`](./examples/canvas2d-social-frame-plan.json)

Summary:

| Field | Value |
|-------|--------|
| `target` | `canvas2d` |
| `aspect` | `9:16` |
| `concept` | Kinetic social frame with headline, accent pulse, logo, optional background |
| `params` | Same as M0b social-frame example (`bg`, `accent`, `title`, `speed`, …) |
| `assetSlots` | `logo`, `background` |
| `palette` | `#0b0b12`, `#7c5cff`, `#f5f5f7` |

```ts
import { socialFrameToolPlan } from "@repo/contracts/examples/canvas2d-social-frame-plan";
```

---

## Authoring / agent checklist

1. `target` is a valid `TargetId`; on ASAP path it is `"canvas2d"`.  
2. `params` entries use only M0b kinds (prefer ≥3).  
3. Every `assetRef.assetSlotId` exists in `assetSlots`.  
4. `assetSlots` may be empty; do not invent a brand kit.  
5. `motion` is concrete enough for codegen (not just `"cool"`); prefer `motionSpec` too.  
6. `concept` is one clear idea (one tool, not a multi-screen app).  
7. Fill DesignBrief v2 fields when art-directing (composition, paletteRoles, tags).  

---

## Out of scope (M0d)

- LLM prompts / system messages  
- Style-extract / vision node (M4)  
- Multi-target selection logic  
- Runtime execution of the plan (codegen is M3)  

---

## Import

```ts
import type { ToolPlan, AsapToolPlan, PlanAspect } from "@repo/contracts";
import {
  createAsapToolPlan,
  isAsapToolPlan,
  ASAP_TARGET,
} from "@repo/contracts";
```
