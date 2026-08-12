/**
 * Control Tool Catalog — abstract kind templates the Plan agent selects from.
 *
 * Seed data: `control-catalog.seed.json` (shared with Python agent).
 * Docs: md/contracts/control-catalog.md
 */

import type { ParamFieldKind, ParamUiHint } from "./param-schema";
import seed from "./control-catalog.seed.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ControlCatalogStatus = "active" | "experimental" | "deprecated";

/**
 * Partial param shape used as a template when resolving a catalog selection.
 * Concrete `name` / `default` / ranges come from plan overrides.
 */
export type ControlCatalogTemplate = {
  kind: ParamFieldKind;
  uiHint?: ParamUiHint;
  label?: string;
  description?: string;
  group?: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  placeholder?: string;
  options?: readonly { value: string; label?: string }[];
  assetSlotId?: string;
};

export type ControlCatalogEntry = {
  /** Stable id, e.g. `number.slider`. */
  id: string;
  /** Entry schema version (independent of catalog version). */
  version: number;
  kind: ParamFieldKind;
  uiHint?: ParamUiHint;
  label: string;
  whenToUse: string;
  whenNotToUse: string;
  template: ControlCatalogTemplate;
  requiresAssetSlot?: boolean;
  status: ControlCatalogStatus;
  /** Optional runtime target filter; omit = all targets. */
  targets?: readonly string[];
};

export type ControlCatalog = {
  version: string;
  entries: readonly ControlCatalogEntry[];
};

// ---------------------------------------------------------------------------
// Plan inventory (selection layer → merges into ToolPlan.params)
// ---------------------------------------------------------------------------

export type ControlInventorySelected = {
  catalogId: string;
  /** Concrete param name on the tool. */
  name: string;
  /** Overrides merged over catalog template. */
  overrides?: Record<string, unknown>;
};

export type ControlInventorySkipped = {
  catalogId: string;
  reason: string;
};

/**
 * Plan-time control inventory. Resolver materializes this into `params`.
 * Runtime Studio/codegen only need the resolved `params`.
 */
export type ControlInventory = {
  catalogVersion: string;
  selected: readonly ControlInventorySelected[];
  skipped?: readonly ControlInventorySkipped[];
  /** Params not backed by a catalog template (still must use allowed kinds). */
  custom: readonly Record<string, unknown>[];
};

// ---------------------------------------------------------------------------
// Seed catalog
// ---------------------------------------------------------------------------

export const CONTROL_CATALOG_VERSION: string = String(
  (seed as { version: string }).version,
);

export const CONTROL_CATALOG: ControlCatalog = {
  version: CONTROL_CATALOG_VERSION,
  entries: (seed as { entries: ControlCatalogEntry[] }).entries,
};

export function getActiveControlCatalogEntries(
  catalog: ControlCatalog = CONTROL_CATALOG,
): readonly ControlCatalogEntry[] {
  return catalog.entries.filter((e) => e.status === "active");
}

export function getControlCatalogEntry(
  id: string,
  catalog: ControlCatalog = CONTROL_CATALOG,
): ControlCatalogEntry | undefined {
  return catalog.entries.find((e) => e.id === id);
}
