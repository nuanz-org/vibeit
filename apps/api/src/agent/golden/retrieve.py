"""
Tag-matched golden retriever (AM1) — no LLM.

Picks 1–2 golden tools from the library based on plan tags / concept keywords.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from agent.golden.index import GOLDEN_MANIFEST, GoldenEntry, load_golden_source

_TOKEN_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)?", re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class RetrievedGolden:
    id: str
    tags: frozenset[str]
    description: str
    source: str
    score: float


def _tokens_from_text(*parts: str) -> set[str]:
    out: set[str] = set()
    for part in parts:
        for m in _TOKEN_RE.finditer(part or ""):
            tok = m.group(0).lower()
            if len(tok) >= 2:
                out.add(tok)
    return out


def _plan_query_tokens(plan: dict[str, Any]) -> set[str]:
    tags = plan.get("tags") or []
    tag_bits = [str(t) for t in tags] if isinstance(tags, list) else []
    concept = str(plan.get("concept") or "")
    motion = str(plan.get("motion") or "")
    notes = str(plan.get("notes") or "")
    layers: list[str] = []
    composition = plan.get("composition")
    if isinstance(composition, dict):
        for key in ("layers", "focalPoints"):
            val = composition.get(key)
            if isinstance(val, list):
                layers.extend(str(x) for x in val)
        if composition.get("grid"):
            layers.append(str(composition["grid"]))
    return _tokens_from_text(concept, motion, notes, *tag_bits, *layers)


def _score_entry(entry: GoldenEntry, query: set[str]) -> float:
    if not query:
        return 0.0
    tag_hits = len(entry.tags & query)
    # Partial: query token contained in a tag or vice versa
    partial = 0.0
    for q in query:
        for t in entry.tags:
            if q == t:
                continue
            if q in t or t in q:
                partial += 0.35
                break
    # Prefer exact tag overlap
    return float(tag_hits) * 2.0 + partial


def retrieve_goldens(
    plan: dict[str, Any] | None,
    *,
    limit: int = 2,
    target: str | None = None,
) -> list[RetrievedGolden]:
    """
    Return up to `limit` goldens ordered by tag relevance.
    Prefer goldens matching plan.target (AM6); fall back within that target.
    Always returns at least one golden when the library is non-empty.
    """
    limit = max(1, min(3, int(limit)))
    plan_d = plan or {}
    tgt = (target or plan_d.get("target") or "canvas2d")
    if not isinstance(tgt, str):
        tgt = "canvas2d"
    tgt = tgt.strip() or "canvas2d"

    pool = [e for e in GOLDEN_MANIFEST if e.target == tgt]
    if not pool:
        pool = [e for e in GOLDEN_MANIFEST if e.target == "canvas2d"]
    if not pool:
        pool = list(GOLDEN_MANIFEST)

    query = _plan_query_tokens(plan_d)

    scored: list[tuple[float, GoldenEntry]] = []
    for entry in pool:
        scored.append((_score_entry(entry, query), entry))

    scored.sort(key=lambda x: (-x[0], x[1].id))

    # If nothing matched, use stable default order from target pool
    if not scored or all(s <= 0 for s, _ in scored):
        chosen = list(pool[:limit])
        scores = [0.0] * len(chosen)
    else:
        # Keep positive scores first; pad with next best if needed
        positive = [e for s, e in scored if s > 0]
        rest = [e for s, e in scored if s <= 0]
        chosen = (positive + rest)[:limit]
        score_map = {e.id: s for s, e in scored}
        scores = [score_map.get(e.id, 0.0) for e in chosen]

    out: list[RetrievedGolden] = []
    for entry, score in zip(chosen, scores, strict=True):
        out.append(
            RetrievedGolden(
                id=entry.id,
                tags=entry.tags,
                description=entry.description,
                source=load_golden_source(entry),
                score=score,
            )
        )
    return out
