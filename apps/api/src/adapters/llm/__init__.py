"""LLM adapters (OpenRouter + AM4 role router)."""

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
from adapters.llm.router import (
    FLASH_MODEL,
    allowlist_for_role,
    resolve_model_for_role,
    validate_configured_models,
)

__all__ = [
    "ASAP_CODEGEN_MODEL",
    "FLASH_MODEL",
    "ChatMessage",
    "LLMClient",
    "LLMCompletion",
    "LLMConfigError",
    "LLMError",
    "LLMRequestError",
    "OpenRouterLLMClient",
    "TokenUsage",
    "allowlist_for_role",
    "resolve_model_for_role",
    "validate_configured_models",
]
