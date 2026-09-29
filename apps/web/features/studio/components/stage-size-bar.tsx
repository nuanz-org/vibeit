"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

import {
  STAGE_PRESETS,
  type StagePresetId,
  type StageSize,
  sizeFromCustom,
  sizeFromPreset,
} from "../lib/stage-size";

export type StageSizeBarProps = {
  value: StageSize;
  onChange: (next: StageSize) => void;
  disabled?: boolean;
};

/**
 * Canvas size: the landing's ink-thumb size picker (design-language §3.8 B)
 * plus mono W × H fields. It sits on the workspace, so the tracks are
 * `bg-surface` like the landing's transport controls.
 */
export function StageSizeBar({ value, onChange, disabled }: StageSizeBarProps) {
  const name = useId();
  // Local draft strings so typing "10" doesn't jump to 1080 mid-edit
  const [wDraft, setWDraft] = useState(String(value.width));
  const [hDraft, setHDraft] = useState(String(value.height));

  useEffect(() => {
    setWDraft(String(value.width));
    setHDraft(String(value.height));
  }, [value.width, value.height]);

  const commitWidth = useCallback(
    (raw: string) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        setWDraft(String(value.width));
        return;
      }
      onChange(sizeFromCustom(n, value.height));
    },
    [onChange, value.height, value.width],
  );

  const commitHeight = useCallback(
    (raw: string) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        setHDraft(String(value.height));
        return;
      }
      onChange(sizeFromCustom(value.width, n));
    },
    [onChange, value.height, value.width],
  );

  const onPresetChange = useCallback(
    (preset: string) => {
      if (preset === "custom") {
        onChange(sizeFromCustom(value.width, value.height));
        return;
      }
      onChange(sizeFromPreset(preset as Exclude<StagePresetId, "custom">));
    },
    [onChange, value.height, value.width],
  );

  const n = STAGE_PRESETS.length;
  const presetIndex = STAGE_PRESETS.findIndex((p) => p.id === value.preset);

  return (
    <div
      className="flex max-w-full shrink-0 flex-wrap items-center justify-center gap-1 rounded-[12px] border border-border bg-surface p-1 shadow-panel"
      role="group"
      aria-label="Canvas size"
    >
      <fieldset className="min-w-0" disabled={disabled}>
        <legend className="sr-only">Canvas size preset</legend>
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {presetIndex >= 0 ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-[8px] bg-fg transition-transform duration-[240ms] ease-standard"
              style={{
                width: `calc(100% / ${n})`,
                transform: `translateX(${presetIndex * 100}%)`,
              }}
            />
          ) : null}
          {STAGE_PRESETS.map((p) => {
            const active = p.id === value.preset;
            // Ratio glyph: longest side 12px.
            const iw =
              p.width >= p.height ? 12 : Math.round(12 * (p.width / p.height));
            const ih =
              p.height >= p.width ? 12 : Math.round(12 * (p.height / p.width));
            return (
              <label
                key={p.id}
                title={`${p.label} · ${p.width} × ${p.height}`}
                className={cn(
                  "relative z-10 flex h-8 min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-2.5 pointer-coarse:h-11",
                  "transition-colors duration-[180ms] ease-standard",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid",
                  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45",
                  active ? "text-bg" : "text-muted hover:text-fg",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={p.id}
                  checked={active}
                  onChange={() => onPresetChange(p.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="inline-block rounded-[2px] border-[1.25px] border-current"
                  style={{ width: iw, height: ih }}
                />
                <span className="text-[12px] font-medium">{p.id}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

      <div className="inline-flex items-center">
        <input
          type="number"
          className={dimInput}
          value={wDraft}
          min={64}
          max={4096}
          step={1}
          disabled={disabled}
          aria-label="Canvas width in pixels"
          onChange={(e) => setWDraft(e.target.value)}
          onBlur={() => commitWidth(wDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
        <span
          className="t-mono px-0.5 text-[12px] text-muted"
          aria-hidden="true"
        >
          ×
        </span>
        <input
          type="number"
          className={dimInput}
          value={hDraft}
          min={64}
          max={4096}
          step={1}
          disabled={disabled}
          aria-label="Canvas height in pixels"
          onChange={(e) => setHDraft(e.target.value)}
          onBlur={() => commitHeight(hDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
        {value.preset === "custom" ? (
          <span className="t-label pr-2 pl-1 text-[10px] text-muted">
            Custom
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Borderless mono field inside the size track; the border shows on hover / focus. */
const dimInput = cn(
  "h-8 w-[3.75rem] rounded-[8px] border border-transparent bg-transparent px-1.5 text-center pointer-coarse:h-11",
  "t-mono text-[12px] text-fg [appearance:textfield]",
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  "transition-colors duration-[180ms] ease-standard",
  "hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-45",
);
