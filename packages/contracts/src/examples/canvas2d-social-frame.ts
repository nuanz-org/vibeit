/**
 * Example canvas2d tool schema: kinetic social frame (M0b fixture).
 *
 * 5+ params + 2 asset slots. Validates types and documents Control mapping.
 * Not a runnable tool — runtime harness lands in M0c / M2a.
 */

import type { AssetSlots, ParamSchema } from "../param-schema.js";
import type { TargetId } from "../targets.js";
import type { ToolParams } from "../vibe-tool.js";

/** Asset slots: logo mark + optional full-bleed background. */
export const socialFrameAssetSlots = [
  {
    id: "logo",
    label: "Logo",
    description: "Brand mark overlaid on the frame",
    accept: "image/*",
    required: false,
    aspectHint: "1:1",
  },
  {
    id: "background",
    label: "Background",
    description: "Optional photo or texture behind motion",
    accept: "image/*",
    required: false,
    aspectHint: "9:16",
  },
] as const satisfies AssetSlots;

/** Control-driven params for a simple social / kinetic frame tool. */
export const socialFrameParamSchema = [
  {
    name: "bg",
    kind: "color",
    label: "Background color",
    default: "#0b0b12",
  },
  {
    name: "accent",
    kind: "color",
    label: "Accent",
    default: "#7c5cff",
  },
  {
    name: "title",
    kind: "text",
    label: "Headline",
    default: "Your vibe",
    maxLength: 48,
    placeholder: "Headline text",
  },
  {
    name: "speed",
    kind: "number",
    label: "Motion speed",
    default: 1,
    min: 0,
    max: 3,
    step: 0.05,
  },
  {
    name: "motionPreset",
    kind: "enum",
    label: "Motion",
    default: "pulse",
    options: [
      { value: "pulse", label: "Pulse" },
      { value: "drift", label: "Drift" },
      { value: "none", label: "Still" },
    ],
  },
  {
    name: "showGrid",
    kind: "boolean",
    label: "Show grid",
    default: false,
  },
  {
    name: "logoSlot",
    kind: "assetRef",
    label: "Logo",
    assetSlotId: "logo",
    default: "logo",
  },
] as const satisfies ParamSchema;

/** Defaults derived from schema (what `getDefaultParams()` would return). */
export const socialFrameDefaultParams = {
  bg: "#0b0b12",
  accent: "#7c5cff",
  title: "Your vibe",
  speed: 1,
  motionPreset: "pulse",
  showGrid: false,
  logoSlot: "logo",
} as const satisfies ToolParams;

/** Fixture bundle for docs and tests. */
export const socialFrameExample = {
  target: "canvas2d" as TargetId,
  name: "social-frame",
  description:
    "Kinetic social frame with headline, palette, motion, logo + background slots",
  params: socialFrameParamSchema,
  assetSlots: socialFrameAssetSlots,
  defaultParams: socialFrameDefaultParams,
};

export type SocialFrameParams = typeof socialFrameDefaultParams;
