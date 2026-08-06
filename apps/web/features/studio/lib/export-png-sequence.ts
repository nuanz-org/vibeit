/**
 * PNG-sequence export (M7c) — fallback when MediaRecorder WebM is unavailable.
 *
 * Samples captureFrame() over a short window, packs frames into a ZIP.
 */

import {
  CAPTURE_VIDEO_DURATION_SECONDS,
  clampRecordDurationSeconds,
} from "./export-video-constants";
import { createStoreZipFromBlobs } from "./zip-store";

/** Frames per second for sequence sampling (product MVP). */
export const PNG_SEQUENCE_FPS = 4 as const;

export type CapturePngSequenceOptions = {
  /** Capture one PNG blob (already validated). */
  captureFrame: () => Promise<Blob>;
  /** Wall-clock duration to sample (clamped 3–6s). */
  durationSeconds?: number;
  /** Samples per second (default 4 → ~16 frames at 4s). */
  fps?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
};

/**
 * Sample frames evenly over durationSeconds.
 * Frame count = max(2, round(duration * fps)).
 */
export async function capturePngSequence(
  options: CapturePngSequenceOptions,
): Promise<Blob[]> {
  const durationSeconds = clampRecordDurationSeconds(
    options.durationSeconds ?? CAPTURE_VIDEO_DURATION_SECONDS.default,
  );
  const fps = options.fps ?? PNG_SEQUENCE_FPS;
  const total = Math.max(2, Math.round(durationSeconds * fps));
  const intervalMs = (durationSeconds * 1000) / Math.max(1, total - 1);

  const frames: Blob[] = [];
  for (let i = 0; i < total; i += 1) {
    if (options.signal?.aborted) {
      throw new Error("PNG sequence capture aborted");
    }
    const blob = await options.captureFrame();
    if (!(blob instanceof Blob) || blob.size < 32) {
      throw new Error(`PNG sequence frame ${i + 1} empty or invalid`);
    }
    frames.push(blob);
    options.onProgress?.(i + 1, total);

    if (i < total - 1) {
      await delay(intervalMs, options.signal);
    }
  }
  return frames;
}

export async function packPngSequenceZip(
  frames: Blob[],
  /** Optional prefix inside zip, e.g. "frames" */
  folder = "frames",
): Promise<Blob> {
  const entries = frames.map((blob, i) => ({
    name: `${folder}/frame-${String(i).padStart(3, "0")}.png`,
    blob,
  }));
  return createStoreZipFromBlobs(entries);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("PNG sequence capture aborted"));
      return;
    }
    const t = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new Error("PNG sequence capture aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
