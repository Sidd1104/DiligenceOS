# Software Requirements Specification (SRS)
## AI Due Diligence Copilot — MVP v1.0

**Purpose of this document:** This is the requirements reference to place inside the repo (`docs/SRS.md`) and point Antigravity at before/while building. It is the single source of truth for scope — if a prompt conflicts with this document, this document wins.

---

## 1. Project Overview

**Project name:** DiligenceOS

**One-line description:** An AI-powered due-diligence platform where a user uploads company documents and receives evidence-backed, citation-linked answers, financial insights, and risk/opportunity analysis — never an un-sourced claim.

**Core principle (non-negotiable):** Every AI-generated conclusion must be traceable to a specific document and page. No answer ships without a citation.

**Target user (MVP):** A solo investment analyst / VC associate evaluating a company from a handful of PDF documents (annual report, pitch deck, financials).

**Business framing:** This is not a demo project. It is designed to be deployable, presentable to real companies as a working product, and defensible in a technical interview as production-grade software.

---

## 2. System Architecture Summary

```
Next.js Frontend  ──HTTPS──►  FastAPI Backend  ──►  PostgreSQL + pgvector
                                    │
                                    ├──► Redis (cache + job queue)
                                    ├──► S3 / object storage (files)
                                    └──► Celery Workers ──► AI Provider (LLM + embeddings)
```

- **Frontend and backend are separate projects** inside one monorepo (`apps/web`, `apps/api`) — not a single Next.js app with API routes. This is the correct production pattern here because document processing, embeddings, and background jobs need Python's AI/data ecosystem and independent scaling from the UI.
- **The database is not created by hand.** Antigravity generates it via SQLAlchemy models + Alembic migrations, driven by the schema in this document. You don't write SQL yourself — you provide the schema (already defined below), and the migration files are generated and version-controlled.
- **API calls do not "happen by themselves."** The frontend calls the FastAPI backend over HTTP; the backend calls the AI provider. Three distinct layers, each with one job — this separation is exactly what makes the system explainable and swappable later (e.g. changing AI providers touches one layer only).

---

## 3. How RAG Fits In (brief)

```
1. Document uploaded → stored in S3 → row created in `documents` table (status: QUEUED)
2. Celery worker picks up job → extracts text page-by-page from the PDF
3. Text is split into semantically coherent chunks (not fixed character counts)
4. Each chunk is embedded (converted to a vector) and stored in `document_chunks`
   alongside its page number and section title
5. User asks a question → the question is embedded the same way
6. Postgres/pgvector finds the chunks whose embeddings are closest to the question
7. Those chunks (with their page/section metadata) are sent to the LLM as context,
   with an explicit instruction: "answer only from this evidence, cite the source"
8. The LLM's answer is returned along with the chunk citations that supported it
9. Frontend renders the answer + clickable citation → opens the source page
```

This is the entire product's core loop. Everything else (risk engine, opportunity engine, reports) is this same loop repeated with a different prompt and a different output shape.

---

## 4. Functional Requirements

### 4.1 Authentication
```
REQ-AUTH-01   User can register with email + password
REQ-AUTH-02   User can log in and receive a secure session (HttpOnly cookie or JWT — not localStorage)
REQ-AUTH-03   User can log out
REQ-AUTH-04   Passwords are hashed (bcrypt/argon2), never stored plain
REQ-AUTH-05   Unauthenticated requests to protected routes are rejected (401)
```

### 4.2 Workspace & Company
```
REQ-WS-01     A workspace is auto-created for each new user
REQ-CO-01     User can create a Company (name, industry, description)
REQ-CO-02     User can view a list of their companies
REQ-CO-03     User can view a single company's overview page
REQ-CO-04     User can only access companies inside their own workspace
```

### 4.3 Document Management
```
REQ-DOC-01    User can upload a PDF to a company (max size: define, e.g. 50MB)
REQ-DOC-02    Upload returns immediately; processing happens asynchronously
REQ-DOC-03    User can see live processing status (QUEUED/PROCESSING/COMPLETED/FAILED)
REQ-DOC-04    User can view a list of documents per company
REQ-DOC-05    Only valid PDF files are accepted (MIME + content validation, not just extension)
REQ-DOC-06    Failed processing shows a clear error state, not a silent failure
```

### 4.4 Document Processing Pipeline
```
REQ-PROC-01   Text is extracted per page, preserving page numbers
REQ-PROC-02   Text is chunked semantically (respecting paragraph/section boundaries)
REQ-PROC-03   Each chunk stores: document_id, page_number, section_title, text, embedding
REQ-PROC-04   Embeddings are generated via the configured AI provider's embedding model
REQ-PROC-05   Processing runs as a Celery background job, never inside the HTTP request
```

### 4.5 AI Research (RAG Q&A)
```
REQ-RAG-01    User can ask a free-text question about a specific company
REQ-RAG-02    System retrieves the most relevant chunks via vector similarity search
REQ-RAG-03    The LLM answer is grounded ONLY in retrieved chunks — no external knowledge
              injected as fact
REQ-RAG-04    Every answer includes at least one citation (document + page)
REQ-RAG-05    If no relevant evidence is found, the system says so explicitly rather
              than guessing
REQ-RAG-06    Question/answer history is saved per company (research_sessions)
```

