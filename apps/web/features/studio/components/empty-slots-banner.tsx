"use client";

import type { AssetSlot, AssetSlots } from "@repo/contracts";
import type { ToolAssets } from "@repo/contracts";

import { ImageIcon } from "@/components/icons";

export type EmptySlotsBannerProps = {
  slots: AssetSlots;
  assets: ToolAssets;
  /** Scroll/focus a specific empty slot when CTA clicked. */
  onFocusSlot?: (slotId: string) => void;
};

function assetUrl(ref: ToolAssets[string]): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url;
}

/** Prefer logo-like / required slots for the primary CTA message. */
export function pickPrimaryEmptySlot(
  slots: AssetSlots,
  assets: ToolAssets,
): AssetSlot | null {
  const empty = slots.filter((s) => !assetUrl(assets[s.id]));
  if (empty.length === 0) return null;

  const required = empty.find((s) => s.required);
  if (required) return required;

  const logoLike = empty.find((s) =>
    /logo|brand|mark|icon/i.test(`${s.id} ${s.label ?? ""}`),
  );
  if (logoLike) return logoLike;

  return empty[0] ?? null;
}

export function countEmptySlots(
  slots: AssetSlots,
  assets: ToolAssets,
): number {
  return slots.filter((s) => !assetUrl(assets[s.id])).length;
}

/**
 * M5b: loud affordance when the tool has empty asset slots.
 * Softens/clears as slots fill — no crash path.
 */
export function EmptySlotsBanner({
  slots,
  assets,
  onFocusSlot,
}: EmptySlotsBannerProps) {
  if (slots.length === 0) return null;

  const primary = pickPrimaryEmptySlot(slots, assets);
  if (!primary) return null;

  const emptyCount = countEmptySlots(slots, assets);
  const label = primary.label ?? primary.id;
  const isLogoLike = /logo|brand|mark|icon/i.test(
    `${primary.id} ${primary.label ?? ""}`,
  );
  const headline = isLogoLike
    ? "Add your logo"
    : primary.required
      ? `Add ${label}`
      : "Personalise with your assets";

  const detail = isLogoLike
    ? "Placeholder until you upload."
    : emptyCount === 1
      ? `“${label}” is empty.`
      : `${emptyCount} empty slots. Start with “${label}”.`;

  return (
    <div
      className="flex flex-col items-start gap-2.5 rounded-[10px] border border-border bg-surface p-3"
      role="status"
      data-empty-slots={emptyCount}
      data-primary-slot={primary.id}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13.5px] font-medium tracking-[-0.01em] text-fg">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-accent-text"
          />
          {headline}
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-muted">{detail}</p>
      </div>
      <button
        type="button"
        className="btn btn-ink btn-sm max-w-full"
        onClick={() => onFocusSlot?.(primary.id)}
      >
        <ImageIcon size={14} />
        <span className="min-w-0 truncate">
          {isLogoLike ? "Add logo" : `Add ${label}`}
        </span>
      </button>
    </div>
  );
}
