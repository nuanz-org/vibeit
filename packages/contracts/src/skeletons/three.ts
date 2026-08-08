/**
 * three skeleton harness (Track B2 — real three.js).
 *
 * B1: product-vendored pin `@repo/contracts/skeletons/three-vendor` (`three@0.185.1`).
 * B2: harness owns Scene / WebGLRenderer / PerspectiveCamera + rAF + capture/dispose.
 *
 * Creative / agent tool source must import only this module:
 *   import { createThreeTool, THREE } from "@repo/contracts/skeletons/three"
 * Never bare `"three"`, `"three/addons/*"`, or `skeletons/three-vendor`.
 *
 * Docs: md/contracts/skeletons/three.md
 */

import type { AssetSlots, ParamSchema } from "../param-schema";
import type {
  CreateVibeTool,
  MountOptions,
  ToolAssets,
  ToolParams,
  VibeTool,
} from "../vibe-tool";
import {
  THREE,
  THREE_VIBEIT_PIN,
  THREE_VIBEIT_SUPPLY,
} from "./three-vendor";

// Re-export product three for creative fill (allowlisted via this package path).
export { THREE, THREE_VIBEIT_PIN, THREE_VIBEIT_SUPPLY };

export type ThreeAspect = "1:1" | "9:16" | "16:9" | "4:5";

export interface ThreeHarnessOptions {
  aspect?: ThreeAspect | string;
  autoDpr?: boolean;
  /**
   * Cap on devicePixelRatio when autoDpr is on. Default **2**.
   */
  maxDpr?: number;
  /**
   * Vertical FOV for the default PerspectiveCamera (degrees). Default 45.
   */
  fov?: number;
  /**
   * When true (default), harness calls `renderer.render(scene, camera)` after
   * each successful `draw`. Set false only if creative renders manually.
   */
  autoRender?: boolean;
}

/**
 * Frame state for creative `setup` / `draw` / hooks.
 *
 * Mutate `scene` (add meshes, lights). Prefer `c.THREE` for constructors.
 * Do not replace `renderer` / `camera` ownership, start your own rAF, or import CDN three.
 */
export interface ThreeDrawContext {
  canvas: HTMLCanvasElement;
  /** Product-vendored three namespace (same pin as three-vendor). */
  THREE: typeof THREE;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Underlying WebGL context (escape hatch; prefer three APIs). */
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  width: number;
  height: number;
  dpr: number;
  params: ToolParams;
  assets: ToolAssets;
  /** Seconds since mount. */
  time: number;
  /** Seconds since previous frame. */
  delta: number;
  /**
   * Set clear / background color. Accepts CSS hex (`#rrggbb`) or 0–1 RGB floats.
   * Alpha defaults to 1.
   */
  setBackground: (color: string | number, g?: number, b?: number, a?: number) => void;
  /** Manual render pass (usually unnecessary when autoRender is true). */
  render: () => void;
}

export interface ThreeCreative {
  getParamSchema(): ParamSchema;
  getDefaultParams(): ToolParams;
  getAssetSlots(): AssetSlots;
  /** Once after mount (scene/camera/renderer ready). Add meshes/lights here. */
  setup?(c: ThreeDrawContext): void | Promise<void>;
  /** Every frame — animate; harness renders after unless autoRender is false. */
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

function hexToColor(hex: string): THREE.Color {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color("#0a0a12");
  }
}

/**
 * Build a VibeTool with a real three.js scene loop.
 * Uses preserveDrawingBuffer so captureFrame can read pixels.
 */
