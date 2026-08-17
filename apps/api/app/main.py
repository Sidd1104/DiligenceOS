"""
DiligenceOS API — FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from slowapi.errors import RateLimitExceeded

from app.api.v1 import auth, companies, documents, research
from app.core.rate_limit import custom_rate_limit_exceeded_handler, limiter

app = FastAPI(
    title="DiligenceOS API",
    description="AI-powered due-diligence platform API",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────
# Allow the Next.js frontend to call the API with credentials in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://web:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(companies.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(research.router, prefix="/api/v1")


# ── Health Check ──────────────────────────────────────────────
@app.get("/api/v1/health")
async def health_check():
    """Returns {"status": "ok"} when the API is running."""
    return {"status": "ok"}
