import time
import uuid
import datetime
import json
import requests
import sqlalchemy
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_URL = "postgresql://postgres:postgres@localhost:5432/diligenceos"
API_URL = "http://localhost:8000/api/v1"

def prepare_known_user():
    print("Preparing known user in database...")
    email = "known_valid_user@example.com"
    password = "CorrectPassword123!"
    hashed_pw = pwd_context.hash(password)
    user_id = str(uuid.uuid4())
    ws_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc)
    
    engine = sqlalchemy.create_engine(DB_URL)
    with engine.connect() as conn:
        # Delete if exists
        conn.execute(sqlalchemy.text("DELETE FROM users WHERE email = :e"), {"e": email})
        conn.commit()
        
        # Insert user
        conn.execute(
            sqlalchemy.text("INSERT INTO users (id, email, password_hash, full_name, created_at) VALUES (:id, :e, :h, :fn, :now)"),
            {"id": user_id, "e": email, "h": hashed_pw, "fn": "Known User", "now": now}
        )
        
        # Insert workspace
        conn.execute(
            sqlalchemy.text("INSERT INTO workspaces (id, user_id, name, created_at) VALUES (:w_id, :u_id, :n, :now)"),
            {"w_id": ws_id, "u_id": user_id, "n": "Known Workspace", "now": now}
        )
        conn.commit()
    print(f"Prepared user {email} with ID {user_id}")
    return email, password

def run_exact_proof():
    known_email, known_password = prepare_known_user()
    
    print("\nWaiting 65 seconds to guarantee all rate-limiter windows reset...")
    time.sleep(65)

    print("\n" + "="*60)
    print("ISSUE 1: REAL RAW RESPONSE FOR SINGLE LOGIN WITH KNOWN-CORRECT CREDENTIALS")
    print("="*60)
    
    resp1 = requests.post(
        f"{API_URL}/auth/login",
        json={"email": known_email, "password": known_password},
    )
    print(f"Status Code: {resp1.status_code}")
    print(f"Raw Body: {resp1.text}")
    print(f"Headers: {dict(resp1.headers)}")

    # Verify password against DB hash directly
    engine = sqlalchemy.create_engine(DB_URL)
    with engine.connect() as conn:
        row = conn.execute(
            sqlalchemy.text("SELECT id, email, password_hash FROM users WHERE email = :e"),
            {"e": known_email}
        ).mappings().first()
        if row:
            is_valid = pwd_context.verify(known_password, row["password_hash"])
            print(f"DB Row: ID={row['id']}, Email={row['email']}")
            print(f"Bcrypt verify_password('{known_password}', stored_hash): {is_valid}")

    print("\n" + "="*60)
    print("ISSUE 2: REAL RAW RESPONSE FOR SINGLE REGISTER WITH UNUSED EMAIL")
    print("="*60)
    
    timestamp = int(time.time())
    unused_email = f"qa-never-used-{timestamp}@example.com"
    unused_password = "SecurePassword123!"

    print(f"Attempting single registration for: {unused_email}")
    resp2 = requests.post(
        f"{API_URL}/auth/register",
        json={"email": unused_email, "password": unused_password, "full_name": "Fresh QA User"},
    )
    print(f"Status Code: {resp2.status_code}")
    print(f"Raw Body: {resp2.text}")

    # Query DB to confirm row creation
    with engine.connect() as conn:
        row2 = conn.execute(
            sqlalchemy.text("SELECT id, email, created_at FROM users WHERE email = :e"),
            {"e": unused_email}
        ).mappings().first()
        if row2:
            print(f"DB Query Result: Row genuinely created! ID={row2['id']}, Email={row2['email']}")
        else:
            print("DB Query Result: Row DOES NOT exist!")

if __name__ == "__main__":
    run_exact_proof()
