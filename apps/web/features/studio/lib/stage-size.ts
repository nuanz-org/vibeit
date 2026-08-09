/**
 * Studio stage size model (C6) — Brik-style presets + custom W×H.
 * Controls preview frame presentation; harness reflows via ResizeObserver.
 */

export type StagePresetId = "16:9" | "1:1" | "4:3" | "4:5" | "9:16" | "custom";

export type StageSize = {
  preset: StagePresetId;
  width: number;
  height: number;
};

export type StagePresetDef = {
  id: Exclude<StagePresetId, "custom">;
  label: string;
  width: number;
  height: number;
};

/** Default logical sizes for named presets (Brik-class). */
export const STAGE_PRESETS: readonly StagePresetDef[] = [
  { id: "16:9", label: "HD 16:9", width: 1280, height: 720 },
  { id: "1:1", label: "Square 1:1", width: 1080, height: 1080 },
  { id: "4:3", label: "4:3", width: 1024, height: 768 },
  { id: "4:5", label: "Portrait 4:5", width: 1080, height: 1350 },
  { id: "9:16", label: "Portrait 9:16", width: 1080, height: 1920 },
] as const;

export const STAGE_SIZE_MIN = 64;
export const STAGE_SIZE_MAX = 4096;

const STORAGE_PREFIX = "vibeit.stageSize.v1:";

export function clampStageDim(n: number): number {
  if (!Number.isFinite(n)) return STAGE_SIZE_MIN;
  return Math.min(STAGE_SIZE_MAX, Math.max(STAGE_SIZE_MIN, Math.round(n)));
}

export function clampStageSize(size: StageSize): StageSize {
  return {
    preset: size.preset,
    width: clampStageDim(size.width),
    height: clampStageDim(size.height),
  };
}

export function parseAspectRatio(
  aspect: string,
): { w: number; h: number } | null {
  const m = aspect.trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  return { w, h };
}

function presetById(id: string): StagePresetDef | undefined {
  return STAGE_PRESETS.find((p) => p.id === id);
}

/**
 * Build a StageSize from a plan/harness aspect string (e.g. "16:9", "1:1").
 * Uses preset defaults when aspect matches a known id; otherwise scales to longEdge.
 */
export function sizeFromAspect(
  aspect: string,
  longEdge = 1080,
): StageSize {
  const known = presetById(aspect.trim());
  if (known) {
    return {
      preset: known.id,
      width: known.width,
      height: known.height,
    };
  }
  const ar = parseAspectRatio(aspect);
  if (!ar) {
    return defaultStageSize("1:1");
  }
  const ratio = ar.w / ar.h;
  let width: number;
  let height: number;
  if (ratio >= 1) {
    width = longEdge;
    height = Math.round(longEdge / ratio);
  } else {
    height = longEdge;
    width = Math.round(longEdge * ratio);
  }
  return clampStageSize({
    preset: "custom",
    width,
    height,
  });
}

export function defaultStageSize(
  preset: Exclude<StagePresetId, "custom"> = "1:1",
): StageSize {
  const p = presetById(preset) ?? STAGE_PRESETS[1]!;
  return { preset: p.id, width: p.width, height: p.height };
}

export function sizeFromPreset(
  presetId: Exclude<StagePresetId, "custom">,
): StageSize {
  return defaultStageSize(presetId);
}

/** Manual W/H edit → custom preset. */
export function sizeFromCustom(width: number, height: number): StageSize {
  return clampStageSize({
    preset: "custom",
    width,
    height,
  });
}

/**
 * Contain logical W×H inside max box (preserve aspect).
 * Returns display CSS pixel size for the stage frame.
 */
export function fitStageBox(
  logicalW: number,
  logicalH: number,
  maxW: number,
  maxH: number,
): { displayW: number; displayH: number } {
  const w = Math.max(1, logicalW);
  const h = Math.max(1, logicalH);
  const boxW = Math.max(1, maxW);
  const boxH = Math.max(1, maxH);
  const scale = Math.min(boxW / w, boxH / h, 1);
  return {
    displayW: Math.max(1, Math.round(w * scale)),
    displayH: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * Embed / share default iframe size from stage or aspect.
 * Scaled down from logical size for a reasonable embed.
 */
export function embedSizeFromStage(
  size: Pick<StageSize, "width" | "height">,
  maxLongEdge = 640,
): { width: number; height: number } {
  const w = Math.max(1, size.width);
  const h = Math.max(1, size.height);
  const long = Math.max(w, h);
  const scale = long > maxLongEdge ? maxLongEdge / long : 1;
  return {
    width: Math.max(120, Math.round(w * scale)),
    height: Math.max(120, Math.round(h * scale)),
  };
}

export function embedSizeFromAspect(
  aspect: string | null | undefined,
): { width: number; height: number } {
  if (!aspect?.trim()) {
    return { width: 480, height: 480 };
  }
  return embedSizeFromStage(sizeFromAspect(aspect));
}

/** Extract aspect from createTool options in source (best-effort). */
export function parseAspectFromSource(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  // aspect: "9:16" | aspect: '1:1' | aspect: `16:9`
  const m = code.match(/\baspect\s*:\s*["'`](\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?)["'`]/);
  return m?.[1]?.replace(/\s+/g, "") ?? null;
}

function storageKey(toolId: string): string {
  return `${STORAGE_PREFIX}${toolId}`;
}

export function loadStageSize(toolId: string): StageSize | null {
  if (typeof window === "undefined" || !toolId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(toolId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StageSize>;
    if (
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number" ||
      typeof parsed.preset !== "string"
    ) {
      return null;
    }
    const preset = parsed.preset as StagePresetId;
    const validPresets: StagePresetId[] = [
      "16:9",
      "1:1",
      "4:3",
      "4:5",
      "9:16",
      "custom",
    ];
    if (!validPresets.includes(preset)) return null;
    return clampStageSize({
      preset,
      width: parsed.width,
      height: parsed.height,
    });
  } catch {
    return null;
  }
}

export function saveStageSize(toolId: string, size: StageSize): void {
  if (typeof window === "undefined" || !toolId) return;
  try {
    window.localStorage.setItem(
      storageKey(toolId),
      JSON.stringify(clampStageSize(size)),
    );
  } catch {
    /* quota / private mode */
  }
}

/**
 * Seed order: localStorage → plan aspect → source aspect → fallback.
 * social-frame fixture → 9:16; other defaults → 1:1.
 */
export function resolveInitialStageSize(options: {
  toolId: string;
  planAspect?: string | null;
  sourceAspect?: string | null;
  /** Prefer 9:16 for social-frame fixture when nothing else wins. */
  fallbackPreset?: Exclude<StagePresetId, "custom">;
}): StageSize {
  const stored = loadStageSize(options.toolId);
  if (stored) return stored;

  const aspect =
    options.planAspect?.trim() ||
    options.sourceAspect?.trim() ||
    null;
  if (aspect) {
    return sizeFromAspect(aspect);
  }

  return defaultStageSize(options.fallbackPreset ?? "1:1");
}
