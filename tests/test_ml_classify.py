import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from backend import main
from backend.models import User

class FakeHFResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload

async def fake_post(self, url, json=None, headers=None):
    return FakeHFResponse([{"label": "Positive", "score": 0.99}])

def test_ml_classify_endpoint(monkeypatch):
    db = main.SessionLocal()
    try:
        user = User(email="mltest@example.com", hashed_password=main.pwd_context.hash("password123"))
        db.add(user)
        db.commit()
        db.refresh(user)

        token = jwt.encode(
            {"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            main.SECRET_KEY,
            algorithm=main.ALGORITHM,
        )

        monkeypatch.setenv("HF_API_TOKEN", "fake_token")
        monkeypatch.setattr(main.httpx.AsyncClient, "post", fake_post)

        with TestClient(main.app) as client:
            response = client.post(
                "/ml/classify",
                json={"text": "I feel okay"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["label"] == "Low risk"
        assert payload["confidence"] == 0.99
    finally:
        db.delete(user)
        db.commit()
        db.close()
