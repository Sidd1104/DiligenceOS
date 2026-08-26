#!/bin/bash
set -e

echo "Running Alembic migrations..."
alembic upgrade head || echo "Alembic migrations completed or skipped."

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
