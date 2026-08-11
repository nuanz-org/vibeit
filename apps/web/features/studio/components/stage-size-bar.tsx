"use client";

import { useCallback, useEffect, useState } from "react";

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
 * Brik-style stage size controls: W · H · preset dropdown.
 */
export function StageSizeBar({
  value,
  onChange,
  disabled,
}: StageSizeBarProps) {
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

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-center gap-x-[0.55rem] gap-y-[0.45rem] rounded-full border border-border-subtle bg-surface-elevated px-[0.55rem] py-[0.4rem] shadow-panel"
      role="group"
      aria-label="Stage size"
    >
      <label className="inline-flex items-center gap-[0.3rem]">
        <span className="text-[0.68rem] font-[650] tracking-[0.04em] uppercase opacity-55">
          W
        </span>
        <input
          type="number"
          className="w-[4.25rem] rounded-lg border border-foreground/14 bg-foreground/[0.04] px-[0.4rem] py-[0.28rem] text-right text-[0.78rem] text-inherit tabular-nums focus:outline-2 focus:outline-offset-1 focus:outline-foreground/28 disabled:opacity-50"
          value={wDraft}
          min={64}
          max={4096}
          step={1}
          disabled={disabled}
          aria-label="Stage width in pixels"
          onChange={(e) => setWDraft(e.target.value)}
          onBlur={() => commitWidth(wDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
        <span className="text-[0.68rem] opacity-45">px</span>
      </label>

      <label className="inline-flex items-center gap-[0.3rem]">
        <span className="text-[0.68rem] font-[650] tracking-[0.04em] uppercase opacity-55">
          H
        </span>
        <input
          type="number"
          className="w-[4.25rem] rounded-lg border border-foreground/14 bg-foreground/[0.04] px-[0.4rem] py-[0.28rem] text-right text-[0.78rem] text-inherit tabular-nums focus:outline-2 focus:outline-offset-1 focus:outline-foreground/28 disabled:opacity-50"
          value={hDraft}
          min={64}
          max={4096}
          step={1}
          disabled={disabled}
          aria-label="Stage height in pixels"
          onChange={(e) => setHDraft(e.target.value)}
          onBlur={() => commitHeight(hDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
        <span className="text-[0.68rem] opacity-45">px</span>
      </label>

      <select
        className="min-w-[7.5rem] cursor-pointer rounded-lg border border-foreground/14 bg-foreground/[0.04] px-2 py-[0.32rem] text-[0.78rem] font-medium text-inherit disabled:cursor-not-allowed disabled:opacity-50"
        value={value.preset}
        disabled={disabled}
        aria-label="Stage size preset"
        title="Stage size controls preview shape"
        onChange={(e) => onPresetChange(e.target.value)}
      >
        <option value="custom">Custom</option>
        {STAGE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
