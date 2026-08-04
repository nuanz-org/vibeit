"""
Load hand-authored tool source for agent tests / fixture pipeline (M3c).

Reads monorepo files relative to repo root — no LLM.
"""

from __future__ import annotations

from pathlib import Path

# apps/api/src/agent/fixtures.py → parents[4] = monorepo root
_REPO_ROOT = Path(__file__).resolve().parents[4]

FIXTURE_PATHS: dict[str, Path] = {
    "social-frame": (
        _REPO_ROOT
        / "apps"
        / "web"
        / "runtime"
        / "fixtures"
        / "social-frame"
        / "tool.ts"
    ),
}


class FixtureNotFoundError(FileNotFoundError):
    pass


def load_fixture_source(name: str = "social-frame") -> str:
    path = FIXTURE_PATHS.get(name)
    if path is None:
        raise FixtureNotFoundError(f"unknown fixture: {name!r}")
    if not path.is_file():
        raise FixtureNotFoundError(f"fixture file missing: {path}")
    return path.read_text(encoding="utf-8")


def list_fixtures() -> list[str]:
    return sorted(FIXTURE_PATHS.keys())
