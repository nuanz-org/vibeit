"""
Shared Create graph state (M3c+).

Linear ASAP path: ingest → (plan/codegen later) → validate → smoke → (repair/finalize later).
"""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

JobPhase = Literal[
    "ingest",
    "clarify",
    "plan",
    "codegen",
    "validate",
    "smoke",
    "critique",
    "repair",
    "finalize",
]
# AM7 — Control refine patch mode
PatchMode = Literal["param", "code"]
JobKind = Literal["create", "refine"]


class CreateGraphState(TypedDict, total=False):
    """Mutable graph state passed between LangGraph nodes."""

    # Input
    vision_text: str
    # When True, skip LLM and use injected/fixture code (M3c)
    use_fixture_code: bool
    fixture_name: NotRequired[str]

    # A3 planMode clarify
    plan_mode: NotRequired[bool]
    clarify_result: NotRequired[dict[str, Any] | None]
    clarify_payload: NotRequired[dict[str, Any] | None]
    clarify_questions: NotRequired[list[dict[str, Any]]]

    # AM5 — inspiration style conditioning
    inspiration_asset_ids: NotRequired[list[str]]
    # Preloaded images: {asset_id?, content_type, base64}
    inspiration_images: NotRequired[list[dict[str, Any]]]
    style_notes: NotRequired[dict[str, Any] | None]
    style_extract_ok: NotRequired[bool]
    style_extract_error: NotRequired[str | None]

    # Artifacts
    plan: dict[str, Any] | None
    code: str
    target: str  # always canvas2d on ASAP path

    # Gates
    validation_errors: list[str]
    validate_ok: bool
    smoke_errors: list[str]
    smoke_ok: bool

    # AM2 — real gates artifacts
    smoke_mode: NotRequired[str]
    compiled_js: NotRequired[str | None]
    smoke_screenshot_path: NotRequired[str | None]
    smoke_variance: NotRequired[float | None]

    # AM3 — critic / quality judge
    critique: NotRequired[dict[str, Any] | None]
    critique_ok: NotRequired[bool]
    critique_score: NotRequired[float | None]
    critique_fixes: NotRequired[list[str]]
    critique_passes: NotRequired[bool]
    critique_error: NotRequired[str | None]
    critic_threshold: NotRequired[float]
    critic_enforced: NotRequired[bool]

    # Repair / budgets (M3e fills these)
    repair_count: int
    max_repairs: int
    best_valid_code: str | None

    # Job bookkeeping (optional until worker wires them)
    job_id: NotRequired[str | None]
    tool_id: NotRequired[str | None]
    phase: JobPhase | str

    # Terminal
    error_code: str | None
    error_message: str | None
    ready_for_finalize: bool

    # Usage (M3d+)
    llm_tokens_used: NotRequired[int]

    # AM1 — golden exemplars injected into codegen (ids only)
    golden_ids: NotRequired[list[str]]

    # AM7 — Control refine (patch mode)
    job_kind: NotRequired[JobKind | str]
    chat_message: NotRequired[str]
    base_version_id: NotRequired[str | None]
    base_code: NotRequired[str]
    base_plan: NotRequired[dict[str, Any] | None]
    base_default_params: NotRequired[dict[str, Any]]
    base_param_schema: NotRequired[list[Any]]
    base_asset_slots: NotRequired[list[Any]]
    base_critique_score: NotRequired[float | None]
    patch_mode: NotRequired[PatchMode | str | None]
    patch_route_rationale: NotRequired[str | None]
    param_patch: NotRequired[dict[str, Any] | None]
    default_params: NotRequired[dict[str, Any] | None]
    param_schema: NotRequired[list[Any] | None]
    asset_slots: NotRequired[list[Any] | None]
    # True when param path used plan-model only (no codegen role call)
    used_param_patch_only: NotRequired[bool]


def initial_create_state(
    *,
    vision_text: str,
    code: str = "",
    use_fixture_code: bool = False,
    fixture_name: str = "social-frame",
    max_repairs: int = 3,
    job_id: str | None = None,
    tool_id: str | None = None,
    inspiration_asset_ids: list[str] | None = None,
    inspiration_images: list[dict[str, Any]] | None = None,
    plan_mode: bool = False,
    clarify_result: dict[str, Any] | None = None,
) -> CreateGraphState:
    return CreateGraphState(
        vision_text=vision_text,
        use_fixture_code=use_fixture_code,
        fixture_name=fixture_name,
        inspiration_asset_ids=list(inspiration_asset_ids or []),
        inspiration_images=list(inspiration_images or []),
        style_notes=None,
        style_extract_ok=False,
        plan_mode=plan_mode,
        clarify_result=clarify_result,
        plan=None,
        code=code,
        target="canvas2d",
        validation_errors=[],
        validate_ok=False,
        smoke_errors=[],
        smoke_ok=False,
        repair_count=0,
        max_repairs=max_repairs,
        best_valid_code=None,
        job_id=job_id,
        tool_id=tool_id,
        phase="ingest",
        error_code=None,
        error_message=None,
        ready_for_finalize=False,
        llm_tokens_used=0,
        job_kind="create",
    )

def initial_refine_state(
    *,
    chat_message: str,
    base_code: str,
    base_plan: dict[str, Any] | None = None,
    base_default_params: dict[str, Any] | None = None,
    base_param_schema: list[Any] | None = None,
    base_asset_slots: list[Any] | None = None,
    base_critique_score: float | None = None,
    base_version_id: str | None = None,
    target: str = "canvas2d",
    max_repairs: int = 3,
    job_id: str | None = None,
    tool_id: str | None = None,
    patch_mode: PatchMode | str | None = None,
) -> CreateGraphState:
    """AM7 — seed state for Control refine from an existing tool version."""
    defaults = dict(base_default_params or {})
    schema = list(base_param_schema or [])
    slots = list(base_asset_slots or [])
    plan = base_plan if isinstance(base_plan, dict) else None
    chat = (chat_message or "").strip()
    return CreateGraphState(
        vision_text=chat,
        chat_message=chat,
        use_fixture_code=False,
        job_kind="refine",
        base_version_id=base_version_id,
        base_code=base_code,
        base_plan=plan,
        base_default_params=defaults,
        base_param_schema=schema,
        base_asset_slots=slots,
        base_critique_score=base_critique_score,
        patch_mode=patch_mode,
        plan=plan,
        code=base_code,
        default_params=defaults,
        param_schema=schema,
        asset_slots=slots,
        target=target or "canvas2d",
        validation_errors=[],
        validate_ok=False,
        smoke_errors=[],
        smoke_ok=False,
        repair_count=0,
        max_repairs=max_repairs,
        best_valid_code=None,
        job_id=job_id,
        tool_id=tool_id,
        phase="ingest",
        error_code=None,
        error_message=None,
        ready_for_finalize=False,
        llm_tokens_used=0,
        used_param_patch_only=False,
    )
