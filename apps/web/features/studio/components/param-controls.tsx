"use client";

import type { ParamField, ParamSchema } from "@repo/contracts";
import type { ToolParams } from "@repo/contracts";

import styles from "../styles.module.css";

export type ParamControlsProps = {
  schema: ParamSchema;
  params: ToolParams;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
};

/**
 * Schema-driven Control fields (M2a5 minimal).
 * Skips assetRef — assets are handled by AssetSlotsPanel.
 */
export function ParamControls({
  schema,
  params,
  onChange,
  disabled,
}: ParamControlsProps) {
  const fields = schema.filter((f) => f.kind !== "assetRef");

  if (fields.length === 0) {
    return <p className={styles.muted}>No params for this tool.</p>;
  }

  return (
    <div className={styles.controlList}>
      {fields.map((field) => (
        <ParamFieldControl
          key={field.name}
          field={field}
          value={params[field.name]}
          disabled={disabled}
          onChange={(value) => onChange(field.name, value)}
        />
      ))}
    </div>
  );
}

function ParamFieldControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ParamField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
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
      return (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            {label}
            <span className={styles.fieldValue}>{Number(n).toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
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
      const text = typeof value === "string" ? value : String(field.default ?? "");
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
        <label className={styles.fieldCheck}>
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>
            <span className={styles.fieldLabelInline}>{label}</span>
            {field.description ? (
              <span className={styles.fieldHint}>{field.description}</span>
            ) : null}
          </span>
        </label>
      );
    }
    default:
      return null;
  }
}
