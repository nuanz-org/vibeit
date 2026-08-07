"""
Style extract node (AM5) — inspiration images → StyleNotes.

Soft-fail: missing images / vision model errors never fail the Create job.
"""

from __future__ import annotations

import base64
from typing import Any

from adapters.llm.protocol import ChatMessage, LLMClient, LLMError
from adapters.llm.router import resolve_model_for_role
from agent.prompts.style_extract import (
    STYLE_EXTRACT_SYSTEM_PROMPT,
    style_extract_user_text,
)
from agent.state import CreateGraphState
from agent.style_parse import StyleParseError, parse_style_notes
from core.config import get_settings

MAX_INSPIRATION_IMAGES = 4
MAX_IMAGE_BYTES = 4_000_000  # ~4MB per image after decode


def _image_data_url(content_type: str, b64: str) -> str:
    ctype = content_type or "image/png"
    if ";" in ctype:
        ctype = ctype.split(";", 1)[0].strip()
    return f"data:{ctype};base64,{b64}"


def _normalize_images(raw: list[Any] | None) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    if not raw:
        return out
    for item in raw[:MAX_INSPIRATION_IMAGES]:
        if not isinstance(item, dict):
            continue
        b64 = item.get("base64") or item.get("data")
        if not isinstance(b64, str) or not b64.strip():
            continue
        # crude size guard
        try:
            raw_bytes = base64.b64decode(b64, validate=False)
        except Exception:  # noqa: BLE001
            continue
        if len(raw_bytes) > MAX_IMAGE_BYTES:
            continue
        ctype = item.get("content_type") or item.get("contentType") or "image/png"
        if not isinstance(ctype, str):
            ctype = "image/png"
        out.append(
            {
                "base64": b64.strip(),
                "content_type": ctype,
                "asset_id": str(item.get("asset_id") or item.get("id") or ""),
            }
        )
    return out


async def style_extract_node(
    state: CreateGraphState,
    *,
    llm: LLMClient | None,
) -> dict[str, Any]:
    """
    Run style extract when inspiration images are present.

    Uses LLM_MODEL_VISION (AM4). On any failure, returns style_extract_ok=False
    and empty notes so plan/codegen continue unstyled.
    """
    base: dict[str, Any] = {"phase": "style_extract"}
    images = _normalize_images(state.get("inspiration_images"))  # type: ignore[arg-type]

    if not images:
        return {
            **base,
            "style_notes": None,
            "style_extract_ok": False,
            "style_extract_error": None,  # silent skip — no images
        }

    if llm is None:
        return {
            **base,
            "style_notes": None,
            "style_extract_ok": False,
            "style_extract_error": "style extract skipped: no LLM",
        }

    parts: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": style_extract_user_text(
                vision_text=state.get("vision_text") or "",
                image_count=len(images),
            ),
        }
    ]
    for img in images:
        parts.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": _image_data_url(img["content_type"], img["base64"]),
                },
            }
        )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": STYLE_EXTRACT_SYSTEM_PROMPT},
        {"role": "user", "content": parts},
    ]

    tokens = int(state.get("llm_tokens_used") or 0)
    try:
        vision_model = resolve_model_for_role(
            "vision", configured=get_settings().llm_model_vision
        )
        completion = await llm.complete(
            messages,  # type: ignore[arg-type]
            model=vision_model,
            temperature=0.2,
            max_tokens=2_000,
        )
        tokens += completion.usage.total_tokens
        notes = parse_style_notes(completion.text)
    except (StyleParseError, LLMError, TypeError, ValueError, RuntimeError) as exc:
        return {
            **base,
            "style_notes": None,
            "style_extract_ok": False,
            "style_extract_error": f"style extract failed: {exc}",
            "llm_tokens_used": tokens,
        }
    except Exception as exc:  # noqa: BLE001 — soft fail
        return {
            **base,
            "style_notes": None,
            "style_extract_ok": False,
            "style_extract_error": f"style extract failed: {exc}",
            "llm_tokens_used": tokens,
        }

    return {
        **base,
        "style_notes": notes,
        "style_extract_ok": True,
        "style_extract_error": None,
        "llm_tokens_used": tokens,
    }
