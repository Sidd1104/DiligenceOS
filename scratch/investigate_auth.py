import time
import requests
import sqlalchemy
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_URL = "postgresql://postgres:postgres@localhost:5432/diligenceos"
API_URL = "http://localhost:8000/api/v1"

def inspect_db():
    print("=== DATABASE INSPECTION ===")
    engine = sqlalchemy.create_engine(DB_URL)
    with engine.connect() as conn:
        users = conn.execute(sqlalchemy.text("SELECT id, email, password_hash, created_at FROM users ORDER BY created_at DESC LIMIT 10")).mappings().all()
        print(f"Total Users Found: {len(users)}")
        for u in users:
            print(f"- Email: {u['email']} | ID: {u['id']} | Created: {u['created_at']}")
    return users

if __name__ == "__main__":
    inspect_db()
