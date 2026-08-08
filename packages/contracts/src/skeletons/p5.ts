/**
 * p5-style skeleton harness (AM6a).
 *
 * Stub harness: p5-like creative API on Canvas2D (no external p5 CDN —
 * frame CSP blocks remote scripts). Full allowlisted p5 bundle is M2b+.
 *
 * Creative fill implements draw(p) with helpers: background, fill, ellipse, etc.
 */

import type { AssetSlots, ParamSchema } from "../param-schema";
import type {
  CreateVibeTool,
  MountOptions,
  ToolAssets,
  ToolParams,
  VibeTool,
} from "../vibe-tool";

export type P5Aspect = "1:1" | "9:16" | "16:9" | "4:5";

export interface P5HarnessOptions {
  aspect?: P5Aspect | string;
  autoDpr?: boolean;
  /**
   * Cap on devicePixelRatio when autoDpr is on. Default **2**.
   */
  maxDpr?: number;
}

/** p5-flavored draw context (Canvas2D-backed stub). */
export interface P5DrawContext {
  canvas: HTMLCanvasElement;
  /** Underlying 2d context (advanced escape hatch). */
  drawingContext: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  params: ToolParams;
  assets: ToolAssets;
  time: number;
  delta: number;
  /** Clear + fill background. */
  background: (color: string) => void;
  fill: (color: string) => void;
  stroke: (color: string) => void;
  noStroke: () => void;
  strokeWeight: (w: number) => void;
  ellipse: (x: number, y: number, w: number, h?: number) => void;
  rect: (x: number, y: number, w: number, h: number) => void;
  text: (str: string, x: number, y: number, maxWidth?: number) => void;
  textSize: (size: number) => void;
  textAlign: (h: CanvasTextAlign, v?: CanvasTextBaseline) => void;
}

export interface P5Creative {
  getParamSchema(): ParamSchema;
  getDefaultParams(): ToolParams;
  getAssetSlots(): AssetSlots;
  setup?(p: P5DrawContext): void | Promise<void>;
  draw(p: P5DrawContext): void;
  onParams?(params: ToolParams, p: P5DrawContext): void;
  dispose?(): void;
}

function parseAspect(aspect: string): { w: number; h: number } {
  const parts = aspect.split(":").map(Number);
  const w = parts[0];
  const h = parts[1];
  if (
    w != null &&
    h != null &&
    Number.isFinite(w) &&
    Number.isFinite(h) &&
    w > 0 &&
    h > 0
  ) {
    return { w, h };
  }
  return { w: 1, h: 1 };
}

/**
 * Build a VibeTool with a p5-like creative API (Canvas2D stub harness).
 */
