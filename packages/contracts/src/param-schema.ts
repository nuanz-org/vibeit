/**
 * Param schema + asset slot conventions (M0b).
 *
 * Schema drives Studio Control UI and codegen defaults.
 * Params and assets stay separate — no brand kit object at create/mount.
 *
 * Docs: md/contracts/param-schema.md
 */

// ---------------------------------------------------------------------------
// Param field kinds (closed set for MVP)
// ---------------------------------------------------------------------------

/** Closed set of Control-driven param kinds. */
export type ParamFieldKind =
  | "color"
  | "number"
  | "text"
  | "enum"
  | "boolean"
  | "assetRef";

/**
 * Optional Studio widget hint (Brik-class control surfaces).
 * When omitted, Studio infers from `kind` (number→slider, boolean→switch, etc.).
 */
export type ParamUiHint =
  | "slider"
  | "segmented"
  | "select"
  | "switch"
  | "hidden";

/** Shared fields on every param schema entry. */
export interface ParamFieldBase {
  /** Stable key; must match keys in `ToolParams` / `getDefaultParams()`. */
  name: string;
  /** Human label for Control UI (falls back to `name` if omitted). */
  label?: string;
  /** Optional help text under the control. */
  description?: string;
  /**
   * Control panel section title (e.g. "Distortion Effect", "Card Styling").
   * Studio groups fields by this string when present.
   */
  group?: string;
  /** Prefer a specific widget when `kind` alone is ambiguous. */
  uiHint?: ParamUiHint;
}

/** CSS-friendly color string. Prefer `#rrggbb` or `#rrggbbaa` for MVP. */
export type ColorValue = string;

export interface ColorParamField extends ParamFieldBase {
  kind: "color";
  default: ColorValue;
}

export interface NumberParamField extends ParamFieldBase {
  kind: "number";
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface TextParamField extends ParamFieldBase {
  kind: "text";
  default: string;
  /** Soft limit for Control input; not a runtime hard fail. */
  maxLength?: number;
  placeholder?: string;
}

export interface EnumOption {
  value: string;
  label?: string;
}

export interface EnumParamField extends ParamFieldBase {
  kind: "enum";
  default: string;
  /** Non-empty; `default` must be one of `options[].value`. */
  options: readonly EnumOption[];
}

export interface BooleanParamField extends ParamFieldBase {
  kind: "boolean";
  default: boolean;
}

/**
 * Param that points at a named asset slot from `getAssetSlots()`.
 * Runtime image data lives in `ToolAssets[assetSlotId]`, not in the param value.
 * Param value is typically the slot id string (for schema completeness / UI focus).
 */
export interface AssetRefParamField extends ParamFieldBase {
  kind: "assetRef";
  /** Must match an `AssetSlot.id`. */
  assetSlotId: string;
  /** Usually the same as `assetSlotId`; may be omitted when slot starts empty. */
  default?: string;
}

/**
 * Discriminated union of all MVP param field shapes.
 * Control UI maps `kind` → control widget (see param-schema.md).
 */
export type ParamField =
  | ColorParamField
  | NumberParamField
  | TextParamField
  | EnumParamField
  | BooleanParamField
  | AssetRefParamField;

/** Ordered list of param fields returned by `getParamSchema()`. */
export type ParamSchema = readonly ParamField[];

// ---------------------------------------------------------------------------
// Asset slots (uploads) — separate from params
// ---------------------------------------------------------------------------

/**
 * Named slot for user-uploaded media.
 * Bound at runtime via `setAssets` / `MountOptions.assets`, not via brand kit.
 */
export interface AssetSlot {
  /** Stable id; keys `ToolAssets`. */
  id: string;
  label?: string;
  description?: string;
  /**
   * MIME accept string for file pickers.
   * Default when omitted: `image/*`.
   */
  accept?: string;
  /** When true, Studio may warn if empty before export/publish. */
  required?: boolean;
  /**
   * Aspect hint for UI crop/placeholder, e.g. `1:1`, `16:9`, `9:16`.
   * Not a hard crop constraint in MVP.
   */
  aspectHint?: string;
}

/** Ordered list of asset slots returned by `getAssetSlots()`. */
export type AssetSlots = readonly AssetSlot[];

// ---------------------------------------------------------------------------
// Value typing helpers (optional for hand-authored tools)
// ---------------------------------------------------------------------------

/** Runtime value type for a single param kind. */
export type ParamValueForKind<K extends ParamFieldKind> = K extends "color"
  ? ColorValue
  : K extends "number"
    ? number
    : K extends "text"
      ? string
      : K extends "enum"
        ? string
        : K extends "boolean"
          ? boolean
          : K extends "assetRef"
            ? string
            : never;
