import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from backend.models import Assessment, Progress, User
from backend.main import app
from tests.test_phase1 import db_session, TEST_EMAIL, TEST_PASSWORD


@pytest_asyncio.fixture(scope="module")
async def auth_token():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        if login_response.status_code != 200:
            await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
            login_response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})

        assert login_response.status_code == 200
        return login_response.json()["token"]


@pytest.fixture(autouse=True)
def cleanup_records(db_session):
    yield
    user = db_session.query(User).filter(User.email == TEST_EMAIL).first()
    if user:
        db_session.query(Progress).filter(Progress.user_id == user.id).delete()
        db_session.query(Assessment).filter(Assessment.user_id == user.id).delete()
        db_session.commit()


@pytest.mark.asyncio
async def test_health_endpoint():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_register_rejects_missing_password():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/auth/register", json={"email": TEST_EMAIL})
        assert response.status_code == 422
        data = response.json()
        assert data["detail"]
        assert any(error["loc"][-1] == "password" for error in data["detail"])


@pytest.mark.asyncio
async def test_login_rejects_missing_email():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/auth/login", json={"password": TEST_PASSWORD})
        assert response.status_code == 422
        data = response.json()
        assert data["detail"]
        assert any(error["loc"][-1] == "email" for error in data["detail"])


@pytest.mark.asyncio
async def test_login_rejects_invalid_credentials():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": "wrongpassword"})
        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_assessments_requires_auth():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/assessments", json={"anxiety_score": 5, "depression_score": 5})
        assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_assessments_rejects_malformed_body(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.post("/assessments", json={"anxiety_score": "bad", "depression_score": 5}, headers=headers)
        assert response.status_code == 422
        data = response.json()
        assert data["detail"]
        assert any(error["loc"][-1] == "anxiety_score" for error in data["detail"])


@pytest.mark.asyncio
async def test_mood_requires_auth():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/mood", json={"mood_score": 5})
        assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_mood_rejects_missing_mood_score(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.post("/mood", json={}, headers=headers)
        assert response.status_code == 422
        data = response.json()
        assert any(error["loc"][-1] == "mood_score" for error in data["detail"])


@pytest.mark.asyncio
async def test_mood_history_rejects_invalid_days_type(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.get("/mood/history?days=not-an-int", headers=headers)
        assert response.status_code == 422
        data = response.json()
        assert any(error["loc"][-1] == "days" for error in data["detail"])


@pytest.mark.asyncio
async def test_assessments_history_response_schema(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Ensure there is at least one assessment record
        await client.post("/assessments", json={"anxiety_score": 8, "depression_score": 12}, headers=headers)

        response = await client.get("/assessments/history?days=30", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) >= 1

        item = data["items"][0]
        assert set(item.keys()) == {"id", "depression_score", "anxiety_score", "created_at"}
        assert isinstance(item["id"], int)
        assert isinstance(item["depression_score"], (int, float))
        assert isinstance(item["anxiety_score"], (int, float))
        assert isinstance(item["created_at"], str)


@pytest.mark.asyncio
async def test_assessments_history_filters_by_days(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create a current assessment record
        await client.post("/assessments", json={"anxiety_score": 5, "depression_score": 5}, headers=headers)

        response = await client.get("/assessments/history?days=1", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) >= 1

        for item in data["items"]:
            assert set(item.keys()) == {"id", "depression_score", "anxiety_score", "created_at"}


@pytest.mark.asyncio
async def test_mood_history_raises_400_for_zero_days(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.get("/mood/history?days=0", headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "days must be greater than 0"


@pytest.mark.asyncio
async def test_mood_history_raises_400_for_negative_days(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.get("/mood/history?days=-5", headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "days must be greater than 0"


@pytest.mark.asyncio
async def test_ml_classify_response_schema(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = await client.post("/ml/classify", json={"text": "I feel very stressed today"}, headers=headers)
        assert response.status_code in [200, 503]
        data = response.json()
        assert "label" in data
        assert "confidence" in data
        assert "error" in data
        assert isinstance(data["label"], str)
        assert isinstance(data["confidence"], (int, float))
        assert data["error"] is None or isinstance(data["error"], str)


@pytest.mark.asyncio
async def test_mood_score_allows_boundary_values(auth_token):
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {auth_token}"}

        low_response = await client.post("/mood", json={"mood_score": 1}, headers=headers)
        assert low_response.status_code == 200
        assert low_response.json()["mood_score"] == 1

        high_response = await client.post("/mood", json={"mood_score": 10}, headers=headers)
        assert high_response.status_code == 200
        assert high_response.json()["mood_score"] == 10


@pytest.mark.asyncio
async def test_duplicate_registration_is_blocked():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register or ensure the user exists
        await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        response = await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "Email already registered"
