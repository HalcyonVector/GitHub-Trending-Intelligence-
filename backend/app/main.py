from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1 import analytics, dashboard, push, repositories, search, trends
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown — close GitHub HTTP client
    from app.services.github_service import github_service
    await github_service.close()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routes
PREFIX = f"/api/{settings.API_VERSION}"
app.include_router(dashboard.router, prefix=PREFIX, tags=["Dashboard"])
app.include_router(repositories.router, prefix=f"{PREFIX}/repositories", tags=["Repositories"])
app.include_router(trends.router, prefix=f"{PREFIX}/trends", tags=["Trends"])
app.include_router(search.router, prefix=f"{PREFIX}/search", tags=["Search"])
app.include_router(push.router, prefix=f"{PREFIX}/push", tags=["Push"])
app.include_router(analytics.router, prefix=f"{PREFIX}/analytics", tags=["Analytics"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
