# AI Due Diligence Copilot — Build Kit
### Tech/UX techniques · Prerequisites checklist · First prompts

---

# PART 1 — Techniques for a genuinely distinctive, fast UI

"Cool UI/UX" and "better performance" are two different jobs. Don't hand both to one tool and hope — split them like this:

## 1.1 Making it *look* unique (not templated)

Since Antigravity is your main builder, don't route UI through a separate Figma-first pass — that's the overhead we already agreed to cut. Instead:

- Give Antigravity a **design brief**, not just a feature list — 4–6 named hex colors, 2 typefaces (a characterful display face + a restrained body face), and one "signature element" specific to due-diligence/finance (e.g. a citation-hover effect that highlights the exact source line, not a generic modal).
- Explicitly tell it to **avoid the default AI-generated look**: cream background + terracotta accent, or near-black + neon accent, or dense hairline-rule "broadsheet" layouts. These are what every AI-built SaaS looks like right now — naming them and banning them is the single highest-leverage sentence you can put in your prompt.
- Anchor the design in the *subject matter*: this is a serious financial tool. Borrow visual language from real diligence/analyst tooling (dense data, confident typography, restrained color used only for signal — risk = one color, evidence = another) rather than generic "startup SaaS" gradients.
- Pick **one** moment to be memorable (e.g. the citation → source-page jump, or the live processing-status pipeline animation) and keep everything else quiet and disciplined. Trying to make every screen "cool" is what makes AI-built UIs look busy and generic.

## 1.2 Making it *fast*

Performance is a pipeline of small decisions, not one setting:

**Frontend**
```
Streaming AI responses (don't wait for full generation to render)
Skeleton loading states (never a blank screen during processing/retrieval)
Virtualized lists for document chunks/citations (TanStack Table + virtualization)
Route-level code splitting (Next.js App Router does this by default — don't break it)
Optimistic UI for non-destructive actions (e.g. sending a question)
```

**Backend / RAG**
```
Async FastAPI endpoints throughout (no blocking I/O in request handlers)
Background jobs for anything >1–2 seconds (Celery — already in your stack)
Connection pooling for Postgres
Batch embedding calls instead of one-chunk-at-a-time
Cache repeated queries/embeddings in Redis
Parallel retrieval where possible (once you add hybrid search)
```

**The one habit that matters most:** never let an HTTP request wait on an LLM call for document processing. Upload returns instantly; everything else happens in a job and the UI polls/streams status. This is already in your architecture (blueprint §11) — the discipline is just not breaking it under deadline pressure.

## 1.3 What makes this project *unique* as a portfolio piece

Not the tech stack (RAG + citations is now common). Uniqueness comes from:
- **The citation system actually being verifiable** (click → real source page, not just a footnote) — most portfolio RAG projects fake this or skip it.
- **Confidence framing done honestly** (blueprint §20) — showing *why* the system is confident, not just a made-up percentage. This is a talking point interviewers respond well to because it shows you understand LLM limitations.
- **The prompt-injection guard** (blueprint §37) — most people building "chat with PDF" apps never think about a malicious document trying to hijack the system prompt. Implementing and being able to explain this is a differentiator in interviews.

Lead with these three in your README and demo — they're more interesting than "I used Next.js and FastAPI."

---

# PART 2 — What you need to have/provide before prompting

## 2.1 Accounts to create (do this first, before any prompt)

```
[ ] GitHub account + new repo created (empty, private is fine)
[ ] Antigravity account/access
[ ] AI provider account(s) — pick ONE to start, add others later via the abstraction layer:
      [ ] OpenAI account + API key   (or)
      [ ] Anthropic account + API key   (or)
      [ ] Google AI Studio (Gemini) + API key
[ ] AWS account (for S3) — or use local/MinIO for dev to avoid cost while building
[ ] A Postgres instance — local via Docker is fine, no cloud account needed yet
[ ] A Redis instance — same, local via Docker is fine
[ ] (Optional, later) Vercel account — if deploying frontend separately
[ ] (Optional, later) Render/Railway/Fly.io account — for backend + worker deployment
```

