"use client";

import { useCallback, useEffect, useState } from "react";

import {
  STAGE_PRESETS,
  type StagePresetId,
  type StageSize,
  sizeFromCustom,
  sizeFromPreset,
} from "../lib/stage-size";
import styles from "../styles.module.css";

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
    <div className={styles.stageSizeBar} role="group" aria-label="Stage size">
      <label className={styles.stageSizeField}>
        <span className={styles.stageSizeLabel}>W</span>
        <input
          type="number"
          className={styles.stageSizeInput}
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
        <span className={styles.stageSizeUnit}>px</span>
      </label>

      <label className={styles.stageSizeField}>
        <span className={styles.stageSizeLabel}>H</span>
        <input
          type="number"
          className={styles.stageSizeInput}
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
        <span className={styles.stageSizeUnit}>px</span>
      </label>

      <select
        className={styles.stageSizeSelect}
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
