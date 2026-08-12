/**
 * A6: group ParamSchema into Studio Control sections.
 * Pure helpers — no React.
 */

import type { ParamField, ParamSchema } from "@repo/contracts";

export type ParamSection = {
  /** Stable key for collapse state / React key. */
  id: string;
  /** Display title. */
  label: string;
  fields: ParamField[];
};

const UNGROUPED = "Params";
const COLORS = "Colors";
const LINKED = "Linked slots";

function isHidden(field: ParamField): boolean {
  return field.uiHint === "hidden";
}

/**
 * When any visible field has `group`, partition by that string (schema order).
 * First occurrence of a group title wins ordering.
 * Fields without group go to "Params" at the end of their relative order
 * (inserted when first ungrouped field appears, or appended last).
 */
export function groupParamsBySchema(schema: ParamSchema): ParamSection[] {
  const visible = schema.filter((f) => !isHidden(f));
  if (visible.length === 0) return [];

  const hasAnyGroup = visible.some(
    (f) => typeof f.group === "string" && f.group.trim().length > 0,
  );

  if (!hasAnyGroup) {
    // Legacy layout: Colors → other (non-assetRef) → Linked slots
    const colors = visible.filter((f) => f.kind === "color");
    const assetRefs = visible.filter((f) => f.kind === "assetRef");
    const rest = visible.filter(
      (f) => f.kind !== "color" && f.kind !== "assetRef",
    );
    const out: ParamSection[] = [];
    if (colors.length) {
      out.push({ id: "legacy-colors", label: COLORS, fields: colors });
    }
    if (rest.length) {
      out.push({ id: "legacy-params", label: UNGROUPED, fields: rest });
    }
    if (assetRefs.length) {
      out.push({ id: "legacy-assets", label: LINKED, fields: assetRefs });
    }
    return out;
  }

  const order: string[] = [];
  const map = new Map<string, ParamField[]>();

  for (const field of visible) {
    const raw =
      typeof field.group === "string" && field.group.trim()
        ? field.group.trim()
        : UNGROUPED;
    if (!map.has(raw)) {
      map.set(raw, []);
      order.push(raw);
    }
    map.get(raw)!.push(field);
  }

  return order.map((label) => ({
    id: `group-${slugSectionId(label)}`,
    label,
    fields: map.get(label) ?? [],
  }));
}

function slugSectionId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "section";
}

/** Enum → segmented when uiHint says so, or ≤4 options and not forced select. */
export function useSegmentedEnum(field: ParamField): boolean {
  if (field.kind !== "enum") return false;
  // presetGrid / select → dropdown (Studio soft-support until real grid)
  if (field.uiHint === "select" || field.uiHint === "presetGrid") return false;
  if (field.uiHint === "segmented") return true;
  const n = field.options?.length ?? 0;
  return n > 0 && n <= 4;
}

/** Boolean with playPause hint (Studio may still use switch chrome). */
export function usePlayPauseBoolean(field: ParamField): boolean {
  return field.kind === "boolean" && field.uiHint === "playPause";
}

/** Text with multiline hint. */
export function useTextarea(field: ParamField): boolean {
  return field.kind === "text" && field.uiHint === "textarea";
}

/** Number → slider unless uiHint forces something else (hidden handled earlier). */
export function useSliderNumber(field: ParamField): boolean {
  if (field.kind !== "number") return false;
  if (field.uiHint === "hidden") return false;
  // Default: slider (existing UX). No number-input kind in uiHint set.
  return field.uiHint !== "select";
}
