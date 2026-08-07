/**
 * three-style skeleton harness (AM6a).
 *
 * Stub harness: WebGL canvas with preserveDrawingBuffer for capture.
 * Does NOT load three.js from CDN (CSP blocks it). Creative fill gets a
 * minimal WebGL context + time/params; full three.js allowlist is M2b+.
 */

import type { AssetSlots, ParamSchema } from "../param-schema";
import type {
  CreateVibeTool,
  MountOptions,
  ToolAssets,
  ToolParams,
  VibeTool,
} from "../vibe-tool";

export type ThreeAspect = "1:1" | "9:16" | "16:9" | "4:5";

export interface ThreeHarnessOptions {
  aspect?: ThreeAspect | string;
  autoDpr?: boolean;
}

export interface ThreeDrawContext {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  width: number;
  height: number;
  dpr: number;
  params: ToolParams;
  assets: ToolAssets;
  time: number;
  delta: number;
  /** Clear color buffer (0–1 floats). */
  clear: (r: number, g: number, b: number, a?: number) => void;
}

export interface ThreeCreative {
  getParamSchema(): ParamSchema;
  getDefaultParams(): ToolParams;
  getAssetSlots(): AssetSlots;
  setup?(c: ThreeDrawContext): void | Promise<void>;
  draw(c: ThreeDrawContext): void;
  onParams?(params: ToolParams, c: ThreeDrawContext): void;
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

function hexToRgb01(hex: string): [number, number, number] {
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return [0.05, 0.05, 0.08];
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return [0.05, 0.05, 0.08];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Build a VibeTool with WebGL creative fill (three-style stub harness).
 * Uses preserveDrawingBuffer so captureFrame can read pixels.
 */
export function createThreeTool(
  creative: ThreeCreative,
  options: ThreeHarnessOptions = {},
): VibeTool {
  const aspect = options.aspect ?? "1:1";
  const autoDpr = options.autoDpr !== false;

  let root: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let gl: WebGLRenderingContext | null = null;
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
  let program: WebGLProgram | null = null;
  let buf: WebGLBuffer | null = null;

  function buildCtx(now: number): ThreeDrawContext {
    if (!canvas || !gl) throw new Error("three harness: not mounted");
    const g = gl;
    return {
      canvas,
      gl: g,
      width,
      height,
      dpr,
      params,
      assets,
      time: (now - startMs) / 1000,
      delta: lastMs ? (now - lastMs) / 1000 : 0,
      clear(r, gg, b, a = 1) {
        g.clearColor(r, gg, b, a);
        g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
      },
    };
  }

  function ensureDefaultProgram() {
    if (!gl || program) return;
    const vsSrc = `
      attribute vec2 a_pos;
      uniform float u_time;
      uniform float u_aspect;
      varying float v_d;
      void main() {
        float s = 0.35 + 0.08 * sin(u_time * 2.0);
        vec2 p = a_pos * s;
        p.x /= u_aspect;
        v_d = length(a_pos);
        gl_Position = vec4(p, 0.0, 1.0);
      }
    `;
    const fsSrc = `
      precision mediump float;
      uniform vec3 u_accent;
      varying float v_d;
      void main() {
        float a = smoothstep(1.0, 0.2, v_d);
        gl_FragColor = vec4(u_accent * a, 1.0);
      }
    `;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSrc);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSrc);
    gl.compileShader(fs);
    program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    const verts = new Float32Array([
      0, 1, -0.866, -0.5, 0.866, -0.5,
    ]);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  }

