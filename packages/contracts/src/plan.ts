/**
 * Plan JSON schema (M0d).
 *
 * Structured plan the Create agent produces *before* codegen into a target skeleton.
 * ASAP critical path always sets `target: "canvas2d"`.
 *
 * Linkage:
 * - Plan → codegen fills canvas2d creative body (M3) via M0c skeleton
 * - Plan metadata may persist on `tool_versions.plan` (M1b)
 *
 * Docs: md/contracts/plan-json.md
 */

import type { AssetSlots, ParamSchema } from "./param-schema";
import { ASAP_TARGET, type TargetId } from "./targets";

// ---------------------------------------------------------------------------
// Aspect
// ---------------------------------------------------------------------------

/**
 * Frame aspect for layout / harness sizing.
 * Common social ratios are listed; other `"W:H"` strings are allowed.
 */
export type PlanAspect = "1:1" | "9:16" | "16:9" | "4:5" | (string & {});

// ---------------------------------------------------------------------------
// ToolPlan
// ---------------------------------------------------------------------------

/**
 * Create-agent plan: one tool concept, one target, params + slots to expose.
 *
 * Rules:
 * - Exactly **one** `target` (never mix runtimes in one plan)
 * - ASAP path: `target` must be `"canvas2d"` (`ASAP_TARGET`)
 * - `params` / `assetSlots` follow M0b conventions
 * - No brand kit object — palette hints are optional strings only
 */
export interface ToolPlan {
  /** Short description of the tool idea (from vision text). */
  concept: string;

  /** Output aspect, e.g. `1:1`, `9:16`, `16:9`. */
  aspect: PlanAspect;

  /** Motion style / energy notes for codegen (free text). */
  motion: string;

  /**
   * Param fields the tool will expose (M0b shape).
   * Becomes `getParamSchema()` + informs `getDefaultParams()`.
   */
  params: ParamSchema;

  /**
   * Asset slots the tool will declare (may be empty `[]`).
   * Becomes `getAssetSlots()`.
   */
  assetSlots: AssetSlots;

  /**
   * Runtime target. Union allows p5/three for later multi-target agent (M4).
   * ASAP critical path always uses `"canvas2d"`.
   */
  target: TargetId;

  /**
   * Optional color hints from vision / inspiration (M4).
   * Prefer `#rrggbb` strings; not a full brand kit.
   */
  palette?: readonly string[];

  /** Freeform agent notes (debug, constraints, style keywords). */
  notes?: string;
}

/**
 * Plan constrained to the ASAP critical-path target.
 * Prefer this type in M3 Create graph until multi-target ships.
 */
export type AsapToolPlan = ToolPlan & {
  target: typeof ASAP_TARGET;
};

/** Runtime check: plan is on the ASAP path. */
export function isAsapToolPlan(plan: ToolPlan): plan is AsapToolPlan {
  return plan.target === ASAP_TARGET;
}

/**
 * Narrow helper for building ASAP plans without repeating the target literal.
 * Does not validate param/slot consistency (that is author/agent responsibility).
 */
export function createAsapToolPlan(
  plan: Omit<ToolPlan, "target">,
): AsapToolPlan {
  return {
    ...plan,
    target: ASAP_TARGET,
  };
}
