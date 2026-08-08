/**
 * Normalize tool_versions.target (or plan target) for Studio / public mount (B3).
 *
 * Unknown / missing values fall back to canvas2d (ASAP path).
 */

import { isTargetId, type TargetId } from "@repo/contracts";

export type RuntimeTargetId = TargetId;

/**
 * Coerce API / plan target strings into a closed TargetId.
 * @example resolveRuntimeTarget("three") → "three"
 * @example resolveRuntimeTarget("nope") → "canvas2d"
 */
export function resolveRuntimeTarget(value: unknown): RuntimeTargetId {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isTargetId(trimmed)) return trimmed;
  }
  return "canvas2d";
}

/** True when the target needs the real three harness (product-vendored three). */
export function isThreeRuntimeTarget(target: RuntimeTargetId): boolean {
  return target === "three";
}
