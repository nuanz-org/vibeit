"use client";

import { RECORD_VIDEO_DEFAULT_SECONDS } from "@/runtime";

import styles from "../styles.module.css";

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
};

/**
 * M7a–M7c — product export chrome (PNG, WebM, PNG-sequence fallback).
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
}: ExportPanelProps) {
  const disabled = !mounted || busy;
  const recording = recordSecondsLeft != null;
  const sequencing = sequenceProgress != null;

  return (
    <section className={styles.section} aria-label="Export">
      <h2 className={styles.sectionTitle}>Export</h2>
      <p className={styles.muted}>
        Client-side only. PNG always works. Short video is WebM (best on
        Chromium); if MediaRecorder fails we download a PNG sequence ZIP
        instead. Default clip: {RECORD_VIDEO_DEFAULT_SECONDS}s. See{" "}
        <code>md/export-browser-support.md</code>.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
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
          className={styles.button}
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
          className={styles.button}
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
      </div>
      {!mediaRecorderSupported ? (
        <p className={styles.muted}>
          MediaRecorder not detected — video button uses PNG-sequence fallback.
        </p>
      ) : null}
      {lastAt ? (
        <p className={styles.muted}>
          Last PNG {new Date(lastAt).toLocaleTimeString()}
          {lastByteLength != null ? ` · ~${lastByteLength} bytes` : null}
        </p>
      ) : null}
      {lastVideoAt ? (
        <p className={styles.muted}>
          Last video {new Date(lastVideoAt).toLocaleTimeString()}
          {lastVideoDurationSeconds != null
            ? ` · ${lastVideoDurationSeconds}s`
            : null}
          {lastVideoByteLength != null
            ? ` · ~${lastVideoByteLength} bytes`
            : null}
        </p>
      ) : null}
      {lastSequenceAt ? (
        <p className={styles.muted}>
          Last sequence {new Date(lastSequenceAt).toLocaleTimeString()}
          {lastSequenceFrameCount != null
            ? ` · ${lastSequenceFrameCount} frames`
            : null}
          {lastSequenceAsFallback ? " · video fallback" : null}
        </p>
      ) : null}
    </section>
  );
}
