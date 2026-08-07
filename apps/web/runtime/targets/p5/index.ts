/**
 * p5 target host stub (AM6a).
 *
 * Mount protocol is identical to canvas2d (createTool + postMessage).
 * READY advertises target "p5". Full p5.js allowlist loader is M2b+.
 */

export {
  Canvas2dFrameAdapter as P5FrameAdapter,
  FrameAdapterError,
  startCanvas2dFrameAdapter as startP5FrameAdapter,
} from "../canvas2d";
export type { Canvas2dFrameAdapterOptions as P5FrameAdapterOptions } from "../canvas2d";
