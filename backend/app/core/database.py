from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Local Postgres (Docker) vs a hosted/managed one (Supabase, Neon, Railway…).
# Hosted Postgres requires SSL, and Supabase's connection pooler (PgBouncer /
# Supavisor, transaction mode) does not support asyncpg's prepared statements —
# so disable the statement cache and let the external pooler manage connections.
_url = settings.DATABASE_URL
_is_local = ("localhost" in _url) or ("127.0.0.1" in _url) or ("@postgres" in _url)

if _is_local:
    engine = create_async_engine(
        _url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=settings.DEBUG,
    )
else:
    engine = create_async_engine(
        _url,
        poolclass=NullPool,           # external pooler owns the connections
        pool_pre_ping=True,
        echo=settings.DEBUG,
        connect_args={
            "ssl": True,
            "statement_cache_size": 0,          # PgBouncer transaction-mode safe
            "prepared_statement_cache_size": 0,
        },
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
