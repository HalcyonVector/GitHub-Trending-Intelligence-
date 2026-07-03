"""
Web Push delivery via VAPID (free — no third-party push service).

Uses pywebpush to send an encrypted message to a browser push endpoint
(Chrome/FCM, Firefox, Safari). Delivery is free; we self-sign with VAPID keys.
"""

import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def push_enabled() -> bool:
    """True only when VAPID keys are configured."""
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def send_web_push(subscription: dict, payload: dict) -> str:
    """
    Send a single push message.

    subscription: {"endpoint": str, "p256dh": str, "auth": str}
    Returns one of: "ok" | "expired" | "error".
    """
    if not push_enabled():
        return "error"

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:  # pragma: no cover
        logger.error("pywebpush not installed; run pip install -r requirements.txt")
        return "error"

    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            ttl=3600,
        )
        return "ok"
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        # 404/410 mean the subscription is dead and should be pruned.
        if status in (404, 410):
            return "expired"
        logger.warning("Web push failed (%s): %s", status, exc)
        return "error"
    except Exception as exc:  # pragma: no cover
        logger.warning("Web push error: %s", exc)
        return "error"
