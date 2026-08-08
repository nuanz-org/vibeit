"use client";

import { useCallback, useMemo, useState } from "react";

import type { ParamField, ParamSchema } from "@repo/contracts";
import type { ToolParams } from "@repo/contracts";

import {
  groupParamsBySchema,
  useSegmentedEnum,
} from "../lib/group-params";
import styles from "../styles.module.css";

export type ParamControlsProps = {
  schema: ParamSchema;
  params: ToolParams;
  onChange: (name: string, value: unknown) => void;
  /** M5a: restore defaults (live update, no remount). */
  onResetDefaults?: () => void;
  /**
   * M5a: assetRef fields deep-link here (scroll/focus Assets panel).
   * Does not hold image bytes — params stay separate from slots.
   */
  onFocusAssetSlot?: (slotId: string) => void;
  disabled?: boolean;
};

/**
 * Schema-driven Control fields (M2a5 + M5a + A6 sections).
 * Groups by `field.group` when present; collapsible sections.
 * Enums: segmented (≤4 or uiHint) / select; booleans: switch; numbers: slider.
 */
export function ParamControls({
  schema,
  params,
  onChange,
  onResetDefaults,
  onFocusAssetSlot,
  disabled,
}: ParamControlsProps) {
  const sections = useMemo(() => groupParamsBySchema(schema), [schema]);

  // Collapse state: all open by default; user can collapse.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (schema.length === 0 || sections.length === 0) {
    return <p className={styles.muted}>No params for this tool.</p>;
  }

  return (
    <div className={styles.controlStack}>
      <div className={styles.presetBar}>
        <button
          type="button"
          className={styles.presetChip}
          disabled={disabled || !onResetDefaults}
          onClick={() => onResetDefaults?.()}
          title="Restore getDefaultParams() / version defaults"
        >
          Reset to defaults
        </button>
      </div>

      {sections.map((section, index) => {
        const isCollapsed = Boolean(collapsed[section.id]);
        // First section stays open unless user collapses; others same default open
        const open = !isCollapsed;
        return (
          <div
            key={section.id}
            className={styles.controlSection}
            data-section={section.id}
            data-open={open ? "true" : "false"}
          >
            <button
              type="button"
              className={styles.controlSectionHeader}
              onClick={() => toggle(section.id)}
              aria-expanded={open}
              aria-controls={`${section.id}-body`}
              id={`${section.id}-header`}
            >
              <span className={styles.controlSectionTitle}>{section.label}</span>
              <span className={styles.controlSectionMeta}>
                {section.fields.length}
                <span
                  className={styles.controlSectionChevron}
                  data-open={open ? "true" : "false"}
                  aria-hidden
                >
                  ▾
                </span>
              </span>
            </button>
            {open ? (
              <div
                className={styles.controlSectionBody}
                id={`${section.id}-body`}
                role="region"
                aria-labelledby={`${section.id}-header`}
                style={{
                  // Subtle stagger for first paint of multi-section tools
                  animationDelay: `${Math.min(index, 4) * 40}ms`,
                }}
              >
                {section.id === "legacy-colors" ? (
                  <p className={styles.muted}>
                    Palette overrides — live preview, no regenerate.
                  </p>
                ) : null}
                {section.id === "legacy-assets" ? (
                  <p className={styles.muted}>
                    These params point at asset slots — upload images in Assets
                    below.
                  </p>
                ) : null}
                <div className={styles.controlList}>
                  {section.fields.map((field) => (
                    <ParamFieldControl
                      key={field.name}
                      field={field}
                      value={params[field.name]}
                      disabled={disabled}
                      onChange={(value) => onChange(field.name, value)}
                      onFocusAssetSlot={onFocusAssetSlot}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ParamFieldControl({
  field,
  value,
  onChange,
  onFocusAssetSlot,
  disabled,
}: {
  field: ParamField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFocusAssetSlot?: (slotId: string) => void;
  disabled?: boolean;
}) {
  if (field.uiHint === "hidden") return null;

  const label = field.label ?? field.name;

  switch (field.kind) {
    case "color": {
      const hex =
        typeof value === "string" && value.startsWith("#")
          ? value.slice(0, 7)
          : typeof field.default === "string"
            ? field.default.slice(0, 7)
            : "#000000";
      return (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{label}</span>
          <div className={styles.colorRow}>
            <input
              type="color"
              value={hex}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className={styles.colorInput}
            />
            <input
              type="text"
              value={typeof value === "string" ? value : hex}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className={styles.textInput}
              spellCheck={false}
            />
          </div>
          {field.description ? (
            <span className={styles.fieldHint}>{field.description}</span>
          ) : null}
        </label>
      );
    }
    case "number": {
      const n =
        typeof value === "number" && Number.isFinite(value)
          ? value
          : field.default;
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 2) : 0;
      const display =
        decimals > 0 ? Number(n).toFixed(Math.min(decimals, 3)) : String(n);
      return (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            {label}
            <span className={styles.fieldValue}>{display}</span>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={n}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className={styles.rangeInput}
          />
          {field.description ? (
            <span className={styles.fieldHint}>{field.description}</span>
          ) : null}
        </label>
      );
    }
    case "text": {
      const text =
        typeof value === "string" ? value : String(field.default ?? "");
      return (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{label}</span>
          <input
            type="text"
            value={text}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={styles.textInput}
          />
          {field.description ? (
            <span className={styles.fieldHint}>{field.description}</span>
          ) : null}
        </label>
      );
    }
    case "enum": {
      const current =
        typeof value === "string" ? value : String(field.default ?? "");
      const segmented = useSegmentedEnum(field);

      if (segmented) {
        return (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{label}</span>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-label={label}
            >
              {field.options.map((opt) => {
                const selected = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={styles.segment}
                    data-selected={selected ? "true" : "false"}
                    disabled={disabled}
                    onClick={() => onChange(opt.value)}
                  >
                    {opt.label ?? opt.value}
                  </button>
                );
              })}
            </div>
            {field.description ? (
              <span className={styles.fieldHint}>{field.description}</span>
            ) : null}
          </div>
        );
      }

      return (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{label}</span>
          <select
            value={current}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={styles.selectInput}
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label ?? opt.value}
              </option>
            ))}
          </select>
          {field.description ? (
            <span className={styles.fieldHint}>{field.description}</span>
          ) : null}
        </label>
      );
    }
    case "boolean": {
      const checked =
        typeof value === "boolean" ? value : Boolean(field.default);
      return (
        <label className={styles.switchRow}>
          <span className={styles.switchText}>
            <span className={styles.fieldLabelInline}>{label}</span>
            {field.description ? (
              <span className={styles.fieldHint}>{field.description}</span>
            ) : null}
          </span>
          <span className={styles.switchTrack} data-checked={checked ? "true" : "false"}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              aria-label={label}
            />
            <span className={styles.switchThumb} aria-hidden />
          </span>
        </label>
      );
    }
    case "assetRef": {
      const slotId = field.assetSlotId;
      return (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{label}</span>
          <button
            type="button"
            className={styles.assetRefButton}
            disabled={disabled}
            onClick={() => onFocusAssetSlot?.(slotId)}
          >
            Open Assets · {slotId}
          </button>
          {field.description ? (
            <span className={styles.fieldHint}>{field.description}</span>
          ) : null}
        </div>
      );
    }
    default:
      return null;
  }
}
