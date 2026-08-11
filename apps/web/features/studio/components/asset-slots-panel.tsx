"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AssetSlot, AssetSlots } from "@repo/contracts";
import type { ToolAssets } from "@repo/contracts";

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

const fileLabel =
  "inline-flex w-fit cursor-pointer items-center justify-center rounded-lg border border-foreground/14 px-3 py-[0.4rem] text-[0.8rem] font-medium appearance-none has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-45 [&_input]:hidden";
const fileLabelPrimary =
  "border-[#d97706]/40 bg-[#b45309]/12 font-semibold";
const fieldHint = "block text-[0.75rem] leading-snug opacity-55";
const fieldLabelCls = "flex items-baseline justify-between font-medium";
const muted = "text-sm opacity-55";

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
    return <p className={muted}>No asset slots.</p>;
  }

  const multiHint =
    slots.length > 1
      ? `This animation has ${slots.length} image slots — upload multiple images and assign different ones (or multi-select to fill empty slots left-to-right).`
      : "Upload one or more images. Extra images stay in the tray so you can swap anytime.";

  return (
    <div className="flex flex-col gap-[0.55rem]">
      <div className="flex flex-col gap-[0.45rem] rounded-xl border border-foreground/10 bg-foreground/[0.035] px-[0.7rem] py-[0.65rem]">
        <div className="flex items-center justify-between gap-2">
          <span className={fieldLabelCls}>Images</span>
          <label className={cn(fileLabel, fileLabelPrimary)}>
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
        <span className={fieldHint}>{multiHint}</span>
        {library.length > 0 ? (
          <ul
            className="m-0 flex list-none flex-wrap gap-[0.45rem] p-0"
            aria-label="Uploaded images"
          >
            {library.map((item, index) => {
              const usedBy = slots
                .filter((s) => slotBoundLocalId[s.id] === item.localId)
                .map((s) => s.label ?? s.id);
              const selected = selectedLocalId === item.localId;
              return (
                <li
                  key={item.localId}
                  className="relative h-14 w-14 shrink-0"
                >
                  <button
                    type="button"
                    className="block h-full w-full cursor-pointer overflow-hidden rounded-[10px] border-2 border-transparent bg-foreground/[0.06] p-0 data-[selected=true]:border-[#d97706]/85 data-[selected=true]:shadow-[0_0_0_2px_color-mix(in_srgb,#f59e0b_28%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="block h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute bottom-1 left-1 min-w-[1.1rem] rounded-full bg-black/55 px-[0.2rem] text-center text-[0.62rem] font-bold leading-[1.1rem] text-white">
                      {index + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 grid h-[1.15rem] w-[1.15rem] place-items-center rounded-full border border-foreground/16 bg-background p-0 text-[0.85rem] leading-none text-inherit opacity-75 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35"
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
          <p className={cn(muted, "m-0")}>
            No images yet. Add multiple PNG/JPEG/WebP files (stays on this
            device).
          </p>
        )}
        {selectedLocalId ? (
          <span className={fieldHint}>
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

      {error ? (
        <p className="text-[0.8rem] leading-snug text-[#b91c1c]">{error}</p>
      ) : null}
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
      className={cn(
        "flex flex-col gap-[0.4rem]",
        highlighted &&
          "rounded-[10px] p-[0.35rem] outline outline-2 outline-offset-[3px] outline-[color-mix(in_srgb,#2563eb_55%,transparent)]",
        empty && "opacity-[0.98]",
      )}
      id={`asset-slot-${slot.id}`}
      data-slot-id={slot.id}
      data-empty={empty ? "true" : "false"}
      data-local-first="true"
    >
      <div className="flex items-center justify-between">
        <span className={fieldLabelCls}>
          {slot.label ?? slot.id}
          {slot.required && empty ? (
            <span className="ml-[0.4rem] rounded-full bg-[#f59e0b]/18 px-[0.4rem] py-[0.12rem] align-middle text-[0.65rem] font-[650] tracking-[0.04em] text-[#b45309] uppercase">
              Required
            </span>
          ) : null}
        </span>
        {url ? (
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent font-inherit text-[0.8rem] text-inherit underline opacity-65 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={disabled}
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>
      {slot.description ? (
        <span className={fieldHint}>{slot.description}</span>
      ) : (
        <span className={fieldHint}>Stays on this device</span>
      )}
      <div className="flex items-center gap-[0.65rem]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-12 w-12 rounded-lg border border-foreground/12 object-cover"
          />
        ) : (
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/18 shadow-[inset_0_0_0_1px_color-mix(in_srgb,#000_12%,transparent)]"
            style={{
              background: `linear-gradient(145deg, hsl(${hue} 42% 42%), hsl(${(hue + 40) % 360} 38% 28%))`,
            }}
            aria-hidden
            title="Placeholder until you add an image"
          >
            <span className="text-[0.85rem] font-bold tracking-[0.02em] text-white opacity-95 [text-shadow:0_1px_2px_color-mix(in_srgb,#000_35%,transparent)]">
              {mark}
            </span>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {hasLibrarySelection && !selectedIsBound ? (
            <button
              type="button"
              className={cn(fileLabel, fileLabelPrimary)}
              disabled={disabled}
              onClick={onAssignSelected}
            >
              Assign selected
            </button>
          ) : null}
          <label
            className={cn(fileLabel, empty && fileLabelPrimary)}
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
            <span className={fieldHint}>
              Hint {slot.aspectHint} · stays on this device
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
