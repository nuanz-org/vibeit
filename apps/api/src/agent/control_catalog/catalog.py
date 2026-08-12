"""Load the versioned control catalog seed (shared with packages/contracts)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_SEED_PATH = Path(__file__).with_name("control-catalog.seed.json")

# Keep in sync with packages/contracts ParamUiHint
PARAM_UI_HINTS = frozenset(
    {
        "slider",
        "segmented",
        "select",
        "switch",
        "hidden",
        "playPause",
        "textarea",
        "presetGrid",
    }
)

PARAM_KINDS = frozenset(
    {"color", "number", "text", "enum", "boolean", "assetRef"}
)


@lru_cache(maxsize=1)
def load_catalog() -> dict[str, Any]:
    """Return full catalog dict: { version, entries }."""
    raw = _SEED_PATH.read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, dict) or "entries" not in data:
        raise RuntimeError(f"invalid control catalog at {_SEED_PATH}")
    return data


def catalog_version() -> str:
    return str(load_catalog().get("version") or "1")


# Stable import alias matching contracts CONTROL_CATALOG_VERSION
CONTROL_CATALOG_VERSION = catalog_version()


def active_entries() -> list[dict[str, Any]]:
    entries = load_catalog().get("entries") or []
    out: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        if str(e.get("status") or "active") != "active":
            continue
        out.append(e)
    return out


def get_entry(catalog_id: str) -> dict[str, Any] | None:
    cid = (catalog_id or "").strip()
    if not cid:
        return None
    for e in load_catalog().get("entries") or []:
        if isinstance(e, dict) and str(e.get("id") or "") == cid:
            return e
    return None


def catalog_ids() -> frozenset[str]:
    return frozenset(
        str(e.get("id"))
        for e in (load_catalog().get("entries") or [])
        if isinstance(e, dict) and e.get("id")
    )
