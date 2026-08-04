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
};

/**
 * Upload / clear asset slots (M2a5).
 * Uses M1e studio upload API; real-asset capture bar is M2a6.
 */
export function AssetSlotsPanel({
  slots,
  assets,
  onAssetUrl,
  disabled,
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

function AssetSlotRow({
  slot,
  url,
  onAssetUrl,
  disabled,
}: {
  slot: AssetSlot;
  url: string | null;
  onAssetUrl: (
    slotId: string,
    url: string | null,
  ) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const res = await uploadAsset(file, "studio");
      // Prefer raw URL from API — must be http(s) for M2a6 (not data:).
      await onAssetUrl(slot.id, res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.assetSlot}>
      <div className={styles.assetHeader}>
        <span className={styles.fieldLabel}>{slot.label ?? slot.id}</span>
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
          <div className={styles.assetPlaceholder}>Empty</div>
        )}
        <label className={styles.fileLabel}>
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
          {pending ? "Uploading…" : url ? "Replace" : "Upload"}
        </label>
      </div>
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
