/**
 * Target loaders (M2a3+).
 *
 * ASAP path: canvas2d only. p5 / three loaders are M2b (fast-follow).
 */

export {
  Canvas2dFrameAdapter,
  FrameAdapterError,
  startCanvas2dFrameAdapter,
} from "./canvas2d";
export type { Canvas2dFrameAdapterOptions } from "./canvas2d";
