/**
 * Target loaders (M2a3+ / AM6 stubs).
 *
 * canvas2d is the ASAP path. p5 / three host adapters share the same
 * postMessage lifecycle; skeletons use Canvas2D / WebGL stubs until full
 * allowlisted p5/three bundles land (M2b+).
 */

export {
  Canvas2dFrameAdapter,
  FrameAdapterError,
  startCanvas2dFrameAdapter,
} from "./canvas2d";
export type { Canvas2dFrameAdapterOptions } from "./canvas2d";

export {
  P5FrameAdapter,
  startP5FrameAdapter,
} from "./p5";
export type { P5FrameAdapterOptions } from "./p5";

export {
  ThreeFrameAdapter,
  startThreeFrameAdapter,
} from "./three";
export type { ThreeFrameAdapterOptions } from "./three";
