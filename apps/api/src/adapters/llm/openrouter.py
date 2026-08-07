"""
OpenRouter chat completions adapter (M3b + AM4 multi-model).

Any non-empty OpenRouter model id is accepted (see adapters.llm.router).
Per-model request shaping (reasoning, timeouts) via adapters.llm.profiles.
Default remains deepseek/deepseek-v4-flash.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from adapters.llm.protocol import (
    ChatMessage,
    LLMCompletion,
    LLMConfigError,
    LLMRequestError,
    TokenUsage,
)
from adapters.llm.profiles import profile_for_model, reasoning_payload_for_model
from adapters.llm.router import FLASH_MODEL, assert_allowed_model

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

# Back-compat: Flash is the documented default / fallback.
ASAP_CODEGEN_MODEL = FLASH_MODEL

# Legacy alias — DeepSeek Flash profile still uses this shape.
DEFAULT_REASONING: dict[str, Any] = {"effort": "none"}

# Debug prints (request/response) — set False to silence.
_DEBUG_LLM_IO = True
# Truncate long message bodies in debug dumps (full length still logged).
_DEBUG_MSG_PREVIEW_CHARS = 800


def _preview_text(text: str | None, limit: int = _DEBUG_MSG_PREVIEW_CHARS) -> str:
    if text is None:
        return "null"
    if not isinstance(text, str):
        text = str(text)
    if len(text) <= limit:
        return text
    return f"{text[:limit]}… [truncated, total={len(text)} chars]"


def _debug_print_request(url: str, payload: dict[str, Any], timeout: float) -> None:
    if not _DEBUG_LLM_IO:
        return
    msgs = payload.get("messages") or []
    slim_msgs = []
    for m in msgs:
        content = m.get("content") if isinstance(m, dict) else None
        if isinstance(content, list):
            text_bits = []
            n_images = 0
            for p in content:
                if isinstance(p, dict) and p.get("type") == "text":
                    text_bits.append(str(p.get("text") or ""))
                elif isinstance(p, dict) and p.get("type") == "image_url":
                    n_images += 1
            preview = _preview_text(" ".join(text_bits)) + (
                f" [+{n_images} image(s)]" if n_images else ""
            )
            slim_msgs.append(
                {
                    "role": m.get("role") if isinstance(m, dict) else None,
                    "content_len": sum(len(t) for t in text_bits),
                    "content_preview": preview,
                    "multimodal": True,
                    "image_parts": n_images,
                }
            )
        else:
            slim_msgs.append(
                {
                    "role": m.get("role") if isinstance(m, dict) else None,
                    "content_len": len(content) if isinstance(content, str) else None,
                    "content_preview": _preview_text(
                        content if isinstance(content, str) else None
                    ),
                }
            )
    dump = {
        "url": url,
        "timeout_s": timeout,
        "model": payload.get("model"),
        "temperature": payload.get("temperature"),
        "max_tokens": payload.get("max_tokens"),
        "reasoning": payload.get("reasoning"),
        "stream": payload.get("stream"),
        "response_format": payload.get("response_format"),
        "message_count": len(msgs),
        "messages": slim_msgs,
    }
    print("[openrouter] >>> REQUEST (what we send)")
    print(json.dumps(dump, indent=2, default=str))


def _debug_print_response(status: int, data: dict[str, Any] | None, raw_text: str) -> None:
    if not _DEBUG_LLM_IO:
        return
    print(f"[openrouter] <<< RESPONSE status={status}")
    if data is None:
        print(f"[openrouter] non-JSON body: {_preview_text(raw_text, 2000)}")
        return
    choice0 = None
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        choice0 = choices[0] if isinstance(choices[0], dict) else None
    message = (choice0 or {}).get("message") if isinstance(choice0, dict) else None
    if not isinstance(message, dict):
        message = {}
    content = message.get("content")
    reasoning = message.get("reasoning")
    usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
    ctd = (
        usage.get("completion_tokens_details")
        if isinstance(usage.get("completion_tokens_details"), dict)
        else {}
    )
    dump = {
        "id": data.get("id"),
        "model": data.get("model"),
        "error": data.get("error"),
        "finish_reason": (choice0 or {}).get("finish_reason") if choice0 else None,
        "native_finish_reason": (choice0 or {}).get("native_finish_reason")
        if choice0
        else None,
        "content_is_null": content is None,
        "content_len": len(content) if isinstance(content, str) else None,
        "content_preview": _preview_text(content if isinstance(content, str) else None),
        "reasoning_len": len(reasoning) if isinstance(reasoning, str) else None,
        "reasoning_preview": _preview_text(
            reasoning if isinstance(reasoning, str) else None, 400
        ),
        "has_reasoning_details": bool(message.get("reasoning_details")),
        "usage": {
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
            "reasoning_tokens": ctd.get("reasoning_tokens"),
            "cost": usage.get("cost"),
        },
    }
    print(json.dumps(dump, indent=2, default=str))


def normalize_messages(
    messages: list[ChatMessage] | list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Normalize chat messages for OpenRouter.

    Content may be a string (text) or a list of multimodal parts
    (e.g. text + image_url) for vision / style extract (AM5).
    """
    out: list[dict[str, Any]] = []
    for m in messages:
        if isinstance(m, ChatMessage):
            out.append({"role": m.role, "content": m.content})
        else:
            role = str(m.get("role", "user"))
            content = m.get("content", "")
            # Preserve multimodal content arrays as-is
            if isinstance(content, list):
                out.append({"role": role, "content": content})
            else:
                out.append({"role": role, "content": str(content)})
    return out


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
        messages: list[ChatMessage] | list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict[str, Any] | None = None,
        timeout_seconds: float | None = None,
    ) -> LLMCompletion:
        model_id = assert_allowed_model(model or self._default_model)
        profile = profile_for_model(model_id)
        payload: dict[str, Any] = {
            "model": model_id,
            "messages": normalize_messages(messages),
            "stream": False,
        }
        # Per-model reasoning: DeepSeek → effort none; Gemini 3.x → enabled true.
        reasoning = reasoning_payload_for_model(model_id)
        if reasoning is not None:
            payload["reasoning"] = dict(reasoning)
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if response_format is not None:
            payload["response_format"] = response_format

        client = await self._get_client()
        if timeout_seconds is not None:
            timeout = timeout_seconds
        elif profile.timeout_seconds is not None:
            timeout = float(profile.timeout_seconds)
        else:
            timeout = self._timeout

        _debug_print_request(self._base_url, payload, timeout)

        try:
            res = await client.post(
                self._base_url,
                headers=self._headers(),
                json=payload,
                timeout=timeout,
            )
        except httpx.TimeoutException as exc:
            print(f"[openrouter] !!! TIMEOUT after {timeout}s")
            raise LLMRequestError(
                f"OpenRouter request timed out after {timeout}s",
                status_code=None,
            ) from exc
        except httpx.HTTPError as exc:
            print(f"[openrouter] !!! TRANSPORT ERROR: {exc}")
            raise LLMRequestError(f"OpenRouter transport error: {exc}") from exc

        if res.status_code >= 400:
            detail = res.text[:500] if res.text else res.reason_phrase
            print(f"[openrouter] !!! HTTP {res.status_code}: {detail}")
            raise LLMRequestError(
                f"OpenRouter error {res.status_code}: {detail}",
                status_code=res.status_code,
            )

        try:
            data = res.json()
        except ValueError as exc:
            _debug_print_response(res.status_code, None, res.text)
            raise LLMRequestError("OpenRouter returned non-JSON body") from exc

        _debug_print_response(res.status_code, data if isinstance(data, dict) else None, res.text)

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

        usage_raw = (
            data.get("usage") if isinstance(data.get("usage"), dict) else None
        )
        usage = TokenUsage.from_api(usage_raw)
        reasoning = message.get("reasoning") if isinstance(message, dict) else None
        reasoning_len = len(reasoning) if isinstance(reasoning, str) else 0
        ctd = (
            usage_raw.get("completion_tokens_details")
            if isinstance(usage_raw, dict)
            and isinstance(usage_raw.get("completion_tokens_details"), dict)
            else {}
        )
        reasoning_tokens = ctd.get("reasoning_tokens")

        if not (text or "").strip():
            print(
                "[openrouter] !!! EMPTY content after parse "
                f"(finish_reason={finish!r}, content_type={type(message.get('content')).__name__}, "
                f"reasoning_len={reasoning_len}, reasoning_tokens={reasoning_tokens})"
            )
            # Fail loud so Create surfaces a useful error instead of
            # "empty codegen response" with no cause.
            if finish == "length" or (
                reasoning_tokens is not None
                and max_tokens is not None
                and int(reasoning_tokens) >= int(max_tokens)
            ):
                raise LLMRequestError(
                    "OpenRouter returned empty content: entire max_tokens budget "
                    f"spent on reasoning (finish_reason={finish!r}, "
                    f"reasoning_tokens={reasoning_tokens}, max_tokens={max_tokens}). "
                    "Increase max_tokens or lower reasoning effort for this model.",
                    status_code=res.status_code,
                )
            raise LLMRequestError(
                f"OpenRouter returned empty content "
                f"(finish_reason={finish!r}, reasoning_len={reasoning_len})",
                status_code=res.status_code,
            )

        return LLMCompletion(
            text=text,
            model=str(data.get("model") or model_id),
            usage=usage,
            finish_reason=str(finish) if finish is not None else None,
            raw=data,
        )
