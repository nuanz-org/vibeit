"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";

import type {
  AssetRefParamField,
  BooleanParamField,
  ColorParamField,
  EnumParamField,
  NumberParamField,
  ParamField,
  ParamSchema,
  TextParamField,
  ToolParams,
} from "@repo/contracts";

import { ChevronDown, Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";

// These are pure predicates (not hooks) despite the `use` prefix.
import {
  groupParamsBySchema,
  usePlayPauseBoolean as isPlayPauseBoolean,
  useSegmentedEnum as isSegmentedEnum,
  useTextarea as isTextarea,
} from "../lib/group-params";
import {
  ResetIcon,
  controlWrapCls,
  groupLabelCls,
  inputCls,
  labelCls,
  rowCls,
  valueCls,
} from "../lib/studio-ui";

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

/** Inline row: label left, compact control right (toggle, swatch, pill). */
const inlineRowCls = "flex min-h-8 items-center justify-between gap-3";

/**
 * Schema-driven Control fields — the landing Studio's controls column
 * (aiditr-landing/features/landing/ui/controls.tsx): groups headed by mono
 * labels, `.range` sliders, 36px inputs, light-thumb segments, 38×22 toggles.
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
    return <p className="text-[12.5px] text-muted">No params for this tool.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {!hideReset && onResetDefaults ? (
        <div className="-mb-2 flex justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled}
            onClick={() => onResetDefaults()}
          >
            <ResetIcon size={14} />
            Reset
          </button>
        </div>
      ) : null}

      {sections.map((section) => {
        const open = !collapsed[section.id];
        return (
          <div
            key={section.id}
            className="flex flex-col gap-1"
            data-section={section.id}
            data-open={open ? "true" : "false"}
          >
            <button
              type="button"
              className="group hit flex min-h-6 w-full cursor-pointer items-center justify-between gap-3 text-left"
              onClick={() => toggle(section.id)}
              aria-expanded={open}
              aria-controls={`${section.id}-body`}
              id={`${section.id}-header`}
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span
                  className={cn(
                    groupLabelCls,
                    "transition-colors duration-[180ms] ease-standard group-hover:text-fg",
                  )}
                >
                  {section.label}
                </span>
                <span className="t-mono text-[10.5px] leading-none text-muted">
                  {section.fields.length}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "shrink-0 text-muted transition-[transform,color] duration-[240ms] ease-standard group-hover:text-fg",
                  open ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            {open ? (
              <div
                className="flex animate-control-section-in flex-col gap-1"
                id={`${section.id}-body`}
                role="region"
                aria-labelledby={`${section.id}-header`}
              >
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type FieldProps<F extends ParamField> = {
  field: F;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

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
  const common = { label, value, onChange, disabled };

  let control: ReactElement | null;
  switch (field.kind) {
    case "color":
      control = <ColorField field={field} {...common} />;
      break;
    case "number":
      control = <RangeField field={field} {...common} />;
      break;
    case "text":
      control = <TextField field={field} {...common} />;
      break;
    case "enum":
      control = isSegmentedEnum(field) ? (
        <ChoiceField field={field} {...common} />
      ) : (
        <SelectField field={field} {...common} />
      );
      break;
    case "boolean":
      control = isPlayPauseBoolean(field) ? (
        <PlayPauseField field={field} {...common} />
      ) : (
        <ToggleField field={field} {...common} />
      );
      break;
    case "assetRef":
      control = (
        <AssetRefField
          field={field}
          label={label}
          disabled={disabled}
          onFocusAssetSlot={onFocusAssetSlot}
        />
      );
      break;
    default:
      control = null;
  }

  if (!control) return null;
  return (
    <div className={controlWrapCls} data-control={field.name}>
      {control}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

function RangeField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<NumberParamField>) {
  const id = useId();
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

  return (
    <div>
      <div className={rowCls}>
        <label htmlFor={id} className={cn(labelCls, "min-w-0")}>
          {label}
        </label>
        <output htmlFor={id} className={cn(valueCls, "shrink-0")}>
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={n}
        disabled={disabled}
        aria-valuetext={display}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

function TextField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<TextParamField>) {
  const id = useId();
  const text = typeof value === "string" ? value : String(field.default ?? "");
  return (
    <div>
      <div className={rowCls}>
        <label htmlFor={id} className={cn(labelCls, "min-w-0")}>
          {label}
        </label>
        {field.maxLength != null ? (
          <span className={cn(valueCls, "shrink-0")} aria-hidden="true">
            {text.length}/{field.maxLength}
          </span>
        ) : null}
      </div>
      {isTextarea(field) ? (
        <textarea
          id={id}
          rows={3}
          value={text}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "resize-none py-2")}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "h-9 pointer-coarse:h-11")}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

function ColorField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<ColorParamField>) {
  const labelId = useId();
  const raw =
    typeof value === "string" && value.length > 0
      ? value
      : typeof field.default === "string"
        ? field.default
        : "#000000";
  const hex = normalizeHex(raw);

  return (
    <div className={inlineRowCls} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={cn(labelCls, "min-w-0")}>
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <label
          className="hit group relative size-6 shrink-0 cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45"
          title="Pick any colour"
        >
          <input
            type="color"
            value={hex}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="peer sr-only"
            aria-label={`${label} colour`}
          />
          <span
            className="absolute inset-0 rounded-full border border-black/10 transition-[box-shadow,transform] duration-[180ms] ease-standard group-hover:scale-[1.08] peer-focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--focus)] dark:border-white/15"
            style={{ background: hex }}
          />
        </label>
        <input
          type="text"
          value={typeof value === "string" ? value.toUpperCase() : hex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            inputCls,
            "t-mono h-9 w-[5.5rem] px-2 text-[12.5px] pointer-coarse:h-11",
          )}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Enum: light-thumb segmented choice                                  */
/* ------------------------------------------------------------------ */

function ChoiceField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<EnumParamField>) {
  const name = useId();
  const current =
    typeof value === "string" ? value : String(field.default ?? "");
  const count = field.options.length;
  const index = field.options.findIndex((o) => o.value === current);

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className={cn(labelCls, "mb-2")}>{label}</legend>
      {/* Tips only for truncated option labels, never for the field label. */}
      <Tooltip.Provider
        delay={TIP_OPEN_DELAY_MS}
        closeDelay={0}
        timeout={TIP_SKIP_DELAY_MS}
      >
        <div
          className="relative grid rounded-full border border-border bg-workspace p-[3px]"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {index >= 0 ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-[3px] left-[3px] rounded-full border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-transform duration-[240ms] ease-standard"
              style={{
                width: `calc((100% - 6px) / ${count})`,
                transform: `translateX(${index * 100}%)`,
              }}
            />
          ) : null}
          {field.options.map((opt) => (
            <SegmentedOption
              key={opt.value}
              name={name}
              value={opt.value}
              label={opt.label ?? opt.value}
              selected={current === opt.value}
              onSelect={() => onChange(opt.value)}
            />
          ))}
        </div>
      </Tooltip.Provider>
    </fieldset>
  );
}

