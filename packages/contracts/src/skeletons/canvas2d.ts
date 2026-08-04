/**
 * canvas2d skeleton — harness vs creative fill (M0c).
 *
 * Harness owns: mount root, canvas sizing, rAF loop, param/asset apply,
 * capture, dispose, hard-rule comments.
 * Creative fill owns: draw (and optional setup / param / asset hooks only).
 *
 * Docs: md/contracts/skeletons/canvas2d.md
 *
 * Forbidden in creative fill (and anywhere in the tool iframe):
 * - parent window / top access
 * - arbitrary npm imports
 * - remote code eval / dynamic script injection
 * - unrestricted fetch
 */

import type { AssetSlots, ParamSchema } from "../param-schema.js";
import type {
  AssetRef,
  CreateVibeTool,
  ToolAssets,
  ToolParams,
  VibeTool,
} from "../vibe-tool.js";

// ---------------------------------------------------------------------------
// Harness options + draw context
// ---------------------------------------------------------------------------

/** Common aspect strings for social / studio layouts. */
export type Canvas2dAspect = "1:1" | "9:16" | "16:9" | "4:5";

export interface Canvas2dHarnessOptions {
  /**
   * Logical aspect used when the mount element has no intrinsic size.
   * Default `1:1`.
   */
  aspect?: Canvas2dAspect | string;
  /** Scale backing store by devicePixelRatio (default true). */
  autoDpr?: boolean;
}

/**
 * Read-only frame state passed to creative `draw` / hooks.
 * Mutate `ctx` (the 2D context) only — do not replace `canvas` or break out of iframe.
 */
export interface Canvas2dDrawContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** CSS pixel width of the drawing surface. */
  width: number;
  /** CSS pixel height of the drawing surface. */
  height: number;
  dpr: number;
  params: ToolParams;
  assets: ToolAssets;
  /**
   * Loaded images keyed by asset slot id (when ref resolved successfully).
   * Prefer these over re-fetching URLs in creative code.
   */
  images: Readonly<Record<string, HTMLImageElement | null>>;
  /** Seconds since mount (rAF clock). */
  time: number;
  /** Seconds since previous frame. */
  delta: number;
}

// ---------------------------------------------------------------------------
// Creative fill contract (what the model / hand author implements)
// ---------------------------------------------------------------------------

/**
 * Creative body for a canvas2d tool.
 * Codegen should only replace methods marked as creative fill — not the harness.
 */
export interface Canvas2dCreative {
  getParamSchema(): ParamSchema;
  getDefaultParams(): ToolParams;
  getAssetSlots(): AssetSlots;

  /**
   * CREATIVE_FILL: optional one-shot setup after first layout.
   * Do not start your own rAF loop — harness owns the loop.
   */
  setup?(draw: Canvas2dDrawContext): void | Promise<void>;

  /**
   * CREATIVE_FILL: required per-frame (or static) render.
   * Draw into `draw.ctx` using `width` / `height` CSS pixels
   * (context is already scaled for DPR).
   */
  draw(draw: Canvas2dDrawContext): void;

  /** CREATIVE_FILL: optional reaction to param updates (after merge). */
  onParams?(params: ToolParams, draw: Canvas2dDrawContext): void;

  /** CREATIVE_FILL: optional reaction after assets/images update. */
  onAssets?(assets: ToolAssets, draw: Canvas2dDrawContext): void;

  /** Optional creative teardown (harness still clears DOM / rAF). */
  dispose?(): void;
}

// ---------------------------------------------------------------------------
// Asset helpers (harness-internal)
// ---------------------------------------------------------------------------

function assetUrl(ref: AssetRef | null | undefined): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref.url;
}

/**
 * Load an image with CORS anonymous so captureFrame does not taint the canvas.
 * See M0f / capture-cors.ts (`ASSET_CROSS_ORIGIN`, storage CORS policy).
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Keep in sync with ASSET_CROSS_ORIGIN in capture-cors.ts
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load asset: ${url}`));
    img.src = url;
  });
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

// ---------------------------------------------------------------------------
// Harness factory
// ---------------------------------------------------------------------------

/**
 * Build a `VibeTool` from creative fill + canvas2d harness.
 * Hand-authored tools and M3 codegen both target this shape.
 */
