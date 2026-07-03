from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "GitHub Trending Intelligence"
    DEBUG: bool = False
    API_VERSION: str = "v1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:2326",
        "http://localhost:3000",
        "https://yourapp.vercel.app",
    ]

    # Database
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/db

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub
    GITHUB_TOKEN: str
    GITHUB_API_BASE: str = "https://api.github.com"
    GITHUB_GRAPHQL_URL: str = "https://api.github.com/graphql"

    # Web Push (VAPID) — free browser push. Generate with `python scripts/generate_vapid.py`.
    # Leave blank to disable push; the API and workers degrade gracefully.
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@example.com"

    # AI insight generation — pluggable provider.
    AI_PROVIDER: str = "ollama"  # "ollama" (free, local) | "anthropic" (paid) | "off"
    AI_MAX_TOKENS: int = 1024

    # Ollama (local / self-hosted, free). host.docker.internal reaches the host
    # from inside a container; change to your Ollama URL when you host it.
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Anthropic Claude (optional, paid). Leave key blank unless AI_PROVIDER=anthropic.
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    AI_DAILY_BUDGET_USD: float = 5.0  # rough guard, tracked manually

    # Cache TTLs (seconds)
    CACHE_TTL_DASHBOARD: int = 300        # 5 min
    CACHE_TTL_REPO_DETAIL: int = 600      # 10 min
    CACHE_TTL_SEARCH: int = 30            # 30 sec
    CACHE_TTL_INSIGHTS: int = 86400       # 24 hrs
    CACHE_TTL_TRENDS: int = 3600          # 1 hr

    # Ingestion
    INGEST_BATCH_SIZE: int = 100          # repos per cron run to deep-fetch
    TOP_REPOS_FOR_INSIGHTS: int = 50      # top N repos to generate AI insights for


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