export function createThreeTool(
  creative: ThreeCreative,
  options: ThreeHarnessOptions = {},
): VibeTool {
  const aspect = options.aspect ?? "1:1";
  const autoDpr = options.autoDpr !== false;
  const maxDpr = Math.max(
    1,
    Number.isFinite(options.maxDpr as number) ? Number(options.maxDpr) : 2,
  );
  const autoRender = options.autoRender !== false;
  const fov = options.fov ?? 45;

  let root: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
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

  // Default demo mesh (used only when creative.draw throws / empty default tool)
  let defaultMesh: THREE.Mesh | null = null;
  let defaultLight: THREE.Light | null = null;
  let defaultAmbient: THREE.Light | null = null;

  function buildCtx(now: number): ThreeDrawContext {
    if (!canvas || !renderer || !scene || !camera) {
      throw new Error("three harness: not mounted");
    }
    const gl = renderer.getContext();
    return {
      canvas,
      THREE,
      scene,
      camera,
      renderer,
      gl,
      width,
      height,
      dpr,
      params,
      assets,
      time: (now - startMs) / 1000,
      delta: lastMs ? (now - lastMs) / 1000 : 0,
      setBackground(color, g, b, a = 1) {
        if (typeof color === "string") {
          scene!.background = hexToColor(color);
          renderer!.setClearColor(hexToColor(color), a);
        } else if (
          typeof color === "number" &&
          typeof g === "number" &&
          typeof b === "number"
        ) {
          const c = new THREE.Color(color, g, b);
          scene!.background = c;
          renderer!.setClearColor(c, a);
        } else if (typeof color === "number") {
          const c = new THREE.Color(color);
          scene!.background = c;
          renderer!.setClearColor(c, a);
        }
      },
      render() {
        renderer!.render(scene!, camera!);
      },
    };
  }

  function ensureDefaultScene(c: ThreeDrawContext) {
    if (defaultMesh) return;
    const T = c.THREE;
    defaultAmbient = new T.AmbientLight(0xffffff, 0.45);
    c.scene.add(defaultAmbient);
    defaultLight = new T.DirectionalLight(0xffffff, 1.1);
    defaultLight.position.set(2.5, 3.5, 2);
    c.scene.add(defaultLight);
    const geo = new T.BoxGeometry(1, 1, 1);
    const mat = new T.MeshStandardMaterial({
      color: hexToColor(String(c.params.accent ?? "#7c5cff")),
      metalness: 0.25,
      roughness: 0.35,
    });
    defaultMesh = new T.Mesh(geo, mat);
    c.scene.add(defaultMesh);
    c.camera.position.set(1.6, 1.2, 2.2);
    c.camera.lookAt(0, 0, 0);
  }

  function defaultDraw(c: ThreeDrawContext) {
    ensureDefaultScene(c);
    const bg = String(c.params.bg ?? "#0a0a12");
    c.setBackground(bg);
    const speed = Number(c.params.speed ?? 1);
    if (defaultMesh) {
      defaultMesh.rotation.x = c.time * 0.55 * speed;
      defaultMesh.rotation.y = c.time * 0.85 * speed;
      const mat = defaultMesh.material as THREE.MeshStandardMaterial;
      if (mat?.color) mat.color.copy(hexToColor(String(c.params.accent ?? "#7c5cff")));
    }
  }

  function layout() {
    if (!root || !canvas || !renderer || !camera) return;
    const rect = root.getBoundingClientRect();
    const ar = parseAspect(aspect);
    let cssW = Math.max(1, Math.floor(rect.width) || 0);
    let cssH = Math.max(1, Math.floor(rect.height) || 0);
    if (cssW <= 1 && cssH <= 1) {
      cssW = 360;
      cssH = Math.max(1, Math.round((360 * ar.h) / ar.w));
    }
    dpr = autoDpr ? Math.min(window.devicePixelRatio || 1, maxDpr) : 1;
    width = cssW;
    height = cssH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / Math.max(cssH, 1);
    camera.updateProjectionMatrix();
  }

  function frame(now: number) {
    if (!mounted || !renderer || !scene || !camera || !canvas) return;
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
    if (autoRender) {
      try {
        renderer.render(scene, camera);
      } catch {
        /* keep loop */
      }
    }
    lastMs = now;
    raf = requestAnimationFrame(frame);
  }

  function disposeThreeGraph() {
    if (defaultMesh) {
      defaultMesh.geometry?.dispose();
      const mat = defaultMesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
      defaultMesh = null;
    }
    defaultLight = null;
    defaultAmbient = null;
    if (scene) {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose?.();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
          else (mat as THREE.Material | undefined)?.dispose?.();
        }
      });
      scene.clear();
    }
    renderer?.dispose();
    renderer?.forceContextLoss?.();
  }

  return {
    async mount(el: HTMLElement, mountOptions: MountOptions) {
      root = el;
      root.replaceChildren();

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
      camera.position.set(0, 0, 3);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        // Required for reliable captureFrame / toBlob
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(hexToColor("#0a0a12"), 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      canvas = renderer.domElement;
      canvas.setAttribute("data-vibe-target", "three");
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      root.appendChild(canvas);

      params = { ...creative.getDefaultParams(), ...mountOptions.params };
      assets = { ...(mountOptions.assets ?? {}) };
      setupDone = false;
      defaultMesh = null;
      defaultLight = null;
      defaultAmbient = null;
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
      if (!mounted || !renderer || !scene || !camera) return;
      creative.onParams?.(params, buildCtx(performance.now()));
    },
    async setAssets(next: ToolAssets) {
      assets = { ...assets, ...next };
    },
    getParamSchema: () => creative.getParamSchema(),
    getDefaultParams: () => creative.getDefaultParams(),
    getAssetSlots: () => creative.getAssetSlots(),
    captureFrame() {
      if (!canvas || !renderer || !scene || !camera) {
        throw new Error("three harness: captureFrame before mount");
      }
      // Ensure a fresh frame is in the buffer before toBlob
      renderer.render(scene, camera);
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
      try {
        disposeThreeGraph();
      } catch {
        /* ignore */
      }
      root?.replaceChildren();
      root = null;
      canvas = null;
      renderer = null;
      scene = null;
      camera = null;
    },
  };
}

/** Minimal reference three tool (rotating cube). */
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
      setup(c) {
        const T = c.THREE;
        c.scene.add(new T.AmbientLight(0xffffff, 0.5));
        const dir = new T.DirectionalLight(0xffffff, 1.15);
        dir.position.set(2.5, 3.5, 2);
        c.scene.add(dir);
        const mesh = new T.Mesh(
          new T.BoxGeometry(1, 1, 1),
          new T.MeshStandardMaterial({
            color: hexToColor(String(c.params.accent ?? "#7c5cff")),
            metalness: 0.3,
            roughness: 0.35,
          }),
        );
        mesh.name = "vibe-default-cube";
        c.scene.add(mesh);
        c.camera.position.set(1.6, 1.2, 2.2);
        c.camera.lookAt(0, 0, 0);
      },
      draw(c) {
        c.setBackground(String(c.params.bg ?? "#0a0a12"));
        const mesh = c.scene.getObjectByName("vibe-default-cube") as THREE.Mesh | undefined;
        const speed = Number(c.params.speed ?? 1);
        if (mesh) {
          mesh.rotation.x = c.time * 0.55 * speed;
          mesh.rotation.y = c.time * 0.85 * speed;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat?.color) mat.color.copy(hexToColor(String(c.params.accent ?? "#7c5cff")));
        }
      },
    },
    { aspect: "1:1" },
  );
