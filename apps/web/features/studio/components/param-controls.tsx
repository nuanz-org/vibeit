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
   * When true, hide the internal Reset control (header hosts it).
   */
  hideReset?: boolean;
  /**
   * M5a: assetRef fields deep-link here (scroll/focus Assets panel).
   * Does not hold image bytes — params stay separate from slots.
   */
  onFocusAssetSlot?: (slotId: string) => void;
  disabled?: boolean;
};

/**
 * Brik-class schema-driven Control fields.
 * Flat accordion sections · horizontal label | control rows · fill-bar numbers.
 */
export function ParamControls({
  schema,
  params,
  onChange,
  onResetDefaults,
  hideReset = false,
  onFocusAssetSlot,
  disabled,
}: ParamControlsProps) {
  const sections = useMemo(() => groupParamsBySchema(schema), [schema]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (schema.length === 0 || sections.length === 0) {
    return <p className={styles.muted}>No params for this tool.</p>;
  }

  return (
    <div className={styles.controlStack}>
      {!hideReset && onResetDefaults ? (
        <div className={styles.controlToolbar}>
          <button
            type="button"
            className={styles.resetLink}
            disabled={disabled}
            onClick={() => onResetDefaults()}
            title="Restore default parameters"
          >
            <ResetIcon />
            Reset
          </button>
        </div>
      ) : null}

      <div className={styles.controlAccordion}>
        {sections.map((section) => {
          const isCollapsed = Boolean(collapsed[section.id]);
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
                <span className={styles.controlSectionTitle}>
                  {section.label}
                </span>
                <span
                  className={styles.controlSectionChevron}
                  data-open={open ? "true" : "false"}
                  aria-hidden
                >
                  <ChevronIcon />
                </span>
              </button>
              {open ? (
                <div
                  className={styles.controlSectionBody}
                  id={`${section.id}-body`}
                  role="region"
                  aria-labelledby={`${section.id}-header`}
                >
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
      const raw =
        typeof value === "string" && value.length > 0
          ? value
          : typeof field.default === "string"
            ? field.default
            : "#000000";
      const hex = normalizeHex(raw);
      return (
        <div className={styles.fieldRow}>
          <span className={styles.fieldRowLabel} title={field.description}>
            {label}
          </span>
          <div className={styles.colorControl}>
            <label className={styles.colorSwatch}>
              <input
                type="color"
                value={hex}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className={styles.colorInputNative}
                aria-label={`${label} color`}
              />
              <span
                className={styles.colorSwatchFace}
                style={{ background: hex }}
                aria-hidden
              />
            </label>
            <input
              type="text"
              value={typeof value === "string" ? value.toUpperCase() : hex}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className={styles.colorHex}
              spellCheck={false}
              aria-label={`${label} hex`}
            />
          </div>
        </div>
      );
    }
    case "number": {
      const n =
        typeof value === "number" && Number.isFinite(value)
          ? value
          : typeof field.default === "number"
            ? field.default
            : 0;
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 2) : 0;
      const display =
        decimals > 0 ? Number(n).toFixed(Math.min(decimals, 3)) : String(n);
      const span = max - min || 1;
      const pct = Math.min(100, Math.max(0, ((n - min) / span) * 100));
      const highFill = pct >= 42;

      return (
        <div className={styles.fieldRow}>
          <span className={styles.fieldRowLabel} title={field.description}>
            {label}
          </span>
          <div
            className={styles.valueSlider}
            data-high={highFill ? "true" : "false"}
            data-disabled={disabled ? "true" : "false"}
          >
            <div
              className={styles.valueSliderFill}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <span className={styles.valueSliderReadout}>{display}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={n}
              disabled={disabled}
              onChange={(e) => onChange(Number(e.target.value))}
              className={styles.valueSliderInput}
              aria-label={label}
            />
          </div>
        </div>
      );
    }
    case "text": {
      const text =
        typeof value === "string" ? value : String(field.default ?? "");
      return (
        <div className={styles.fieldRow}>
          <span className={styles.fieldRowLabel} title={field.description}>
            {label}
          </span>
          <input
            type="text"
            value={text}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={styles.controlPillInput}
          />
        </div>
      );
    }
    case "enum": {
      const current =
        typeof value === "string" ? value : String(field.default ?? "");
      const segmented = useSegmentedEnum(field);

      if (segmented) {
        return (
          <div className={styles.fieldStack}>
            <span className={styles.fieldRowLabel} title={field.description}>
              {label}
            </span>
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
          </div>
        );
      }

      return (
        <div className={styles.fieldRow}>
          <span className={styles.fieldRowLabel} title={field.description}>
            {label}
          </span>
          <select
            value={current}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={styles.controlPillSelect}
            aria-label={label}
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label ?? opt.value}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case "boolean": {
      const checked =
        typeof value === "boolean" ? value : Boolean(field.default);
      return (
        <label className={styles.fieldRow} data-interactive="true">
          <span className={styles.fieldRowLabel} title={field.description}>
            {label}
          </span>
          <span
            className={styles.switchTrack}
            data-checked={checked ? "true" : "false"}
          >
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
        <div className={styles.fieldRow}>
          <span className={styles.fieldRowLabel} title={field.description}>
            {label}
          </span>
          <button
            type="button"
            className={styles.assetRefButton}
            disabled={disabled}
            onClick={() => onFocusAssetSlot?.(slotId)}
          >
            Open · {slotId}
          </button>
        </div>
      );
    }
    default:
      return null;
  }
}

function normalizeHex(raw: string): string {
  const s = raw.trim();
  if (/^#[0-9a-fA-F]{6}/.test(s)) return s.slice(0, 7).toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#000000";
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 3.5V6.5H5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 9.2A5 5 0 1 0 4 4.8L2.5 6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