/**
 * Segmented option: native radio in a pill label (landing ChoiceControl).
 * Fast tooltip only when the label is actually ellipsized.
 */
function SegmentedOption({
  name,
  value,
  label,
  selected,
  onSelect,
}: {
  name: string;
  value: string;
  label: string;
  selected: boolean;
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
  }, [label, selected, measure]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const option = (
    <label
      className={cn(
        "relative z-10 flex h-8 min-w-0 cursor-pointer items-center justify-center rounded-full px-2 pointer-coarse:h-11",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        ref={textRef}
        className="block min-w-0 truncate text-[12.5px] text-muted transition-colors duration-[180ms] peer-checked:font-medium peer-checked:text-fg"
      >
        {label}
      </span>
    </label>
  );

  if (!truncated) return option;

  return <OptionTip content={label}>{option}</OptionTip>;
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
              "max-w-[16rem] rounded-[6px] bg-ink px-2.5 py-1.5",
              "text-[12px] leading-snug font-medium text-ink-fg",
              "origin-[var(--transform-origin)]",
              "transition-[opacity,transform] duration-[180ms] ease-standard",
              "data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0",
              "data-[instant]:transition-none",
            )}
          >
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Enum: long lists fall back to a native select                       */
/* ------------------------------------------------------------------ */

function SelectField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<EnumParamField>) {
  const id = useId();
  const current =
    typeof value === "string" ? value : String(field.default ?? "");
  return (
    <div>
      <div className={rowCls}>
        <label htmlFor={id} className={cn(labelCls, "min-w-0")}>
          {label}
        </label>
      </div>
      <div className="relative">
        <select
          id={id}
          value={current}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            inputCls,
            "h-9 cursor-pointer appearance-none pr-8 pointer-coarse:h-11",
          )}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label ?? opt.value}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Boolean                                                             */
/* ------------------------------------------------------------------ */

function ToggleField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<BooleanParamField>) {
  const id = useId();
  const checked = typeof value === "boolean" ? value : Boolean(field.default);
  // The row is a <label>, so the name toggles the switch too.
  return (
    <label
      className={cn(
        inlineRowCls,
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <span id={id} className={cn(labelCls, "min-w-0")}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "hit relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors duration-[180ms] ease-standard",
          "disabled:cursor-not-allowed disabled:opacity-45",
          checked ? "bg-fg" : "bg-border-strong",
        )}
      >
        <span
          className="absolute top-[3px] left-[3px] size-4 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-[240ms] ease-standard"
          style={{ transform: checked ? "translateX(16px)" : "none" }}
        />
      </button>
    </label>
  );
}

/** playPause hint: the landing transport button (32px, Play / Pause). */
function PlayPauseField({
  field,
  label,
  value,
  onChange,
  disabled,
}: FieldProps<BooleanParamField>) {
  const checked = typeof value === "boolean" ? value : Boolean(field.default);
  return (
    <div className={inlineRowCls}>
      <span className={cn(labelCls, "min-w-0")}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        aria-label={checked ? "Pause" : "Play"}
        onClick={() => onChange(!checked)}
        className="hit grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface text-fg transition-colors duration-[180ms] hover:border-fg disabled:cursor-not-allowed disabled:opacity-45"
      >
        {checked ? <Pause size={13} /> : <Play size={13} />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Asset reference                                                     */
/* ------------------------------------------------------------------ */

function AssetRefField({
  field,
  label,
  disabled,
  onFocusAssetSlot,
}: {
  field: AssetRefParamField;
  label: string;
  disabled?: boolean;
  onFocusAssetSlot?: (slotId: string) => void;
}) {
  const slotId = field.assetSlotId;
  return (
    <div className={inlineRowCls}>
      <span className={cn(labelCls, "min-w-0")}>{label}</span>
      <button
        type="button"
        className="btn btn-outline btn-sm max-w-[60%] min-w-0"
        disabled={disabled}
        onClick={() => onFocusAssetSlot?.(slotId)}
      >
        <span className="min-w-0 truncate">Open · {slotId}</span>
      </button>
    </div>
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
