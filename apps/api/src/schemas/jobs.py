"""
Job API shapes (M0e / M1a).

Wire format is camelCase to match `@repo/contracts` / md/contracts/job-api.md.
Python field names use snake_case with aliases.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

JobStatus = Literal[
    "queued",
    "running",
    "awaiting_clarify",
    "succeeded",
    "failed",
]
JobPhase = Literal["clarify", "plan", "codegen", "validate", "repair"]
JobErrorCode = Literal[
    "UNAUTHORIZED",
    "QUOTA_EXCEEDED",
    "VALIDATION_FAILED",
    "GENERATION_FAILED",
    "TIMEOUT",
    "INTERNAL",
]

class CamelModel(BaseModel):
    """Base model: accept snake_case or camelCase, serialize camelCase."""

    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )


class QuotaFields(CamelModel):
    creates_used: int = Field(alias="createsUsed")
    creates_limit: int = Field(alias="createsLimit")
    resets_at: str | None = Field(default=None, alias="resetsAt")


class RepairBudgetFields(CamelModel):
    max_repairs: int = Field(alias="maxRepairs")
    repairs_used: int = Field(alias="repairsUsed")
    token_budget: int | None = Field(default=None, alias="tokenBudget")
    tokens_used: int | None = Field(default=None, alias="tokensUsed")
    wall_time_ms: int | None = Field(default=None, alias="wallTimeMs")
    wall_time_used_ms: int | None = Field(default=None, alias="wallTimeUsedMs")


class CreateJobRequest(CamelModel):
    """POST /api/v1/jobs body."""

    vision_text: str = Field(alias="visionText", min_length=1)
    inspiration_asset_ids: list[str] | None = Field(
        default=None,
        alias="inspirationAssetIds",
    )
    client_metadata: dict[str, Any] | None = Field(
        default=None,
        alias="clientMetadata",
    )
    # Optional OpenRouter model id from Create picker (must be in LLM_MODELS_ALLOWED).
    model: str | None = None
    # A3: opt-in clarify interview before plan/codegen.
    plan_mode: bool = Field(default=False, alias="planMode")


class CreateJobResponse(CamelModel):
    """POST /api/v1/jobs accept response (usually status queued)."""

    job_id: str = Field(alias="jobId")
    status: JobStatus
    created_at: str = Field(alias="createdAt")
    quota: QuotaFields | None = None
    plan_mode: bool | None = Field(default=None, alias="planMode")
    # Stub-only debug aid (not in TS CreateJobResponse). Remove before external beta.
    user_id: str | None = Field(default=None, alias="userId")


class ClarifyJobRequest(CamelModel):
    """POST /api/v1/jobs/{jobId}/clarify body (A3)."""

    answers: dict[str, Any]
    build_now: bool = Field(default=True, alias="buildNow")


class ClarifyJobResponse(CamelModel):
    """POST clarify accept — usually re-queued for build."""

    job_id: str = Field(alias="jobId")
    status: JobStatus
    clarify: dict[str, Any] | None = None
    updated_at: str | None = Field(default=None, alias="updatedAt")


class RefineJobRequest(CamelModel):
    """POST /api/v1/tools/{toolId}/refine body (AM7)."""

    message: str = Field(min_length=1)
    base_version_id: str | None = Field(default=None, alias="baseVersionId")


class RefineBudgetFields(CamelModel):
    refine_used: int = Field(alias="refineUsed")
    refine_limit: int = Field(alias="refineLimit")


class RefineJobResponse(CamelModel):
    """POST refine accept response."""

    job_id: str = Field(alias="jobId")
    tool_id: str = Field(alias="toolId")
    base_version_id: str = Field(alias="baseVersionId")
    status: JobStatus
    created_at: str = Field(alias="createdAt")
    job_kind: str = Field(default="refine", alias="jobKind")
    refine: RefineBudgetFields | None = None


class JobStatusResponse(CamelModel):
    """GET /api/v1/jobs/:jobId poll response (M3 + A3)."""

    job_id: str = Field(alias="jobId")
    status: JobStatus
    phase: JobPhase | None = None
    progress: float | None = None
    error_code: JobErrorCode | None = Field(default=None, alias="errorCode")
    error_message: str | None = Field(default=None, alias="errorMessage")
    quota: QuotaFields | None = None
    repair: RepairBudgetFields | None = None
    updated_at: str | None = Field(default=None, alias="updatedAt")
    result_ready: bool | None = Field(default=None, alias="resultReady")
    plan_mode: bool | None = Field(default=None, alias="planMode")
    clarify: dict[str, Any] | None = None


class JobResultResponse(CamelModel):
    """GET /api/v1/jobs/:jobId/result success payload (M3)."""

    job_id: str = Field(alias="jobId")
    tool_id: str = Field(alias="toolId")
    version_id: str = Field(alias="versionId")
    target: str
    public_id: str | None = Field(default=None, alias="publicId")
    completed_at: str | None = Field(default=None, alias="completedAt")


class JobErrorBody(CamelModel):
    error_code: JobErrorCode = Field(alias="errorCode")
    error_message: str = Field(alias="errorMessage")
    job_id: str | None = Field(default=None, alias="jobId")
    quota: QuotaFields | None = None
