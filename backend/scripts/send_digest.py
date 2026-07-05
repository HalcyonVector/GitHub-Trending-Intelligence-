"""
Build and send the weekly digest -- top movers + breakouts (young & accelerating
repos) -- to whichever notification channels are configured. Scheduled via
.github/workflows/digest.yml, or run on demand:

    python scripts/send_digest.py

The email is a styled, Gmail-safe HTML layout (inline CSS, table-based) in the
app's warm "Dusk" theme, with clickable repo links, momentum + signal badges,
and a "big story" callout. Discord/Slack get a tidy plaintext version.
"""

import asyncio
import html as _htmllib
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.services.notify_service import any_channel_configured, notify  # noqa: E402

# One query shape for both sections. The LATERAL joins pull the freshest daily
# metric (commit / contributor activity, for the hype-vs-substance signal) and
# the primary category, without fanning the row out.
_SELECT = """
    SELECT
        r.full_name,
        r.language,
        r.latest_stars,
        r.latest_forks,
        r.stars_gained_today,
        r.stars_gained_week,
        r.momentum_score,
        r.github_created_at,
        r.description,
        c.name              AS category,
        dm.commit_count_week,
        dm.contributors_count
    FROM repositories r
    LEFT JOIN LATERAL (
        SELECT commit_count_week, contributors_count
        FROM daily_metrics
        WHERE repository_id = r.id
        ORDER BY date DESC
        LIMIT 1
    ) dm ON TRUE
    LEFT JOIN LATERAL (
        SELECT tc.name
        FROM repository_categories rc
        JOIN technology_categories tc ON tc.id = rc.category_id
        WHERE rc.repository_id = r.id
        ORDER BY rc.confidence DESC NULLS LAST
        LIMIT 1
    ) c ON TRUE
"""

_MOVERS_SQL = f"""
    {_SELECT}
    WHERE r.is_archived = FALSE AND r.momentum_score > 0
    ORDER BY r.momentum_score DESC
    LIMIT :n
"""

_BREAKOUTS_SQL = f"""
    {_SELECT}
    WHERE r.is_archived = FALSE
      AND r.github_created_at >= :cutoff
      AND r.momentum_score >= :minmom
    ORDER BY r.momentum_score DESC
    LIMIT :n
"""

# -- App "Dusk" palette (warm dark editorial theme; email-safe solid hex) --
BODY = "#191410"     # page background
CARD = "#241d16"     # container / card
PANEL = "#2b231a"    # raised surface / default pill background
BORDER = "#4a3f32"   # outer border
RULE = "#382f26"     # inner dividers
INK = "#efe7d8"      # primary text
MUTED = "#b6a893"    # secondary text
DIM = "#7e6f5c"      # tertiary text
GAIN = "#8fc46b"     # positive / backed-by-activity
EMBER = "#ef9367"    # accent / hot momentum
PLASMA = "#79d6c0"   # secondary accent / age
LINK = "#ef9367"
MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace"
SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _signal(m) -> bool:
    """True when momentum is backed by real dev activity, not just stars.
    Mirrors the frontend's hype-vs-substance rule."""
    commit = m["commit_count_week"] or 0
    contrib = m["contributors_count"] or 0
    stars = m["latest_stars"] or 0
    fork_ratio = (m["latest_forks"] or 0) / stars if stars else 0.0
    return commit > 0 or contrib > 0 or fork_ratio > 0.04


def _age_days(m) -> Optional[int]:
    created = m["github_created_at"]
    if not created:
        return None
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - created).days


# ------------------------- plaintext (Discord / Slack) -------------------------

def _lines(rows) -> list:
    if not rows:
        return ["  (none yet -- momentum needs a few days of data)"]
    out = []
    for i, r in enumerate(rows, 1):
        m = r._mapping
        sig = "backed by activity" if _signal(m) else "star-driven"
        cat = m["category"] or "-"
        out.append(
            f"{i}. {m['full_name']}  |  {cat}  |  momentum {float(m['momentum_score']):.0f}  |  "
            f"+{m['stars_gained_week'] or 0:,}/wk  |  +{m['stars_gained_today'] or 0:,} today  |  "
            f"{m['latest_stars']:,} stars  |  {sig}"
        )
        out.append(f"   https://github.com/{m['full_name']}")
    return out


