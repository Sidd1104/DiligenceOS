"""
DiligenceOS API — FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth

app = FastAPI(
    title="DiligenceOS API",
    description="AI-powered due-diligence platform API",
    version="0.1.0",
)

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


# ── Health Check ──────────────────────────────────────────────
@app.get("/api/v1/health")
async def health_check():
    """Returns {"status": "ok"} when the API is running."""
    return {"status": "ok"}
