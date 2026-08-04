"""Opaque public / storage id helpers."""

from __future__ import annotations

import secrets


def new_public_id(prefix: str = "t") -> str:
    """
    Short unique public id for tools (share/gallery).

    Format: `{prefix}_{urlsafe}` — not a full nanoid lib; enough for MVP.
    """
    # 12 bytes → 16 url-safe chars without padding
    token = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:14]
    return f"{prefix}_{token}"
