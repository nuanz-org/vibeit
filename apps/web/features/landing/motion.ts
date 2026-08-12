/** Shared landing motion tokens — interface-craft storyboard constants. */

export const EASE_UI = [0.2, 0, 0, 1] as const;

export const HERO_TIMING = {
  atmosphere: 0,
  eyebrow: 60,
  title: 100,
  titleLine2: 180,
  body: 180,
  ctas: 260,
  frame: 300,
  messyChip: 420,
  satellites: 520,
} as const;

export const FRAME_MOTION = {
  initialScale: 0.97,
  finalScale: 1,
  spring: { type: "spring" as const, stiffness: 280, damping: 32, bounce: 0 },
};

export const SATELLITE_MOTION = {
  stagger: 0.09,
  offsetY: 10,
  spring: { type: "spring" as const, stiffness: 320, damping: 30, bounce: 0 },
};

export const SECTION_TIMING = {
  title: 0,
  body: 100,
  frame: 180,
  rows: 320,
  rowStagger: 0.08,
} as const;

export const FLOW_STAGGER = 0.1;

export const CONTROL_LOOP_MS = 3000;
