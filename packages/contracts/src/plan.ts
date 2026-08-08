/**
 * Plan JSON schema (M0d + AM1 DesignBrief v2).
 *
 * Structured plan the Create agent produces *before* codegen into a target skeleton.
 * ASAP critical path always sets `target: "canvas2d"`.
 *
 * DesignBrief v2 (AM1) adds optional art-direction fields while remaining
 * backward compatible with M0d ToolPlan consumers.
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
// DesignBrief v2 (AM1) — optional art-direction fields
// ---------------------------------------------------------------------------

/** Scene structure for codegen craft (layers, focal points, optional grid). */
export interface PlanComposition {
  /** Ordered layer descriptions from back to front. */
  layers?: readonly string[];
  /** Primary visual anchors (e.g. "center orb", "bottom headline"). */
  focalPoints?: readonly string[];
  /** Optional layout grid note (e.g. "centered column", "rule of thirds"). */
  grid?: string;
}

/**
 * Palette with semantic roles. Prefer `#rrggbb` hex.
 * Complements flat `palette?: string[]` (which remains for simple hints).
 */
export interface PlanPaletteRoles {
  bg?: string;
  ink?: string;
  accent?: string;
  highlight?: string;
}

/** Structured motion intent beyond free-text `motion`. */
export interface PlanMotionSpec {
  /** Short motion summary (may mirror `motion`). */
  summary?: string;
  /** Easing feel, e.g. "ease-out", "smoothstep", "springy". */
  easing?: string;
  /** Tempo label or relative rate, e.g. "slow", "medium", "1.2". */
  tempo?: string;
  /** Loop behavior, e.g. "seamless", "pingpong", "once". */
  loop?: string;
}

/** Type hierarchy hints for kinetic type / posters. */
export interface PlanTypography {
  /** Scale description, e.g. "display 72 / body 14" or "hero + caption". */
  scale?: string;
  /** Named levels, e.g. ["display", "label"]. */
  hierarchy?: readonly string[];
}

/**
 * Optional layout section for Studio Control (mirrors param `group` strings).
 * `params` remain the source of truth; sections are Art Director layout hints.
 */
export interface PlanControlSection {
  /** Stable id, e.g. "content", "interaction". */
  id: string;
  /** Section heading shown in Control UI. */
  label: string;
  /** Param `name`s in this section (must exist on `params` when present). */
  paramNames: readonly string[];
}

/**
 * Which params matter most to the user — control-surface intent.
 * Does not replace `params`; guides codegen defaults and prominence.
 */
export interface PlanControlSurface {
  /** Free-text intent for the control panel. */
  intent?: string;
  /** Param names the user should tweak first. */
  primaryParams?: readonly string[];
  /**
   * Ordered sections for the Edit Controllers panel.
   * Prefer also setting `group` on each param field.
   */
  sections?: readonly PlanControlSection[];
}

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
 * - No brand kit object — palette hints are optional strings / roles only
 * - DesignBrief v2 fields are optional; parsers must accept legacy plans
 */
export interface ToolPlan {
  /** Short description of the tool idea (from vision text). */
  concept: string;

  /** Output aspect, e.g. `1:1`, `9:16`, `16:9`. */
  aspect: PlanAspect;

  /**
   * Motion style / energy notes for codegen (free text).
   * Prefer also filling `motionSpec` when art-directing (AM1).
   */
  motion: string;

  /**
   * Param fields the tool will expose (M0b shape).
   * Becomes `getParamSchema()` + informs `getDefaultParams()`.
   * Art Director gate: prefer ≥3 params.
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

  // --- DesignBrief v2 (AM1) optional art direction ---

  /** Composition structure (layers, focal points, grid). */
  composition?: PlanComposition;

  /** Semantic palette roles (bg / ink / accent / highlight). */
  paletteRoles?: PlanPaletteRoles;

  /** Structured motion (easing, tempo, loop). */
  motionSpec?: PlanMotionSpec;

  /** Typography scale / hierarchy. */
  typography?: PlanTypography;

  /** Control-surface intent + primary param names. */
  controlSurface?: PlanControlSurface;

  /**
   * Retrieval tags for golden / boilerplate matching (AM1).
   * e.g. "kinetic-type", "particles", "gradient", "poster".
   */
  tags?: readonly string[];
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
