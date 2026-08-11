"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import { normalizePublicAssetUrl } from "../lib/asset-url";

/** Soft-truncate on a word boundary; never mid-glyph. */
function clipAtWord(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > Math.floor(max * 0.45) ? cut.slice(0, sp) : cut)
    .replace(/[.,;:\-—…\s]+$/u, "")
    .trim();
  return base ? `${base}…` : `${cut.trim()}…`;
}

function looksTruncatedToken(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return false;
  const w = words[0] ?? "";
  if (w.length < 6 || w.length > 16) return false;
  // Complete short titles we keep
  if (/^(dvd|vhs|logo|grid|type|clock|morph)$/i.test(w)) return false;
  // Half-words from storage truncation rarely end in common suffixes
  return !/(ions?|ings?|ments?|ness|able|ally|ed|er|ly|ty|al|ous|ive|parc)$/i.test(
    w,
  );
}

/** Prefer a short craft name; vision dumps become a tight line. */
function displayTitle(raw: string | null | undefined): string {
  let t = (raw ?? "").trim();
  if (!t) return "Untitled tool";

  // Strip wrapping quote marks from pasted prompts
  t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();

  // Named tool patterns: `… called "X"` — only use X if it looks complete
  const called = t.match(
    /(?:called|named)\s+["'“”‘’]([^"'“”‘’\n]{2,56})/i,
  );
  if (called?.[1]) {
    const name = called[1].replace(/[.,;:\-—…"']+$/u, "").trim();
    if (name.length >= 2 && !looksTruncatedToken(name)) {
      return clipAtWord(name, 42);
    }
  }

  // Strip openers + "called …" tail so we never surface raw scaffolding
  t = t
    .replace(
      /^(build|create|make|design|generate|i want|i need|please)\s+(an|a|me|my)?\s*/i,
      "",
    )
    .replace(
      /^(remixable\s+)?(creative\s+)?(motion\s+)?tool\s*/i,
      "",
    )
    .replace(/^a\s+tool\s*/i, "")
    .replace(/^(which|that|whihc|simple)\s+/i, "")
    .replace(/^(these are|this is|here(?:'s| are))\s+/i, "")
    // Drop leftover "called/named …" whether mid-string or the whole remainder
    .replace(/(?:^|\s+)(?:called|named)\s+["'“”‘’]?.*$/i, "")
    .trim();

  // First sentence / clause
  if (t.length > 48) {
    const cut = t.slice(0, 48);
    const stop = Math.max(
      cut.lastIndexOf(". "),
      cut.lastIndexOf(" — "),
      cut.lastIndexOf(" - "),
      cut.lastIndexOf(", "),
    );
    t = (stop > 16 ? cut.slice(0, stop) : cut).trim();
  }

  // If stripping left nothing useful, avoid resurfacing "called …" fragments
  if (t.length < 3) {
    const fallback = (raw ?? "")
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(
        /^(build|create|make)\s+(an|a)?\s*(remixable\s+)?(creative\s+)?(motion\s+)?tool\s*/i,
        "",
      )
      .replace(/(?:^|\s+)(?:called|named)\s+["'“”‘’]?.*$/i, "")
      .trim();
    t = fallback.length >= 3 ? fallback : "Creative tool";
  }

  t = clipAtWord(t, 44);

  // Title-case only short lowercase phrases (not long vision dumps)
  const body = t.replace(/…$/, "");
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (body.length > 0 && body === body.toLowerCase() && wordCount > 0 && wordCount <= 6) {
    t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return t || "Untitled tool";
}

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** Vary tile proportions so masonry feels less uniform. */
function aspectClass(publicId: string): string {
  let h = 0;
  for (let i = 0; i < publicId.length; i++) {
    h = (h * 33 + publicId.charCodeAt(i)) >>> 0;
  }
  const bucket = h % 5;
  if (bucket === 0 || bucket === 1) return "aspect-[3/4]";
  if (bucket === 2) return "aspect-[16/10]";
  return "";
}

export type GalleryCardProps = {
  card: GalleryCardType;
  /** Link target: detail page (default) or open public tool directly. */
  href?: string;
};

/**
 * Media-first gallery tile (Brik-style): large preview, short name, quiet meta.
 */
export function GalleryCard({ card, href }: GalleryCardProps) {
  const fullTitle = (card.title ?? "").trim() || "Untitled tool";
  const title = displayTitle(card.title);
  const tags = (card.tags ?? []).slice(0, 2);
  const to = href ?? `/gallery/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);
  const hue = hashHue(card.publicId || title);
  const wrapAspect = aspectClass(card.publicId || title);

  return (
    <Link
      href={to}
      className="group mb-3 block w-full break-inside-avoid overflow-visible rounded-none border-none bg-transparent text-inherit no-underline transition-opacity hover:opacity-[0.96] focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none min-[1100px]:mb-3.5"
      title={fullTitle}
    >
      <div
        className={cn(
          "relative w-full aspect-[4/3] overflow-hidden rounded-[10px] bg-muted",
          wrapAspect,
        )}
      >
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- public asset URL
          <img
            src={thumbSrc}
            alt=""
            className="block size-full object-cover transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className={cn(
              "relative flex size-full items-center justify-center",
              "bg-[radial-gradient(120%_90%_at_20%_15%,oklch(0.78_0.04_var(--ph-hue)/0.55),transparent_55%),radial-gradient(100%_80%_at_85%_90%,oklch(0.72_0.035_calc(var(--ph-hue)+50)/0.4),transparent_50%),oklch(0.82_0.02_var(--ph-hue))]",
              "[@media(prefers-color-scheme:dark)]:bg-[radial-gradient(120%_90%_at_20%_15%,oklch(0.32_0.05_var(--ph-hue)/0.7),transparent_55%),radial-gradient(100%_80%_at_85%_90%,oklch(0.28_0.04_calc(var(--ph-hue)+50)/0.55),transparent_50%),oklch(0.2_0.025_var(--ph-hue))]",
              "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_6%,transparent)] after:content-['']",
            )}
            style={
              {
                ["--ph-hue" as string]: String(hue),
              } as CSSProperties
            }
            aria-hidden
          >
            <span className="size-7 rounded-md border-[1.5px] border-foreground/14 opacity-35" />
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-col gap-[0.15rem] px-[0.15rem] pt-[0.65rem] pb-[0.35rem]">
        <div className="line-clamp-2 text-sm font-medium leading-snug tracking-tight text-foreground">
          {title}
        </div>
        {tags.length > 0 ? (
          <div className="line-clamp-1 text-xs leading-snug tracking-tight text-muted-foreground">
            {tags.join(" · ")}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
