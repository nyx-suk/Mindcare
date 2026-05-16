import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
import jwt
from sqlalchemy.orm import sessionmaker
from backend.models import Base, User, Assessment
from backend.main import engine, app, SECRET_KEY, ALGORITHM
import os

# Test data
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpass123"


@pytest.fixture(scope="session")
def db_session():
    """Fixture to provide a database session for cleanup."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest_asyncio.fixture(scope="module", autouse=True)
async def cleanup_test_user():
    """Cleanup fixture to delete the test user before and after all tests."""
    import psycopg2

    def perform_cleanup():
        conn = psycopg2.connect(
            host="localhost",
            dbname="mindcare_db",
            user="mindcare_user",
            password="mindcare_pass",
            port=5432
        )
        try:
            with conn.cursor() as cur:
                # Delete related records first to avoid foreign key constraints
                cur.execute("DELETE FROM assessments WHERE user_id IN (SELECT id FROM users WHERE email = %s)", (TEST_EMAIL,))
                cur.execute("DELETE FROM progress WHERE user_id IN (SELECT id FROM users WHERE email = %s)", (TEST_EMAIL,))
                # Finally delete the user
                cur.execute("DELETE FROM users WHERE email = %s", (TEST_EMAIL,))
            conn.commit()
        finally:
            conn.close()

    # Pre-test cleanup: ensuring the suite is idempotent
    perform_cleanup()

    yield

    # Post-test cleanup
    perform_cleanup()


@pytest.mark.asyncio
async def test_register():
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "userId" in data
        # Verify JWT
        token = data["token"]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == str(data["userId"])


@pytest.mark.asyncio
async def test_login():
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "userId" in data
        # Verify JWT
        token = data["token"]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == str(data["userId"])


@pytest.mark.asyncio
async def test_get_questions():
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # First login to get token
        login_response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        token = login_response.json()["token"]

        response = await client.get("/assessments/questions", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        questions = response.json()
        assert len(questions) == 16

        depression_count = sum(1 for q in questions if q["category"] == "depression")
        anxiety_count = sum(1 for q in questions if q["category"] == "anxiety")
        assert depression_count == 9
        assert anxiety_count == 7

        for q in questions:
            assert "options" in q
            assert len(q["options"]) == 4
            for option in q["options"]:
                assert "label" in option
                assert "value" in option


@pytest.mark.asyncio
async def test_submit_assessment():
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # First login to get token
        login_response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        token = login_response.json()["token"]

        response = await client.post("/assessments", json={"anxiety_score": 18, "depression_score": 22}, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "assessment_id" in data