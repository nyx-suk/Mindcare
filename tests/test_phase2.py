import pytest
import pytest_asyncio
import httpx
from datetime import datetime, timezone
from backend.models import Assessment, Progress, User
from tests.test_phase1 import db_session, TEST_EMAIL, TEST_PASSWORD

@pytest_asyncio.fixture(scope="module")
async def auth_token():
    """Fixture to obtain a valid JWT token for the test user."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Assuming the user was already created in test_phase1.py, we just log in
        # If running independently, you might need a register step here
        response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        if response.status_code != 200:
            # Fallback: create the user if tests run out of order
            await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
            response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        
        data = response.json()
        return data["token"]

@pytest.fixture(autouse=True)
def cleanup_records(db_session):
    """Fixture to clean up Progress (mood) and Assessment records after each test."""
    yield
    user = db_session.query(User).filter(User.email == TEST_EMAIL).first()
    if user:
        db_session.query(Progress).filter(Progress.user_id == user.id).delete()
        db_session.query(Assessment).filter(Assessment.user_id == user.id).delete()
        db_session.commit()

@pytest.mark.asyncio
async def test_post_mood_valid(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"mood_score": 7, "note": "Feeling good"}
        
        response = await client.post("/mood", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["mood_score"] == 7
        assert data["note"] == "Feeling good"
        assert "recorded_at" in data

@pytest.mark.asyncio
async def test_post_mood_invalid_low(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"mood_score": 0}
        
        response = await client.post("/mood", json=payload, headers=headers)
        
        assert response.status_code == 422

@pytest.mark.asyncio
async def test_post_mood_invalid_high(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"mood_score": 11}
        
        response = await client.post("/mood", json=payload, headers=headers)
        
        assert response.status_code == 422

@pytest.mark.asyncio
async def test_get_mood_history(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Post 3 mood entries
        await client.post("/mood", json={"mood_score": 5}, headers=headers)
        await client.post("/mood", json={"mood_score": 6}, headers=headers)
        await client.post("/mood", json={"mood_score": 8}, headers=headers)
        
        response = await client.get("/mood/history", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

@pytest.mark.asyncio
async def test_get_mood_history_days_filter(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Post 1 entry today
        await client.post("/mood", json={"mood_score": 7}, headers=headers)
        
        response = await client.get("/mood/history?days=1", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

@pytest.mark.asyncio
async def test_get_assessments_history(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Post 2 assessments
        await client.post("/assessments", json={"anxiety_score": 10, "depression_score": 15}, headers=headers)
        await client.post("/assessments", json={"anxiety_score": 5, "depression_score": 8}, headers=headers)
        
        response = await client.get("/assessments/history", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert len(items) == 2
        
        # Assert ordered by created_at ascending
        date1 = datetime.fromisoformat(items[0]["created_at"].replace('Z', '+00:00'))
        date2 = datetime.fromisoformat(items[1]["created_at"].replace('Z', '+00:00'))
        assert date1 <= date2

@pytest.mark.asyncio
async def test_get_assessments_history_empty_days(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Post an assessment to ensure data exists
        await client.post("/assessments", json={"anxiety_score": 10, "depression_score": 15}, headers=headers)
        
        response = await client.get("/assessments/history?days=0", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 0

@pytest.mark.asyncio
async def test_ml_classify_valid(auth_token):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"text": "feeling very anxious and hopeless"}
        
        response = await client.post("/ml/classify", json=payload, headers=headers)
        
        # Could be 200 or 503 depending on HF token availability
        # We assert it's a successful schema return structure either way
        data = response.json()
        assert response.status_code in [200, 503]
        assert "label" in data
        assert "confidence" in data

@pytest.mark.asyncio
async def test_ml_classify_unauthorized():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        payload = {"text": "feeling very anxious and hopeless"}
        
        response = await client.post("/ml/classify", json=payload)
        
        # HTTPBearer naturally rejects missing headers with 403 Forbidden 
        # (or 401 depending on the strict custom implementations)
        assert response.status_code in [401, 403]
