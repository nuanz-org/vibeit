/* ─────────────────────────────────────────────────────────
 * Gallery motion — the house curve, nothing bounces.
 *
 * Canvas
 *    0ms   tiles fade + rise 10px, staggered 30ms (first paint only)
 *          inertia pan with drag / wheel / arrow keys
 *
 * Tool detail (click a tile)
 *    0ms   backdrop fades in (180ms)
 *    0ms   panel `panel-in`: fade + 8px rise (240ms)
 *   40ms   copy block rises in, actions at 80ms
 *
 * Reduced motion: everything instant; pan without inertia.
 * ───────────────────────────────────────────────────────── */

/** cubic-bezier(0.4, 0, 0.2, 1) — the only easing curve. */
export const EASE = [0.4, 0, 0.2, 1] as const;

/** Seconds, matching --dur-1/2/3. */
export const DUR = { press: 0.12, fast: 0.18, ui: 0.24 } as const;

export const CANVAS_PHYSICS = {
  /** Lerp factor toward target velocity while dragging. */
  velocityLerp: 0.22,
  /** Per-frame decay of target velocity (inertia). */
  velocityDecay: 0.92,
  /** Wheel → pan scale. */
  wheelScale: 0.85,
  /** Pointer drag → pan scale. */
  dragScale: 1,
  /** Stop integrating when speed is below this. */
  restEpsilon: 0.08,
  /** Max |velocity| clamp. */
  maxSpeed: 48,
} as const;

export const CARD_MOTION = {
  /** Entrance rise in px. */
  enterY: 10,
  /** Per-tile entrance delay in seconds, capped. */
  stagger: 0.03,
  maxDelay: 0.4,
} as const;
