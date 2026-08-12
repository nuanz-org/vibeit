"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";

import type { ParamField, ParamSchema } from "@repo/contracts";
import type { ToolParams } from "@repo/contracts";

import { cn } from "@/lib/utils";

import {
  groupParamsBySchema,
  usePlayPauseBoolean,
  useSegmentedEnum,
  useTextarea,
} from "../lib/group-params";

/** Segmented option tips only — snappy open; re-enter within timeout is instant. */
const TIP_OPEN_DELAY_MS = 80;
const TIP_SKIP_DELAY_MS = 3000;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

const fieldRow = cn(
  "group/field flex min-h-10 items-center justify-between gap-3 rounded-[10px] px-1.5 py-1",
  "transition-[background-color] duration-ui ease-ui",
  "data-[interactive=true]:cursor-pointer data-[interactive=true]:hover:bg-surface",
);

const fieldRowLabel = cn(
  "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
  "text-[0.8rem] font-medium leading-snug tracking-[-0.01em] text-muted-ink",
  "transition-colors duration-ui ease-ui group-hover/field:text-ink",
);

const fieldStack = "flex flex-col gap-1.5 py-1";

const controlSurface = cn(
  "rounded-[10px] border-none bg-ink/[0.05] dark:bg-white/10",
  "transition-[box-shadow,background-color] duration-ui ease-ui",
  "focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ink/25",
);

