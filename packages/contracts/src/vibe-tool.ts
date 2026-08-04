/**
 * VibeTool runtime contract (M0a).
 *
 * Every target (canvas2d, p5, three) implements this interface so Studio,
 * export, and the Create agent share one lifecycle:
 * mount → update / setAssets → capture → dispose.
 *
 * Param/asset schema shapes: param-schema.ts (M0b).
 * Docs: md/contracts/vibe-tool.md
 */

import type { AssetSlots, ParamSchema } from "./param-schema.js";

// ---------------------------------------------------------------------------
// Params & assets (no brand kit at create/mount)
// ---------------------------------------------------------------------------

/**
 * Runtime parameter bag. Keys match `getParamSchema()` field names.
 * Values are JSON-serializable primitives matching each field's kind.
 */
export type ToolParams = Record<string, unknown>;

/**
 * Reference to a loaded asset bound to a named slot.
 * MVP: HTTPS URL or blob URL string. Object form allows mime hints later.
 */
export type AssetRef =
  | string
  | {
      url: string;
      mimeType?: string;
    };

/**
 * Map of asset-slot id → current ref (or null/undefined when empty).
 * Slot ids come from `getAssetSlots()`.
 */
export type ToolAssets = Record<string, AssetRef | null | undefined>;

/**
 * Options passed on first mount. Params are required; assets may start empty
 * (host supplies placeholders or waits for Studio uploads).
 */
export interface MountOptions {
  params: ToolParams;
  assets?: ToolAssets;
}

// ---------------------------------------------------------------------------
// Capture results
// ---------------------------------------------------------------------------

/**
 * PNG (or single-frame) capture result from `captureFrame()`.
 * Prefer `Blob` (`image/png`) so export can upload or download without
 * re-encoding from canvas in the host.
 */
export type CaptureFrameResult = Blob;

// ---------------------------------------------------------------------------
// VibeTool
// ---------------------------------------------------------------------------

/**
 * Shared runtime interface every generated or hand-authored tool implements.
 *
 * Hard rules (enforced by host/sandbox, not this type alone):
 * - No arbitrary npm / remote code
 * - No parent `window` access
 * - No unrestricted fetch
 * - Host loads allowlisted runtime only (per target)
 */
export interface VibeTool {
  /**
   * Attach the tool to a host element and start rendering with initial state.
   * May be async when loading fonts/assets.
   */
  mount(el: HTMLElement, options: MountOptions): void | Promise<void>;

  /**
   * Apply a full or partial param update and refresh the live preview.
   * Host may pass a complete params object; tools should merge safely.
   */
  update(params: ToolParams): void | Promise<void>;

  /**
   * Bind or replace assets for named slots after the tool is ready.
   * Optional when the tool declares no slots.
   */
  setAssets?(assets: ToolAssets): void | Promise<void>;

  /** Schema that drives Studio Control UI controls. */
  getParamSchema(): ParamSchema;

  /** Defaults used on mount when the host does not supply overrides. */
  getDefaultParams(): ToolParams;

  /** Declared upload slots (may be empty). */
  getAssetSlots(): AssetSlots;

  /**
   * Capture the current frame as PNG (or equivalent image blob).
   * Required for export MVP.
   */
  captureFrame(): CaptureFrameResult | Promise<CaptureFrameResult>;

  /**
   * Optional live stream for short-video export (MediaRecorder in M7).
   * canvas2d tools typically expose canvas.captureStream().
   */
  getCaptureStream?(): MediaStream | Promise<MediaStream>;

  /**
   * Tear down listeners, rAF loops, WebGL contexts, and DOM under the mount root.
   * Must leave the host element usable for remount.
   */
  dispose(): void | Promise<void>;
}

/**
 * Factory signature for skeleton/codegen entrypoints.
 * M0c / M2a use this shape for hand-authored and generated tools.
 */
export type CreateVibeTool = () => VibeTool;
