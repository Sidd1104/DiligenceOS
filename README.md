# DiligenceOS

AI-powered due-diligence platform — upload company documents, get evidence-backed answers with citations.

## Architecture

```
apps/web/        → Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
apps/api/        → FastAPI + SQLAlchemy + Alembic + Pydantic
workers/         → Celery worker (shares models with apps/api)
infrastructure/  → Docker Compose configuration
docs/            → Requirements & specification documents
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Ports 3000, 5432, 6379, 8000 available

## Quick Start

1. **Clone the repository** and navigate to the project root.

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your real API keys
   ```

3. **Start all services:**
   ```bash
   docker compose up --build
   ```

   This starts:
   | Service    | URL / Port            | Description                     |
   |------------|-----------------------|---------------------------------|
   | **web**    | http://localhost:3000  | Next.js frontend                |
   | **api**    | http://localhost:8000  | FastAPI backend                 |
   | **postgres** | localhost:5432      | PostgreSQL 16 + pgvector        |
   | **redis**  | localhost:6379        | Redis 7 (cache + job queue)     |
   | **worker** | (background)          | Celery worker                   |

4. **Verify the health check:**
   ```bash
   curl http://localhost:8000/api/v1/health
   # Should return: {"status":"ok"}
   ```

5. **Verify the frontend:**
   Open http://localhost:3000 in your browser. The home page should display the health check status fetched from the API.

## Database

The database schema is managed via Alembic migrations. Migrations run automatically on API startup.

To run migrations manually:
```bash
docker compose exec api alembic upgrade head
```

To create a new migration after model changes:
```bash
docker compose exec api alembic revision --autogenerate -m "description of changes"
```

## Project Status

**Current phase:** Repository foundation (scaffold only)

- [x] Monorepo structure
- [x] Docker Compose (Postgres + pgvector, Redis, API, Worker, Frontend)
- [x] FastAPI health-check endpoint
- [x] SQLAlchemy models + initial Alembic migration (full MVP schema)
- [x] Next.js + Tailwind + shadcn/ui scaffold
- [ ] Authentication
- [ ] Document upload & processing
- [ ] RAG-based AI Research
- [ ] Citation viewer

## Documentation

- [MVP Requirements & Schema](docs/01-mvp-requirements-and-schema.md)
- [Build Kit & Tech Prompts](docs/02-build-kit-tech-prompts-checklist.md)
- [SRS — Requirements Specification](docs/03-SRS-requirements-specification.md)
