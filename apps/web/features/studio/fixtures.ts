/**
 * Studio fixture registry (M2a5).
 *
 * Parent never imports tool factories for execution — the sandboxed frame
 * loads the reference tool. This map is metadata for routing + chrome only.
 */

export type StudioFixtureMeta = {
  /** URL segment: /studio/[toolId] */
  toolId: string;
  /** Host mount toolId for logging */
  runtimeToolId: string;
  label: string;
  description: string;
  target: "canvas2d";
};

export const STUDIO_FIXTURES: Record<string, StudioFixtureMeta> = {
  "social-frame": {
    toolId: "social-frame",
    runtimeToolId: "fixture:social-frame",
    label: "Social frame",
    description:
      "Kinetic 9:16 social frame — params, logo + background slots (M2a4 reference).",
    target: "canvas2d",
  },
};

export const DEFAULT_STUDIO_FIXTURE_ID = "social-frame";

export function resolveStudioFixture(
  toolId: string | undefined,
): StudioFixtureMeta | null {
  if (!toolId) return STUDIO_FIXTURES[DEFAULT_STUDIO_FIXTURE_ID] ?? null;
  return STUDIO_FIXTURES[toolId] ?? null;
}
