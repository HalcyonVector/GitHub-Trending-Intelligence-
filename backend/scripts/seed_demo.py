"""
Seed a synthetic "yesterday" snapshot (~6% fewer stars) so gains, momentum, and
leaderboards show live non-zero numbers on a fresh install — without waiting for
the next real ingest cycle.

    python scripts/seed_demo.py

Safe to re-run (only overwrites yesterday's synthetic row). Purely for demo/first-run;
once real daily snapshots accumulate you don't need it.
"""

import asyncio
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.workers.ingestion import _aggregate_snapshots, _compute_trend_scores  # noqa: E402


async def main() -> None:
    today = date.today()
    yesterday = today - timedelta(days=1)

    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    "SELECT repository_id, stars_total, forks_total, watchers "
                    "FROM daily_metrics WHERE date = :d"
                ),
                {"d": today},
            )
        ).fetchall()

        for r in rows:
            m = dict(r._mapping)
            await session.execute(
                text(
                    """
                    INSERT INTO daily_metrics
                      (repository_id, date, stars_total, forks_total, watchers, open_issues, releases_count)
                    VALUES (:rid, :d, :st, :ft, :w, 0, 0)
                    ON CONFLICT (repository_id, date) DO UPDATE
                      SET stars_total = EXCLUDED.stars_total,
                          forks_total = EXCLUDED.forks_total
                    """
                ),
                {
                    "rid": m["repository_id"],
                    "d": yesterday,
                    "st": int((m["stars_total"] or 0) * 0.94),
                    "ft": int((m["forks_total"] or 0) * 0.95),
                    "w": m["watchers"] or 0,
                },
            )
        await session.commit()
        print(f"→ seeded {len(rows)} synthetic prior-day snapshots")

    # Recompute so gains, momentum, and category snapshots reflect the seed
    print("→ recomputing scores…")
    await _compute_trend_scores()
    print("→ aggregating snapshots…")
    await _aggregate_snapshots()
    print("✓ momentum is now live — refresh the dashboard")


if __name__ == "__main__":
    asyncio.run(main())
