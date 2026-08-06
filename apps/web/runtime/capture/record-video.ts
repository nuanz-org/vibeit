/**
 * In-frame short video recording (M7b).
 *
 * MediaStream cannot cross postMessage — record inside the sandboxed frame
 * via VibeTool.getCaptureStream() + MediaRecorder, then wire the WebM blob
 * back to the host (same base64 wire as PNG capture).
 *
 * Constants: @repo/contracts capture-cors
 *   CAPTURE_VIDEO_DURATION_SECONDS, CAPTURE_VIDEO_MIME_PREFERRED, CAPTURE_STREAM_FPS
 */

import {
  CAPTURE_STREAM_FPS,
  CAPTURE_VIDEO_DURATION_SECONDS,
  CAPTURE_VIDEO_MIME_PREFERRED,
} from "@repo/contracts";

/** Preferred MIME candidates for MediaRecorder (Chromium-first). */
export const RECORD_VIDEO_MIME_CANDIDATES = [
  CAPTURE_VIDEO_MIME_PREFERRED,
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

export function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== "undefined";
}

/** Pick the first MediaRecorder-supported MIME, or empty string for browser default. */
export function pickRecordVideoMimeType(): string {
  if (!isMediaRecorderSupported()) return "";
  for (const mime of RECORD_VIDEO_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      /* ignore */
    }
  }
  return "";
}

/**
 * Clamp duration to product range (default 4s, min 3, max 6).
 */
export function clampRecordDurationSeconds(seconds: number): number {
  const n = Number.isFinite(seconds) ? seconds : CAPTURE_VIDEO_DURATION_SECONDS.default;
  return Math.min(
    CAPTURE_VIDEO_DURATION_SECONDS.max,
    Math.max(CAPTURE_VIDEO_DURATION_SECONDS.min, n),
  );
}

export type RecordMediaStreamOptions = {
  stream: MediaStream;
  /** Seconds of recording (clamped). */
  durationSeconds: number;
  /** Optional abort — stops recorder early and rejects. */
  signal?: AbortSignal;
};

/**
 * Record a MediaStream to a WebM (or browser-chosen) Blob via MediaRecorder.
 * Stops all tracks when finished. Throws if MediaRecorder is unavailable.
 */
export async function recordMediaStreamToBlob(
  options: RecordMediaStreamOptions,
): Promise<Blob> {
  const { stream, signal } = options;
  const durationSeconds = clampRecordDurationSeconds(options.durationSeconds);
  const durationMs = Math.round(durationSeconds * 1000);

  if (!isMediaRecorderSupported()) {
    throw new Error(
      "MediaRecorder is not available in this browser — use PNG-sequence fallback (M7c)",
    );
  }

  if (signal?.aborted) {
    stopStreamTracks(stream);
    throw new Error("Video recording aborted");
  }

  const mimeType = pickRecordVideoMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  } catch (err) {
    stopStreamTracks(stream);
    throw new Error(
      `MediaRecorder failed to start: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const chunks: Blob[] = [];
  const recordedType = recorder.mimeType || mimeType || CAPTURE_VIDEO_MIME_PREFERRED;

  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (stopTimer != null) {
        clearTimeout(stopTimer);
        stopTimer = null;
      }
      signal?.removeEventListener("abort", onAbort);
      stopStreamTracks(stream);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      reject(new Error(message));
    };

    const succeed = (blob: Blob) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(blob);
    };

    const onAbort = () => {
      fail("Video recording aborted");
    };

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      fail("MediaRecorder error while recording");
    };

    recorder.onstop = () => {
      if (settled) return;
      const blob = new Blob(chunks, { type: recordedType });
      if (blob.size < 32) {
        fail("Recorded video empty — MediaRecorder produced no data");
        return;
      }
      succeed(blob);
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      // timeslice keeps data flowing and helps some browsers flush chunks
      recorder.start(250);
    } catch (err) {
      fail(
        `MediaRecorder.start failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    stopTimer = setTimeout(() => {
      try {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch (err) {
        fail(
          `MediaRecorder.stop failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }, durationMs);
  });
}

function stopStreamTracks(stream: MediaStream): void {
  try {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  } catch {
    /* ignore */
  }
}

/** Documented default duration for Studio UI (seconds). */
export const RECORD_VIDEO_DEFAULT_SECONDS =
  CAPTURE_VIDEO_DURATION_SECONDS.default;

/** Documented FPS hint (canvas.captureStream). */
export const RECORD_VIDEO_STREAM_FPS = CAPTURE_STREAM_FPS;
