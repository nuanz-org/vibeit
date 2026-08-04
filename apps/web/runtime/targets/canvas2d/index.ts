/**
 * canvas2d target — in-frame adapter (M2a3).
 *
 * Note: the adapter is primarily consumed by `runtime/frame/entry.ts`
 * (bundled into the sandbox). Host code talks only via postMessage.
 */

export {
  Canvas2dFrameAdapter,
  FrameAdapterError,
  startCanvas2dFrameAdapter,
} from "./adapter";
export type { Canvas2dFrameAdapterOptions } from "./adapter";
