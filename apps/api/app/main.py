"""
DiligenceOS API — FastAPI application entry point.

Scaffold only: single health-check endpoint at GET /api/v1/health.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DiligenceOS API",
    description="AI-powered due-diligence platform API",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────
# Allow the Next.js frontend to call the API in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://web:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────────────────────
@app.get("/api/v1/health")
async def health_check():
    """Returns {"status": "ok"} when the API is running."""
    return {"status": "ok"}
