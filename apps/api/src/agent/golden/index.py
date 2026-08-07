"""
Golden library manifest (AM1).

Each entry is a hand-authored canvas2d tool used as few-shot boilerplate.
No LLM — plain file load + tags.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True, slots=True)
class GoldenEntry:
    id: str
    path: Path
    tags: frozenset[str]
    description: str


GOLDEN_MANIFEST: tuple[GoldenEntry, ...] = (
    GoldenEntry(
        id="kinetic-type",
        path=_DIR / "kinetic-type.ts",
        tags=frozenset(
            {
                "kinetic-type",
                "type",
                "typography",
                "text",
                "title",
                "headline",
            }
        ),
        description="Bold kinetic typography with easing and palette roles",
    ),
    GoldenEntry(
        id="particle-field",
        path=_DIR / "particle-field.ts",
        tags=frozenset(
            {
                "particles",
                "particle",
                "dots",
                "orbit",
                "field",
                "motion",
            }
        ),
        description="Soft orbiting particle field with core glow",
    ),
    GoldenEntry(
        id="gradient-poster",
        path=_DIR / "gradient-poster.ts",
        tags=frozenset(
            {
                "gradient",
                "poster",
                "wash",
                "still",
                "minimal",
                "social",
            }
        ),
        description="Full-bleed gradient poster with type hierarchy",
    ),
)


def list_goldens() -> list[str]:
    return [g.id for g in GOLDEN_MANIFEST]


def load_golden_source(entry: GoldenEntry) -> str:
    if not entry.path.is_file():
        raise FileNotFoundError(f"golden missing: {entry.path}")
    return entry.path.read_text(encoding="utf-8")
