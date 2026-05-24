import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from backend.main import (
    app,
    SECRET_KEY,
    ALGORITHM,
    pwd_context,
    get_current_user,
)
from backend.models import User
from tests.test_phase1 import db_session, TEST_EMAIL, TEST_PASSWORD


@pytest_asyncio.fixture(scope="module")
async def ensure_user(db_session):
    """Fixture to ensure the default test user exists in the database and returns it."""
    user = db_session.query(User).filter(User.email == TEST_EMAIL).first()
    if not user:
        async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        user = db_session.query(User).filter(User.email == TEST_EMAIL).first()
    return user


# ==============================================================================
# 1. JWT Verification Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_jwt_missing_token():
    """Verify that calling a protected route without a token fails with 401."""
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0})
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_jwt_malformed_token():
    """Verify that calling a protected route with a malformed token fails with 401."""
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": "Bearer malformed-token-xyz"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_expired_token():
    """Verify that an expired token is rejected with 401."""
    expired_payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1)
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_missing_sub_claim():
    """Verify that a token missing the 'sub' claim is rejected with 401."""
    payload = {
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "invalid token" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_nonexistent_user():
    """Verify that a token for a non-existent user is rejected with 401."""
    payload = {
        "sub": "999999",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "user not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_none_algorithm():
    """Verify that a token signed with the 'none' algorithm is rejected with 401."""
    payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, key="", algorithm="none")

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_wrong_algorithm():
    """Verify that a token signed with a different algorithm (e.g. HS512) is rejected with 401."""
    payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS512")

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_tampered_signature():
    """Verify that a token with a modified/tampered signature is rejected with 401."""
    payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    parts = token.split(".")
    if len(parts) == 3:
        parts[2] = "tamperedsignatureabcdef"
    tampered_token = ".".join(parts)

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {tampered_token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_jwt_non_integer_sub():
    """Verify that a token with a non-integer 'sub' claim raises a validation exception."""
    payload = {
        "sub": "not-an-integer",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/assessments", json={"anxiety_score": 5.0, "depression_score": 5.0}, headers=headers)
        assert response.status_code == 401
        assert "validate credentials" in response.json()["detail"].lower()



# ==============================================================================
# 2. Password Hashing Tests
# ==============================================================================

def test_password_hashing_scheme():
    """Verify that the pwd_context uses pbkdf2_sha256 scheme."""
    # Ensure pbkdf2_sha256 is the active hashing scheme
    assert "pbkdf2_sha256" in pwd_context.schemes()


def test_password_not_plaintext():
    """Verify that passwords are hashed and not stored in plaintext."""
    test_pwd = "MySuperSecretPassword123"
    hashed = pwd_context.hash(test_pwd)
    
    assert hashed != test_pwd
    assert hashed.startswith("$pbkdf2-sha256$")


def test_password_verification():
    """Verify that password context correctly verifies valid/invalid passwords."""
    test_pwd = "MySuperSecretPassword123"
    hashed = pwd_context.hash(test_pwd)
    
    assert pwd_context.verify(test_pwd, hashed) is True
    assert pwd_context.verify("WrongPassword123", hashed) is False


def test_database_stored_password_is_hashed(db_session, ensure_user):
    """Verify that user records saved in the database hold correctly hashed passwords."""
    user = ensure_user
    assert user.hashed_password != TEST_PASSWORD
    assert user.hashed_password.startswith("$pbkdf2-sha256$")
    assert pwd_context.verify(TEST_PASSWORD, user.hashed_password) is True


# ==============================================================================
# 3. Dependency Injection Tests
# ==============================================================================

def test_dependency_injection_valid_token(db_session, ensure_user):
    """Verify that get_current_user resolves and returns correct user for valid tokens."""
    user = ensure_user
    
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    
    resolved_user = get_current_user(credentials=credentials, db=db_session)
    assert resolved_user.id == user.id
    assert resolved_user.email == user.email


def test_dependency_injection_invalid_token(db_session):
    """Verify that get_current_user raises HTTPException for invalid tokens."""
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-jwt-token-value")
    
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, db=db_session)
    
    assert exc_info.value.status_code == 401
    assert "could not validate credentials" in exc_info.value.detail.lower()


def test_dependency_injection_expired_token(db_session):
    """Verify that get_current_user raises HTTPException for expired tokens."""
    payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, db=db_session)
        
    assert exc_info.value.status_code == 401
    assert "could not validate credentials" in exc_info.value.detail.lower()


def test_dependency_injection_user_not_found(db_session):
    """Verify that get_current_user raises HTTPException if user sub doesn't exist."""
    payload = {
        "sub": "999999",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, db=db_session)
        
    assert exc_info.value.status_code == 401
    assert "user not found" in exc_info.value.detail.lower()
