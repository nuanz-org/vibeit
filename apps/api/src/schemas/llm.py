"""LLM catalog API shapes (Create model picker)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )


class LlmModelOption(CamelModel):
    id: str
    label: str
    default: bool = False


class LlmModelsResponse(CamelModel):
    models: list[LlmModelOption]
    default_model: str = Field(alias="defaultModel")
