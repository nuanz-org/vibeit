"""
Golden library manifest (AM1 + AM6 multi-target).

Each entry is a hand-authored tool used as few-shot boilerplate.
No LLM — plain file load + tags. Filter by `target` (canvas2d | p5 | three).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

_DIR = Path(__file__).resolve().parent

GoldenTarget = Literal["canvas2d", "p5", "three"]


@dataclass(frozen=True, slots=True)
class GoldenEntry:
    id: str
    path: Path
    tags: frozenset[str]
    description: str
    target: GoldenTarget = "canvas2d"


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
        target="canvas2d",
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
        target="canvas2d",
    ),
    GoldenEntry(
        id="neon-trail",
        path=_DIR / "neon-trail.ts",
        tags=frozenset(
            {
                "glow",
                "trail",
                "neon",
                "loop",
                "logo",
                "kinetic",
                "infinity",
                "bloom",
                "lemniscate",
                "motion",
            }
        ),
        description="Efficient neon trail (single-path multi-width glow, no per-segment blur)",
        target="canvas2d",
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
        target="canvas2d",
    ),
    # A5 — Brik-class craft exemplars
    GoldenEntry(
        id="proximity-pixel-card",
        path=_DIR / "proximity-pixel-card.ts",
        tags=frozenset(
            {
                "card",
                "proximity",
                "pixel",
                "pixelation",
                "distortion",
                "interaction",
                "pointer",
                "hover",
                "image",
                "photo",
                "parametric",
            }
        ),
        description=(
            "Proximity card: pointer falloff → pixelation/warp, image cover, "
            "grouped Content/Distortion/Interaction/Card controls"
        ),
        target="canvas2d",
    ),
    GoldenEntry(
        id="kinetic-logo-2d",
        path=_DIR / "kinetic-logo-2d.ts",
        tags=frozenset(
            {
                "logo",
                "loop",
                "parametric",
                "kinetic",
                "isometric",
                "cube",
                "enum",
                "shape",
                "assembly",
                "material",
                "wordmark",
            }
        ),
        description=(
            "Kinetic logo 2d: shape × assembly × material enums, "
            "normalized loop phase, isometric/flat multi-variant branches"
        ),
        target="canvas2d",
    ),
    GoldenEntry(
        id="p5-orbit",
        path=_DIR / "p5-orbit.ts",
        tags=frozenset(
            {
                "p5",
                "orbit",
                "particles",
                "sketch",
                "ellipse",
                "motion",
            }
        ),
        description="p5-style orbiting accent with soft field",
        target="p5",
    ),
    GoldenEntry(
        id="three-depth",
        path=_DIR / "three-depth.ts",
        tags=frozenset(
            {
                "three",
                "webgl",
                "depth",
                "3d",
                "material",
                "mesh",
                "cube",
                "logo",
                "parametric",
                "loop",
                "metalness",
                "lighting",
            }
        ),
        description=(
            "Real three harness: MeshStandardMaterial cube + rim light + "
            "orbiting satellite; palette-driven materials (B2/B4 craft exemplar)"
        ),
        target="three",
    ),
)


def list_goldens() -> list[str]:
    return [g.id for g in GOLDEN_MANIFEST]


def load_golden_source(entry: GoldenEntry) -> str:
    if not entry.path.is_file():
        raise FileNotFoundError(f"golden missing: {entry.path}")
    return entry.path.read_text(encoding="utf-8")
