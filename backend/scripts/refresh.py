"""
Manually run the data pipeline in ONE event loop.

    python scripts/refresh.py            # ingest + compute scores
    python scripts/refresh.py --insights # also generate AI insights (needs Ollama)

Running everything on a single loop avoids the asyncpg "different loop" error you
get from chaining multiple asyncio.run(...) calls.
"""

import asyncio
import os
import sys

# Make the app package importable regardless of how this script is invoked
# (running "python scripts/refresh.py" otherwise puts scripts/ on the path, not /app).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.workers.ingestion import (  # noqa: E402
    _aggregate_snapshots,
    _compute_trend_scores,
    _generate_ai_insights,
    _ingest_trending_repos,
)


async def main(with_insights: bool) -> None:
    print("→ ingesting trending repos…")
    await _ingest_trending_repos()
    print("→ computing trend scores…")
    await _compute_trend_scores()
    print("→ aggregating category snapshots (Trends/Radar)…")
    await _aggregate_snapshots()
    if with_insights:
        print("→ generating AI insights (via Ollama)…")
        await _generate_ai_insights()
    print("✓ done")


if __name__ == "__main__":
    asyncio.run(main("--insights" in sys.argv))
