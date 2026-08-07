"""
LLM catalog for Create UI model picker.

GET /api/v1/llm/models — allowed models + default (from server config).
"""

from __future__ import annotations

from fastapi import APIRouter

from core.config import get_settings
from schemas.llm import LlmModelOption, LlmModelsResponse

router = APIRouter(prefix="/llm", tags=["llm"])


@router.get(
    "/models",
    response_model=LlmModelsResponse,
    summary="List selectable Create models",
)
async def list_models() -> LlmModelsResponse:
    """
    Product menu of OpenRouter models the Create form may pick.

    Controlled by LLM_MODELS_ALLOWED (and defaults). Does not require auth
    so the picker can load alongside the create page session.
    """
    settings = get_settings()
    catalog = settings.llm_model_catalog()
    models = [
        LlmModelOption(
            id=str(m["id"]),
            label=str(m["label"]),
            default=bool(m.get("default")),
        )
        for m in catalog.get("models") or []
    ]
    return LlmModelsResponse(
        models=models,
        default_model=str(catalog.get("defaultModel") or ""),
    )
