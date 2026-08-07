/**
 * three target host stub (AM6a).
 *
 * Same postMessage lifecycle as canvas2d. Tools use createThreeTool
 * (WebGL + preserveDrawingBuffer). Full three.js bundle is M2b+.
 */

export {
  Canvas2dFrameAdapter as ThreeFrameAdapter,
  FrameAdapterError,
  startCanvas2dFrameAdapter as startThreeFrameAdapter,
} from "../canvas2d";
export type { Canvas2dFrameAdapterOptions as ThreeFrameAdapterOptions } from "../canvas2d";
