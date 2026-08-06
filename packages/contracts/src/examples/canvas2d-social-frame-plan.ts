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
}) satisfies AsapToolPlan;

/** Same fixture typed as general ToolPlan (multi-target union). */
export const socialFrameToolPlanAsToolPlan: ToolPlan = socialFrameToolPlan;
