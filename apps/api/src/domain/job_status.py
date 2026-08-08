"""
Job status machine helpers (M0e / M3a / A3).

Machine:
  queued → running → succeeded | failed
  running → awaiting_clarify  (planMode pause)
  awaiting_clarify → queued   (answers submitted → resume build)

Invariant: failed never becomes ready/published (enforced at finalize in M3e).
"""

from __future__ import annotations

from typing import Final

JOB_STATUSES: Final[tuple[str, ...]] = (
    "queued",
    "running",
    "awaiting_clarify",
    "succeeded",
    "failed",
)
TERMINAL_STATUSES: Final[frozenset[str]] = frozenset({"succeeded", "failed"})
# Pause states: worker not running; client should stop auto-polling.
PAUSED_STATUSES: Final[frozenset[str]] = frozenset(
    {"awaiting_clarify", "succeeded", "failed"}
)

# Allowed single-step transitions (same status is a no-op, not listed).
_ALLOWED: Final[dict[str, frozenset[str]]] = {
    "queued": frozenset({"running", "failed"}),
    "running": frozenset({"succeeded", "failed", "awaiting_clarify"}),
    "awaiting_clarify": frozenset({"queued", "failed"}),
    "succeeded": frozenset(),
    "failed": frozenset(),
}

class IllegalJobTransition(ValueError):
    """Raised when a status jump is not on the M0e machine."""


def is_terminal_job_status(status: str) -> bool:
    return status in TERMINAL_STATUSES


def is_job_poll_paused(status: str) -> bool:
    """True when client should stop auto-polling (terminal or needs input)."""
    return status in PAUSED_STATUSES


def job_may_become_published(status: str) -> bool:
    """Only succeeded jobs may attach a publishable ready version later."""
    return status == "succeeded"


def job_result_ready(status: str) -> bool:
    """resultReady hint for poll clients — true only on succeeded."""
    return status == "succeeded"

def assert_job_transition(from_status: str, to_status: str) -> None:
    if from_status not in JOB_STATUSES:
        raise IllegalJobTransition(f"unknown from status: {from_status}")
    if to_status not in JOB_STATUSES:
        raise IllegalJobTransition(f"unknown to status: {to_status}")
    if from_status == to_status:
        return
    allowed = _ALLOWED.get(from_status, frozenset())
    if to_status not in allowed:
        raise IllegalJobTransition(
            f"illegal job status transition {from_status!r} → {to_status!r}"
        )
