/**
 * Shared export timing constants (M7b/M7c).
 * Mirrors @repo/contracts CAPTURE_VIDEO_* so Studio helpers stay aligned
 * without pulling host-only runtime into pure helpers when testing.
 */

import {
  CAPTURE_VIDEO_DURATION_SECONDS as CONTRACT_DURATION,
} from "@repo/contracts";

export const CAPTURE_VIDEO_DURATION_SECONDS = CONTRACT_DURATION;

export function clampRecordDurationSeconds(seconds: number): number {
  const n = Number.isFinite(seconds)
    ? seconds
    : CAPTURE_VIDEO_DURATION_SECONDS.default;
  return Math.min(
    CAPTURE_VIDEO_DURATION_SECONDS.max,
    Math.max(CAPTURE_VIDEO_DURATION_SECONDS.min, n),
  );
}
