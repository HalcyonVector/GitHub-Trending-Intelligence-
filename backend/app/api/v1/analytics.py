"""
Analytics endpoints: language leaderboard and per-repo sparkline series.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set
from app.core.config import settings
from app.core.database import get_db

router = APIRouter()


@router.get("/languages")
async def get_languages(db: AsyncSession = Depends(get_db)):
    """Aggregate momentum, counts, and star velocity by programming language."""
    cache_key = "analytics:languages:v1"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(
        text(
            """
            SELECT language,
                   COUNT(*)                          AS repo_count,
                   AVG(momentum_score)               AS avg_momentum,
                   COALESCE(SUM(stars_gained_week), 0) AS stars_gained_week,
                   COALESCE(SUM(latest_stars), 0)      AS total_stars
            FROM repositories
            WHERE language IS NOT NULL AND language <> '' AND is_archived = FALSE
            GROUP BY language
            ORDER BY AVG(momentum_score) DESC NULLS LAST, SUM(stars_gained_week) DESC
            LIMIT 25
            """
        )
    )

    languages = []
    for row in result.fetchall():
        d = dict(row._mapping)
        languages.append(
            {
                "language": d["language"],
                "repo_count": int(d["repo_count"] or 0),
                "avg_momentum": round(float(d["avg_momentum"] or 0), 1),
                "stars_gained_week": int(d["stars_gained_week"] or 0),
                "total_stars": int(d["total_stars"] or 0),
            }
        )

    response = {"languages": languages}
    await cache_set(cache_key, response, settings.CACHE_TTL_TRENDS)
    return response


@router.get("/sparklines")
async def get_sparklines(ids: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Return the last 7 days of daily star gains for the given repo ids."""
    id_list = [int(x) for x in ids.split(",") if x.strip().isdigit()][:60]
    if not id_list:
        return {"sparklines": {}}

    result = await db.execute(
        text(
            """
            SELECT repository_id, date, stars_gained
            FROM daily_metrics
            WHERE repository_id = ANY(:ids) AND date >= CURRENT_DATE - 7
            ORDER BY repository_id, date ASC
            """
        ),
        {"ids": id_list},
    )

    spark: dict[str, list[int]] = {}
    for row in result.fetchall():
        d = dict(row._mapping)
        spark.setdefault(str(d["repository_id"]), []).append(int(d["stars_gained"] or 0))

    return {"sparklines": spark}
