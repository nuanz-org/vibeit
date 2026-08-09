"use client";

import { useState } from "react";

import type { AssetSlot, AssetSlots } from "@repo/contracts";
import type { ToolAssets } from "@repo/contracts";

import {
  LocalAssetValidationError,
  deleteLocalAsset,
  getLocalObjectUrl,
  putLocalAsset,
  revokeLocalObjectUrl,
} from "../lib/local-asset-store";
import {
  getSlotBinding,
  setSlotBinding,
} from "../lib/project-asset-map";

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
  /** Tool id for local IDB bindings (required for persist across reload). */
  toolId?: string | null;
};

/**
 * Local-first asset slots: files stay in IndexedDB on this device.
 * No studio upload to server for personalization (see md/local-first-assets.md).
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
      const tid = toolId?.trim() || null;
      // Replace: drop previous local binding for this slot when possible.
      if (tid) {
        const prev = await getSlotBinding(tid, slot.id);
        if (prev) {
          revokeLocalObjectUrl(prev);
          await setSlotBinding(tid, slot.id, null);
          void deleteLocalAsset(prev);
        }
      }

      const record = await putLocalAsset(file);
      if (tid) {
        await setSlotBinding(tid, slot.id, record.id);
      }
      const objectUrl = await getLocalObjectUrl(record.id);
      if (!objectUrl) {
        throw new Error("Could not create local preview URL");
      }
      await onAssetUrl(slot.id, objectUrl);
    } catch (err) {
      const msg =
        err instanceof LocalAssetValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not add image";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  async function onClear() {
    setPending(true);
    setError(null);
    try {
      const tid = toolId?.trim() || null;
      if (tid) {
        const prev = await getSlotBinding(tid, slot.id);
        if (prev) {
          revokeLocalObjectUrl(prev);
          await setSlotBinding(tid, slot.id, null);
          void deleteLocalAsset(prev);
        }
      }
      await onAssetUrl(slot.id, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setPending(false);
    }
  }

  const empty = !url;
  const isLogoLike = /logo|brand|mark|icon/i.test(
    `${slot.id} ${slot.label ?? ""}`,
  );
  const ctaLabel = pending
    ? "Adding…"
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
      data-local-first="true"
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
            onClick={() => void onClear()}
          >
            Clear
          </button>
        ) : null}
      </div>
      {slot.description ? (
        <span className={styles.fieldHint}>{slot.description}</span>
      ) : (
        <span className={styles.fieldHint}>Stays on this device</span>
      )}
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
            title="Placeholder until you add an image"
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
              accept={slot.accept ?? "image/png,image/jpeg,image/webp"}
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
              Hint {slot.aspectHint} · stays on this device
            </span>
          ) : null}
        </div>
      </div>
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
