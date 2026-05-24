import pytest
import jwt
import httpx
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from backend import main
from backend.models import User
from tests.test_phase1 import db_session


class FakeHFResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("HTTP Error", request=None, response=self)
        return None

    def json(self):
        return self._payload


@pytest.fixture(scope="module")
def ml_test_user_token(db_session):
    """Fixture that ensures a test user exists and returns a valid authorization token."""
    email = "mltest@example.com"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password=main.pwd_context.hash("password123"))
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = jwt.encode(
        {"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        main.SECRET_KEY,
        algorithm=main.ALGORITHM,
    )

    yield token

    # Teardown
    db_session.delete(user)
    db_session.commit()


# ==============================================================================
# 1. Fault Tolerance Tests
# ==============================================================================

def test_ml_missing_token(monkeypatch, ml_test_user_token):
    """Verify that a missing HF_API_TOKEN environment variable returns 503."""
    monkeypatch.delenv("HF_API_TOKEN", raising=False)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I feel anxious"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 503
    payload = response.json()
    assert payload["label"] == "Unavailable"
    assert "temporarily unavailable" in payload["error"].lower()


def test_ml_timeout(monkeypatch, ml_test_user_token):
    """Verify that a HuggingFace API timeout is handled gracefully and returns 503."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post_timeout(*args, **kwargs):
        raise httpx.TimeoutException("Mocked timeout")

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post_timeout)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I feel anxious"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 503
    payload = response.json()
    assert payload["label"] == "Unavailable"
    assert "timeout" in payload["error"].lower()


def test_ml_request_error(monkeypatch, ml_test_user_token):
    """Verify that a general request failure (e.g. connection error) returns 503."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post_error(*args, **kwargs):
        raise httpx.RequestError("Connection failed")

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post_error)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I feel anxious"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 503
    payload = response.json()
    assert payload["label"] == "Unavailable"
    assert "temporarily unavailable" in payload["error"].lower()


def test_ml_empty_response(monkeypatch, ml_test_user_token):
    """Verify that an empty list payload from HuggingFace returns 503."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post_empty(*args, **kwargs):
        return FakeHFResponse([])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post_empty)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I feel anxious"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 503
    payload = response.json()
    assert payload["label"] == "Unavailable"
    assert "temporarily unavailable" in payload["error"].lower()


def test_ml_malformed_response_not_list(monkeypatch, ml_test_user_token):
    """Verify that a malformed non-list response from HuggingFace returns 503."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post_malformed(*args, **kwargs):
        return FakeHFResponse({"error": "Model loading"})

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post_malformed)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I feel anxious"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 503
    payload = response.json()
    assert payload["label"] == "Unavailable"
    assert "temporarily unavailable" in payload["error"].lower()


# ==============================================================================
# 2. Label Mapping & Confidence Extraction Tests
# ==============================================================================

def test_ml_label_mapping_label_0(monkeypatch, ml_test_user_token):
    """Verify raw 'LABEL_0' correctly maps to 'Low concern'."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post(*args, **kwargs):
        return FakeHFResponse([{"label": "LABEL_0", "score": 0.8499}])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I am relaxed"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "Low concern"
    assert payload["confidence"] == 0.85


def test_ml_label_mapping_positive(monkeypatch, ml_test_user_token):
    """Verify raw 'Positive' correctly maps to 'Low concern'."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post(*args, **kwargs):
        return FakeHFResponse([{"label": "Positive", "score": 0.992}])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I feel safe"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "Low concern"
    assert payload["confidence"] == 0.99


def test_ml_label_mapping_label_1(monkeypatch, ml_test_user_token):
    """Verify raw 'LABEL_1' correctly maps to 'Elevated concern'."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post(*args, **kwargs):
        return FakeHFResponse([{"label": "LABEL_1", "score": 0.778}])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I can't breathe"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "Elevated concern"
    assert payload["confidence"] == 0.78


def test_ml_label_mapping_negative(monkeypatch, ml_test_user_token):
    """Verify raw 'Negative' correctly maps to 'Elevated concern'."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post(*args, **kwargs):
        return FakeHFResponse([{"label": "Negative", "score": 0.884}])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "I am suffering"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "Elevated concern"
    assert payload["confidence"] == 0.88


def test_ml_label_mapping_custom(monkeypatch, ml_test_user_token):
    """Verify other labels are mapped directly without translation."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post(*args, **kwargs):
        return FakeHFResponse([{"label": "Crisis-Trigger", "score": 0.954}])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "Emergency situation"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "Crisis-Trigger"
    assert payload["confidence"] == 0.95


def test_ml_extract_top_prediction(monkeypatch, ml_test_user_token):
    """Verify that the highest score item is extracted from multiple model predictions."""
    monkeypatch.setenv("HF_API_TOKEN", "fake_token")

    async def fake_post(*args, **kwargs):
        return FakeHFResponse([
            {"label": "LABEL_0", "score": 0.15},
            {"label": "LABEL_1", "score": 0.85},
            {"label": "Crisis-Trigger", "score": 0.05}
        ])

    monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

    with TestClient(main.app) as client:
        response = client.post(
            "/ml/classify",
            json={"text": "Mixed signals but mostly very anxious"},
            headers={"Authorization": f"Bearer {ml_test_user_token}"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "Elevated concern"
    assert payload["confidence"] == 0.85
