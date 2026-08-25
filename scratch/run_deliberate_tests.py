import time
import json
import requests
import sqlalchemy
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_URL = "postgresql://postgres:postgres@localhost:5432/diligenceos"
API_URL = "http://localhost:8000/api/v1"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def run_tests():
    print("Waiting 65 seconds to ensure rate limit counters expire completely...")
    time.sleep(65)

    print("\n" + "="*50)
    print("ISSUE 1: DELIBERATE SINGLE LOGIN TEST WITH REGISTERED ACCOUNT")
    print("="*50)
    # Known registered user: auditor_a@example.com / SecurePassword123!
    known_email = "auditor_a@example.com"
    known_password = "SecurePassword123!"

    resp1 = requests.post(
        f"{API_URL}/auth/login",
        json={"email": known_email, "password": known_password},
    )
    print(f"Status Code: {resp1.status_code}")
    print(f"Response Body: {resp1.text}")
    print(f"Cookies Received: {dict(resp1.cookies)}")

    # Query DB directly for verification
    engine = sqlalchemy.create_engine(DB_URL)
    with engine.connect() as conn:
        row = conn.execute(
            sqlalchemy.text("SELECT id, email, password_hash FROM users WHERE email = :e"),
            {"e": known_email}
        ).mappings().first()
        if row:
            is_valid = verify_password(known_password, row["password_hash"])
            print(f"DB Row Found: ID={row['id']}, Email={row['email']}")
            print(f"Bcrypt Hash Verification Result for '{known_password}': {is_valid}")
        else:
            print("DB Row NOT Found!")

    print("\n" + "="*50)
    print("ISSUE 2: DELIBERATE SINGLE REGISTER TEST WITH DEFINITELY UNUSED EMAIL")
    print("="*50)
    timestamp = int(time.time())
    unused_email = f"qa-test-{timestamp}@example.com"
    unused_password = "Password123!"

    print(f"Testing Registration with Unused Email: {unused_email}")
    resp2 = requests.post(
        f"{API_URL}/auth/register",
        json={"email": unused_email, "password": unused_password, "full_name": "QA Tester"},
    )
    print(f"Status Code: {resp2.status_code}")
    print(f"Response Body: {resp2.text}")
    print(f"Cookies Received: {dict(resp2.cookies)}")

    # Query DB to check if row was created
    with engine.connect() as conn:
        row2 = conn.execute(
            sqlalchemy.text("SELECT id, email, created_at FROM users WHERE email = :e"),
            {"e": unused_email}
        ).mappings().first()
        if row2:
            print(f"DB Query Result: Row genuinely exists! ID={row2['id']}, Email={row2['email']}, Created={row2['created_at']}")
        else:
            print("DB Query Result: Row does NOT exist in database!")

if __name__ == "__main__":
    run_tests()
