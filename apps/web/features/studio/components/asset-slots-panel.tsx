"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  getSlotBindings,
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

type LibraryItem = {
  localId: string;
  url: string;
  name: string;
};

/**
 * Local-first multi-image assets: upload many, keep a tray, assign any image
 * to any slot (different images per slot when the animation needs them).
 */
export function AssetSlotsPanel({
  slots,
  assets,
  onAssetUrl,
  disabled,
  highlightSlotId,
  toolId,
}: AssetSlotsPanelProps) {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed tray from existing slot bindings when tool loads / reloads.
  useEffect(() => {
    let cancelled = false;
    const tid = toolId?.trim() || null;
    if (!tid) {
      setLibrary([]);
      setSelectedLocalId(null);
      return;
    }

    void (async () => {
      try {
        const bindings = await getSlotBindings(tid);
        const items: LibraryItem[] = [];
        const seen = new Set<string>();
        // Prefer declared slot order so multi-image tools (trail / morph) read L→R.
        const orderedIds = [
          ...slots.map((s) => bindings[s.id]).filter(Boolean),
          ...Object.values(bindings),
        ] as string[];
        for (const localId of orderedIds) {
          if (!localId || seen.has(localId)) continue;
          seen.add(localId);
          const url = await getLocalObjectUrl(localId);
          if (!url) continue;
          items.push({ localId, url, name: localId.slice(0, 8) });
        }
        if (!cancelled) {
          setLibrary(items);
          setSelectedLocalId((prev) =>
            prev && items.some((i) => i.localId === prev)
              ? prev
              : (items[0]?.localId ?? null),
          );
        }
      } catch {
        if (!cancelled) {
          /* IDB unavailable — keep empty tray; direct upload still works */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toolId, slots]);

  const slotBoundLocalId = useMemo(() => {
    // Reverse-lookup: match asset URL → library localId when possible.
    const byUrl = new Map(library.map((i) => [i.url, i.localId]));
    const map: Record<string, string | null> = {};
    for (const slot of slots) {
      const u = assetUrl(assets[slot.id]);
      map[slot.id] = u ? (byUrl.get(u) ?? null) : null;
    }
    return map;
  }, [assets, library, slots]);

  const upsertLibrary = useCallback((item: LibraryItem) => {
    setLibrary((prev) => {
      if (prev.some((p) => p.localId === item.localId)) return prev;
      return [...prev, item];
    });
  }, []);

  const bindLocalToSlot = useCallback(
    async (slotId: string, localId: string, url: string) => {
      const tid = toolId?.trim() || null;
      if (tid) {
        const prev = await getSlotBinding(tid, slotId);
        // Keep previous bytes in library/IDB; only rebind the slot.
        if (prev && prev !== localId) {
          await setSlotBinding(tid, slotId, null);
        }
        await setSlotBinding(tid, slotId, localId);
      }
      await onAssetUrl(slotId, url);
    },
    [onAssetUrl, toolId],
  );

  /**
   * Ingest files into the local library. Assigns into empty slots in
   * declared slot order (left-to-right for multi-image / trail tools).
   * If `preferSlotId` is set, that slot is filled first (replace).
   */
  const ingestFiles = useCallback(
    async (files: File[], preferSlotId?: string) => {
      if (!files.length) return;
      setPending(true);
      setError(null);
      try {
        const added: LibraryItem[] = [];
        for (const file of files) {
          const record = await putLocalAsset(file);
          const objectUrl = await getLocalObjectUrl(record.id);
          if (!objectUrl) {
            throw new Error("Could not create local preview URL");
          }
          const item: LibraryItem = {
            localId: record.id,
            url: objectUrl,
            name: record.name,
          };
          added.push(item);
          upsertLibrary(item);
        }

        if (added.length === 0) return;

        setSelectedLocalId(added[0]!.localId);

        const emptySlots = slots.filter((s) => !assetUrl(assets[s.id]));
        const assignOrder: string[] = [];
        if (preferSlotId) {
          assignOrder.push(preferSlotId);
        }
        for (const s of emptySlots) {
          if (!assignOrder.includes(s.id)) assignOrder.push(s.id);
        }
        // Prefer-slot with existing image still gets first file (replace).
        // Remaining files fill remaining empty slots only.
        const toAssign = Math.min(added.length, assignOrder.length || 0);
        for (let i = 0; i < toAssign; i++) {
          const slotId = assignOrder[i]!;
          const item = added[i]!;
          // When preferSlot is non-empty and i===0, replace binding.
          if (preferSlotId && slotId === preferSlotId && i === 0) {
            const tid = toolId?.trim() || null;
            if (tid) {
              const prev = await getSlotBinding(tid, slotId);
              if (prev && prev !== item.localId) {
                await setSlotBinding(tid, slotId, null);
                // Do not delete prev — it may still be in the library tray.
              }
            }
          }
          await bindLocalToSlot(slotId, item.localId, item.url);
        }
      } catch (err) {
        const msg =
          err instanceof LocalAssetValidationError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not add images";
        setError(msg);
      } finally {
        setPending(false);
      }
    },
    [assets, bindLocalToSlot, slots, toolId, upsertLibrary],
  );

  const assignSelectedToSlot = useCallback(
    async (slotId: string) => {
      if (!selectedLocalId) return;
      const item = library.find((i) => i.localId === selectedLocalId);
      if (!item) return;
      setPending(true);
      setError(null);
      try {
        await bindLocalToSlot(slotId, item.localId, item.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not assign image");
      } finally {
        setPending(false);
      }
    },
    [bindLocalToSlot, library, selectedLocalId],
  );

  const clearSlot = useCallback(
    async (slotId: string) => {
      setPending(true);
      setError(null);
      try {
        const tid = toolId?.trim() || null;
        if (tid) {
          await setSlotBinding(tid, slotId, null);
        }
        await onAssetUrl(slotId, null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Clear failed");
      } finally {
        setPending(false);
      }
    },
    [onAssetUrl, toolId],
  );

  const removeFromLibrary = useCallback(
    async (localId: string) => {
      setPending(true);
      setError(null);
      try {
        const tid = toolId?.trim() || null;
        // Unbind any slots using this image.
        for (const slot of slots) {
          if (slotBoundLocalId[slot.id] === localId) {
            if (tid) await setSlotBinding(tid, slot.id, null);
            await onAssetUrl(slot.id, null);
          } else if (tid) {
            const bound = await getSlotBinding(tid, slot.id);
            if (bound === localId) {
              await setSlotBinding(tid, slot.id, null);
              await onAssetUrl(slot.id, null);
            }
          }
        }
        revokeLocalObjectUrl(localId);
        void deleteLocalAsset(localId);
        setLibrary((prev) => prev.filter((i) => i.localId !== localId));
        setSelectedLocalId((prev) => (prev === localId ? null : prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Remove failed");
      } finally {
        setPending(false);
      }
    },
    [onAssetUrl, slotBoundLocalId, slots, toolId],
  );

  if (slots.length === 0) {
    return <p className={styles.muted}>No asset slots.</p>;
  }

  const multiHint =
    slots.length > 1
      ? `This animation has ${slots.length} image slots — upload multiple images and assign different ones (or multi-select to fill empty slots left-to-right).`
      : "Upload one or more images. Extra images stay in the tray so you can swap anytime.";

  return (
    <div className={styles.controlList}>
      <div className={styles.assetLibrary}>
        <div className={styles.assetLibraryHeader}>
          <span className={styles.fieldLabel}>Images</span>
          <label
            className={`${styles.fileLabel} ${styles.fileLabelPrimary}`}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={disabled || pending}
              onChange={(e) => {
                const list = e.target.files
                  ? Array.from(e.target.files)
                  : [];
                e.target.value = "";
                void ingestFiles(list);
              }}
            />
            {pending ? "Adding…" : "Add images"}
          </label>
        </div>
        <span className={styles.fieldHint}>{multiHint}</span>
        {library.length > 0 ? (
          <ul className={styles.assetTray} aria-label="Uploaded images">
            {library.map((item, index) => {
              const usedBy = slots
                .filter((s) => slotBoundLocalId[s.id] === item.localId)
                .map((s) => s.label ?? s.id);
              const selected = selectedLocalId === item.localId;
              return (
                <li key={item.localId} className={styles.assetTrayItem}>
                  <button
                    type="button"
                    className={styles.assetTrayThumbBtn}
                    data-selected={selected ? "true" : "false"}
                    disabled={disabled || pending}
                    title={
                      usedBy.length
                        ? `${item.name} · used by ${usedBy.join(", ")}`
                        : item.name
                    }
                    onClick={() =>
                      setSelectedLocalId((prev) =>
                        prev === item.localId ? null : item.localId,
                      )
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className={styles.assetTrayThumb}
                    />
                    <span className={styles.assetTrayIndex}>{index + 1}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.assetTrayRemove}
                    disabled={disabled || pending}
                    aria-label={`Remove ${item.name}`}
                    onClick={() => void removeFromLibrary(item.localId)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.muted} style={{ margin: 0 }}>
            No images yet. Add multiple PNG/JPEG/WebP files (stays on this
            device).
          </p>
        )}
        {selectedLocalId ? (
          <span className={styles.fieldHint}>
            Image selected — use “Assign selected” on a slot below, or click
            again to deselect.
          </span>
        ) : null}
      </div>

      {slots.map((slot) => (
        <AssetSlotRow
          key={slot.id}
          slot={slot}
          url={assetUrl(assets[slot.id])}
          disabled={disabled || pending}
          highlighted={highlightSlotId === slot.id}
          hasLibrarySelection={Boolean(selectedLocalId)}
          selectedIsBound={
            selectedLocalId != null &&
            slotBoundLocalId[slot.id] === selectedLocalId
          }
          onAssignSelected={() => void assignSelectedToSlot(slot.id)}
          onClear={() => void clearSlot(slot.id)}
          onFiles={(files) => void ingestFiles(files, slot.id)}
        />
      ))}

      {error ? <p className={styles.errorText}>{error}</p> : null}
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
  disabled,
  highlighted,
  hasLibrarySelection,
  selectedIsBound,
  onAssignSelected,
  onClear,
  onFiles,
}: {
  slot: AssetSlot;
  url: string | null;
  disabled?: boolean;
  highlighted?: boolean;
  hasLibrarySelection: boolean;
  selectedIsBound: boolean;
  onAssignSelected: () => void;
  onClear: () => void;
  onFiles: (files: File[]) => void;
}) {
  const empty = !url;
  const isLogoLike = /logo|brand|mark|icon/i.test(
    `${slot.id} ${slot.label ?? ""}`,
  );
  const ctaLabel = url
    ? "Replace / add more"
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
            disabled={disabled}
            onClick={onClear}
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
          {hasLibrarySelection && !selectedIsBound ? (
            <button
              type="button"
              className={`${styles.fileLabel} ${styles.fileLabelPrimary}`}
              disabled={disabled}
              onClick={onAssignSelected}
            >
              Assign selected
            </button>
          ) : null}
          <label
            className={`${styles.fileLabel}${empty ? ` ${styles.fileLabelPrimary}` : ""}`}
          >
            <input
              type="file"
              accept={slot.accept ?? "image/png,image/jpeg,image/webp"}
              multiple
              disabled={disabled}
              onChange={(e) => {
                const list = e.target.files
                  ? Array.from(e.target.files)
                  : [];
                e.target.value = "";
                onFiles(list);
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
    </div>
  );
}