  function defaultDraw(c: ThreeDrawContext) {
    const g = c.gl;
    ensureDefaultProgram();
    if (!program || !buf) return;
    const bg = hexToRgb01(String(c.params.bg ?? "#0a0a12"));
    const accent = hexToRgb01(String(c.params.accent ?? "#7c5cff"));
    c.clear(bg[0], bg[1], bg[2], 1);
    g.useProgram(program);
    const aPos = g.getAttribLocation(program, "a_pos");
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.enableVertexAttribArray(aPos);
    g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);
    g.uniform1f(g.getUniformLocation(program, "u_time"), c.time);
    g.uniform1f(
      g.getUniformLocation(program, "u_aspect"),
      c.height > 0 ? c.width / c.height : 1,
    );
    g.uniform3f(
      g.getUniformLocation(program, "u_accent"),
      accent[0],
      accent[1],
      accent[2],
    );
    g.drawArrays(g.TRIANGLES, 0, 3);
  }

  function layout() {
    if (!root || !canvas || !gl) return;
    const rect = root.getBoundingClientRect();
    const ar = parseAspect(aspect);
    let cssW = Math.max(1, Math.floor(rect.width) || 0);
    let cssH = Math.max(1, Math.floor(rect.height) || 0);
    if (cssW <= 1 && cssH <= 1) {
      cssW = 360;
      cssH = Math.max(1, Math.round((360 * ar.h) / ar.w));
    }
    dpr = autoDpr ? Math.min(window.devicePixelRatio || 1, 3) : 1;
    width = cssW;
    height = cssH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function frame(now: number) {
    if (!mounted || !gl || !canvas) return;
    const c = buildCtx(now);
    if (!setupDone) {
      setupDone = true;
      void Promise.resolve(creative.setup?.(c)).catch(() => {});
    }
    try {
      creative.draw(c);
    } catch {
      try {
        defaultDraw(c);
      } catch {
        /* keep loop */
      }
    }
    lastMs = now;
    raf = requestAnimationFrame(frame);
  }

  return {
    async mount(el: HTMLElement, mountOptions: MountOptions) {
      root = el;
      root.replaceChildren();
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-vibe-target", "three");
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      root.appendChild(canvas);
      // preserveDrawingBuffer required for reliable captureFrame
      const context = canvas.getContext("webgl", {
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: false,
      });
      if (!context) throw new Error("three harness: WebGL unavailable");
      gl = context;
      gl.enable(gl.DEPTH_TEST);
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
      if (!mounted || !canvas || !gl) return;
      creative.onParams?.(params, buildCtx(performance.now()));
    },
    async setAssets(next: ToolAssets) {
      assets = { ...assets, ...next };
    },
    getParamSchema: () => creative.getParamSchema(),
    getDefaultParams: () => creative.getDefaultParams(),
    getAssetSlots: () => creative.getAssetSlots(),
    captureFrame() {
      if (!canvas) throw new Error("three harness: captureFrame before mount");
      return new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("three harness: toBlob null")),
          "image/png",
        );
      });
    },
    getCaptureStream() {
      if (!canvas) throw new Error("three harness: getCaptureStream before mount");
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
      if (gl && program) {
        gl.deleteProgram(program);
        program = null;
      }
      if (gl && buf) {
        gl.deleteBuffer(buf);
        buf = null;
      }
      root?.replaceChildren();
      root = null;
      canvas = null;
      gl = null;
    },
  };
}

export const createTool: CreateVibeTool = () =>
  createThreeTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", default: "#0a0a12" },
        { name: "accent", kind: "color", default: "#7c5cff" },
        { name: "speed", kind: "number", default: 1, min: 0, max: 3, step: 0.05 },
      ],
      getDefaultParams: () => ({
        bg: "#0a0a12",
        accent: "#7c5cff",
        speed: 1,
      }),
      getAssetSlots: () => [],
      draw(c) {
        // Default shader triangle; creative fill may replace entirely
        const g = c.gl;
        const bg = hexToRgb01(String(c.params.bg ?? "#0a0a12"));
        c.clear(bg[0], bg[1], bg[2], 1);
        // Use harness internal default via empty custom path: simple clear +
        // a pulsing clear color shift so variance > 0 for smoke
        const accent = hexToRgb01(String(c.params.accent ?? "#7c5cff"));
        const speed = Number(c.params.speed ?? 1);
        const pulse = 0.5 + 0.5 * Math.sin(c.time * speed * 2);
        c.clear(
          bg[0] * (1 - pulse * 0.3) + accent[0] * pulse * 0.3,
          bg[1] * (1 - pulse * 0.3) + accent[1] * pulse * 0.3,
          bg[2] * (1 - pulse * 0.3) + accent[2] * pulse * 0.3,
          1,
        );
        void g;
      },
    },
    { aspect: "1:1" },
  );
