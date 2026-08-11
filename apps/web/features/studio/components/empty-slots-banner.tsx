"use client";

import type { AssetSlot, AssetSlots } from "@repo/contracts";
import type { ToolAssets } from "@repo/contracts";

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
      : "Personalize with your assets";

  const detail = isLogoLike
    ? "Placeholder until you upload."
    : emptyCount === 1
      ? `“${label}” is empty.`
      : `${emptyCount} empty slots — start with “${label}”.`;

  return (
    <div
      className="flex items-start justify-between gap-3 rounded-xl border border-[#d97706]/35 bg-[#f59e0b]/14 px-[0.85rem] py-3"
      role="status"
      data-empty-slots={emptyCount}
      data-primary-slot={primary.id}
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[0.9rem] font-[650] tracking-tight text-[color-mix(in_srgb,#92400e_80%,var(--foreground))]">
          {headline}
        </p>
        <p className="mt-1 mb-0 text-[0.78rem] leading-snug opacity-80">
          {detail}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-[#b45309] px-[0.7rem] py-[0.4rem] font-inherit text-[0.78rem] font-semibold text-[#fffbeb] hover:bg-[#92400e]"
        onClick={() => onFocusSlot?.(primary.id)}
      >
        {isLogoLike ? "Add logo" : `Add ${label}`}
      </button>
    </div>
  );
}
