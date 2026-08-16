# AI Due Diligence Copilot — MVP Requirements & Database Schema

**Document type:** Phase 0 (Product Definition) + Phase 1.5 (Data Model)
**Status:** Draft for approval — freeze before writing any code
**Depends on:** `AI Due Diligence Copilot — Production-Ready System Design & Development Blueprint v1.0`

---

# PART 1 — MVP REQUIREMENTS

## 1.1 Who is the user (MVP)

Pick **one** primary persona to design for first. Recommended default, since it's the narrowest and fastest to validate:

> **Solo investment analyst / independent VC associate** who receives a handful of PDF documents (annual report, pitch deck, financial statement) for a company they're evaluating, and wants fast, evidence-backed answers instead of reading everything manually.

Everything else (org teams, roles, billing, admin) is deferred — see 1.4.

## 1.2 Problem statement

Analysts spend hours manually reading long, unstructured company documents to answer basic diligence questions ("What's the revenue trend?", "What are the biggest risks?"), and it's hard to trust AI summaries without being able to verify the source.

## 1.3 MVP scope — IN

```
Authentication (single user, email/password)
Single Workspace per user (no org/team model yet)
Company creation (manual entry: name + basic metadata)
Document upload (PDF only)
Background document processing (extract → chunk → embed)
Processing status visible to user (queued/processing/completed/failed)
RAG-based Q&A ("AI Research") against a company's documents
Every answer includes citations (document + page/section)
Click citation → view source location in the document
Basic document viewer (page navigation)
```

## 1.4 MVP scope — OUT (explicitly deferred)

```
Organizations / multi-tenancy / roles (Owner/Admin/Member/Viewer)
Financial Intelligence engine (metric extraction, ratios)
Risk Intelligence engine
Opportunity Intelligence engine
Cross-document contradiction detection
Full Due-Diligence Agent (the "one click" flagship workflow)
Report generation
Confidence scoring framework
Hybrid retrieval (keyword + vector) — start with vector-only
Reranking — add once retrieval quality is validated
Billing / subscriptions
Notifications
Admin panel
Mobile app
Non-PDF document types (docx, xlsx, images) — PDF only for MVP
```

Everything in 1.4 is real, planned, and in the blueprint — it's just sequenced for **after** the vertical slice in 1.3 is working end-to-end.

## 1.5 Core user journey (the one that must work)

```
1. User logs in
2. User creates a Company ("Acme Corp")
3. User uploads a PDF (e.g. Annual Report)
4. System processes the document in the background
   (extract text → chunk → embed → store)
5. User sees "Document Ready"
6. User asks: "What are the company's biggest risks?"
7. System retrieves relevant chunks, sends to LLM
8. System returns an answer with citations
   (e.g. "Annual Report, Page 87")
9. User clicks the citation
10. System shows the source page/section that supports the answer
```

If this loop works reliably, the foundation is proven and every later phase (financial/risk/opportunity engines, full DD agent, reports) is additive on top of it — not a redesign.

## 1.6 MVP definition of done

- [ ] A new user can register and log in
- [ ] A user can create a company and upload a PDF
- [ ] Upload returns immediately; processing happens in the background (Celery)
- [ ] Processing status is visible and updates without manual refresh
- [ ] A processed document is chunked, embedded, and stored in pgvector
- [ ] A user can ask a free-text question about a company's documents
- [ ] The answer is grounded only in retrieved chunks (no un-cited claims)
- [ ] Every answer shows at least one citation (document name + page)
- [ ] Clicking a citation opens the source page in a document viewer
- [ ] A malicious/irrelevant PDF doesn't crash the pipeline (basic validation + error handling)
- [ ] Retrieved document content is treated as data, never as instructions (basic prompt-injection guard, per blueprint §37)

---

# PART 2 — DATABASE SCHEMA (MVP)

Scoped to what part 1 needs. Additional tables from the full blueprint (`Risk`, `Opportunity`, `Report`, `AuditLog`, etc.) are listed at the end as **future tables**, not built yet.

## 2.1 Entity list (MVP)

```
User
Workspace
Company
Document
DocumentChunk
ResearchSession
ResearchMessage
Citation
ProcessingJob
```

## 2.2 Relationships (MVP)

```
User (1) ── (1) Workspace          [MVP: one workspace per user]
Workspace (1) ── (N) Company
Company (1) ── (N) Document
Document (1) ── (N) DocumentChunk
Document (1) ── (N) ProcessingJob
Company (1) ── (N) ResearchSession
ResearchSession (1) ── (N) ResearchMessage
ResearchMessage (1) ── (N) Citation
Citation (N) ── (1) DocumentChunk
```