def _big_story_line(breakouts, movers) -> Optional[str]:
    src = breakouts or movers
    if not src:
        return None
    m = src[0]._mapping
    kind = "breakout" if breakouts else "top mover"
    return (
        f"This week's {kind}: {m['full_name']} -- momentum {float(m['momentum_score']):.0f}, "
        f"+{m['stars_gained_week'] or 0:,} stars in 7 days."
    )


def _text_body(breakouts, movers, date_range: str) -> str:
    parts = [f"GitHub Trending -- Weekly Digest ({date_range})", ""]
    story = _big_story_line(breakouts, movers)
    if story:
        parts += [f"* {story}", ""]
    parts += ["Breakouts (new & accelerating)", *_lines(breakouts), ""]
    parts += ["Top movers", *_lines(movers)]
    if settings.FRONTEND_URL:
        parts += ["", f"Full dashboard: {settings.FRONTEND_URL}"]
    return "\n".join(parts)


# ------------------------- HTML email -------------------------

def _esc(s) -> str:
    return _htmllib.escape(str(s)) if s is not None else ""


def _pill(label: str, color: str, bg: str) -> str:
    return (
        f'<span style="display:inline-block;font-family:{MONO};font-size:10px;'
        f"letter-spacing:.06em;text-transform:uppercase;color:{color};background:{bg};"
        f'border-radius:20px;padding:2px 9px;line-height:1.7;white-space:nowrap;">{label}</span>'
    )


def _repo_card(i: int, m, is_breakout: bool) -> str:
    name = _esc(m["full_name"])
    url = f"https://github.com/{name}"
    mom = float(m["momentum_score"])
    hot = mom >= 65
    mom_pill = _pill(f"momentum {mom:.0f}", EMBER if hot else "#d8c8b0", "#3a2a1e" if hot else PANEL)

    backed = _signal(m)
    sig_pill = _pill(
        "backed by activity" if backed else "star-driven",
        GAIN if backed else DIM,
        "#26301c" if backed else PANEL,
    )

    badges = [mom_pill, sig_pill]
    if m["category"]:
        badges.append(_pill(_esc(m["category"]), MUTED, PANEL))
    if is_breakout:
        age = _age_days(m)
        if age is not None:
            badges.append(_pill(f"{age}d old", PLASMA, "#173029"))
    badges_html = "&nbsp;".join(badges)

    week = m["stars_gained_week"] or 0
    today = m["stars_gained_today"] or 0
    stars = m["latest_stars"] or 0
    lang = _esc(m["language"]) if m["language"] else "-"
    desc = _esc((m["description"] or "").strip())
    if len(desc) > 110:
        desc = desc[:107] + "&#8230;"

    stats = (
        f'<span style="color:{GAIN};font-weight:600;">+{week:,}</span> this week'
        f'&nbsp;&nbsp;&middot;&nbsp;&nbsp;+{today:,} today'
        f'&nbsp;&nbsp;&middot;&nbsp;&nbsp;{stars:,}<span style="color:{EMBER};">&#9733;</span>'
        f'&nbsp;&nbsp;&middot;&nbsp;&nbsp;{lang}'
    )

    desc_row = (
        f'<div style="font-family:{SANS};font-size:12px;color:{MUTED};margin:2px 0 8px;">{desc}</div>'
        if desc else ""
    )

    return f"""
    <tr>
      <td width="34" valign="top" style="font-family:{MONO};font-size:15px;color:{DIM};padding:14px 6px 14px 18px;">{i}</td>
      <td valign="top" style="padding:14px 18px 14px 0;border-bottom:1px solid {RULE};">
        <a href="{url}" style="font-family:{SANS};font-size:15px;font-weight:700;color:{INK};text-decoration:none;">{name}</a>
        {desc_row}
        <div style="margin:5px 0 9px;">{badges_html}</div>
        <div style="font-family:{MONO};font-size:12px;color:{MUTED};">{stats}</div>
      </td>
    </tr>"""