export function createP5Tool(
  creative: P5Creative,
  options: P5HarnessOptions = {},
): VibeTool {
  const aspect = options.aspect ?? "1:1";
  const autoDpr = options.autoDpr !== false;
  const maxDpr = Math.max(
    1,
    Number.isFinite(options.maxDpr as number) ? Number(options.maxDpr) : 2,
  );

  let root: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let params: ToolParams = { ...creative.getDefaultParams() };
  let assets: ToolAssets = {};
  let raf = 0;
  let mounted = false;
  let setupDone = false;
  let startMs = 0;
  let lastMs = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let resizeObserver: ResizeObserver | null = null;
  let strokeOn = false;
  let strokeColor = "#000000";
  let fillColor = "#ffffff";
  let lineW = 1;

  function buildP(now: number): P5DrawContext {
    if (!canvas || !ctx) throw new Error("p5 harness: not mounted");
    const g = ctx;
    const time = (now - startMs) / 1000;
    const delta = lastMs ? (now - lastMs) / 1000 : 0;
    return {
      canvas,
      drawingContext: g,
      width,
      height,
      dpr,
      params,
      assets,
      time,
      delta,
      background(color: string) {
        g.save();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = color;
        g.fillRect(0, 0, width, height);
        g.restore();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
      fill(color: string) {
        fillColor = color;
      },
      stroke(color: string) {
        strokeOn = true;
        strokeColor = color;
      },
      noStroke() {
        strokeOn = false;
      },
      strokeWeight(w: number) {
        lineW = w;
      },
      ellipse(x: number, y: number, w: number, h?: number) {
        const hh = h ?? w;
        g.beginPath();
        g.ellipse(x, y, Math.abs(w) / 2, Math.abs(hh) / 2, 0, 0, Math.PI * 2);
        g.fillStyle = fillColor;
        g.fill();
        if (strokeOn) {
          g.strokeStyle = strokeColor;
          g.lineWidth = lineW;
          g.stroke();
        }
      },
      rect(x: number, y: number, w: number, h: number) {
        g.fillStyle = fillColor;
        g.fillRect(x, y, w, h);
        if (strokeOn) {
          g.strokeStyle = strokeColor;
          g.lineWidth = lineW;
          g.strokeRect(x, y, w, h);
        }
      },
      text(str: string, x: number, y: number, maxWidth?: number) {
        g.fillStyle = fillColor;
        if (maxWidth != null) g.fillText(str, x, y, maxWidth);
        else g.fillText(str, x, y);
      },
      textSize(size: number) {
        g.font = `${size}px system-ui, sans-serif`;
      },
      textAlign(h: CanvasTextAlign, v?: CanvasTextBaseline) {
        g.textAlign = h;
        if (v) g.textBaseline = v;
      },
    };
  }

  function layout() {
    if (!root || !canvas || !ctx) return;
    const rect = root.getBoundingClientRect();
    const ar = parseAspect(aspect);
    let cssW = Math.max(1, Math.floor(rect.width) || 0);
    let cssH = Math.max(1, Math.floor(rect.height) || 0);
    if (cssW <= 1 && cssH <= 1) {
      cssW = 360;
      cssH = Math.max(1, Math.round((360 * ar.h) / ar.w));
    } else if (rect.width > 0 && rect.height <= 1) {
      cssH = Math.max(1, Math.round((cssW * ar.h) / ar.w));
    }
    dpr = autoDpr ? Math.min(window.devicePixelRatio || 1, maxDpr) : 1;
    width = cssW;
    height = cssH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now: number) {
    if (!mounted || !ctx || !canvas) return;
    const p = buildP(now);
    if (!setupDone) {
      setupDone = true;
      void Promise.resolve(creative.setup?.(p)).catch(() => {});
    }
    try {
      creative.draw(p);
    } catch {
      /* keep loop */
    }
    lastMs = now;
    raf = requestAnimationFrame(frame);
  }

  return {
    async mount(el: HTMLElement, mountOptions: MountOptions) {
      root = el;
      root.replaceChildren();
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-vibe-target", "p5");
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      root.appendChild(canvas);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("p5 harness: 2d context unavailable");
      ctx = context;
      params = { ...creative.getDefaultParams(), ...mountOptions.params };
      assets = { ...(mountOptions.assets ?? {}) };
      setupDone = false;
      mounted = true;
      startMs = performance.now();
      lastMs = 0;
      layout();
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => layout());
        resizeObserver.observe(root);
      }
      raf = requestAnimationFrame(frame);
    },
    update(nextParams: ToolParams) {
      params = { ...params, ...nextParams };
      if (!mounted || !canvas || !ctx) return;
      creative.onParams?.(params, buildP(performance.now()));
    },
    async setAssets(next: ToolAssets) {
      assets = { ...assets, ...next };
    },
    getParamSchema: () => creative.getParamSchema(),
    getDefaultParams: () => creative.getDefaultParams(),
    getAssetSlots: () => creative.getAssetSlots(),
    captureFrame() {
      if (!canvas) throw new Error("p5 harness: captureFrame before mount");
      return new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("p5 harness: toBlob null")),
          "image/png",
        );
      });
    },
    getCaptureStream() {
      if (!canvas) throw new Error("p5 harness: getCaptureStream before mount");
      return canvas.captureStream(30);
    },
    dispose() {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      resizeObserver?.disconnect();
      resizeObserver = null;
      try {
        creative.dispose?.();
      } catch {
        /* ignore */
      }
      root?.replaceChildren();
      root = null;
      canvas = null;
      ctx = null;
    },
  };
}

export const createTool: CreateVibeTool = () =>
  createP5Tool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", default: "#0b1020" },
        { name: "accent", kind: "color", default: "#5ce1ff" },
        { name: "speed", kind: "number", default: 1, min: 0, max: 3, step: 0.05 },
      ],
      getDefaultParams: () => ({
        bg: "#0b1020",
        accent: "#5ce1ff",
        speed: 1,
      }),
      getAssetSlots: () => [],
      draw(p) {
        p.background(String(p.params.bg ?? "#0b1020"));
        const speed = Number(p.params.speed ?? 1);
        const t = p.time * speed;
        p.noStroke();
        p.fill(String(p.params.accent ?? "#5ce1ff"));
        p.ellipse(
          p.width * 0.5 + Math.cos(t) * p.width * 0.2,
          p.height * 0.5 + Math.sin(t) * p.height * 0.15,
          48 + 12 * Math.sin(t * 2),
        );
      },
    },
    { aspect: "1:1" },
  );
