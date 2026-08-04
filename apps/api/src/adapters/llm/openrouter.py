"""
OpenRouter chat completions adapter (M3b).

Only model allowed on ASAP path: deepseek/deepseek-v4-flash.
"""

from __future__ import annotations

from typing import Any

import httpx

from adapters.llm.protocol import (
    ChatMessage,
    LLMCompletion,
    LLMConfigError,
    LLMRequestError,
    TokenUsage,
)

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

# Sole codegen model for M3 ASAP (user freeze).
ASAP_CODEGEN_MODEL = "deepseek/deepseek-v4-flash"


def normalize_messages(
    messages: list[ChatMessage] | list[dict[str, str]],
) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for m in messages:
        if isinstance(m, ChatMessage):
            out.append({"role": m.role, "content": m.content})
        else:
            role = str(m.get("role", "user"))
            content = str(m.get("content", ""))
            out.append({"role": role, "content": content})
    return out


def assert_allowed_model(model: str) -> str:
    """Reject any model other than deepseek/deepseek-v4-flash."""
    mid = model.strip()
    if mid != ASAP_CODEGEN_MODEL:
        raise LLMConfigError(
            f"model {mid!r} is not allowed on ASAP path; "
            f"only {ASAP_CODEGEN_MODEL!r} is configured"
        )
    return mid


class OpenRouterLLMClient:
    """
    httpx-based OpenRouter client.

    Does not stream. Usage fields are surfaced for M3f cost logging.
    """

    def __init__(
        self,
        *,
        api_key: str,
        default_model: str = ASAP_CODEGEN_MODEL,
        base_url: str = OPENROUTER_CHAT_URL,
        timeout_seconds: float = 60.0,
        http_referer: str | None = None,
        app_title: str = "Vibeit",
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key or not api_key.strip():
            raise LLMConfigError(
                "OPENROUTER_API_KEY is missing — set it in the API environment"
            )
        self._api_key = api_key.strip()
        self._default_model = assert_allowed_model(default_model)
        self._base_url = base_url
        self._timeout = timeout_seconds
        self._http_referer = http_referer
        self._app_title = app_title
        self._client = client
        self._owns_client = client is None

    @property
    def default_model(self) -> str:
        return self._default_model

    async def aclose(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    def _headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if self._http_referer:
            headers["HTTP-Referer"] = self._http_referer
        if self._app_title:
            headers["X-Title"] = self._app_title
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client

    async def complete(
        self,
        messages: list[ChatMessage] | list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict[str, Any] | None = None,
        timeout_seconds: float | None = None,
    ) -> LLMCompletion:
        model_id = assert_allowed_model(model or self._default_model)
        payload: dict[str, Any] = {
            "model": model_id,
            "messages": normalize_messages(messages),
            "stream": False,
        }
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if response_format is not None:
            payload["response_format"] = response_format

        client = await self._get_client()
        timeout = timeout_seconds if timeout_seconds is not None else self._timeout

        try:
            res = await client.post(
                self._base_url,
                headers=self._headers(),
                json=payload,
                timeout=timeout,
            )
        except httpx.TimeoutException as exc:
            raise LLMRequestError(
                f"OpenRouter request timed out after {timeout}s",
                status_code=None,
            ) from exc
        except httpx.HTTPError as exc:
            raise LLMRequestError(f"OpenRouter transport error: {exc}") from exc

        if res.status_code >= 400:
            detail = res.text[:500] if res.text else res.reason_phrase
            raise LLMRequestError(
                f"OpenRouter error {res.status_code}: {detail}",
                status_code=res.status_code,
            )

        try:
            data = res.json()
        except ValueError as exc:
            raise LLMRequestError("OpenRouter returned non-JSON body") from exc

        try:
            choice0 = data["choices"][0]
            message = choice0["message"]
            text = message.get("content") or ""
            if not isinstance(text, str):
                # Some models return list content parts
                text = str(text)
            finish = choice0.get("finish_reason")
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMRequestError(
                f"OpenRouter response missing choices[0].message: {data!r}"[:400]
            ) from exc

        usage = TokenUsage.from_api(
            data.get("usage") if isinstance(data.get("usage"), dict) else None
        )
        return LLMCompletion(
            text=text,
            model=str(data.get("model") or model_id),
            usage=usage,
            finish_reason=str(finish) if finish is not None else None,
            raw=data,
        )