export function createCanvas2dTool(
  creative: Canvas2dCreative,
  options: Canvas2dHarnessOptions = {},
): VibeTool {
  const aspect = options.aspect ?? "1:1";
  const autoDpr = options.autoDpr !== false;

  let root: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let params: ToolParams = { ...creative.getDefaultParams() };
  let assets: ToolAssets = {};
  let images: Record<string, HTMLImageElement | null> = {};
  let raf = 0;
  let mounted = false;
  let setupDone = false;
  let startMs = 0;
  let lastMs = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let resizeObserver: ResizeObserver | null = null;
  let loadGeneration = 0;

  function buildDrawContext(now: number): Canvas2dDrawContext {
    if (!canvas || !ctx) {
      throw new Error("canvas2d harness: not mounted");
    }
    const time = (now - startMs) / 1000;
    const delta = lastMs ? (now - lastMs) / 1000 : 0;
    return {
      canvas,
      ctx,
      width,
      height,
      dpr,
      params,
      assets,
      images,
      time,
      delta,
    };
  }

  function layout() {
    if (!root || !canvas || !ctx) return;

    const rect = root.getBoundingClientRect();
    const aspectRatio = parseAspect(aspect);
    let cssW = Math.max(1, Math.floor(rect.width) || 0);
    let cssH = Math.max(1, Math.floor(rect.height) || 0);

    if (cssW <= 1 && cssH <= 1) {
      cssW = 360;
      cssH = Math.max(1, Math.round((360 * aspectRatio.h) / aspectRatio.w));
    } else if (rect.width > 0 && rect.height <= 1) {
      cssH = Math.max(1, Math.round((cssW * aspectRatio.h) / aspectRatio.w));
    } else if (rect.height > 0 && rect.width <= 1) {
      cssW = Math.max(1, Math.round((cssH * aspectRatio.w) / aspectRatio.h));
    }

    dpr = autoDpr ? Math.min(window.devicePixelRatio || 1, 3) : 1;
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
    const draw = buildDrawContext(now);
    if (!setupDone) {
      setupDone = true;
      void Promise.resolve(creative.setup?.(draw)).catch(() => {
        /* setup errors should not kill the loop; repair comes later (M3) */
      });
    }
    try {
      creative.draw(draw);
    } catch {
      /* keep loop alive; host may surface errors later */
    }
    lastMs = now;
    raf = requestAnimationFrame(frame);
  }

  async function reloadImages(next: ToolAssets) {
    const gen = ++loadGeneration;
    const slots = creative.getAssetSlots();
    const nextImages: Record<string, HTMLImageElement | null> = { ...images };

    await Promise.all(
      slots.map(async (slot) => {
        const url = assetUrl(next[slot.id]);
        if (!url) {
          nextImages[slot.id] = null;
          return;
        }
        try {
          nextImages[slot.id] = await loadImage(url);
        } catch {
          nextImages[slot.id] = null;
        }
      }),
    );

    if (gen !== loadGeneration || !mounted) return;
    images = nextImages;
    if (canvas && ctx) {
      const draw = buildDrawContext(performance.now());
      creative.onAssets?.(assets, draw);
    }
  }

  return {
    mount(el, mountOptions) {
      // HARD RULES: do not access parent window / top; do not inject remote scripts.
      root = el;
      root.replaceChildren();

      canvas = document.createElement("canvas");
      canvas.setAttribute("data-vibe-target", "canvas2d");
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      root.appendChild(canvas);

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("canvas2d harness: 2d context unavailable");
      }
      ctx = context;

      params = {
        ...creative.getDefaultParams(),
        ...mountOptions.params,
      };
      assets = { ...(mountOptions.assets ?? {}) };
      images = {};
      setupDone = false;
      mounted = true;
      startMs = performance.now();
      lastMs = 0;

      layout();
      void reloadImages(assets);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => layout());
        resizeObserver.observe(root);
      }

      raf = requestAnimationFrame(frame);
    },

    update(nextParams) {
      params = { ...params, ...nextParams };
      if (!mounted || !canvas || !ctx) return;
      const draw = buildDrawContext(performance.now());
      creative.onParams?.(params, draw);
    },

    setAssets(nextAssets) {
      assets = { ...assets, ...nextAssets };
      void reloadImages(assets);
    },

    getParamSchema: () => creative.getParamSchema(),
    getDefaultParams: () => creative.getDefaultParams(),
    getAssetSlots: () => creative.getAssetSlots(),

    captureFrame() {
      if (!canvas) {
        throw new Error("canvas2d harness: captureFrame before mount");
      }
      // Prefer toBlob when available; sync fallback for non-DOM test envs.
      return new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("canvas2d harness: toBlob returned null"));
          },
          "image/png",
        );
      });
    },

    getCaptureStream() {
      if (!canvas) {
        throw new Error("canvas2d harness: getCaptureStream before mount");
      }
      return canvas.captureStream(30);
    },

    dispose() {
      mounted = false;
      loadGeneration += 1;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      resizeObserver?.disconnect();
      resizeObserver = null;
      try {
        creative.dispose?.();
      } catch {
        /* ignore creative dispose errors */
      }
      root?.replaceChildren();
      root = null;
      canvas = null;
      ctx = null;
      images = {};
      assets = {};
    },
  };
}

