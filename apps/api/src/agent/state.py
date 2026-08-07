"""
Shared Create graph state (M3c+).

Linear ASAP path: ingest → (plan/codegen later) → validate → smoke → (repair/finalize later).
"""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

JobPhase = Literal["ingest", "plan", "codegen", "validate", "smoke", "repair", "finalize"]


class CreateGraphState(TypedDict, total=False):
    """Mutable graph state passed between LangGraph nodes."""

    # Input
    vision_text: str
    # When True, skip LLM and use injected/fixture code (M3c)
    use_fixture_code: bool
    fixture_name: NotRequired[str]

    # Artifacts
    plan: dict[str, Any] | None
    code: str
    target: str  # always canvas2d on ASAP path

    # Gates
    validation_errors: list[str]
    validate_ok: bool
    smoke_errors: list[str]
    smoke_ok: bool

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


def initial_create_state(
    *,
    vision_text: str,
    code: str = "",
    use_fixture_code: bool = False,
    fixture_name: str = "social-frame",
    max_repairs: int = 3,
    job_id: str | None = None,
    tool_id: str | None = None,
) -> CreateGraphState:
    return CreateGraphState(
        vision_text=vision_text,
        use_fixture_code=use_fixture_code,
        fixture_name=fixture_name,
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
    )
