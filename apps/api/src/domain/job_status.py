"""
Job status machine helpers (M0e / M3a).

Machine: queued → running → succeeded | failed
Invariant: failed never becomes ready/published (enforced at finalize in M3e).
"""

from __future__ import annotations

from typing import Final

JOB_STATUSES: Final[tuple[str, ...]] = ("queued", "running", "succeeded", "failed")
TERMINAL_STATUSES: Final[frozenset[str]] = frozenset({"succeeded", "failed"})

# Allowed single-step transitions (same status is a no-op, not listed).
_ALLOWED: Final[dict[str, frozenset[str]]] = {
    "queued": frozenset({"running", "failed"}),
    "running": frozenset({"succeeded", "failed"}),
    "succeeded": frozenset(),
    "failed": frozenset(),
}


class IllegalJobTransition(ValueError):
    """Raised when a status jump is not on the M0e machine."""


def is_terminal_job_status(status: str) -> bool:
    return status in TERMINAL_STATUSES


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
