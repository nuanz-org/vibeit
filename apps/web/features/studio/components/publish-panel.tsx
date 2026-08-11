"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PublishGatesError,
  publishTool,
  unpublishTool,
  type PublishGateFailure,
  type ToolResponse,
} from "@/lib/api/tools";
import { cn } from "@/lib/utils";

export type PublishPanelProps = {
  toolId: string | null | undefined;
  publicId: string | null | undefined;
  /** draft | published */
  status: string | null | undefined;
  galleryReady?: boolean | null;
  initialTitle?: string | null;
  initialDescription?: string | null;
  initialTags?: string[] | null;
  /** Current thumb (from save gallery thumbnail or prior publish). */
  thumbnailAssetId?: string | null;
  thumbnailUrl?: string | null;
  /** Runtime mounted + ready for capture. */
  mounted: boolean;
  busy?: boolean;
  /** Capture frame and upload kind=thumb; returns asset id + url. */
  onCaptureThumbnail?: () => Promise<{ assetId: string; url: string }>;
  /** True when a PNG capture succeeded this session (export smoke). */
  exportSmokeProved?: boolean;
  /** Notify parent after publish/unpublish state changes. */
  onToolUpdated?: (tool: ToolResponse) => void;
  fixtureMode?: boolean;
};

function parseTags(raw: string): string[] {
  return raw
    .split(/[,#\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const btn =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit no-underline box-border disabled:cursor-not-allowed disabled:opacity-45";
const btnPrimary = "border-transparent bg-foreground text-background";
const section = "flex flex-col gap-[0.55rem]";
const sectionTitle =
  "text-[0.72rem] font-[650] tracking-[0.06em] uppercase opacity-55";
const muted = "text-sm opacity-55";
const shareField = "flex flex-col gap-[0.35rem]";
const fieldLabel = "block font-medium";
const textInput =
  "w-full rounded-lg border border-border-subtle bg-transparent px-[0.6rem] py-[0.45rem] font-inherit text-inherit";
const embedTextarea =
  "min-h-[5rem] w-full resize-y rounded-lg border border-foreground/14 bg-foreground/[0.04] px-[0.65rem] py-[0.55rem] font-[family-name:var(--font-geist-mono),ui-monospace,monospace] text-[0.75rem] leading-snug text-inherit";
const badge =
  "rounded-full bg-foreground/8 px-[0.55rem] py-[0.2rem] text-xs font-semibold";

/**
 * M8f — Studio gallery publish panel (metadata + gates + thumb + unpublish).
 * Thin share stays on Share panel; this path sets forGallery + galleryReady.
 */
export function PublishPanel({
  toolId,
  publicId,
  status,
  galleryReady: galleryReadyProp,
  initialTitle,
  initialDescription,
  initialTags,
  thumbnailAssetId: thumbIdProp,
  thumbnailUrl: thumbUrlProp,
  mounted,
  busy,
  onCaptureThumbnail,
  exportSmokeProved,
  onToolUpdated,
  fixtureMode,
}: PublishPanelProps) {
  const [title, setTitle] = useState(initialTitle?.trim() || "");
  const [description, setDescription] = useState(
    initialDescription?.trim() || "",
  );
  const [tagsRaw, setTagsRaw] = useState((initialTags ?? []).join(", "));
  const [localStatus, setLocalStatus] = useState(status ?? "draft");
  const [localGalleryReady, setLocalGalleryReady] = useState(
    Boolean(galleryReadyProp),
  );
  const [thumbId, setThumbId] = useState(thumbIdProp ?? null);
  const [thumbUrl, setThumbUrl] = useState(thumbUrlProp ?? null);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateFailures, setGateFailures] = useState<PublishGateFailure[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalStatus(status ?? "draft");
  }, [status]);

  useEffect(() => {
    setLocalGalleryReady(Boolean(galleryReadyProp));
  }, [galleryReadyProp]);

  useEffect(() => {
    if (thumbIdProp) setThumbId(thumbIdProp);
    if (thumbUrlProp) setThumbUrl(thumbUrlProp);
  }, [thumbIdProp, thumbUrlProp]);

  const isPublished = localStatus === "published";
  const inGallery = localGalleryReady && isPublished;
  const hasTitle = title.trim().length > 0;
  const hasThumb = Boolean(thumbId);
  const smokeOk = Boolean(exportSmokeProved || hasThumb);
  const canPublish =
    Boolean(toolId) && mounted && hasTitle && hasThumb && smokeOk;

  const checklist = useMemo(
    () => [
      {
        ok: mounted,
        label: "Preview live (tool mounted)",
      },
      {
        ok: hasTitle,
        label: "Title set",
      },
      {
        ok: hasThumb,
        label: "Gallery thumbnail captured",
      },
      {
        ok: smokeOk,
        label: "Export smoke (PNG / thumbnail)",
      },
    ],
    [hasThumb, hasTitle, mounted, smokeOk],
  );

  const handleCapture = useCallback(async () => {
    if (!onCaptureThumbnail) return;
    setError(null);
    setGateFailures([]);
    setSuccessMsg(null);
    setCapturing(true);
    try {
      const result = await onCaptureThumbnail();
      setThumbId(result.assetId);
      setThumbUrl(result.url);
      setSuccessMsg("Thumbnail saved — ready for gallery publish.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail capture failed");
    } finally {
      setCapturing(false);
    }
  }, [onCaptureThumbnail]);

  const handlePublishGallery = useCallback(async () => {
    if (!toolId) return;
    setError(null);
    setGateFailures([]);
    setSuccessMsg(null);
    setPublishing(true);
    try {
      const tags = parseTags(tagsRaw);
      const tool = await publishTool(toolId, {
        title: title.trim(),
        description: description.trim() || null,
        tags,
        forGallery: true,
        exportSmokeOk: smokeOk,
        thumbnailAssetId: thumbId,
        freezeDraft: false,
      });
      setLocalStatus(tool.status);
      setLocalGalleryReady(Boolean(tool.galleryReady));
      if (tool.thumbnailAssetId) setThumbId(tool.thumbnailAssetId);
      if (tool.thumbnailUrl) setThumbUrl(tool.thumbnailUrl);
      setSuccessMsg("Published to gallery.");
      onToolUpdated?.(tool);
    } catch (err) {
      if (err instanceof PublishGatesError) {
        setGateFailures(err.gates);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Publish failed");
      }
    } finally {
      setPublishing(false);
    }
  }, [
    description,
    onToolUpdated,
    smokeOk,
    tagsRaw,
    thumbId,
    title,
    toolId,
  ]);

  const handleUnpublish = useCallback(async () => {
    if (!toolId) return;
    setError(null);
    setGateFailures([]);
    setSuccessMsg(null);
    setUnpublishing(true);
    try {
      const tool = await unpublishTool(toolId);
      setLocalStatus(tool.status);
      setLocalGalleryReady(Boolean(tool.galleryReady));
      setSuccessMsg("Unpublished — public link and gallery listing hidden.");
      onToolUpdated?.(tool);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setUnpublishing(false);
    }
  }, [onToolUpdated, toolId]);

  if (fixtureMode || !toolId || !publicId) {
    return (
      <section className={section} aria-label="Publish">
        <h2 className={sectionTitle}>Publish</h2>
        <p className={muted}>Gallery publish is for generated tools.</p>
      </section>
    );
  }

  const galleryHref = `/gallery/${encodeURIComponent(publicId)}`;
  const publicHref = `/t/${encodeURIComponent(publicId)}`;

  return (
    <section className={section} aria-label="Publish to gallery">
      <h2 className={sectionTitle}>Publish</h2>

      <div className="mb-3 flex flex-wrap gap-2">
        {inGallery ? (
          <span className={cn(badge, "bg-[#15803d]/14 text-[#15803d]")}>
            In gallery
          </span>
        ) : isPublished ? (
          <span className={badge}>Public link · not in gallery</span>
        ) : (
          <span className={badge}>Draft · private</span>
        )}
      </div>

      <div className={shareField}>
        <label className={fieldLabel} htmlFor="publish-title">
          Title
        </label>
        <input
          id="publish-title"
          className={textInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name shown in the gallery"
          maxLength={120}
        />
      </div>

      <div className={shareField}>
        <label className={fieldLabel} htmlFor="publish-desc">
          Description
        </label>
        <textarea
          id="publish-desc"
          className={embedTextarea}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional short blurb"
          maxLength={500}
        />
      </div>

      <div className={shareField}>
        <label className={fieldLabel} htmlFor="publish-tags">
          Tags
        </label>
        <input
          id="publish-tags"
          className={textInput}
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="motion, brand, canvas (comma-separated)"
        />
      </div>

      <div className={shareField}>
        <span className={fieldLabel}>Thumbnail</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={!mounted || busy || capturing || !onCaptureThumbnail}
            onClick={() => void handleCapture()}
            title="Capture live frame and upload as gallery thumbnail"
          >
            {capturing ? "Capturing…" : "Capture thumbnail"}
          </button>
        </div>
        {thumbUrl ? (
          <div className="mt-[0.65rem] flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt="Gallery thumbnail"
              className="h-[72px] w-[72px] rounded-lg border border-foreground/12 bg-foreground/[0.04] object-cover"
              crossOrigin="anonymous"
            />
            <p className={muted}>Ready for gallery</p>
          </div>
        ) : (
          <p className={muted}>
            Capture a frame from the live preview before publishing.
          </p>
        )}
      </div>

      <div className={shareField}>
        <span className={fieldLabel}>Checklist</span>
        <ul className="mt-[0.35rem] mb-0 flex list-none flex-col gap-1 p-0">
          {checklist.map((item) => (
            <li key={item.label} className={muted}>
              {item.ok ? "✓" : "○"} {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(btn, btnPrimary)}
          disabled={!canPublish || publishing || unpublishing}
          onClick={() => void handlePublishGallery()}
          title="Run gates and list this tool in the public gallery"
        >
          {publishing
            ? "Publishing…"
            : inGallery
              ? "Update gallery listing"
              : "Publish to gallery"}
        </button>
        {(isPublished || inGallery) && (
          <button
            type="button"
            className={btn}
            disabled={publishing || unpublishing}
            onClick={() => void handleUnpublish()}
            title="Full takedown: hide public link and remove from gallery"
          >
            {unpublishing ? "Unpublishing…" : "Unpublish"}
          </button>
        )}
        {inGallery ? (
          <Link href={galleryHref} className={btn} target="_blank">
            View in gallery
          </Link>
        ) : null}
        {isPublished ? (
          <Link href={publicHref} className={btn} target="_blank">
            Open public page
          </Link>
        ) : null}
      </div>

      {gateFailures.length > 0 ? (
        <ul className="mt-[0.65rem] mb-0 flex list-none flex-col gap-[0.35rem] p-0">
          {gateFailures.map((g) => (
            <li key={g.code} className="text-[0.8rem] leading-snug text-[#b91c1c]">
              <strong>{g.code}</strong>: {g.message}
            </li>
          ))}
        </ul>
      ) : null}
      {error && gateFailures.length === 0 ? (
        <p className="text-[0.8rem] leading-snug text-[#b91c1c]">{error}</p>
      ) : null}
      {successMsg ? (
        <p className="text-[0.8rem] leading-snug text-[#15803d]">{successMsg}</p>
      ) : null}
    </section>
  );
}
