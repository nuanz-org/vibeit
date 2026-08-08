/**
 * Target loaders (M2a3+ / Track B).
 *
 * One frame adapter mounts all targets via moduleSource. p5/three named
 * exports alias the shared adapter (postMessage lifecycle identical).
 * Real three harness: @repo/contracts/skeletons/three (B2).
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
