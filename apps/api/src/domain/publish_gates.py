"""
M8b/M8c — publish quality gates (pure domain checks).

Thin share (for_gallery=False):
  Only needs a runnable version (handled by service NO_VERSION).
  Does NOT require export smoke, title, or thumbnail.

Gallery publish (for_gallery=True):
  Preview smoke (server readiness) + export smoke + title + thumbnail (M8c).
  Failures are structured {code, message} for actionable API errors.

No headless browser farm — export smoke / thumb come from client captureFrame
→ upload kind=thumb (M8c). A valid thumbnail also satisfies export smoke.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Final

ALLOWED_TARGETS: Final[frozenset[str]] = frozenset({"canvas2d", "p5", "three"})


@dataclass(frozen=True, slots=True)
class GateFailure:
    code: str
    message: str

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}


@dataclass(frozen=True, slots=True)
class PublishGateInput:
    """Snapshot evaluated by evaluate_publish_gates (no I/O)."""

    # Version readiness (preview smoke)
    has_version: bool
    code: str
    target: str
    param_schema: Any
    # Metadata
    title: str | None
    # Mode + client proof
    for_gallery: bool
    export_smoke_ok: bool
    # M8c: gallery frame thumb attached (or already on tool)
    has_thumbnail: bool = False


def evaluate_publish_gates(inp: PublishGateInput) -> list[GateFailure]:
    """
    Return ordered gate failures (empty list = pass).

    When for_gallery is False, returns no gallery-only failures (service still
    enforces non-empty code for any publish). When True, all gallery gates run.
    """
    failures: list[GateFailure] = []

    # --- Preview smoke (required for gallery; also useful diagnostics) ---
    if not inp.has_version:
        failures.append(
            GateFailure(
                code="PREVIEW_NO_VERSION",
                message="Tool has no version to publish. Generate or open a ready tool first.",
            )
        )
    else:
        code = (inp.code or "").strip()
        if not code:
            failures.append(
                GateFailure(
                    code="PREVIEW_EMPTY_CODE",
                    message="Version code is empty. Failed or incomplete generations cannot be published.",
                )
            )

        target = (inp.target or "").strip()
        if target and target not in ALLOWED_TARGETS:
            failures.append(
                GateFailure(
                    code="PREVIEW_TARGET",
                    message=f"Target {target!r} is not allowed. Use canvas2d (or p5/three when enabled).",
                )
            )
        if not target:
            failures.append(
                GateFailure(
                    code="PREVIEW_TARGET",
                    message="Version has no target. Cannot mount a public preview.",
                )
            )

        schema = inp.param_schema
        if schema is not None and not isinstance(schema, list):
            failures.append(
                GateFailure(
                    code="PREVIEW_PARAM_SCHEMA",
                    message="paramSchema must be a list of param definitions.",
                )
            )

    if not inp.for_gallery:
        # Thin share: service-level NO_VERSION is enough; do not require title/export.
        return failures

    # --- Gallery-only gates ---
    title = (inp.title or "").strip()
    if not title:
        failures.append(
            GateFailure(
                code="GALLERY_TITLE_REQUIRED",
                message="Gallery publish requires a title. Add a title and try again.",
            )
        )

    # M8c: thumbnail required for gallery cards (no placeholder listing)
    if not inp.has_thumbnail:
        failures.append(
            GateFailure(
                code="GALLERY_THUMBNAIL_REQUIRED",
                message=(
                    "Gallery publish requires a thumbnail. Capture a frame in Studio "
                    "(Save gallery thumbnail) then publish."
                ),
            )
        )

    # Export smoke: explicit client flag OR thumbnail proves capture worked
    export_ok = inp.export_smoke_ok or inp.has_thumbnail
    if not export_ok:
        failures.append(
            GateFailure(
                code="EXPORT_SMOKE_REQUIRED",
                message=(
                    "Export smoke required for gallery: run Download PNG or Capture "
                    "in Studio so the tool proves it can export a frame, then publish."
                ),
            )
        )

    return failures


def gates_passed(inp: PublishGateInput) -> bool:
    return len(evaluate_publish_gates(inp)) == 0
