"""
Web Push subscription endpoints.

The browser subscribes with a VAPID public key, then POSTs its push
subscription here along with the repos it's watching and an alert threshold.
The Celery worker later sends pushes when a watched repo crosses the threshold.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.services.push_service import push_enabled

router = APIRouter()


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeIn(BaseModel):
    endpoint: str
    keys: PushKeys
    repo_ids: list[int] = []
    threshold: int = 80


class UnsubscribeIn(BaseModel):
    endpoint: str


@router.get("/vapid-public-key")
async def vapid_public_key():
    """The browser needs this to create a push subscription."""
    return {"public_key": settings.VAPID_PUBLIC_KEY, "enabled": push_enabled()}


@router.post("/subscribe")
async def subscribe(body: SubscribeIn, db: AsyncSession = Depends(get_db)):
    """Upsert a push subscription keyed by its endpoint."""
    await db.execute(
        text(
            """
            INSERT INTO push_subscriptions (endpoint, p256dh, auth, repo_ids, threshold, updated_at)
            VALUES (:endpoint, :p256dh, :auth, :repo_ids, :threshold, NOW())
            ON CONFLICT (endpoint) DO UPDATE SET
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                repo_ids = EXCLUDED.repo_ids,
                threshold = EXCLUDED.threshold,
                updated_at = NOW()
            """
        ),
        {
            "endpoint": body.endpoint,
            "p256dh": body.keys.p256dh,
            "auth": body.keys.auth,
            "repo_ids": body.repo_ids,
            "threshold": body.threshold,
        },
    )
    return {"status": "subscribed", "watching": len(body.repo_ids)}


@router.post("/unsubscribe")
async def unsubscribe(body: UnsubscribeIn, db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("DELETE FROM push_subscriptions WHERE endpoint = :endpoint"),
        {"endpoint": body.endpoint},
    )
    return {"status": "unsubscribed"}
