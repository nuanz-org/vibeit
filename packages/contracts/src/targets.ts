/**
 * Target registry (M0c).
 *
 * Closed set of runtimes a tool may use. Agent selects exactly one per Plan.
 * ASAP critical path implements canvas2d only; p5/three are named until M2b+.
 *
 * Docs: md/contracts/targets.md
 */

/** Frozen target IDs — do not extend without a product decision. */
export const TARGET_IDS = ["canvas2d", "p5", "three"] as const;

/** Union of all registered target IDs. */
export type TargetId = (typeof TARGET_IDS)[number];

/** Target required for the ASAP complete loop. */
export const ASAP_TARGET = "canvas2d" as const satisfies TargetId;

/**
 * Launch readiness for a target.
 * - `required` — must work for core-loop exit
 * - `named_only` — id reserved; harness not on ASAP path
 * - `config_gated` — may ship behind a flag after evals
 */
export type TargetLaunchStatus = "required" | "named_only" | "config_gated";

export interface TargetDefinition {
  id: TargetId;
  /** Short product description. */
  description: string;
  launchStatus: TargetLaunchStatus;
  /** True if on the ASAP critical path (canvas2d only today). */
  asapPath: boolean;
  /** Allowed libraries / runtime surface (human-readable). */
  libraries: string;
}

/**
 * Single source of truth for target metadata.
 * Import this instead of hard-coding strings in Studio / agent / API.
 */
export const TARGET_REGISTRY: Record<TargetId, TargetDefinition> = {
  canvas2d: {
    id: "canvas2d",
    description: "Kinetic type, 2D shapes, social frames — browser Canvas 2D only",
    launchStatus: "required",
    asapPath: true,
    libraries: "Browser canvas APIs only (no extra libs)",
  },
  p5: {
    id: "p5",
    description: "Sketch-like motion, particles, type (p5.js)",
    launchStatus: "named_only",
    asapPath: false,
    libraries: "Allowlisted p5 bundle/CDN (full rules in M2b)",
  },
  three: {
    id: "three",
    description: "3D / camera / materials (three.js)",
    launchStatus: "config_gated",
    asapPath: false,
    libraries: "Allowlisted three bundle (full rules in M2b; gated until eval threshold)",
  },
};

/** Ordered list matching TARGET_IDS. */
export const TARGET_DEFINITIONS: readonly TargetDefinition[] = TARGET_IDS.map(
  (id) => TARGET_REGISTRY[id],
);

/** Type guard for unknown strings (plan JSON, API bodies). */
export function isTargetId(value: unknown): value is TargetId {
  return (
    typeof value === "string" &&
    (TARGET_IDS as readonly string[]).includes(value)
  );
}

/** ASAP path must never pick p5/three until those milestones land. */
export function isAsapTarget(id: TargetId): boolean {
  return TARGET_REGISTRY[id].asapPath;
}
