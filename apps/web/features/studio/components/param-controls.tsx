"use client";

import { useCallback, useMemo, useState } from "react";

import type { ParamField, ParamSchema } from "@repo/contracts";
import type { ToolParams } from "@repo/contracts";

import { cn } from "@/lib/utils";

import {
  groupParamsBySchema,
  useSegmentedEnum,
} from "../lib/group-params";

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

const fieldRow =
  "flex min-h-8 items-center justify-between gap-3 data-[interactive=true]:cursor-pointer";
const fieldRowLabel =
  "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8rem] font-[450] leading-snug tracking-tight text-muted-ink";
const fieldStack = "flex flex-col gap-[0.4rem] py-[0.15rem]";

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
    return <p className="text-sm opacity-55">No params for this tool.</p>;
  }

  return (
    <div className="flex flex-col gap-0">
      {!hideReset && onResetDefaults ? (
        <div className="mb-[0.15rem] flex justify-end">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-[0.35rem] rounded-md border-none bg-transparent px-[0.35rem] py-[0.3rem] font-inherit text-[0.78rem] font-medium text-muted-ink transition-colors duration-150 hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={() => onResetDefaults()}
            title="Restore default parameters"
          >
            <ResetIcon />
            Reset
          </button>
        </div>
      ) : null}

      <div className="-mx-[0.15rem] flex flex-col">
        {sections.map((section) => {
          const isCollapsed = Boolean(collapsed[section.id]);
          const open = !isCollapsed;
          return (
            <div
              key={section.id}
              className="flex flex-col overflow-hidden border-b border-border-subtle bg-transparent last:border-b-0"
              data-section={section.id}
              data-open={open ? "true" : "false"}
            >
              <button
                type="button"
                className="m-0 flex min-h-[2.6rem] w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent px-[0.15rem] py-[0.8rem] text-left font-inherit text-inherit transition-opacity duration-150 hover:opacity-[0.82] active:opacity-70"
                onClick={() => toggle(section.id)}
                aria-expanded={open}
                aria-controls={`${section.id}-body`}
                id={`${section.id}-header`}
              >
                <span className="text-[0.84rem] font-semibold tracking-tight text-ink">
                  {section.label}
                </span>
                <span
                  className="inline-flex items-center justify-center text-muted-ink transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] data-[open=false]:-rotate-90 motion-reduce:transition-none"
                  data-open={open ? "true" : "false"}
                  aria-hidden
                >
                  <ChevronIcon />
                </span>
              </button>
              {open ? (
                <div
                  className="flex animate-control-section-in flex-col gap-[0.35rem] px-[0.15rem] pb-[0.95rem] motion-reduce:animate-none"
                  id={`${section.id}-body`}
                  role="region"
                  aria-labelledby={`${section.id}-header`}
                >
                  <div className="flex flex-col gap-[0.55rem]">
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
        <div className={fieldRow}>
          <span className={fieldRowLabel} title={field.description}>
            {label}
          </span>
          <div className="inline-flex max-w-[58%] shrink-0 items-center gap-[0.3rem]">
            <label className="relative h-[1.55rem] w-[1.55rem] shrink-0 cursor-pointer overflow-hidden rounded-[5px] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--ink,var(--foreground))_14%,transparent)]">
              <input
                type="color"
                value={hex}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className="absolute inset-0 m-0 h-full w-full cursor-pointer border-none p-0 opacity-0"
                aria-label={`${label} color`}
              />
              <span
                className="block h-full w-full pointer-events-none"
                style={{ background: hex }}
                aria-hidden
              />
            </label>
            <input
              type="text"
              value={typeof value === "string" ? value.toUpperCase() : hex}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="w-[5.6rem] min-w-0 rounded-md border-none bg-ink/[0.07] px-[0.4rem] py-[0.28rem] font-inherit text-[0.72rem] font-[550] tracking-[0.01em] text-inherit uppercase tabular-nums focus:outline-2 focus:outline-offset-1 focus:outline-ink/18 disabled:opacity-50"
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
        <div className={fieldRow}>
          <span className={fieldRowLabel} title={field.description}>
            {label}
          </span>
          <div
            className={cn(
              "group relative h-[1.7rem] w-[min(52%,9.5rem)] min-w-[5.5rem] shrink-0 select-none overflow-hidden rounded-md bg-ink/8 data-[disabled=true]:opacity-45",
            )}
            data-high={highFill ? "true" : "false"}
            data-disabled={disabled ? "true" : "false"}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 rounded-l-md bg-ink transition-[width] duration-[80ms] ease-linear group-data-[high=false]:rounded-md motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <span
              className={cn(
                "pointer-events-none relative z-[1] grid h-full place-items-center text-[0.72rem] font-semibold tracking-tight tabular-nums text-ink transition-colors duration-[120ms] group-data-[high=true]:text-white",
              )}
            >
              {display}
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={n}
              disabled={disabled}
              onChange={(e) => onChange(Number(e.target.value))}
              className="absolute inset-0 z-[2] m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
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
        <div className={fieldRow}>
          <span className={fieldRowLabel} title={field.description}>
            {label}
          </span>
          <input
            type="text"
            value={text}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-[1.7rem] w-[min(52%,9.5rem)] min-w-[5.5rem] shrink-0 rounded-md border-none bg-ink/8 px-[0.55rem] text-center font-inherit text-[0.72rem] font-[550] text-inherit focus:outline-2 focus:outline-offset-1 focus:outline-ink/18 disabled:cursor-not-allowed disabled:opacity-45"
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
          <div className={fieldStack}>
            <span className={fieldRowLabel} title={field.description}>
              {label}
            </span>
            <div
              className="flex flex-wrap gap-[0.2rem] rounded-lg bg-ink/[0.07] p-[0.18rem]"
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
                    className={cn(
                      "min-h-[1.7rem] min-w-[3.5rem] flex-1 cursor-pointer rounded-md border-none bg-transparent px-[0.45rem] py-[0.28rem] font-inherit text-[0.72rem] font-[550] text-muted-ink transition-[background-color,color,transform] duration-[140ms] ease-[cubic-bezier(0.2,0,0,1)]",
                      "enabled:hover:bg-ink/6 enabled:hover:text-ink",
                      "enabled:active:scale-[0.97]",
                      "data-[selected=true]:bg-ink data-[selected=true]:font-semibold data-[selected=true]:text-background",
                      "disabled:cursor-not-allowed disabled:opacity-45",
                      "motion-reduce:transition-none",
                    )}
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
        <div className={fieldRow}>
          <span className={fieldRowLabel} title={field.description}>
            {label}
          </span>
          <select
            value={current}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-[1.7rem] w-[min(52%,9.5rem)] min-w-[5.5rem] shrink-0 appearance-none rounded-md border-none bg-ink/8 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2016%2016%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M4%206L8%2010L12%206%27%20stroke%3D%27%23888%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[position:right_0.45rem_center] bg-no-repeat py-0 pr-[1.4rem] pl-[0.55rem] text-left font-inherit text-[0.72rem] font-[550] text-inherit focus:outline-2 focus:outline-offset-1 focus:outline-ink/18 disabled:cursor-not-allowed disabled:opacity-45"
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
        <label className={fieldRow} data-interactive="true">
          <span className={fieldRowLabel} title={field.description}>
            {label}
          </span>
          <span
            className={cn(
              "group/sw relative h-[1.3rem] w-[2.35rem] shrink-0 rounded-full bg-ink/14 transition-colors duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] data-[checked=true]:bg-ink",
            )}
            data-checked={checked ? "true" : "false"}
          >
            <input
              type="checkbox"
              className="peer absolute inset-0 z-[1] m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              aria-label={label}
            />
            <span
              className="pointer-events-none absolute top-[0.14rem] left-[0.14rem] h-[1.02rem] w-[1.02rem] rounded-full bg-white shadow-[0_1px_2px_color-mix(in_oklch,#000_22%,transparent)] transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] peer-disabled:opacity-55 group-data-[checked=true]/sw:translate-x-[1.05rem] motion-reduce:transition-none"
              aria-hidden
            />
          </span>
        </label>
      );
    }
    case "assetRef": {
      const slotId = field.assetSlotId;
      return (
        <div className={fieldRow}>
          <span className={fieldRowLabel} title={field.description}>
            {label}
          </span>
          <button
            type="button"
            className="max-w-[58%] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-md border-none bg-ink/8 px-[0.55rem] py-[0.28rem] font-inherit text-[0.72rem] font-[550] text-inherit disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-ink/12"
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
