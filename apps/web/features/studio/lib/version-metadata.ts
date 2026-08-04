/**
 * Parse tool version metadata from API JSON into Control-safe shapes (M5e).
 * Invalid/empty schema falls back to host introspection (no crash).
 */

import type {
  AssetSlot,
  AssetSlots,
  ParamField,
  ParamFieldKind,
  ParamSchema,
  ToolParams,
} from "@repo/contracts";

const PARAM_KINDS = new Set<ParamFieldKind>([
  "color",
  "number",
  "text",
  "enum",
  "boolean",
  "assetRef",
]);

export function asParams(value: unknown): ToolParams {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ToolParams;
  }
  return {};
}

export function asDraftAssets(
  value: unknown,
): Record<string, string | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v == null) {
      out[k] = null;
    } else if (typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

function isParamField(raw: unknown): raw is ParamField {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) return false;
  if (typeof o.kind !== "string" || !PARAM_KINDS.has(o.kind as ParamFieldKind)) {
    return false;
  }
  if (o.kind === "assetRef") {
    return typeof o.assetSlotId === "string" && Boolean(o.assetSlotId);
  }
  if (o.kind === "enum") {
    return Array.isArray(o.options) && o.options.length > 0;
  }
  // default required for non-assetRef kinds (soft check)
  return "default" in o;
}

/**
 * Prefer API paramSchema when non-empty and valid; else null (use host).
 */
export function parseVersionParamSchema(value: unknown): ParamSchema | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const fields: ParamField[] = [];
  for (const item of value) {
    if (isParamField(item)) {
      fields.push(item);
    }
  }
  return fields.length > 0 ? fields : null;
}

function isAssetSlot(raw: unknown): raw is AssetSlot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return typeof o.id === "string" && Boolean(o.id.trim());
}

/** Prefer API assetSlots when non-empty and valid; else null (use host). */
export function parseVersionAssetSlots(value: unknown): AssetSlots | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const slots: AssetSlot[] = [];
  for (const item of value) {
    if (isAssetSlot(item)) {
      slots.push(item as AssetSlot);
    }
  }
  return slots.length > 0 ? slots : null;
}