### 4.6 Citations
```
REQ-CITE-01   Every citation links to a specific document_id + page_number
REQ-CITE-02   Clicking a citation opens the document viewer at that page
REQ-CITE-03   The exact supporting excerpt is visible in the UI, not just a page number
```

### 4.7 Document Viewer
```
REQ-VIEW-01   User can view the original PDF inside the app
REQ-VIEW-02   User can navigate between pages
REQ-VIEW-03   Viewer can jump directly to a page from a citation click
```

---

## 5. Non-Functional Requirements

### 5.1 Performance
```
REQ-PERF-01   Document upload responds in <1s (processing is async)
REQ-PERF-02   AI answers stream to the frontend token-by-token, not returned all at once
REQ-PERF-03   Lists (documents, citations, sessions) are paginated, never loaded in full
REQ-PERF-04   Database queries use indexes on all foreign keys and status columns
              (see schema doc for the full index list)
REQ-PERF-05   No blocking I/O inside FastAPI request handlers — async throughout
```

### 5.2 Security
```
REQ-SEC-01    All AI prompts treat retrieved document content as data, never as
              instructions (explicit system/user/evidence separation — prompt
              injection defense)
REQ-SEC-02    Uploaded files are validated before processing (type, size, basic
              malware/structure checks)
REQ-SEC-03    A user cannot access another user's workspace, companies, or documents
              under any request
REQ-SEC-04    Secrets (API keys, DB credentials) are read from environment variables,
              never hard-coded or committed
REQ-SEC-05    Basic rate limiting on auth and upload endpoints
```

### 5.3 UI / UX ("production, presentable, sellable")
```
REQ-UX-01     Design must not resemble default AI-generated templates (no generic
              cream+terracotta or black+neon-accent SaaS look)
REQ-UX-02     A defined design system is used throughout: fixed color palette (4-6
              named colors), two typefaces (display + body), consistent spacing scale
REQ-UX-03     Subtle depth/dimensionality is used with restraint — layered shadows,
              glassmorphism panels, gentle hover-tilt on cards, a light parallax or
              3D element on the landing page hero only. NOT literal spinning 3D
              models or heavy motion throughout the app.
REQ-UX-04     Every async action has a loading state (skeletons, not blank screens
              or spinners-only)
REQ-UX-05     Every list/empty state has a designed empty state, not a blank page
REQ-UX-06     Layout is fully responsive (desktop-first, since the primary user is
              an analyst at a desk, but must not break on tablet/mobile)
REQ-UX-07     Interface reads as a professional analyst workspace — dense,
              confident, data-forward — not a generic consumer chatbot UI
```

### 5.4 Reliability
```
REQ-REL-01    A failed processing job can be retried without corrupting existing data
REQ-REL-02    The system remains usable if the AI provider is temporarily unavailable
              (clear error state, not a crash)
```

---

## 6. Data Requirements

Full schema (tables, columns, relationships, indexes) is defined in the companion document `01-mvp-requirements-and-schema.md`. Antigravity should be pointed to that file directly rather than having the schema re-typed into a prompt.

Core entities: `users, workspaces, companies, documents, document_chunks, processing_jobs, research_sessions, research_messages, citations`.

---

## 7. External Interfaces

```
AI Provider API      — LLM completions + embeddings (provider chosen in Section 9)
Object Storage (S3)  — file storage for uploaded PDFs
PostgreSQL           — primary data store + pgvector for embeddings
Redis                — cache + Celery job queue
```

---

## 8. Constraints (v1.0 — do not exceed scope)

```
- PDF only (no docx/xlsx/images in MVP)
- Single workspace per user (no multi-tenant orgs/roles yet)
- One AI provider active at a time (abstraction layer exists, only one is wired up)
- No billing, notifications, or admin panel in this version
- No financial/risk/opportunity engines yet — Q&A + citations only
```

---

## 9. Open Decisions (confirmed)

```
[x] Final project name: DiligenceOS
[x] AI provider for MVP: Anthropic (Claude) — used for retrieval-grounded Q&A,
    reasoning, and report generation
[x] Embedding model: Voyage AI — voyage-finance-2 (1024 dimensions), Anthropic's
    recommended embeddings partner, domain-tuned for financial documents. This
    is a second, separate API key from the Anthropic key — Claude does not
    provide embeddings itself.
[x] Object storage for local dev: Real AWS S3 (not MinIO)
```

---

## 10. Acceptance Criteria (MVP is "done" when)

```
[ ] A user can register, log in, create a company, and upload a PDF
[ ] The PDF is processed in the background and shows live status
[ ] A question about the document returns a grounded, cited answer
[ ] Clicking the citation opens the exact source page
[ ] The UI meets Section 5.3 (no generic template look, proper loading/empty states)
[ ] No secrets are committed to the repo
[ ] The system runs fully via `docker compose up`
```
