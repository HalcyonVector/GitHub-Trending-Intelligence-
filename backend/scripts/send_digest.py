"""
Build and send the weekly digest — top movers + breakouts (young & accelerating
repos) — to whichever notification channels are configured. Scheduled via
.github/workflows/digest.yml, or run on demand:

    python scripts/send_digest.py
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.services.notify_service import any_channel_configured, notify  # noqa: E402

_MOVERS_SQL = """
    SELECT full_name, language, latest_stars, stars_gained_week, momentum_score
    FROM repositories
    WHERE is_archived = FALSE AND momentum_score > 0
    ORDER BY momentum_score DESC
    LIMIT :n
"""

_BREAKOUTS_SQL = """
    SELECT full_name, language, latest_stars, stars_gained_week, momentum_score
    FROM repositories
    WHERE is_archived = FALSE
      AND github_created_at >= :cutoff
      AND momentum_score >= :minmom
    ORDER BY momentum_score DESC
    LIMIT :n
"""


def _lines(rows) -> list[str]:
    out = []
    for i, r in enumerate(rows, 1):
        m = r._mapping
        out.append(
            f"{i}. {m['full_name']} ({m['language'] or '—'}) — "
            f"momentum {float(m['momentum_score']):.0f}, "
            f"+{m['stars_gained_week'] or 0:,}/wk, {m['latest_stars']:,}★"
        )
    return out or ["(none yet — momentum needs a few days of data)"]


def _html(title: str, rows) -> str:
    items = "".join(
        f"<li><b>{r._mapping['full_name']}</b> — momentum "
        f"{float(r._mapping['momentum_score']):.0f}, "
        f"+{r._mapping['stars_gained_week'] or 0} stars/wk</li>"
        for r in rows
    ) or "<li>(none yet)</li>"
    return f"<h2>{title}</h2><ol>{items}</ol>"


async def main() -> None:
    if not any_channel_configured():
        print("No notification channel configured; skipping digest.")
        return

    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.BREAKOUT_MAX_AGE_DAYS)
    async with AsyncSessionLocal() as session:
        movers = (
            await session.execute(text(_MOVERS_SQL), {"n": settings.DIGEST_TOP_N})
        ).fetchall()
        breakouts = (
            await session.execute(
                text(_BREAKOUTS_SQL),
                {"cutoff": cutoff, "minmom": settings.BREAKOUT_MIN_MOMENTUM, "n": settings.DIGEST_TOP_N},
            )
        ).fetchall()

    text_body = "\n".join(
        ["Breakouts (new & accelerating):", *_lines(breakouts), "", "Top movers:", *_lines(movers)]
    )
    html_body = _html("Breakouts (new &amp; accelerating)", breakouts) + _html("Top movers", movers)

    await notify("GitHub Trending — Weekly Digest", text_body, html_body)
    print(f"Digest sent: {len(breakouts)} breakouts, {len(movers)} movers")


if __name__ == "__main__":
    asyncio.run(main())
