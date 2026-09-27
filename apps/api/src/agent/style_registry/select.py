"""
Pick candidate styles for a vision (no LLM).

1. Explicit mention ("risograph poster", "in pixel art") locks that style.
2. Otherwise score every look by mood / subject / format overlap and return a
   diverse shortlist (at most two per family). The plan LLM (or the user in
   plan mode) chooses from the shortlist.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from agent.style_registry.registry import active_styles, get_style

# Fallback when nothing in the vision matches: broad, mostly light core looks.
DEFAULT_SHORTLIST: tuple[str, ...] = (
    "look.editorial",
    "look.swiss",
    "look.flat-vector",
    "look.paper-cut",
    "look.risograph",
    "look.grainy-gradient",
)

_WORD_RE = re.compile(r"[a-z0-9]+")

# Everyday prompt words → registry vocabulary.
_SYNONYMS: dict[str, tuple[str, ...]] = {
    "instagram": ("social-post",),
    "ig": ("social-post",),
    "insta": ("social-post",),
    "post": ("social-post",),
    "linkedin": ("social-post",),
    "tiktok": ("social-post", "story"),
    "reel": ("social-post", "story"),
    "announcing": ("announcement",),
    "announce": ("announcement",),
    "launching": ("launch",),
    "cosy": ("cozy",),
    "colour": ("colorful",),
    "colourful": ("colorful",),
    "bread": ("bakery",),
    "sourdough": ("bakery",),
    "pastry": ("bakery",),
    "croissant": ("bakery",),
    "restaurant": ("food",),
    "invite": ("invitation",),
    "birthday": ("party",),
    "gig": ("music",),
    "concert": ("music",),
    "dj": ("club", "music"),
    "stats": ("statistics",),
    "revenue": ("growth",),
    "grew": ("growth",),
    "grow": ("growth",),
    "growing": ("growth",),
    "increase": ("growth",),
    "increased": ("growth",),
    "doubled": ("growth",),
    "kid": ("kids",),
    "child": ("kids",),
    "children": ("kids",),
    "toddler": ("kids",),
}

# Two or more years / figures ("2019 to 2025", "3 stores to 14", "40%") read as data.
_NUMBER_RE = re.compile(r"\b\d{4}\b|\b\d+(?:\.\d+)?\s*(?:%|k\b|m\b|x\b)|\b\d+\b")

_AGE_RE = re.compile(r"\b\d{1,2}\s*-?\s*(?:year|yr)s?\s*-?\s*old\b", re.I)

_PHOTO_WORDS = frozenset(
    {"photo", "photos", "photograph", "picture", "pictures", "image", "images", "selfie"}
)


@dataclass(frozen=True, slots=True)
class StyleChoice:
    """Result of style selection for one vision."""

    locked_id: str | None
    shortlist: tuple[str, ...]
    type_locked_id: str | None = None
    reason: str = ""


def _normalize(text: str) -> str:
    return " ".join(_WORD_RE.findall((text or "").lower()))


def _tokens(text: str) -> set[str]:
    out: set[str] = set()
    for w in _WORD_RE.findall((text or "").lower()):
        out.add(w)
        if len(w) > 3 and w.endswith("s"):
            out.add(w[:-1])
        for syn in _SYNONYMS.get(w, ()):
            out.add(syn)
    if len(_NUMBER_RE.findall(text or "")) >= 2:
        out |= {"data", "statistics"}
    if _AGE_RE.search(text or ""):
        out.add("kids")
    return out


def _phrase_in(phrase: str, norm_text: str) -> bool:
    p = _normalize(phrase)
    if not p:
        return False
    return re.search(rf"(?:^|\s){re.escape(p)}(?:\s|$)", norm_text) is not None


def explicit_style(vision: str, *, slot: str = "look") -> str | None:
    """Return a style id the vision names outright, else None (longest keyword wins)."""
    norm = _normalize(vision)
    best: tuple[int, str] | None = None
    for entry in active_styles(slot):
        for kw in entry.get("keywords") or []:
            if _phrase_in(str(kw), norm):
                length = len(_normalize(str(kw)))
                if best is None or length > best[0]:
                    best = (length, str(entry["id"]))
    return best[1] if best else None


def _hits(values: list[str], tokens: set[str], norm: str) -> int:
    n = 0
    for v in values:
        v_norm = _normalize(str(v))
        if " " in v_norm:
            if _phrase_in(v_norm, norm):
                n += 1
        elif v_norm in tokens:
            n += 1
    return n


def score_styles(vision: str) -> list[tuple[float, dict[str, Any]]]:
    """
    Score every active look for the vision, highest first.

    Only styles with at least one mood/subject/format hit score above zero;
    the core-tier bonus just breaks ties between matching styles.
    """
    tokens = _tokens(vision)
    norm = _normalize(vision)
    mentions_photo = bool(tokens & _PHOTO_WORDS)
    scored: list[tuple[float, dict[str, Any]]] = []
    for entry in active_styles("look"):
        suits = entry.get("suits") or {}
        score = 3.0 * _hits(list(suits.get("moods") or []), tokens, norm)
        score += 3.0 * _hits(list(suits.get("subjects") or []), tokens, norm)
        score += 1.0 * _hits(list(suits.get("formats") or []), tokens, norm)
        if score <= 0:
            scored.append((0.0, entry))
            continue
        score -= 5.0 * _hits(list(entry.get("avoidFor") or []), tokens, norm)
        if entry.get("tier") == "core":
            score += 0.75
        if entry.get("image") == "required" and not mentions_photo:
            score -= 3.0
        scored.append((score, entry))
    scored.sort(key=lambda s: (-s[0], str(s[1]["id"])))
    return scored


def shortlist_styles(vision: str, *, limit: int = 6, per_family: int = 2) -> tuple[str, ...]:
    """Diverse shortlist of look ids for the vision."""
    scored = score_styles(vision)
    if not scored or scored[0][0] <= 1.0:
        return DEFAULT_SHORTLIST[:limit]
    picked: list[str] = []
    families: dict[str, int] = {}
    for score, entry in scored:
        if score <= 0 or len(picked) >= limit:
            break
        fam = str(entry.get("family") or "")
        if families.get(fam, 0) >= per_family:
            continue
        families[fam] = families.get(fam, 0) + 1
        picked.append(str(entry["id"]))
    for sid in DEFAULT_SHORTLIST:
        if len(picked) >= limit:
            break
        if sid not in picked:
            picked.append(sid)
    return tuple(picked[:limit])


def choose_styles(
    vision: str,
    *,
    locked_id: str | None = None,
    limit: int = 6,
) -> StyleChoice:
    """
    Resolve the style situation for a vision.

    locked_id (e.g. from a clarify answer) wins over explicit mentions.
    """
    type_locked = explicit_style(vision, slot="type")
    if locked_id and get_style(locked_id) and str(locked_id).startswith("look."):
        return StyleChoice(
            locked_id=locked_id,
            shortlist=(locked_id,),
            type_locked_id=type_locked,
            reason="chosen by the user",
        )
    named = explicit_style(vision, slot="look")
    if named:
        return StyleChoice(
            locked_id=named,
            shortlist=(named,),
            type_locked_id=type_locked,
            reason="named in the vision",
        )
    return StyleChoice(
        locked_id=None,
        shortlist=shortlist_styles(vision, limit=limit),
        type_locked_id=type_locked,
        reason="shortlisted by mood/subject match",
    )
