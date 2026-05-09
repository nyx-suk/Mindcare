import pytest
import pytest_asyncio
import httpx
import jwt
from sqlalchemy.orm import sessionmaker
from backend.models import Base, User, Assessment
from backend.main import engine
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
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "userId" in data
        # Verify JWT
        token = data["token"]
        payload = jwt.decode(token, "your_super_secure_32_byte_secret_key_here_change_in_production_12345678901234567890123456789012", algorithms=["HS256"])
        assert payload["sub"] == str(data["userId"])

@pytest.mark.asyncio
async def test_login():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "userId" in data
        # Verify JWT
        token = data["token"]
        payload = jwt.decode(token, "your_super_secure_32_byte_secret_key_here_change_in_production_12345678901234567890123456789012", algorithms=["HS256"])
        assert payload["sub"] == str(data["userId"])

@pytest.mark.asyncio
async def test_get_questions():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
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
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # First login to get token
        login_response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        token = login_response.json()["token"]

        response = await client.post("/assessments", json={"anxiety_score": 18, "depression_score": 22}, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "assessment_id" in data

# Note: Scoring logic test is skipped as it requires importing TypeScript from src/services/scoring.ts
# This would need Jest for JavaScript/TypeScript testing instead of pytest.
# @pytest.mark.parametrize("answers,expected", [
#     ([{"questionId": "phq1", "value": 3}, ...], {"depression": 3, "anxiety": 0}),
#     ...
# ])
# def test_compute_scores(answers, expected):
#     from src.services.scoring import computeScores
#     questions = [...]  # Mock questions
#     result = computeScores(answers, questions)
#     assert result == expected

# @pytest.mark.parametrize("score,category,expected", [
#     (5, "depression", "Mild"),
#     ...
# ])
# def test_get_severity_label(score, category, expected):
#     from src.services.scoring import getSeverityLabel
#     result = getSeverityLabel(score, category)
#     assert result == expected