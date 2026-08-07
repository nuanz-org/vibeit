/**
 * Example Create Plan for a kinetic social-frame canvas2d tool (M0d fixture).
 *
 * Aligns with M0b social-frame param/asset example.
 * Not an LLM prompt — structured agent *output* shape only.
 */

import { createAsapToolPlan } from "../plan";
import type { AsapToolPlan, ToolPlan } from "../plan";
import {
  socialFrameAssetSlots,
  socialFrameParamSchema,
} from "./canvas2d-social-frame";

/**
 * Hand-authored plan fixture that `satisfies ToolPlan` / `AsapToolPlan`.
 * Mirrors what M3 Create should emit before codegen into the canvas2d skeleton.
 */
export const socialFrameToolPlan = createAsapToolPlan({
  concept:
    "Kinetic social frame with bold headline, accent pulse, logo mark, and optional background photo",
  aspect: "9:16",
  motion:
    "Gentle pulse on the accent orb; headline static; logo centered; subtle drift if background present",
  params: socialFrameParamSchema,
  assetSlots: socialFrameAssetSlots,
  palette: ["#0b0b12", "#7c5cff", "#f5f5f7"],
  notes:
    "ASAP path: target fixed to canvas2d. Codegen fills CREATIVE_FILL only; harness from createCanvas2dTool.",
  // DesignBrief v2 (AM1) — optional art direction
  composition: {
    layers: ["bg photo/color", "vignette", "accent orb", "logo", "headline"],
    focalPoints: ["center mark", "headline"],
    grid: "centered column 9:16",
  },
  paletteRoles: {
    bg: "#0b0b12",
    ink: "#f5f5f7",
    accent: "#7c5cff",
  },
  motionSpec: {
    summary: "Gentle pulse / optional drift",
    easing: "sine",
    tempo: "medium",
    loop: "seamless",
  },
  typography: {
    scale: "display headline + footer label",
    hierarchy: ["display", "label"],
  },
  controlSurface: {
    intent: "Tune color, speed, and headline for social export",
    primaryParams: ["title", "accent", "speed", "motionPreset"],
  },
  tags: ["social", "badge", "kinetic-type"],
}) satisfies AsapToolPlan;

/** Same fixture typed as general ToolPlan (multi-target union). */
export const socialFrameToolPlanAsToolPlan: ToolPlan = socialFrameToolPlan;
