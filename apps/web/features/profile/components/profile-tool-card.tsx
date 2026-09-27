"use client";

import Link from "next/link";

import { Globe, ImageIcon } from "@/components/icons";
import { normalizePublicAssetUrl } from "@/features/gallery/lib/asset-url";
import { displayTitle } from "@/features/gallery/lib/display-title";
import type { OwnerToolCard as OwnerToolCardType } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

export type ProfileToolCardProps = {
  card: OwnerToolCardType;
};

function statusLabel(card: OwnerToolCardType): string {
  if (!card.hasRunnableVersion) return "Not ready yet";
  if (card.status === "published") return "Published";
  return "Draft";
}

/**
 * Gallery tile anatomy (design-language §3.18): a hairline frame, caption
 * below. No lift or zoom on hover — the frame border turns ink instead.
 */
export function ProfileToolCard({ card }: ProfileToolCardProps) {
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const studioHref = `/studio/${encodeURIComponent(card.id)}`;
  const publicHref = `/t/${encodeURIComponent(card.publicId)}`;
  const openable = card.hasRunnableVersion;
  const published = card.status === "published";

  const metaParts = [
    card.isRemix ? "Remix" : null,
    statusLabel(card),
  ].filter(Boolean);

  const frame = (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-[10px] border border-border bg-surface transition-colors duration-[180ms] ease-standard",
        openable && "group-hover:border-fg",
      )}
    >
      {thumbSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- public asset URL
        <img
          src={thumbSrc}
          alt=""
          className="absolute inset-0 block size-full object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="workspace-grid absolute inset-0 grid place-items-center text-muted"
          aria-hidden="true"
        >
          <ImageIcon size={16} />
        </div>
      )}
    </div>
  );

  return (
    <article className="min-w-0">
      {openable ? (
        <Link
          href={studioHref}
          className="group block rounded-[10px] focus-visible:outline-offset-4"
          aria-label={`Open ${fullTitle} in Studio`}
        >
          {frame}
        </Link>
      ) : (
        frame
      )}

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {openable ? (
            <Link
              href={studioHref}
              className="link-draw inline-block max-w-full truncate align-top text-[15px] font-medium tracking-[-0.01em] text-fg"
              title={fullTitle}
            >
              {title}
            </Link>
          ) : (
            <p
              className="truncate text-[15px] font-medium tracking-[-0.01em] text-fg"
              title={fullTitle}
            >
              {title}
            </p>
          )}
          <p className="t-mono mt-0.5 truncate text-[12px] text-muted">
            {metaParts.join(" · ")}
          </p>
        </div>
        {published ? (
          <Link
            href={publicHref}
            className="hit inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-medium text-fg transition-colors duration-[180ms] ease-standard hover:border-fg"
          >
            <Globe size={13} />
            Open public
          </Link>
        ) : null}
      </div>
    </article>
  );
}
