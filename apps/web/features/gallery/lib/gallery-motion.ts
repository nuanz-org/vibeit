/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Gallery infinite canvas
 *
 * Canvas idle
 *    0ms   cards rest in world space; inertia pan free
 *
 * Card open (click)
 *    0ms   selected card press scale 1 → 0.97
 *   40ms   backdrop fade 0 → 1 + canvas dim
 *    0ms   layoutId morph: canvas tile → focus frame (spring)
 *  160ms   title + meta slide up (stagger 50ms)
 *  260ms   primary actions fade in
 *  300ms   “Open tool” gains focus ring pulse (once)
 *
 * Card close (Esc / backdrop)
 *    0ms   actions fade out
 *   40ms   meta fade
 *   80ms   layoutId morph back + backdrop out
 * ───────────────────────────────────────────────────────── */

export const OPEN_TIMING = {
  press: 0,
  backdrop: 40,
  morph: 0,
  meta: 160,
  actions: 260,
  focusPulse: 300,
} as const;

export const CLOSE_TIMING = {
  actions: 0,
  meta: 40,
  morph: 80,
} as const;

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
  initialScale: 0.96,
  pressScale: 0.97,
  hoverScale: 1.03,
  hoverY: -4,
  restSpring: {
    type: "spring" as const,
    stiffness: 380,
    damping: 32,
    bounce: 0,
  },
  hoverSpring: {
    type: "spring" as const,
    stiffness: 420,
    damping: 28,
    bounce: 0,
  },
};

export const FOCUS = {
  initialScale: 0.94,
  finalScale: 1,
  spring: {
    type: "spring" as const,
    stiffness: 320,
    damping: 34,
    bounce: 0,
  },
  metaOffsetY: 12,
  metaStagger: 0.05,
  metaSpring: {
    type: "spring" as const,
    stiffness: 360,
    damping: 30,
    bounce: 0,
  },
  backdrop: {
    duration: 0.28,
    ease: [0.2, 0, 0, 1] as const,
  },
};

export const CANVAS_ENTER = {
  stagger: 0.035,
  offsetY: 18,
  spring: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    bounce: 0,
  },
};