def _section(title: str, subtitle: str, rows, is_breakout: bool) -> str:
    if rows:
        cards = "".join(_repo_card(i, r._mapping, is_breakout) for i, r in enumerate(rows, 1))
    else:
        cards = (
            f'<tr><td style="font-family:{SANS};font-size:13px;color:{MUTED};'
            f'padding:14px 18px;border-bottom:1px solid {RULE};">'
            f"Nothing here yet -- momentum needs a few days of daily snapshots to build.</td></tr>"
        )
    return f"""
    <tr><td style="padding:26px 18px 6px;">
      <div style="font-family:{SANS};font-size:17px;font-weight:800;color:{INK};letter-spacing:-.01em;">{title}</div>
      <div style="font-family:{MONO};font-size:11px;color:{EMBER};text-transform:uppercase;letter-spacing:.08em;margin-top:3px;">{subtitle}</div>
    </td></tr>
    <tr><td style="padding:0 0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">{cards}</table></td></tr>"""


def _html_body(breakouts, movers, date_range: str) -> str:
    story = _big_story_line(breakouts, movers)
    story_block = (
        f"""
    <tr><td style="padding:6px 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr><td bgcolor="{PANEL}" style="background:{PANEL};border:1px solid {RULE};border-left:3px solid {EMBER};border-radius:6px;padding:12px 14px;font-family:{SANS};font-size:14px;color:{INK};line-height:1.5;">
          <span style="font-family:{MONO};font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:{EMBER};">&#9733; Big story</span><br>{_esc(story)}
        </td></tr>
      </table>
    </td></tr>"""
        if story else ""
    )

    footer_link = (
        f'<a href="{settings.FRONTEND_URL}" style="color:{LINK};text-decoration:none;font-weight:600;">Open the full dashboard &#8594;</a><br>'
        if settings.FRONTEND_URL else ""
    )

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:{BODY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{BODY}" style="background:{BODY};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="{CARD}" style="width:600px;max-width:100%;background:{CARD};border:1px solid {BORDER};border-radius:10px;overflow:hidden;">

        <tr><td style="padding:22px 18px 15px;border-bottom:1px solid {RULE};">
          <div style="font-family:{MONO};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:{EMBER};">GitHub Trending Intelligence</div>
          <div style="font-family:{SANS};font-size:24px;font-weight:800;color:{INK};letter-spacing:-.02em;margin-top:5px;">Weekly Digest</div>
          <div style="font-family:{MONO};font-size:12px;color:{DIM};margin-top:3px;">{date_range}</div>
        </td></tr>

        {story_block}
        {_section("Breakouts", "new &amp; accelerating", breakouts, True)}
        {_section("Top movers", "ranked by momentum", movers, False)}

        <tr><td style="padding:20px 18px 24px;border-top:1px solid {RULE};font-family:{SANS};font-size:12px;color:{DIM};line-height:1.6;">
          {footer_link}
          Momentum is a 0-100 velocity score (stars, forks, contributors, commits), not a raw star count.
          <span style="color:{GAIN};">Backed by activity</span> means the growth is matched by real commits or contributors;
          <span style="color:{MUTED};">star-driven</span> means it is riding stars alone.
        </td></tr>

      </table>
      <div style="font-family:{MONO};font-size:11px;color:{DIM};margin-top:12px;">Sent by GitHub Trending Intelligence &middot; unsubscribe by removing the digest workflow secrets</div>
    </td></tr>
  </table>
</body></html>"""


async def main() -> None:
    if not any_channel_configured():
        print("No notification channel configured; skipping digest.")
        return

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=settings.BREAKOUT_MAX_AGE_DAYS)
    date_range = f"{(now - timedelta(days=7)):%b %d} - {now:%b %d, %Y}"

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

    text_body = _text_body(breakouts, movers, date_range)
    html_body = _html_body(breakouts, movers, date_range)

    await notify("GitHub Trending -- Weekly Digest", text_body, html_body)
    print(f"Digest sent: {len(breakouts)} breakouts, {len(movers)} movers")


if __name__ == "__main__":
    asyncio.run(main())