## 2.2 Secrets/config you'll need ready

```
[ ] AI_PROVIDER_API_KEY           (OpenAI/Anthropic/Gemini — whichever you pick)
[ ] DATABASE_URL                  (Postgres connection string)
[ ] REDIS_URL
[ ] S3_BUCKET_NAME / S3_ACCESS_KEY / S3_SECRET_KEY   (or MinIO equivalents for local dev)
[ ] JWT_SECRET (or session secret)
[ ] EMBEDDING_MODEL name (decide once — changing later means re-embedding everything)
```

**Do not paste real API keys into chat with any AI tool, including this one.** Store them in a local `.env` file (gitignored) and reference them by name when prompting — e.g. "read the key from `OPENAI_API_KEY` env var," never the key itself.

## 2.3 Decisions to lock before the first prompt

```
[ ] Which AI provider for MVP (pick one — don't build the abstraction layer's 4 providers on day one, just design for it)
[ ] Which embedding model (dimension size affects your pgvector column — already set to 1536 in the schema, matching OpenAI's text-embedding-3-small; change if you pick a different model)
[ ] Local dev storage: real S3 vs MinIO vs local filesystem stub
[ ] Repo structure: monorepo (apps/web, apps/api, workers/) as blueprint §43 — confirm you're keeping this
```

---

# PART 3 — What to actually do, in order

```
1. Create GitHub repo (empty)
2. Create accounts + get API keys (Part 2.1–2.2)
3. Create a local .env file with the values from 2.2 (not committed)
4. Give Antigravity the SCAFFOLD PROMPT below — foundation only, no features
5. Verify the scaffold runs locally (docker compose up, frontend loads, backend health check responds)
6. Commit the scaffold to GitHub
7. Give Antigravity the AUTH PROMPT (next message, after scaffold is verified)
8. Continue one vertical-slice feature at a time (Company → Upload → Processing → RAG → Research UI)
9. After each feature: Playwright test + a Claude code-review pass, THEN move to the next
10. Only after the full slice works: circle back for UI polish using Part 1 techniques
```

Don't skip step 5 (verify before committing) and don't skip step 9 (review before moving on) — those two habits are what keep an AI-built codebase from drifting into something you can't explain in an interview.

---

# PART 4 — The first prompt to give Antigravity

Copy this as your first message to Antigravity. It deliberately does **not** ask for features yet.

```
Set up the repository foundation for a project called "AI Due Diligence
Copilot." This is a scaffold-only task — do not implement any product
features yet.

Create a monorepo with this structure:
  apps/web        — Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
  apps/api        — FastAPI (Python) + Pydantic + SQLAlchemy + Alembic
  workers/        — Celery worker, sharing models with apps/api
  infrastructure/ — Docker Compose config
  docs/           — empty for now

Requirements:
- docker-compose.yml running: postgres (with pgvector extension enabled),
  redis, the FastAPI app, and a Celery worker
- apps/api: a single working health-check endpoint (GET /api/v1/health)
  returning {"status": "ok"}
- apps/web: a minimal home page that fetches and displays the health-check
  response, styled with Tailwind + shadcn/ui base setup (no custom design yet)
- Alembic configured and able to run an initial (empty) migration
- .env.example files for both apps/web and apps/api listing every required
  env var (DATABASE_URL, REDIS_URL, AI provider key placeholder, S3 config
  placeholder, JWT secret placeholder) — no real values
- .gitignore covering node_modules, .env, __pycache__, etc.
- A root README with instructions to run `docker compose up` and reach
  both the frontend and the health-check endpoint

Do not add authentication, document upload, RAG, or any business logic
yet — this step is infrastructure only. Stop after the health check works
end-to-end and ask me to verify before continuing.
```

After Antigravity finishes this and you've verified it locally, come back and I'll write the next prompt (Authentication) — and at that point we can also do a quick design-brief pass for Part 1's UI direction before the first real screen gets built.
