# DiligenceOS — Institutional Due Diligence Platform

**DiligenceOS** is an AI-powered financial due diligence and institutional analysis platform. It enables investment analysts to upload complex corporate filings (annual reports, 10-K filings, pitch decks, financial statements), execute vector-grounded RAG (Retrieval-Augmented Generation) research queries, and receive real-time, token-streamed answers linked to exact PDF page citations.

---

## Key Features

- 🏢 **Multi-Tenant Company Workspaces**: Hard tenant boundary isolation for institutional client data and documents.
- 📄 **Multi-Stage Document Extraction Pipeline**:
  - Automated PDF validation & malware check.
  - Page-level text extraction with PyMuPDF.
  - Semantic chunking & vector embedding generation (pgvector cosine similarity).
  - Background async execution with Celery & Redis.
- ⚡ **AI Research Assistant with Token Streaming**:
  - SSE-based real-time token streaming (`claude-sonnet-4-6`).
  - **Radar Retrieval Animation**: Live status during chunk search (*"Searching N chunks across M documents..."*).
  - **Terminal-Style Streaming UX**: Blinking Sapphire Blue cursor (`▍`), soft word fade-in, smart auto-scroll pause/resume, and an amber **Stop Generating** control.
  - **Interrupted Stream Recovery**: Inline amber interruption chip (`⚠ Response interrupted`) with a **Retry** action button.
- 🎯 **Grounding & Grounded Citations**:
  - Strict evidence-only system prompts preventing AI hallucinations (REQ-SEC-01).
  - Automatic citation extraction with staggered entrance animations.
  - Monospace telemetry metrics (*"1.4s · 6 sources reviewed"*).
- 🔍 **Distinct "No Relevant Evidence" Handling (REQ-RAG-05)**:
  - Specialized amber-tinted evidence card with `SearchX` icon to clearly highlight evidence gaps.
- 📖 **Analyst PDF Document Viewer**:
  - Page-accurate PDF document viewer with direct deep-link page jumping from citation pills.

---

## Tech Stack

### Frontend (`apps/web/`)
- **Framework**: Next.js (App Router, React, TypeScript)
- **Styling**: Tailwind CSS, Vanilla CSS animations, Design Token System (`DESIGN.md`)
- **Components**: Lucide Icons, Radix UI primitives / shadcn

### Backend API (`apps/api/`)
- **Framework**: FastAPI (Python 3.12, Uvicorn)
- **Database & Vectors**: PostgreSQL 16 + `pgvector`
- **ORM & Migrations**: SQLAlchemy + Alembic
- **AI Integration**: Anthropic API (`claude-sonnet-4-6`) & Voyaging embeddings fallback

### Workers & Infrastructure (`workers/` & `infrastructure/`)
- **Task Queue**: Celery + Redis 7
- **Orchestration**: Docker Compose

---

## Monorepo Architecture

```
DiligenceOS/
├── apps/
│   ├── api/          → FastAPI backend service, schemas, RAG service & routes
│   └── web/          → Next.js App Router frontend, streaming UI & citation viewer
├── workers/          → Celery background task processing (PDF extraction & vector indexing)
├── infrastructure/   → Docker Compose configuration & environment templates
├── docs/             → System requirements (SRS), MVP specifications & API documentation
├── DESIGN.md         → Institutional design system tokens (colors, typography, spacing)
└── docker-compose.yml → Container orchestration
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Available local ports: `3000`, `5432`, `6379`, `8000`

---

## Quick Start

### 1. Clone & Configure Environment

```bash
git clone <repository-url>
cd DiligenceOS

# Create environment file from template
cp .env.example .env
```

Set your Anthropic API Key in `.env` (optional for local mock/dev mode):
```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 2. Start Services via Docker Compose

```bash
docker compose down -v
docker compose up --build
```

### 3. Service Endpoints

| Service | Host URL | Description |
|---|---|---|
| **Web App** | [http://localhost:3000](http://localhost:3000) | Next.js Frontend |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI interactive documentation |
| **API Health Check** | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) | Backend health check endpoint |
| **PostgreSQL** | `localhost:5432` | PostgreSQL 16 with pgvector |
| **Redis** | `localhost:6379` | Celery task queue & caching |

---

## Running Tests & Validation

### Python API Unit & Integration Tests

Run the full pytest suite inside the API virtual environment:
```bash
cd apps/api
.venv\Scripts\python.exe -m pytest tests/ -v
```

*Includes 13 test suites covering authentication, tenant workspace isolation, document processing pipeline, prompt injection defense, and RAG streaming.*

### Frontend TypeScript Check

Validate frontend type safety:
```bash
cd apps/web
npx tsc --noEmit
```

---

## Database Migrations

Alembic migrations run automatically on API container startup.

To trigger manual upgrade:
```bash
docker compose exec api alembic upgrade head
```

To generate a new migration:
```bash
docker compose exec api alembic revision --autogenerate -m "descriptive message"
```

---

## Project Milestones & Status

- [x] Monorepo scaffold & Docker orchestration
- [x] Workspace tenant isolation & JWT Authentication
- [x] PDF Extraction Pipeline (PyMuPDF, Chunking, pgvector embedding sync)
- [x] Async background worker pipeline (Celery + Redis)
- [x] AI Research RAG endpoint with SSE token streaming
- [x] Grounded Citations mapping & PDF Document Viewer with page-jumping
- [x] Refined Streaming UX (Radar retrieval, blinking cursor, word fade-in, smart auto-scroll, Stop/Retry actions, staggered citations, & no-evidence card styling)
