.PHONY: dev-up dev-down db-schema backend-shell worker-shell migrate trigger-ingest

# ── Local dev (Docker) ──────────────────────────────────────────────────────────
dev-up:
	cd infra && docker compose up -d

dev-down:
	cd infra && docker compose down

dev-logs:
	cd infra && docker compose logs -f api worker

# ── Database ────────────────────────────────────────────────────────────────────
db-schema:
	psql $(DATABASE_URL) -f infra/schema.sql

db-shell:
	psql $(DATABASE_URL)

# ── Backend ─────────────────────────────────────────────────────────────────────
install-backend:
	cd backend && pip install -r requirements.txt

backend-dev:
	cd backend && uvicorn app.main:app --reload --port 8000

worker-dev:
	cd backend && celery -A app.workers.ingestion.celery_app worker --loglevel=debug --concurrency=1

beat-dev:
	cd backend && celery -A app.workers.ingestion.celery_app beat --loglevel=info

# Manually trigger ingestion without waiting for cron
trigger-ingest:
	cd backend && python -c "from app.workers.ingestion import ingest_trending_repos; ingest_trending_repos.delay()"

trigger-scores:
	cd backend && python -c "from app.workers.ingestion import compute_trend_scores; compute_trend_scores.delay()"

# ── Frontend ────────────────────────────────────────────────────────────────────
install-frontend:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# ── Tests ───────────────────────────────────────────────────────────────────────
test-backend:
	cd backend && pytest tests/ -v --cov=app --cov-report=term-missing

test-frontend:
	cd frontend && npm test

# ── Deployment ──────────────────────────────────────────────────────────────────
deploy-check:
	@echo "Pre-deploy checklist:"
	@echo "  [ ] DATABASE_URL set"
	@echo "  [ ] REDIS_URL set"
	@echo "  [ ] GITHUB_TOKEN set"
	@echo "  [ ] ANTHROPIC_API_KEY set"
	@echo "  [ ] Schema migrated"
	@echo "  [ ] /health endpoint returns 200"
