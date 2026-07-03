"""
Pytest bootstrap: set dummy env so app.core.config (which requires DATABASE_URL /
GITHUB_TOKEN at import time) loads without a real .env. The unit tests exercise
pure functions and never open a connection, so placeholder values are fine.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("GITHUB_TOKEN", "test-token")
os.environ.setdefault("ANTHROPIC_API_KEY", "")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
