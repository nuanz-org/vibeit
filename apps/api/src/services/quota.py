"""
Create-job daily quota (M3f).

Counts accepted enqueues per user per UTC calendar day.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from adapters.db.repositories.jobs import JobsRepository
from core.config import Settings


@dataclass(frozen=True, slots=True)
class QuotaSnapshot:
    creates_used: int
    creates_limit: int
    resets_at: datetime  # next UTC midnight

    @property
    def remaining(self) -> int:
        return max(0, self.creates_limit - self.creates_used)

    @property
    def exceeded(self) -> bool:
        return self.creates_used >= self.creates_limit


def utc_day_start(now: datetime | None = None) -> datetime:
    n = now or datetime.now(timezone.utc)
    if n.tzinfo is None:
        n = n.replace(tzinfo=timezone.utc)
    n = n.astimezone(timezone.utc)
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


def next_utc_midnight(now: datetime | None = None) -> datetime:
    start = utc_day_start(now)
    return start + timedelta(days=1)


def estimate_cost_cents(
    tokens_used: int,
    *,
    cents_per_million: int = 15,
) -> int:
    """
    Rough integer cents for logging (not billing-grade).

    Rounds up so any non-zero usage costs at least 1 cent when tokens are large
    enough; small jobs may be 0.
    """
    if tokens_used <= 0 or cents_per_million <= 0:
        return 0
    return (tokens_used * cents_per_million + 999_999) // 1_000_000


async def get_quota_snapshot(
    *,
    owner_user_id: str,
    jobs: JobsRepository,
    settings: Settings,
    now: datetime | None = None,
) -> QuotaSnapshot:
    limit = max(0, int(settings.create_quota_per_day))
    since = utc_day_start(now)
    used = await jobs.count_jobs_for_owner_since(
        owner_user_id=owner_user_id,
        since_utc=since,
    )
    return QuotaSnapshot(
        creates_used=used,
        creates_limit=limit,
        resets_at=next_utc_midnight(now),
    )


def quota_to_wire(snapshot: QuotaSnapshot) -> dict:
    """Fields for QuotaFields Pydantic model (snake_case before alias)."""
    return {
        "creates_used": snapshot.creates_used,
        "creates_limit": snapshot.creates_limit,
        "resets_at": snapshot.resets_at.isoformat(timespec="seconds").replace(
            "+00:00", "Z"
        ),
    }
