#!/bin/bash
# Wait for postgres to be ready, then run migrations and start the API
set -e

echo "Waiting for postgres..."
while ! python -c "
import psycopg2, os
try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    conn.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; do
    sleep 1
done
echo "Postgres is ready!"

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
