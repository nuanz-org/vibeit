"""
LLM client port (M3b).

Services/agent nodes depend on this protocol — not raw OpenRouter HTTP.
ASAP path: single model deepseek/deepseek-v4-flash via OpenRouter.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol, runtime_checkable

ChatRole = Literal["system", "user", "assistant"]


@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: ChatRole
    content: str


@dataclass(frozen=True, slots=True)
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @classmethod
    def from_api(cls, raw: dict[str, Any] | None) -> TokenUsage:
        if not raw:
            return cls()
        prompt = int(raw.get("prompt_tokens") or 0)
        completion = int(raw.get("completion_tokens") or 0)
        total = int(raw.get("total_tokens") or (prompt + completion))
        return cls(
            prompt_tokens=prompt,
            completion_tokens=completion,
            total_tokens=total,
        )


@dataclass(frozen=True, slots=True)
class LLMCompletion:
    """Normalized completion result for Create graph nodes."""

    text: str
    model: str
    usage: TokenUsage = field(default_factory=TokenUsage)
    finish_reason: str | None = None
    raw: dict[str, Any] | None = None


class LLMError(Exception):
    """Base LLM adapter failure."""


class LLMConfigError(LLMError):
    """Missing key / invalid model config."""


class LLMRequestError(LLMError):
    """Upstream HTTP or API error."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@runtime_checkable
class LLMClient(Protocol):
    """Minimal chat completion surface for Create (and later Control refine)."""

    @property
    def default_model(self) -> str:
        """Configured codegen model id (OpenRouter)."""
        ...

    async def complete(
        self,
        messages: list[ChatMessage] | list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict[str, Any] | None = None,
        timeout_seconds: float | None = None,
    ) -> LLMCompletion:
        """
        Run a non-streaming chat completion.

        `model` must be allowlisted (AM4) or omitted (uses client default).
        Message content may be multimodal parts (AM5 vision).
        """
        ...