// ---------------------------------------------------------------------------
// Default stub (M2a copy target) — creative fill is intentionally minimal
// ---------------------------------------------------------------------------

const stubParamSchema = [
  {
    name: "bg",
    kind: "color" as const,
    label: "Background",
    default: "#111118",
  },
  {
    name: "accent",
    kind: "color" as const,
    label: "Accent",
    default: "#7c5cff",
  },
  {
    name: "title",
    kind: "text" as const,
    label: "Title",
    default: "canvas2d",
    maxLength: 48,
  },
  {
    name: "speed",
    kind: "number" as const,
    label: "Pulse speed",
    default: 1,
    min: 0,
    max: 3,
    step: 0.05,
  },
] as const satisfies ParamSchema;

const stubAssetSlots = [
  {
    id: "logo",
    label: "Logo",
    accept: "image/*",
    required: false,
    aspectHint: "1:1",
  },
] as const satisfies AssetSlots;

/**
 * Thin hand-authored / codegen entrypoint.
 * Replace the CREATIVE_FILL section inside `draw` (and hooks) — keep harness via `createCanvas2dTool`.
 */
export const createTool: CreateVibeTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => stubParamSchema,
      getDefaultParams: () => ({
        bg: "#111118",
        accent: "#7c5cff",
        title: "canvas2d",
        speed: 1,
      }),
      getAssetSlots: () => stubAssetSlots,

      // --- CREATIVE_FILL start (model / hand author replaces body) ---
      draw(c) {
        const { ctx: g, width: w, height: h, params: p, time, images: imgs } =
          c;
        const bg = String(p.bg ?? "#111118");
        const accent = String(p.accent ?? "#7c5cff");
        const title = String(p.title ?? "");
        const speed = Number(p.speed ?? 1);

        g.clearRect(0, 0, w, h);
        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        const pulse = 0.5 + 0.5 * Math.sin(time * speed * 2);
        const r = Math.min(w, h) * (0.12 + 0.04 * pulse);
        g.fillStyle = accent;
        g.beginPath();
        g.arc(w * 0.5, h * 0.42, r, 0, Math.PI * 2);
        g.fill();

        const logo = imgs.logo;
        if (logo) {
          const size = Math.min(w, h) * 0.16;
          g.drawImage(logo, w * 0.5 - size / 2, h * 0.42 - size / 2, size, size);
        }

        g.fillStyle = "#f5f5f7";
        g.font = `600 ${Math.max(14, Math.floor(w * 0.055))}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(title, w * 0.5, h * 0.72, w * 0.9);
      },
      // --- CREATIVE_FILL end ---
    },
    { aspect: "1:1" },
  );