/**
 * Premium schema-driven Control fields.
 * Soft surfaces, fill-bar numbers, snappy segmented enums — vision tuning pleasure.
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
    return (
      <p className="px-1 text-sm text-muted-ink">No params for this tool.</p>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {!hideReset && onResetDefaults ? (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-none bg-transparent px-2 py-1.5",
              "font-inherit text-[0.78rem] font-medium text-muted-ink",
              "transition-[background-color,color,transform] duration-ui ease-ui",
              "hover:bg-ink/5 hover:text-ink active:scale-[0.96]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
            disabled={disabled}
            onClick={() => onResetDefaults()}
          >
            <ResetIcon />
            Reset
          </button>
        </div>
      ) : null}

      <div className="flex flex-col">
        {sections.map((section) => {
          const isCollapsed = Boolean(collapsed[section.id]);
          const open = !isCollapsed;
          return (
            <div
              key={section.id}
              className="flex flex-col border-b border-border-subtle last:border-b-0"
              data-section={section.id}
              data-open={open ? "true" : "false"}
            >
              <button
                type="button"
                className={cn(
                  "m-0 flex min-h-11 w-full cursor-pointer items-center justify-between gap-3",
                  "rounded-[10px] border-none bg-transparent px-1.5 py-2.5 text-left font-inherit text-inherit",
                  "transition-[background-color,opacity] duration-ui ease-ui",
                  "hover:bg-surface active:opacity-80",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "motion-reduce:transition-none",
                )}
                onClick={() => toggle(section.id)}
                aria-expanded={open}
                aria-controls={`${section.id}-body`}
                id={`${section.id}-header`}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-[0.84rem] font-semibold tracking-[-0.015em] text-ink">
                    {section.label}
                  </span>
                  <span className="text-[0.7rem] font-medium tabular-nums text-ink-caption">
                    {section.fields.length}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-muted-ink",
                    "transition-[transform,background-color,color] duration-ui ease-ui",
                    "group-hover:bg-ink/5",
                    open ? "rotate-0" : "-rotate-90",
                    "motion-reduce:transition-none",
                  )}
                  aria-hidden
                >
                  <ChevronIcon />
                </span>
              </button>
              {open ? (
                <div
                  className="flex animate-control-section-in flex-col gap-0.5 px-0.5 pb-3 motion-reduce:animate-none"
                  id={`${section.id}-body`}
                  role="region"
                  aria-labelledby={`${section.id}-header`}
                >
                  <div className="flex flex-col gap-0.5">
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
          <FieldLabel label={label} description={field.description} />
          <div className="inline-flex max-w-[58%] shrink-0 items-center gap-1.5">
            <label
              className={cn(
                "relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-[8px]",
                "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                "transition-transform duration-ui ease-ui active:scale-[0.96]",
                "motion-reduce:active:scale-100",
              )}
            >
              <input
                type="color"
                value={hex}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className="absolute inset-0 m-0 h-full w-full cursor-pointer border-none p-0 opacity-0 disabled:cursor-not-allowed"
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
              className={cn(
                controlSurface,
                "w-[5.6rem] min-w-0 px-2 py-1.5 font-inherit text-[0.72rem] font-medium tracking-[0.01em] text-ink uppercase tabular-nums",
                "disabled:opacity-50",
              )}
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
      // Clip right edge so only glyphs under the fill invert (Brik-style).
      const clipRight = `${(100 - pct).toFixed(3)}%`;

      return (
        <div className={fieldRow}>
          <FieldLabel label={label} description={field.description} />
          <div
            className={cn(
              "group relative h-8 w-[min(52%,9.5rem)] min-w-[5.5rem] shrink-0 select-none overflow-hidden rounded-[10px]",
              "bg-ink/[0.05] dark:bg-white/10",
              "transition-[box-shadow] duration-ui ease-ui",
              "hover:bg-ink/[0.07] dark:hover:bg-white/[0.12]",
              "data-[disabled=true]:opacity-45",
              "focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ink/25",
            )}
            data-disabled={disabled ? "true" : "false"}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 rounded-[10px] bg-cta",
                "transition-[width] duration-fast ease-ui",
                "motion-reduce:transition-none",
              )}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            {/* Base value (ink) — always full; fill sits under it. */}
            <span
              className={cn(
                "pointer-events-none relative z-[1] grid h-full w-full place-items-center",
                "text-[0.72rem] font-semibold tracking-tight tabular-nums text-ink",
              )}
              aria-hidden
            >
              {display}
            </span>
            {/*
             * Overlay value (cta-foreground), same layout as base.
             * clip-path reveals only the portion over the fill so individual
             * digits (or partial digits) invert independently.
             */}
            <span
              className={cn(
                "pointer-events-none absolute inset-0 z-[1] grid place-items-center",
                "text-[0.72rem] font-semibold tracking-tight tabular-nums text-cta-foreground",
                "transition-[clip-path] duration-fast ease-ui",
                "motion-reduce:transition-none",
              )}
              style={{ clipPath: `inset(0 ${clipRight} 0 0)` }}
              aria-hidden
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
      if (useTextarea(field)) {
        return (
          <div className={fieldStack}>
            <FieldLabel
              label={label}
              description={field.description}
              className="px-1.5"
            />
            <textarea
              value={text}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              disabled={disabled}
              rows={3}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                controlSurface,
                "min-h-[4.5rem] w-full resize-y px-2.5 py-2 text-left font-inherit text-[0.72rem] font-medium leading-snug text-ink",
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
            />
          </div>
        );
      }
      return (
        <div className={fieldRow}>
          <FieldLabel label={label} description={field.description} />
          <input
            type="text"
            value={text}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              controlSurface,
              "h-8 w-[min(52%,9.5rem)] min-w-[5.5rem] shrink-0 px-2.5 text-center font-inherit text-[0.72rem] font-medium text-ink",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
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
            <FieldLabel
              label={label}
              description={field.description}
              className="px-1.5"
            />
            {/* Tips only for truncated option pills (e.g. "Full Kit…"), not labels. */}
            <Tooltip.Provider
              delay={TIP_OPEN_DELAY_MS}
              closeDelay={0}
              timeout={TIP_SKIP_DELAY_MS}
            >
              <div
                className="flex flex-wrap gap-0.5 rounded-[10px] bg-ink/[0.05] p-0.5 dark:bg-white/10"
                role="radiogroup"
                aria-label={label}
              >
                {field.options.map((opt) => {
                  const selected = current === opt.value;
                  const optLabel = opt.label ?? opt.value;
                  return (
                    <SegmentedOption
                      key={opt.value}
                      label={optLabel}
                      selected={selected}
                      disabled={disabled}
                      onSelect={() => onChange(opt.value)}
                    />
                  );
                })}
              </div>
            </Tooltip.Provider>
          </div>
        );
      }

      return (
        <div className={fieldRow}>
          <FieldLabel label={label} description={field.description} />
          <select
            value={current}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              controlSurface,
              "h-8 w-[min(52%,9.5rem)] min-w-[5.5rem] shrink-0 appearance-none",
              "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2016%2016%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M4%206L8%2010L12%206%27%20stroke%3D%27%23888%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[position:right_0.45rem_center] bg-no-repeat",
              "py-0 pr-6 pl-2.5 text-left font-inherit text-[0.72rem] font-medium text-ink",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
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
      // playPause: same boolean value; clearer play/pause chrome
      if (usePlayPauseBoolean(field)) {
        return (
          <div className={fieldRow}>
            <FieldLabel label={label} description={field.description} />
            <button
              type="button"
              disabled={disabled}
              aria-pressed={checked}
              aria-label={checked ? "Pause" : "Play"}
              onClick={() => onChange(!checked)}
              className={cn(
                controlSurface,
                "inline-flex h-8 min-w-[5.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 px-2.5",
                "font-inherit text-[0.72rem] font-semibold text-ink",
                "transition-[background-color,transform] duration-ui ease-ui",
                "hover:bg-ink/[0.08] active:scale-[0.97]",
                "disabled:cursor-not-allowed disabled:opacity-45",
                "motion-reduce:active:scale-100",
              )}
            >
              {checked ? "Pause" : "Play"}
            </button>
          </div>
        );
      }
      return (
        <label className={fieldRow} data-interactive="true">
          <FieldLabel label={label} description={field.description} />
          <span
            className={cn(
              "group/sw relative h-6 w-10 shrink-0 rounded-full",
              "bg-ink/12 transition-colors duration-ui ease-ui dark:bg-white/15",
              "data-[checked=true]:bg-cta",
            )}
            data-checked={checked ? "true" : "false"}
          >
            <input
              type="checkbox"
              className="peer absolute inset-0 z-[1] m-0 h-full w-full min-h-0 min-w-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              aria-label={label}
            />
            <span
              className={cn(
                "pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white",
                "shadow-[0_1px_2px_rgba(0,0,0,0.18)]",
                "transition-transform duration-ui ease-ui",
                "peer-disabled:opacity-55",
                "group-data-[checked=true]/sw:translate-x-4",
                "motion-reduce:transition-none",
              )}
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
          <FieldLabel label={label} description={field.description} />
          <button
            type="button"
            className={cn(
              "max-w-[58%] min-h-8 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap",
              "rounded-[10px] border-none bg-ink/8 px-2.5 py-1.5 font-inherit text-[0.72rem] font-medium text-ink",
              "transition-[background-color,transform] duration-ui ease-ui",
              "enabled:hover:bg-ink/12 enabled:active:scale-[0.96]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "motion-reduce:active:scale-100",
            )}
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

/** Single-line field name — no tooltip (tips are only for truncated option pills). */
function FieldLabel({
  label,
  className,
}: {
  label: string;
  description?: string;
  className?: string;
}) {
  return <span className={cn(fieldRowLabel, className)}>{label}</span>;
}

/**
 * Segmented enum option: fixed single-line height.
 * Fast tooltip only when the label is actually ellipsized.
 */
function SegmentedOption({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useIsomorphicLayoutEffect(() => {
    measure();
  }, [label, measure]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const button = (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        "inline-flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-[8px] border-none px-2",
        "font-inherit text-[0.72rem] font-medium tracking-[-0.01em]",
        "transition-[background-color,color,transform,box-shadow] duration-ui ease-ui",
        "enabled:active:scale-[0.96]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        selected
          ? "bg-cta font-semibold text-cta-foreground shadow-sm hover:bg-cta-hover"
          : "bg-transparent text-muted-ink enabled:hover:bg-ink/[0.06] enabled:hover:text-ink dark:enabled:hover:bg-white/10",
      )}
      data-selected={selected ? "true" : "false"}
      disabled={disabled}
      onClick={onSelect}
    >
      <span ref={textRef} className="block min-w-0 truncate">
        {label}
      </span>
    </button>
  );

  if (!truncated) return button;

  return <OptionTip content={label}>{button}</OptionTip>;
}

/** Fast tip for truncated segmented options only (not browser `title`). */
function OptionTip({
  content,
  children,
}: {
  content: string;
  children: ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={TIP_OPEN_DELAY_MS}
        closeDelay={0}
        closeOnClick
        render={children}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side="top"
          sideOffset={6}
          className="z-[80] outline-none"
        >
          <Tooltip.Popup
            className={cn(
              "max-w-[16rem] rounded-[8px] bg-ink px-2.5 py-1.5",
              "text-[0.72rem] leading-snug font-medium tracking-[-0.01em] text-cta-foreground",
              "shadow-[0_4px_16px_rgba(0,0,0,0.14)]",
              "origin-[var(--transform-origin)]",
              "transition-[opacity,transform] duration-fast ease-ui",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              "data-[instant]:transition-none",
              "motion-reduce:transition-none motion-reduce:data-[starting-style]:scale-100",
            )}
          >
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
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