## 2.3 Table definitions

### `users`
```
id                  UUID PK
email               VARCHAR UNIQUE NOT NULL
password_hash       VARCHAR NOT NULL
full_name           VARCHAR
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### `workspaces`
```
id                  UUID PK
user_id             UUID FK -> users.id
name                VARCHAR NOT NULL
created_at          TIMESTAMPTZ
```
*(MVP: 1 workspace auto-created per user. Table exists now so multi-tenancy in blueprint §34 doesn't require a schema rewrite later — just a join-table change.)*

### `companies`
```
id                  UUID PK
workspace_id        UUID FK -> workspaces.id
name                VARCHAR NOT NULL
industry            VARCHAR
description         TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### `documents`
```
id                  UUID PK
company_id          UUID FK -> companies.id
filename            VARCHAR NOT NULL
storage_key         VARCHAR NOT NULL      -- S3 object key
document_type       VARCHAR               -- e.g. "annual_report", "pitch_deck"
status              VARCHAR NOT NULL      -- QUEUED | PROCESSING | COMPLETED | FAILED
page_count          INTEGER
file_size_bytes     BIGINT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### `document_chunks`
```
id                  UUID PK
document_id         UUID FK -> documents.id
company_id          UUID FK -> companies.id     -- denormalized for fast filtering
chunk_index         INTEGER NOT NULL
page_number         INTEGER
section_title       VARCHAR
text                TEXT NOT NULL
embedding           VECTOR(1024)                -- pgvector; Voyage AI voyage-finance-2 (1024 dims)
token_count         INTEGER
created_at          TIMESTAMPTZ
```

### `processing_jobs`
```
id                  UUID PK
document_id         UUID FK -> documents.id
job_type            VARCHAR NOT NULL     -- EXTRACTION | CHUNKING | EMBEDDING
status              VARCHAR NOT NULL     -- QUEUED | PROCESSING | COMPLETED | FAILED
error_message       TEXT
started_at          TIMESTAMPTZ
completed_at        TIMESTAMPTZ
created_at          TIMESTAMPTZ
```

### `research_sessions`
```
id                  UUID PK
company_id          UUID FK -> companies.id
user_id             UUID FK -> users.id
title               VARCHAR
created_at          TIMESTAMPTZ
```

### `research_messages`
```
id                  UUID PK
session_id          UUID FK -> research_sessions.id
role                VARCHAR NOT NULL     -- "user" | "assistant"
content             TEXT NOT NULL
created_at          TIMESTAMPTZ
```

### `citations`
```
id                  UUID PK
message_id          UUID FK -> research_messages.id
chunk_id            UUID FK -> document_chunks.id
document_id         UUID FK -> documents.id      -- denormalized for direct lookup
page_number         INTEGER
excerpt             TEXT                          -- short snippet shown in UI
created_at          TIMESTAMPTZ
```

## 2.4 Indexes to create from day one

```
documents(company_id)
documents(status)
document_chunks(document_id)
document_chunks(company_id)
document_chunks USING ivfflat (embedding vector_cosine_ops)   -- pgvector ANN index
research_sessions(company_id)
research_messages(session_id)
citations(message_id)
processing_jobs(document_id)
processing_jobs(status)
```

## 2.5 Future tables (not built in MVP — added when their phase starts)

```
organizations, memberships          -- Phase: multi-tenancy (blueprint §34)
financial_metrics                   -- Phase 10: Financial Intelligence
risks                               -- Phase 11: Risk Engine
opportunities                       -- Phase 12: Opportunity Engine
contradictions                      -- Phase 13: Cross-Document Analysis
due_diligence_analyses              -- Phase 14: Full DD Agent
reports                             -- Phase 15: Reports
audit_logs                          -- Phase 17: Security
usage_events                        -- Analytics
```

Keeping these out of the MVP schema on purpose — adding them later is a migration, not a redesign, because the core chain (`Company → Document → Chunk → Citation`) they all hang off of is already correct.

---

# PART 3 — NEXT STEPS

Once this document is reviewed and approved:

1. **API contracts** for the MVP endpoints only (auth, companies, documents, research/query) — narrower than blueprint §32, matching Part 1 scope.
2. **Rough UI wireframes** for the 6 MVP screens: Login, Dashboard, Company Overview, Document Upload/List, AI Research, Document Viewer.
3. **Repository foundation prompt** for Antigravity/Claude Code — scaffold only (Next.js + FastAPI + Postgres + Redis + Docker Compose), no feature code yet.
4. Build the vertical slice from §1.5, in order: Auth → Company → Upload → Processing → RAG → Research UI.

Do not proceed to step 3 (coding tools) until 1 and 2 above are frozen.
