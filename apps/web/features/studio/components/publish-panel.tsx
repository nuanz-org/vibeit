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

import styles from "../styles.module.css";

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
      <section className={styles.section} aria-label="Publish">
        <h2 className={styles.sectionTitle}>Publish</h2>
        <p className={styles.muted}>Gallery publish is for generated tools.</p>
      </section>
    );
  }

  const galleryHref = `/gallery/${encodeURIComponent(publicId)}`;
  const publicHref = `/t/${encodeURIComponent(publicId)}`;

  return (
    <section className={styles.section} aria-label="Publish to gallery">
      <h2 className={styles.sectionTitle}>Publish</h2>

      <div className={styles.actions} style={{ marginBottom: "0.75rem" }}>
        {inGallery ? (
          <span className={`${styles.badge} ${styles.badgeReady}`}>
            In gallery
          </span>
        ) : isPublished ? (
          <span className={styles.badge}>Public link · not in gallery</span>
        ) : (
          <span className={styles.badge}>Draft · private</span>
        )}
      </div>

      <div className={styles.shareField}>
        <label className={styles.fieldLabelInline} htmlFor="publish-title">
          Title
        </label>
        <input
          id="publish-title"
          className={styles.textInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name shown in the gallery"
          maxLength={120}
        />
      </div>

      <div className={styles.shareField}>
        <label className={styles.fieldLabelInline} htmlFor="publish-desc">
          Description
        </label>
        <textarea
          id="publish-desc"
          className={styles.embedTextarea}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional short blurb"
          maxLength={500}
        />
      </div>

      <div className={styles.shareField}>
        <label className={styles.fieldLabelInline} htmlFor="publish-tags">
          Tags
        </label>
        <input
          id="publish-tags"
          className={styles.textInput}
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="motion, brand, canvas (comma-separated)"
        />
      </div>

      <div className={styles.shareField}>
        <span className={styles.fieldLabelInline}>Thumbnail</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={!mounted || busy || capturing || !onCaptureThumbnail}
            onClick={() => void handleCapture()}
            title="Capture live frame and upload as gallery thumbnail"
          >
            {capturing ? "Capturing…" : "Capture thumbnail"}
          </button>
        </div>
        {thumbUrl ? (
          <div className={styles.thumbPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt="Gallery thumbnail"
              className={styles.thumbImage}
              crossOrigin="anonymous"
            />
            <p className={styles.muted}>Ready for gallery</p>
          </div>
        ) : (
          <p className={styles.muted}>
            Capture a frame from the live preview before publishing.
          </p>
        )}
      </div>

      <div className={styles.shareField}>
        <span className={styles.fieldLabelInline}>Checklist</span>
        <ul className={styles.publishChecklist}>
          {checklist.map((item) => (
            <li key={item.label} className={styles.muted}>
              {item.ok ? "✓" : "○"} {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
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
            className={styles.button}
            disabled={publishing || unpublishing}
            onClick={() => void handleUnpublish()}
            title="Full takedown: hide public link and remove from gallery"
          >
            {unpublishing ? "Unpublishing…" : "Unpublish"}
          </button>
        )}
        {inGallery ? (
          <Link href={galleryHref} className={styles.button} target="_blank">
            View in gallery
          </Link>
        ) : null}
        {isPublished ? (
          <Link href={publicHref} className={styles.button} target="_blank">
            Open public page
          </Link>
        ) : null}
      </div>

      {gateFailures.length > 0 ? (
        <ul className={styles.publishGateList}>
          {gateFailures.map((g) => (
            <li key={g.code} className={styles.errorText}>
              <strong>{g.code}</strong>: {g.message}
            </li>
          ))}
        </ul>
      ) : null}
      {error && gateFailures.length === 0 ? (
        <p className={styles.errorText}>{error}</p>
      ) : null}
      {successMsg ? <p className={styles.okText}>{successMsg}</p> : null}
    </section>
  );
}
