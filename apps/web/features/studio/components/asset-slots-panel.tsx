"use client";

import { useState } from "react";

import type { AssetSlot, AssetSlots } from "@repo/contracts";
import type { ToolAssets } from "@repo/contracts";

import { uploadAsset } from "@/lib/api/assets";

import styles from "../styles.module.css";

export type AssetSlotsPanelProps = {
  slots: AssetSlots;
  assets: ToolAssets;
  onAssetUrl: (
    slotId: string,
    url: string | null,
  ) => void | Promise<void>;
  disabled?: boolean;
  /** M5a: highlight slot when Control assetRef deep-links here. */
  highlightSlotId?: string | null;
  /** M5d: optional tool id to attach on studio upload. */
  toolId?: string | null;
};

/**
 * Upload / clear asset slots (M2a5 + M5a focus + M5b empty UX).
 * Uses M1e studio upload API; real-asset capture bar is M2a6.
 * Empty slots show lettermark placeholders — never a broken img tag.
 */
export function AssetSlotsPanel({
  slots,
  assets,
  onAssetUrl,
  disabled,
  highlightSlotId,
  toolId,
}: AssetSlotsPanelProps) {
  if (slots.length === 0) {
    return <p className={styles.muted}>No asset slots.</p>;
  }

  return (
    <div className={styles.controlList}>
      {slots.map((slot) => (
        <AssetSlotRow
          key={slot.id}
          slot={slot}
          url={assetUrl(assets[slot.id])}
          disabled={disabled}
          onAssetUrl={onAssetUrl}
          highlighted={highlightSlotId === slot.id}
          toolId={toolId}
        />
      ))}
    </div>
  );
}

function assetUrl(ref: ToolAssets[string]): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url;
}

/** Stable soft hue from slot id for empty placeholder blocks. */
function placeholderHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return h;
}

function lettermark(slot: AssetSlot): string {
  const raw = (slot.label ?? slot.id).trim();
  if (!raw) return "?";
  // Prefer first letter of first word; multi-word → two initials.
  const parts = raw.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return raw.slice(0, 1).toUpperCase();
}

function AssetSlotRow({
  slot,
  url,
  onAssetUrl,
  disabled,
  highlighted,
  toolId,
}: {
  slot: AssetSlot;
  url: string | null;
  onAssetUrl: (
    slotId: string,
    url: string | null,
  ) => void | Promise<void>;
  disabled?: boolean;
  highlighted?: boolean;
  toolId?: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const res = await uploadAsset(file, "studio", {
        toolId: toolId ?? undefined,
      });
      // Prefer raw URL from API — must be http(s) for M2a6 (not data:).
      await onAssetUrl(slot.id, res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  const empty = !url;
  const isLogoLike = /logo|brand|mark|icon/i.test(
    `${slot.id} ${slot.label ?? ""}`,
  );
  const ctaLabel = pending
    ? "Uploading…"
    : url
      ? "Replace"
      : isLogoLike
        ? "Add your logo"
        : slot.required
          ? "Add image (required)"
          : "Add image";

  const hue = placeholderHue(slot.id);
  const mark = lettermark(slot);

  return (
    <div
      className={`${styles.assetSlot}${highlighted ? ` ${styles.assetSlotHighlight}` : ""}${empty ? ` ${styles.assetSlotEmpty}` : ""}`}
      id={`asset-slot-${slot.id}`}
      data-slot-id={slot.id}
      data-empty={empty ? "true" : "false"}
    >
      <div className={styles.assetHeader}>
        <span className={styles.fieldLabel}>
          {slot.label ?? slot.id}
          {slot.required && empty ? (
            <span className={styles.slotRequiredBadge}>Required</span>
          ) : null}
        </span>
        {url ? (
          <button
            type="button"
            className={styles.linkButton}
            disabled={disabled || pending}
            onClick={() => void onAssetUrl(slot.id, null)}
          >
            Clear
          </button>
        ) : null}
      </div>
      {slot.description ? (
        <span className={styles.fieldHint}>{slot.description}</span>
      ) : null}
      <div className={styles.assetBody}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={styles.assetThumb} />
        ) : (
          <div
            className={styles.assetPlaceholder}
            style={{
              background: `linear-gradient(145deg, hsl(${hue} 42% 42%), hsl(${(hue + 40) % 360} 38% 28%))`,
            }}
            aria-hidden
            title="Generated placeholder until you upload"
          >
            <span className={styles.assetPlaceholderMark}>{mark}</span>
          </div>
        )}
        <div className={styles.assetActions}>
          <label
            className={`${styles.fileLabel}${empty ? ` ${styles.fileLabelPrimary}` : ""}`}
          >
            <input
              type="file"
              accept={slot.accept ?? "image/*"}
              disabled={disabled || pending}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onFile(f);
              }}
            />
            {ctaLabel}
          </label>
          {empty && slot.aspectHint ? (
            <span className={styles.fieldHint}>
              Hint {slot.aspectHint} · placeholder until upload
            </span>
          ) : null}
        </div>
      </div>
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
