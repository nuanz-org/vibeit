/**
 * Product-vendored three.js (B1 design freeze).
 *
 * Supply chain:
 * - Pin lives in `@repo/contracts` package.json (`three` exact version).
 * - Resolved via npm/pnpm lockfile — never esm.sh, unpkg, jsdelivr, or other CDN.
 * - Frame CSP (`connect-src 'none'`, `script-src 'self' blob:`) already forbids remote loads.
 *
 * Who may import this module:
 * - Product harness code only (`skeletons/three.ts` in B2+).
 * - Tool / agent creative source must NOT import this path or bare `"three"`.
 *   Creative code continues to use only `@repo/contracts/skeletons/three` (createThreeTool).
 *
 * Delivery (B2):
 * - Harness (`skeletons/three.ts`) imports this surface; esbuild bundles three into tool ESM.
 * - Compile minify + COMPILED_JS_MAX_CHARS 1.5M (was 500k) so three fits.
 * - Frame-preload + external remains a future optimization (same pin, still no CDN).
 *
 * Docs: md/contracts/skeletons/three.md
 */

/**
 * Exact three.js version pinned for Aiditr Track B.
 * Keep in sync with `dependencies.three` in packages/contracts/package.json.
 */
export const THREE_AIDITR_PIN = "0.185.1" as const;

/** Human-readable product label for gates / docs. */
export const THREE_AIDITR_SUPPLY = "npm:three@0.185.1 (product-vendored; no CDN)" as const;

// Re-export the pinned package so product code has one import path.
// B2 harness will use this; creative tool source must not.
export * as THREE from "three";
export { THREE_AIDITR_PIN as THREE_VERSION };
