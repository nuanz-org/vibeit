/**
 * three target host (AM6 lifecycle · B2 harness · B3 Studio/public mount).
 *
 * Same postMessage lifecycle as canvas2d. Studio/public pass target:"three"
 * + moduleSource; frame blob-imports createThreeTool tools.
 */

export {
  Canvas2dFrameAdapter as ThreeFrameAdapter,
  FrameAdapterError,
  startCanvas2dFrameAdapter as startThreeFrameAdapter,
} from "../canvas2d";
export type { Canvas2dFrameAdapterOptions as ThreeFrameAdapterOptions } from "../canvas2d";
