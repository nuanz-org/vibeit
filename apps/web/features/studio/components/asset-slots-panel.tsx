"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AssetSlot, AssetSlots } from "@repo/contracts";
import type { ToolAssets } from "@repo/contracts";

import { Close, ImageIcon, Upload } from "@/components/icons";
import { cn } from "@/lib/utils";

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
import {
  ErrorNote,
  controlHighlightCls,
  controlWrapCls,
  hintCls,
  innerCardCls,
  labelCls,
  rowCls,
  statusPillCls,
} from "../lib/studio-ui";

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

/** Outline pill wrapping a visually hidden file input (keyboard reachable). */
const filePillCls = cn(
  "btn btn-outline btn-sm",
  "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-45",
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid",
);

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
    return <p className="text-[12.5px] text-muted">No asset slots.</p>;
  }

  const multiHint =
    slots.length > 1
      ? `This animation has ${slots.length} image slots. Upload several and assign a different one to each, or multi-select to fill empty slots left to right.`
      : "Upload one or more images. Extras stay in the tray so you can swap any time.";

  return (
    <div className="flex flex-col gap-3">
      <div className={cn(innerCardCls, "flex flex-col gap-2.5")}>
        <div className="flex items-center justify-between gap-2">
          <span className={labelCls}>Images</span>
          <label className={filePillCls}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              disabled={disabled || pending}
              onChange={(e) => {
                const list = e.target.files
                  ? Array.from(e.target.files)
                  : [];
                e.target.value = "";
                void ingestFiles(list);
              }}
            />
            <Upload size={14} />
            {pending ? "Adding…" : "Add images"}
          </label>
        </div>
        <p className={hintCls}>{multiHint}</p>
        {library.length > 0 ? (
          <ul className="flex flex-wrap gap-2.5 pt-1" aria-label="Uploaded images">
            {library.map((item, index) => {
              const usedBy = slots
                .filter((s) => slotBoundLocalId[s.id] === item.localId)
                .map((s) => s.label ?? s.id);
              const selected = selectedLocalId === item.localId;
              return (
                <li key={item.localId} className="relative size-14 shrink-0">
                  <button
                    type="button"
                    className={cn(
                      "relative block size-full cursor-pointer overflow-hidden rounded-[6px] border bg-workspace p-0",
                      "transition-[border-color,box-shadow] duration-[180ms] ease-standard",
                      "disabled:cursor-not-allowed disabled:opacity-45",
                      selected
                        ? "border-fg shadow-[0_0_0_2px_var(--surface),0_0_0_3.5px_var(--fg)]"
                        : "border-border hover:border-fg",
                    )}
                    data-selected={selected ? "true" : "false"}
                    aria-pressed={selected}
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
                      className="block size-full object-cover"
                    />
                    {/* Canvas overlay badge: sits on user art, so it keeps its own contrast. */}
                    <span className="t-mono pointer-events-none absolute bottom-1 left-1 grid h-4 min-w-4 place-items-center rounded-full bg-black/65 px-1 text-[10px] leading-none text-white">
                      {index + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="hit absolute -top-2 -right-2 grid size-5 cursor-pointer place-items-center rounded-full border border-border bg-surface text-muted transition-colors duration-[180ms] ease-standard hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={disabled || pending}
                    aria-label={`Remove ${item.name}`}
                    onClick={() => void removeFromLibrary(item.localId)}
                  >
                    <Close size={10} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12.5px] leading-snug text-muted">
            No images yet. Add PNG, JPEG or WebP files. They stay on this
            device.
          </p>
        )}
        {selectedLocalId ? (
          <p className={hintCls}>
            Image selected. Use “Assign selected” on a slot below, or click it
            again to deselect.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
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
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
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

  const slotLabel = slot.label ?? slot.id;

  return (
    <div
      className={cn(
        controlWrapCls,
        "transition-[background-color,box-shadow] duration-[240ms] ease-standard",
        highlighted && controlHighlightCls,
      )}
      id={`asset-slot-${slot.id}`}
      data-slot-id={slot.id}
      data-empty={empty ? "true" : "false"}
      data-local-first="true"
    >
      <div className={rowCls}>
        <span className={cn(labelCls, "min-w-0")}>{slotLabel}</span>
        {slot.required && empty ? (
          <span className={statusPillCls}>Required</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2.5">
        <label
          className={cn(
            "group flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-[8px] border border-dashed border-border-strong px-2 text-left transition-colors duration-[180ms] ease-standard hover:border-fg",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid",
            "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-45 has-[input:disabled]:hover:border-border-strong",
          )}
        >
          <span
            className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-workspace text-muted"
            title={url ? undefined : "Placeholder until you add an image"}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon />
            )}
          </span>
          <span className="min-w-0 truncate text-[12.5px] text-fg">
            {ctaLabel}
          </span>
          <input
            type="file"
            accept={slot.accept ?? "image/png,image/jpeg,image/webp"}
            multiple
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              onFiles(list);
            }}
          />
        </label>
        {url ? (
          <button
            type="button"
            className="hit grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors duration-[180ms] ease-standard hover:bg-workspace hover:text-fg disabled:cursor-not-allowed disabled:opacity-45"
            disabled={disabled}
            aria-label={`Clear ${slotLabel}`}
            title="Clear"
            onClick={onClear}
          >
            <Close size={14} />
          </button>
        ) : null}
      </div>
      {hasLibrarySelection && !selectedIsBound ? (
        <button
          type="button"
          className="btn btn-outline btn-sm mt-2"
          disabled={disabled}
          onClick={onAssignSelected}
        >
          Assign selected
        </button>
      ) : null}
      <p className={cn(hintCls, "mt-1.5")}>
        {slot.description ?? "Stays on this device"}
      </p>
      {empty && slot.aspectHint ? (
        <p className={cn(hintCls, "mt-0.5")}>
          Hint <span className="t-mono">{slot.aspectHint}</span> · stays on
          this device
        </p>
      ) : null}
    </div>
  );
}
