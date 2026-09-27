"use client";

import type { ReactNode } from "react";

import { Download, ImageIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { RECORD_VIDEO_DEFAULT_SECONDS } from "@/runtime";

import {
  StatusToast,
  groupLabelCls,
  innerCardCls,
} from "../lib/studio-ui";

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

/**
 * M7a–M7c export + M8c gallery thumbnail capture.
 * Format rows follow the landing's export card (design-language §3.20);
 * the row that is working shows the accent "Exporting" pill (§3.6).
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
  lastAt,
  lastVideoAt,
  lastSequenceAt,
  onSaveGalleryThumbnail,
  lastThumbnailUrl,
  lastThumbnailAt,
}: ExportPanelProps) {
  const disabled = !mounted || busy;
  const recording = recordSecondsLeft != null;
  const sequencing = sequenceProgress != null;
  const secs = RECORD_VIDEO_DEFAULT_SECONDS;
  const waitTitle = "Wait until the tool is live";

  const lastExports = [
    lastAt ? { kind: "PNG", at: lastAt } : null,
    lastVideoAt ? { kind: "Video", at: lastVideoAt } : null,
    lastSequenceAt ? { kind: "Seq", at: lastSequenceAt } : null,
  ].filter((x): x is { kind: string; at: string } => x != null);

  return (
    <section className="flex flex-col gap-4" aria-label="Export">
      <div className={innerCardCls}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className={groupLabelCls}>Export</h3>
          <Download size={13} className="text-muted" />
        </div>
        <div className="flex flex-col gap-1">
          <FormatRow
            name="PNG"
            detail="Still image"
            disabled={disabled}
            working={busy && mounted && !recording && !sequencing}
            status="Exporting…"
            onClick={() => void onDownloadPng(filenameBase)}
            title={
              mounted ? "Capture the live canvas and download a PNG" : waitTitle
            }
          />
          <FormatRow
            name="Video"
            detail={
              mediaRecorderSupported ? (
                <>
                  WebM, <span className="t-mono">{secs}s</span>
                </>
              ) : (
                <>
                  PNG sequence, <span className="t-mono">{secs}s</span>
                </>
              )
            }
            disabled={disabled}
            working={recording}
            status={
              <>
                Recording… <span className="t-mono">{recordSecondsLeft}s</span>
              </>
            }
            onClick={() => void onDownloadVideo(filenameBase, secs)}
            title={
              !mediaRecorderSupported
                ? "MediaRecorder unavailable — will download PNG sequence ZIP"
                : mounted
                  ? `Record ~${secs}s WebM (falls back to PNG sequence)`
                  : waitTitle
            }
          />
          <FormatRow
            name="PNG sequence"
            detail="ZIP, for your editor"
            disabled={disabled}
            working={sequencing}
            status={
              sequenceProgress ? (
                <>
                  Frames{" "}
                  <span className="t-mono">
                    {sequenceProgress.done}/{sequenceProgress.total}
                  </span>
                </>
              ) : null
            }
            onClick={() => void onDownloadPngSequence(filenameBase, secs)}
            title={
              mounted
                ? `Sample ~${secs}s of PNG frames into a ZIP`
                : waitTitle
            }
          />
        </div>
      </div>

      {lastExports.length > 0 ? (
        <StatusToast key={lastExports.map((e) => e.at).join("|")}>
          Exported
          {lastExports.map((e) => (
            <span key={e.kind}>
              {" · "}
              {e.kind}{" "}
              <span className="t-mono">
                {new Date(e.at).toLocaleTimeString()}
              </span>
            </span>
          ))}
        </StatusToast>
      ) : null}

      {onSaveGalleryThumbnail || lastThumbnailAt || lastThumbnailUrl ? (
        <div className={innerCardCls}>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h3 className={groupLabelCls}>Gallery thumbnail</h3>
            {lastThumbnailAt ? (
              <span className="t-mono text-[11px] text-muted">
                {new Date(lastThumbnailAt).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {lastThumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastThumbnailUrl}
                alt="Gallery thumbnail"
                className="size-18 shrink-0 rounded-[6px] border border-border bg-workspace object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-18 shrink-0 place-items-center rounded-[6px] border border-dashed border-border-strong text-muted"
              >
                <ImageIcon size={14} />
              </span>
            )}
            {onSaveGalleryThumbnail ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={disabled}
                onClick={() => void onSaveGalleryThumbnail()}
                title={
                  mounted
                    ? "Capture frame and upload as gallery thumbnail (kind=thumb)"
                    : waitTitle
                }
              >
                Save gallery thumbnail
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** One export format: a list row that downloads on click. */
function FormatRow({
  name,
  detail,
  disabled,
  working,
  status,
  onClick,
  title,
}: {
  name: string;
  detail: ReactNode;
  disabled: boolean;
  working: boolean;
  status: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-fg pointer-coarse:min-h-11",
        "transition-colors duration-[180ms] ease-standard enabled:hover:bg-workspace",
        "disabled:cursor-not-allowed",
        disabled && !working && "opacity-45",
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      <span className="min-w-0">
        <span className="sr-only">Download </span>
        <span className="font-medium">{name}</span>
        <span className="block text-[11.5px] text-muted">{detail}</span>
      </span>
      {working ? (
        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-medium text-white">
          {status}
        </span>
      ) : (
        <Download
          size={14}
          className="shrink-0 text-muted transition-colors duration-[180ms] ease-standard group-hover:text-fg"
        />
      )}
    </button>
  );
}
