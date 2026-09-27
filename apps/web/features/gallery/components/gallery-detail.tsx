"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ArrowLeft, ArrowRight, Remix } from "@/components/icons";
import { getGalleryItem } from "@/lib/api/gallery";

import { normalizePublicAssetUrl } from "../lib/asset-url";
import { displayTitle, formatPublished } from "../lib/display-title";
import { GalleryShell } from "./gallery-shell";
import { ToolThumb } from "./tool-thumb";

const backLink =
  "inline-flex h-9 items-center gap-1.5 rounded-full pr-3 pl-2 text-[14px] text-muted transition-colors duration-fast ease-standard hover:bg-band hover:text-fg";

/**
 * Gallery detail page → open live /t/:publicId, or remix it.
 * No source download or Studio owner controls.
 */
export function GalleryDetail({ publicId }: { publicId: string }) {
  const [ratio, setRatio] = useState(1);
  const q = useQuery({
    queryKey: ["public-gallery-item", publicId],
    queryFn: () => getGalleryItem(publicId),
    retry: false,
  });

  if (q.isLoading) {
    return (
      <GalleryShell>
        <main className="wrap flex flex-1 items-center justify-center py-20">
          <p
            className="t-label flex items-center gap-2 text-muted"
            role="status"
          >
            <span
              className="live-dot size-1.5 rounded-full bg-accent-text"
              aria-hidden
            />
            Loading tool
          </p>
        </main>
      </GalleryShell>
    );
  }

  if (q.isError || !q.data) {
    const msg =
      q.error instanceof Error ? q.error.message : "Could not load this tool.";
    const notFound = /404|not found/i.test(msg);

    return (
      <GalleryShell>
        <main className="wrap flex flex-1 items-center justify-center py-20">
          <div className="flex w-full max-w-md flex-col items-center rounded-[12px] border border-border bg-surface px-6 py-10 text-center md:px-10">
            <p className="t-label text-muted">Gallery</p>
            <h1 className="t-h3 mt-3 text-balance">
              {notFound
                ? "This tool isn’t in the gallery."
                : "This tool didn’t open."}
            </h1>
            <p className="mt-2 max-w-[34ch] text-[15px] leading-[1.55] text-pretty text-muted">
              {notFound ? "It may be private, or it was unpublished." : msg}
            </p>
            <Link href="/gallery" className="btn btn-outline btn-sm mt-6">
              <ArrowLeft size={14} />
              Back to gallery
            </Link>
          </div>
        </main>
      </GalleryShell>
    );
  }

  const card = q.data;
  const title = displayTitle(card.title);
  const fullTitle = card.title?.trim() || "Untitled tool";
  const desc = card.description?.trim() || null;
  const tags = card.tags ?? [];
  const published = formatPublished(card.publishedAt);
  const runHref = `/t/${encodeURIComponent(card.publicId)}`;
  const remixHref = `/remix/${encodeURIComponent(card.publicId)}`;
  const thumbSrc = normalizePublicAssetUrl(card.thumbnailUrl);

  return (
    <GalleryShell>
      <main className="wrap flex-1 pt-6 pb-20 md:pt-8 md:pb-28">
        <Link href="/gallery" className={`${backLink} -ml-2`}>
          <ArrowLeft size={14} />
          Gallery
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="workspace-grid grid min-h-[320px] place-items-center rounded-[12px] border border-border p-10 lg:col-span-7 lg:min-h-[520px]">
            <div
              className="frame-marks relative shadow-frame"
              style={{
                aspectRatio: ratio,
                width: `min(100%, 520px, calc(min(60vh, 520px) * ${ratio}))`,
              }}
            >
              <div className="absolute inset-0 overflow-hidden bg-surface">
                <ToolThumb src={thumbSrc} eager onRatio={setRatio} />
              </div>
              <span className="mark-b" aria-hidden />
            </div>
          </div>

          <div className="flex flex-col lg:col-span-5 lg:pt-2">
            <p className="t-label flex flex-wrap items-center gap-x-2 text-muted">
              <span>Tool</span>
              {published ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Published {published}</span>
                </>
              ) : null}
            </p>
            <h1
              className="t-h2 mt-4 text-[clamp(2rem,1.4rem+1.6vw,2.75rem)]"
              title={fullTitle}
            >
              {title}
            </h1>
            <p className="t-lead mt-5 max-w-[40ch]">
              {desc && desc !== fullTitle
                ? desc
                : "A live design tool from the gallery. Open it to play with its controls, or remix it into your own."}
            </p>

            {tags.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <li
                    key={t}
                    className="t-mono rounded-[5px] border border-border px-1.5 py-0.5 text-[10.5px] text-muted"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link href={runHref} className="btn btn-primary">
                Use tool
                <ArrowRight size={16} className="btn-arrow" />
              </Link>
              <Link href={remixHref} className="btn btn-outline">
                <Remix size={15} />
                Remix
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
              <span
                className="size-1 rounded-full bg-accent-text"
                aria-hidden
              />
              Opens a live, view-only session. Remix copies it into your Studio.
            </p>
          </div>
        </div>
      </main>
    </GalleryShell>
  );
}
