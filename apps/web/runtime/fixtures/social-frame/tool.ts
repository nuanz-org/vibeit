/**
 * Hand-authored canvas2d reference tool: kinetic social frame (M2a4).
 *
 * Full VibeTool via createCanvas2dTool + M0b social-frame schema.
 * Loaded inside the sandboxed frame only (see runtime/frame/entry.ts).
 *
 * Creative fill uses harness `images[slotId]` (CORS-safe) — do not re-fetch.
 */

import {
  socialFrameAssetSlots,
  socialFrameDefaultParams,
  socialFrameParamSchema,
} from "@repo/contracts/examples/canvas2d-social-frame";
import {
  createCanvas2dTool,
  type Canvas2dCreative,
  type Canvas2dDrawContext,
} from "@repo/contracts/skeletons/canvas2d";
import type { CreateVibeTool, ToolParams } from "@repo/contracts";

/** Stable fixture id for host logging / Studio later. */
export const SOCIAL_FRAME_TOOL_ID = "fixture:social-frame" as const;

export const SOCIAL_FRAME_ASPECT = "9:16" as const;

function str(params: ToolParams, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function num(params: ToolParams, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function bool(params: ToolParams, key: string, fallback: boolean): boolean {
  const v = params[key];
  return typeof v === "boolean" ? v : fallback;
}

type MotionPreset = "pulse" | "drift" | "none";

function motionPreset(params: ToolParams): MotionPreset {
  const v = params.motionPreset;
  if (v === "pulse" || v === "drift" || v === "none") return v;
  return "pulse";
}

/** Cover-draw image into rect (object-fit: cover). */
function drawImageCover(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw <= 0 || ih <= 0) return;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawGrid(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
): void {
  const step = Math.max(24, Math.min(w, h) * 0.08);
  g.save();
  g.strokeStyle = accent;
  g.globalAlpha = 0.12;
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= w; x += step) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += step) {
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
  }
  g.stroke();
  g.restore();
}

function motionPhase(preset: MotionPreset, time: number, speed: number): {
  scale: number;
  offsetX: number;
  offsetY: number;
  ring: number;
} {
  const t = time * speed;
  switch (preset) {
    case "none":
      return { scale: 1, offsetX: 0, offsetY: 0, ring: 0.35 };
    case "drift":
      return {
        scale: 1,
        offsetX: Math.sin(t * 0.9) * 0.04,
        offsetY: Math.cos(t * 0.7) * 0.03,
        ring: 0.32 + 0.08 * (0.5 + 0.5 * Math.sin(t * 1.1)),
      };
    case "pulse":
    default: {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      return {
        scale: 0.92 + 0.12 * pulse,
        offsetX: 0,
        offsetY: 0,
        ring: 0.28 + 0.1 * pulse,
      };
    }
  }
}

/**
 * Social-frame creative fill — schema from M0b example, motion + assets.
 */
export const socialFrameCreative: Canvas2dCreative = {
  getParamSchema: () => [...socialFrameParamSchema],
  getDefaultParams: () => ({ ...socialFrameDefaultParams }),
  getAssetSlots: () => [...socialFrameAssetSlots],

  // --- CREATIVE_FILL ---
  draw(c: Canvas2dDrawContext) {
    const { ctx: g, width: w, height: h, params: p, time, images } = c;
    const bg = str(p, "bg", socialFrameDefaultParams.bg);
    const accent = str(p, "accent", socialFrameDefaultParams.accent);
    const title = str(p, "title", socialFrameDefaultParams.title);
    const speed = num(p, "speed", socialFrameDefaultParams.speed);
    const showGrid = bool(p, "showGrid", socialFrameDefaultParams.showGrid);
    const preset = motionPreset(p);
    const m = motionPhase(preset, time, speed);

    g.clearRect(0, 0, w, h);

    // Background color
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // Optional full-bleed background photo
    const background = images.background;
    if (background) {
      g.save();
      drawImageCover(g, background, 0, 0, w, h);
      g.fillStyle = bg;
      g.globalAlpha = 0.45;
      g.fillRect(0, 0, w, h);
      g.restore();
    }

    if (showGrid) {
      drawGrid(g, w, h, accent);
    }

    // Soft vignette
    const vig = g.createRadialGradient(
      w * 0.5,
      h * 0.42,
      Math.min(w, h) * 0.1,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.75,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    // Accent orb / ring (kinetic)
    const cx = w * (0.5 + m.offsetX);
    const cy = h * (0.4 + m.offsetY);
    const baseR = Math.min(w, h) * m.ring * m.scale;

    g.save();
    g.shadowColor = accent;
    g.shadowBlur = Math.min(w, h) * 0.08;
    g.fillStyle = accent;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(cx, cy, baseR, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // Outer ring
    g.save();
    g.strokeStyle = accent;
    g.globalAlpha = 0.45;
    g.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
    g.beginPath();
    g.arc(cx, cy, baseR * 1.35, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    // Logo (harness-loaded, crossOrigin anonymous)
    const logo = images.logo;
    if (logo) {
      const size = Math.min(w, h) * 0.18 * m.scale;
      g.save();
      g.globalAlpha = 0.98;
      // Circular clip for mark
      g.beginPath();
      g.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
      g.closePath();
      g.clip();
      g.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
      g.restore();
    }

    // Headline
    const fontSize = Math.max(16, Math.floor(w * 0.07));
    g.fillStyle = "#f5f5f7";
    g.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(title, w * 0.5, h * 0.72, w * 0.86);

    // Subtle footer label
    g.fillStyle = accent;
    g.globalAlpha = 0.7;
    g.font = `500 ${Math.max(10, Math.floor(w * 0.032))}px system-ui, sans-serif`;
    g.fillText("aiditr · social frame", w * 0.5, h * 0.88, w * 0.8);
    g.globalAlpha = 1;
  },
  // --- CREATIVE_FILL end ---
};

/**
 * Factory used by the runtime frame adapter.
 * Implements full VibeTool contract (mount/update/setAssets/capture/dispose).
 */
export const createSocialFrameTool: CreateVibeTool = () =>
  createCanvas2dTool(socialFrameCreative, {
    aspect: SOCIAL_FRAME_ASPECT,
    autoDpr: true,
  });
