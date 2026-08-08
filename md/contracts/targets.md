# Target registry

**Milestone:** M0c  
**TS source of truth:** `@repo/contracts` → `packages/contracts/src/targets.ts`  
**Related:** [vibe-tool.md](./vibe-tool.md) · [skeletons/canvas2d.md](./skeletons/canvas2d.md) · Plan JSON (M0d)

---

## Closed set

A tool selects **exactly one** target. IDs are frozen:

```ts
type TargetId = "canvas2d" | "p5" | "three"
```

```ts
import {
  TARGET_IDS,
  TARGET_REGISTRY,
  ASAP_TARGET,
  isTargetId,
  isAsapTarget,
  type TargetId,
} from "@repo/contracts";
```

Do **not** add frameworks ad hoc (`react`, `svg`, …) on the ASAP path. Extending the registry is a product decision + new harness work.

---

## Launch status

| Target | ASAP path | Launch status | Libraries |
|--------|-----------|---------------|-----------|
| `canvas2d` | **Yes — required** | `required` | Browser Canvas 2D only |
| `p5` | No | `config_gated` | Canvas2D-backed stub harness (full p5 later) |
| `three` | No | `config_gated` | **B1–B5:** real harness + agent path; offline gates green via `scripts/eval_three.py`; enable with `VIBEIT_TARGET_THREE_ENABLED=1` — see [skeletons/three.md](./skeletons/three.md) |

| Status | Meaning |
|--------|---------|
| `required` | Must work for complete-loop MVP (Auth → Create → Studio → Export → Publish) |
| `named_only` | ID reserved in types/Plan; no ASAP harness/codegen |
| `config_gated` | May ship behind config once quality gates pass |

**ASAP rule:** Create agent and Plan always use `target: "canvas2d"` (`ASAP_TARGET`). Never pick `p5` / `three` on the critical path.

---

## Hard rules (all targets)

Same as the VibeTool contract — target only changes *how* drawing works:

1. No arbitrary npm  
2. No parent `window` / `top` access  
3. No unrestricted fetch / remote code  
4. Host loads **allowlisted** runtime for that target only  
5. One target per tool — do not mix canvas2d + p5 in one instance  
6. Same Control UI + export path via `VibeTool`

---

## When the agent picks which target

| Vision signal (later M3/M4) | Target |
|-----------------------------|--------|
| Kinetic type, 2D shapes, social frames, flat motion | `canvas2d` |
| Sketch / particles / classic creative-coding look | `p5` (after M2b) |
| 3D camera / materials / depth wow | `three` (gated) |

Until multi-target agent work lands, **always canvas2d**.

---

## Related artifacts

| Artifact | Path |
|----------|------|
| TS registry | `packages/contracts/src/targets.ts` |
| canvas2d skeleton | `md/contracts/skeletons/canvas2d.md` + `packages/contracts/src/skeletons/canvas2d.ts` |
| three skeleton + vendor pin (B1) | `md/contracts/skeletons/three.md` + `packages/contracts/src/skeletons/three{,-vendor}.ts` |
| Plan `target` field | **M0d** ✅ [plan-json.md](./plan-json.md) |
