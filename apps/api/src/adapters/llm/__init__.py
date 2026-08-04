"""LLM adapters (OpenRouter)."""

from adapters.llm.openrouter import ASAP_CODEGEN_MODEL, OpenRouterLLMClient
from adapters.llm.protocol import (
    ChatMessage,
    LLMClient,
    LLMCompletion,
    LLMConfigError,
    LLMError,
    LLMRequestError,
    TokenUsage,
)
from adapters.llm.router import resolve_model_for_role

__all__ = [
    "ASAP_CODEGEN_MODEL",
    "ChatMessage",
    "LLMClient",
    "LLMCompletion",
    "LLMConfigError",
    "LLMError",
    "LLMRequestError",
    "OpenRouterLLMClient",
    "TokenUsage",
    "resolve_model_for_role",
]
