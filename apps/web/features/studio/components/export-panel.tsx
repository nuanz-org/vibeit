"use client";

import { RECORD_VIDEO_DEFAULT_SECONDS } from "@/runtime";
import { cn } from "@/lib/utils";

export type ExportPanelProps = {
  /** Whether the runtime host has a mounted live tool. */
  mounted: boolean;
  busy: boolean;
  /** Basename for download filenames (tool id / publicId / fixture id). */
  filenameBase: string;
  onDownloadPng: (filenameBase: string) => void | Promise<void>;
  /** M7b — short WebM (auto PNG-sequence fallback on failure — M7c). */
  onDownloadVideo: (
    filenameBase: string,
    durationSeconds?: number,
  ) => void | Promise<void>;
  /** M7c — explicit PNG sequence ZIP. */
  onDownloadPngSequence: (
    filenameBase: string,
    durationSeconds?: number,
  ) => void | Promise<void>;
  /** Host MediaRecorder precheck (frame re-checks). */
  mediaRecorderSupported: boolean;
  /** Seconds left while recording (null when idle). */
  recordSecondsLeft?: number | null;
  /** PNG sequence progress. */
  sequenceProgress?: { done: number; total: number } | null;
  /** Optional last PNG capture size for feedback. */
  lastByteLength?: number | null;
  lastAt?: string | null;
  lastVideoAt?: string | null;
  lastVideoByteLength?: number | null;
  lastVideoDurationSeconds?: number | null;
  lastSequenceAt?: string | null;
  lastSequenceFrameCount?: number | null;
  lastSequenceAsFallback?: boolean | null;
  /**
   * M8c — when set, show "Save gallery thumbnail" (generated tools only).
   * Returns uploaded asset id after capture+upload.
   */
  onSaveGalleryThumbnail?: () => void | Promise<void>;
  /** Last saved gallery thumbnail URL for preview. */
  lastThumbnailUrl?: string | null;
  lastThumbnailAt?: string | null;
};

const btn =
  "cursor-pointer rounded-lg border border-foreground/14 bg-transparent px-[0.85rem] py-2 font-inherit text-sm font-medium text-inherit disabled:cursor-not-allowed disabled:opacity-45";
const btnPrimary = "border-transparent bg-foreground text-background";

/**
 * M7a–M7c export + M8c gallery thumbnail capture.
 */
export function ExportPanel({
  mounted,
  busy,
  filenameBase,
  onDownloadPng,
  onDownloadVideo,
  onDownloadPngSequence,
  mediaRecorderSupported,
  recordSecondsLeft,
  sequenceProgress,
  lastByteLength,
  lastAt,
  lastVideoAt,
  lastVideoByteLength,
  lastVideoDurationSeconds,
  lastSequenceAt,
  lastSequenceFrameCount,
  lastSequenceAsFallback,
  onSaveGalleryThumbnail,
  lastThumbnailUrl,
  lastThumbnailAt,
}: ExportPanelProps) {
  const disabled = !mounted || busy;
  const recording = recordSecondsLeft != null;
  const sequencing = sequenceProgress != null;

  return (
    <section className="flex flex-col gap-[0.55rem]" aria-label="Export">
      <h2 className="text-[0.72rem] font-[650] tracking-[0.06em] uppercase opacity-55">
        Export
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(btn, btnPrimary)}
          disabled={disabled}
          onClick={() => void onDownloadPng(filenameBase)}
          title={
            mounted
              ? "Capture the live canvas and download a PNG"
              : "Wait until the tool is live"
          }
        >
          {busy && mounted && !recording && !sequencing
            ? "Exporting…"
            : "Download PNG"}
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() =>
            void onDownloadVideo(filenameBase, RECORD_VIDEO_DEFAULT_SECONDS)
          }
          title={
            !mediaRecorderSupported
              ? "MediaRecorder unavailable — will download PNG sequence ZIP"
              : mounted
                ? `Record ~${RECORD_VIDEO_DEFAULT_SECONDS}s WebM (falls back to PNG sequence)`
                : "Wait until the tool is live"
          }
        >
          {recording
            ? `Recording… ${recordSecondsLeft}s`
            : mediaRecorderSupported
              ? `Download video (${RECORD_VIDEO_DEFAULT_SECONDS}s)`
              : `Video → PNG sequence (${RECORD_VIDEO_DEFAULT_SECONDS}s)`}
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() =>
            void onDownloadPngSequence(
              filenameBase,
              RECORD_VIDEO_DEFAULT_SECONDS,
            )
          }
          title={
            mounted
              ? `Sample ~${RECORD_VIDEO_DEFAULT_SECONDS}s of PNG frames into a ZIP`
              : "Wait until the tool is live"
          }
        >
          {sequencing && sequenceProgress
            ? `Frames… ${sequenceProgress.done}/${sequenceProgress.total}`
            : "Download PNG sequence"}
        </button>
        {onSaveGalleryThumbnail ? (
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => void onSaveGalleryThumbnail()}
            title={
              mounted
                ? "Capture frame and upload as gallery thumbnail (kind=thumb)"
                : "Wait until the tool is live"
            }
          >
            Save gallery thumbnail
          </button>
        ) : null}
      </div>
      {lastThumbnailAt || lastThumbnailUrl ? (
        <div className="mt-[0.65rem] flex items-center gap-3">
          {lastThumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lastThumbnailUrl}
              alt="Gallery thumbnail"
              className="h-[72px] w-[72px] rounded-lg border border-foreground/12 bg-foreground/[0.04] object-cover"
              crossOrigin="anonymous"
            />
          ) : null}
          <p className="text-sm opacity-55">
            Gallery thumbnail
            {lastThumbnailAt
              ? ` · ${new Date(lastThumbnailAt).toLocaleTimeString()}`
              : null}
          </p>
        </div>
      ) : null}
      {lastAt || lastVideoAt || lastSequenceAt ? (
        <p className="text-sm opacity-55">
          {lastAt
            ? `PNG ${new Date(lastAt).toLocaleTimeString()}`
            : null}
          {lastVideoAt
            ? `${lastAt ? " · " : ""}Video ${new Date(lastVideoAt).toLocaleTimeString()}`
            : null}
          {lastSequenceAt
            ? `${lastAt || lastVideoAt ? " · " : ""}Seq ${new Date(lastSequenceAt).toLocaleTimeString()}`
            : null}
        </p>
      ) : null}
    </section>
  );
}
