/**
 * SETUP SHELL — API / structure reference only.
 * It has no visual style on purpose: never copy its colours, layout or look.
 * Shows the harness patterns style recipes rely on: params, loop phase, stepped
 * "boil" time, seeded random, offscreen layers, text wrapping, image fallback.
 */
import { createCanvas2dTool, drawImageCover } from "@repo/contracts/skeletons/canvas2d";

// Seeded random: same seed → same numbers (stable grain / jitter per step).
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Offscreen layer, never appended to the DOM. Recreate only when the size changes.
const layers: Record<string, HTMLCanvasElement> = {};
function layer(name: string, w: number, h: number): CanvasRenderingContext2D {
  let cv = layers[name];
  if (!cv) {
    cv = document.createElement("canvas");
    layers[name] = cv;
  }
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  return cv.getContext("2d") as CanvasRenderingContext2D;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "headline", kind: "text", label: "Headline", default: "Headline goes here", group: "Content" },
        { name: "bgColor", kind: "color", label: "Background", default: "#e6e6e6", group: "Palette" },
        { name: "inkColor", kind: "color", label: "Ink", default: "#222222", group: "Palette" },
        { name: "stepFps", kind: "number", label: "Step fps", default: 10, min: 1, max: 24, step: 1, group: "Motion" },
        { name: "isPlaying", kind: "boolean", label: "Play", default: true, uiHint: "playPause", group: "Motion" },
        { name: "photo", kind: "assetRef", label: "Photo", default: "photo", assetSlotId: "photo", group: "Content" },
      ],
      getDefaultParams: () => ({
        headline: "Headline goes here",
        bgColor: "#e6e6e6",
        inkColor: "#222222",
        stepFps: 10,
        isPlaying: true,
        photo: "photo",
      }),
      getAssetSlots: () => [{ id: "photo", label: "Photo", accept: "image/*", required: false }],
      draw(c) {
        const { ctx, width: w, height: h } = c;
        const p = c.params as Record<string, unknown>;
        const playing = p.isPlaying !== false;
        const t = playing ? c.time : 0;

        // Stepped time for boil / flipbook styles; smooth phase for tweened styles.
        const fps = Math.max(1, Number(p.stepFps ?? 10));
        const step = Math.floor(t * fps);
        const phase = (t % 4) / 4; // 0..1 seamless loop
        const rand = rng(step + 1);

        ctx.fillStyle = String(p.bgColor ?? "#e6e6e6");
        ctx.fillRect(0, 0, w, h);

        // Offscreen layer: draw a mask in black, then tint with 'source-in'.
        const lc = layer("plate", Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
        lc.clearRect(0, 0, w, h);
        lc.fillStyle = "#000";
        lc.fillRect(w * 0.1, h * 0.35, w * 0.8, h * 0.4);
        lc.globalCompositeOperation = "source-in";
        lc.fillStyle = String(p.inkColor ?? "#222222");
        lc.fillRect(0, 0, w, h);
        lc.globalCompositeOperation = "source-over";
        const jx = (rand() - 0.5) * 2;
        ctx.drawImage(layers.plate as HTMLCanvasElement, jx, 0, w, h);

        // Image slot with a fallback so the first paint is never empty.
        const img = c.images.photo;
        if (img) {
          drawImageCover(ctx, img, w * 0.12, h * 0.37, w * 0.76, h * 0.36);
        }

        // Text: fit to width with measureText; system font stacks only.
        const size = Math.round(w * 0.08);
        ctx.fillStyle = String(p.inkColor ?? "#222222");
        ctx.font = `700 ${size}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        const lines = wrapLines(ctx, String(p.headline ?? ""), w * 0.8);
        lines.forEach((line, i) => ctx.fillText(line, w * 0.1, h * 0.14 + size * (i + 1) * 1.05));

        // Pointer (CSS px) — use for hover effects; harness owns the listeners.
        if (c.pointer.isOver) {
          ctx.fillRect(c.pointer.x - 3, c.pointer.y - 3, 6, 6);
        }
        ctx.fillRect(w * 0.1, h * 0.8, w * 0.8 * phase, 2);
      },
    },
    { aspect: "4:5", autoDpr: true },
  );
