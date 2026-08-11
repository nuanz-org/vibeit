/**
 * @repo/contracts — shared Aiditr contract types (M0-thin).
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
} from "./vibe-tool";

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
  ParamUiHint,
  ParamValueForKind,
  TextParamField,
} from "./param-schema";

// M0c — Target registry
export {
  ASAP_TARGET,
  TARGET_DEFINITIONS,
  TARGET_IDS,
  TARGET_REGISTRY,
  isAsapTarget,
  isTargetId,
} from "./targets";
export type { TargetDefinition, TargetId, TargetLaunchStatus } from "./targets";

// M0d + AM1 DesignBrief v2 — Plan JSON
export { createAsapToolPlan, isAsapToolPlan } from "./plan";
export type {
  AsapToolPlan,
  PlanAspect,
  PlanComposition,
  PlanControlSection,
  PlanControlSurface,
  PlanMotionSpec,
  PlanPaletteRoles,
  PlanTypography,
  ToolPlan,
} from "./plan";

// M0e + A3 — Job API shapes (incl. planMode clarify)
export {
  GENERATION_JOB_COLUMN_MAP,
  JOB_API_ROUTE_SKETCH,
  JOB_ERROR_CODES,
  JOB_ERROR_CODE_MEANING,
  JOB_PHASES,
  JOB_STATUSES,
  isJobPollPaused,
  isTerminalJobStatus,
  jobMayBecomePublished,
} from "./job-api";
export type {
  ClarifyAnswerValue,
  ClarifyForcedEnum,
  ClarifyJobRequest,
  ClarifyJobResponse,
  ClarifyOption,
  ClarifyQuestion,
  ClarifyResult,
  CreateJobRequest,
  CreateJobResponse,
  JobClarifyState,
  JobErrorBody,
  JobErrorCode,
  JobPhase,
  JobResultResponse,
  JobStatus,
  JobStatusResponse,
  QuotaFields,
  RepairBudgetFields,
  TerminalJobStatus,
} from "./job-api";
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
  isCaptureEligibleAssetUrl,
  isFixtureAssetUrl,
  isRealUploadedAssetUrl,
  isUserLocalAssetUrl,
  isAiditrServedAssetUrl,
  provisionalCorsResponseHeaders,
} from "./capture-cors";
export type {
  AssetCrossOriginMode,
  CaptureFailureReason,
  StorageCorsPolicy,
} from "./capture-cors";
