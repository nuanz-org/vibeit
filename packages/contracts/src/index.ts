/**
 * @repo/contracts — shared Vibeit contract types (M0-thin).
 *
 * Contract home (M0a decision): this package is the TypeScript source of truth.
 * Human-readable specs live under `md/contracts/`.
 */

// M0a — VibeTool lifecycle
export type {
  AssetRef,
  CaptureFrameResult,
  CreateVibeTool,
  MountOptions,
  ToolAssets,
  ToolParams,
  VibeTool,
} from "./vibe-tool.js";

// M0b — Param schema + asset slots
export type {
  AssetRefParamField,
  AssetSlot,
  AssetSlots,
  BooleanParamField,
  ColorParamField,
  ColorValue,
  EnumOption,
  EnumParamField,
  NumberParamField,
  ParamField,
  ParamFieldBase,
  ParamFieldKind,
  ParamSchema,
  ParamValueForKind,
  TextParamField,
} from "./param-schema.js";

// M0c — Target registry
export {
  ASAP_TARGET,
  TARGET_DEFINITIONS,
  TARGET_IDS,
  TARGET_REGISTRY,
  isAsapTarget,
  isTargetId,
} from "./targets.js";
export type { TargetDefinition, TargetId, TargetLaunchStatus } from "./targets.js";

// M0d — Plan JSON
export { createAsapToolPlan, isAsapToolPlan } from "./plan.js";
export type { AsapToolPlan, PlanAspect, ToolPlan } from "./plan.js";

// M0e — Job API shapes
export {
  GENERATION_JOB_COLUMN_MAP,
  JOB_API_ROUTE_SKETCH,
  JOB_ERROR_CODES,
  JOB_ERROR_CODE_MEANING,
  JOB_PHASES,
  JOB_STATUSES,
  isTerminalJobStatus,
  jobMayBecomePublished,
} from "./job-api.js";
export type {
  CreateJobRequest,
  CreateJobResponse,
  JobErrorBody,
  JobErrorCode,
  JobPhase,
  JobResultResponse,
  JobStatus,
  JobStatusResponse,
  QuotaFields,
  RepairBudgetFields,
  TerminalJobStatus,
} from "./job-api.js";

// M0f — Capture + CORS provisional policy
export {
  ASSET_CROSS_ORIGIN,
  CAPTURE_FAILURE_MEANING,
  CAPTURE_PNG_MIME,
  CAPTURE_STREAM_FPS,
  CAPTURE_VIDEO_DURATION_SECONDS,
  CAPTURE_VIDEO_MIME_PREFERRED,
  M2A_CAPTURE_REQUIRES_REAL_ASSET,
  PROVISIONAL_STORAGE_CORS,
  REAL_UPLOADED_ASSET_PATH_MARKERS,
  WEBGL_PRESERVE_DRAWING_BUFFER_DEFERRED,
  isFixtureAssetUrl,
  isRealUploadedAssetUrl,
  isVibeitServedAssetUrl,
  provisionalCorsResponseHeaders,
} from "./capture-cors.js";
export type {
  AssetCrossOriginMode,
  CaptureFailureReason,
  StorageCorsPolicy,
} from "./capture-cors.js";
