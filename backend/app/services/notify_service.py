"""
Outbound notifications — fan a message out to whichever channels are configured
(Discord webhook, Slack webhook, Resend email). Every channel is optional; missing
config is silently skipped, and a failing channel never breaks the others.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def any_channel_configured() -> bool:
    return bool(
        settings.DISCORD_WEBHOOK_URL
        or settings.SLACK_WEBHOOK_URL
        or (settings.RESEND_API_KEY and settings.ALERT_EMAIL_TO)
    )


async def _send_discord(client: httpx.AsyncClient, text: str) -> None:
    if not settings.DISCORD_WEBHOOK_URL:
        return
    try:
        r = await client.post(settings.DISCORD_WEBHOOK_URL, json={"content": text[:1990]})
        r.raise_for_status()
    except Exception as e:
        logger.warning("Discord notify failed: %s", e)


async def _send_slack(client: httpx.AsyncClient, text: str) -> None:
    if not settings.SLACK_WEBHOOK_URL:
        return
    try:
        r = await client.post(settings.SLACK_WEBHOOK_URL, json={"text": text})
        r.raise_for_status()
    except Exception as e:
        logger.warning("Slack notify failed: %s", e)


async def _send_email(client: httpx.AsyncClient, subject: str, html: str) -> None:
    if not (settings.RESEND_API_KEY and settings.ALERT_EMAIL_TO):
        return
    try:
        r = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.ALERT_EMAIL_FROM,
                "to": [settings.ALERT_EMAIL_TO],
                "subject": subject,
                "html": html,
            },
        )
        r.raise_for_status()
    except Exception as e:
        logger.warning("Email notify failed: %s", e)


async def notify(subject: str, text_body: str, html_body: str | None = None) -> None:
    """Send to every configured channel. text_body -> Discord/Slack; html_body -> email."""
    html = html_body or ("<pre>" + text_body + "</pre>")
    async with httpx.AsyncClient(timeout=30.0) as client:
        await _send_discord(client, f"**{subject}**\n{text_body}")
        await _send_slack(client, f"*{subject}*\n{text_body}")
        await _send_email(client, subject, html)
