import os
import sys
import subprocess
import pytest
from datetime import datetime
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from backend import main
from backend.models import User, Assessment, Progress
from backend.main import app
from tests.test_phase1 import db_session


# ==============================================================================
# 1. Database and Data Integrity Tests
# ==============================================================================

def test_user_cascades(db_session: Session):
    """Verify ORM-level cascades: deleting a user deletes associated assessments and progress records."""
    # Create test user
    email = "cascade_test@example.com"
    user = db_session.query(User).filter(User.email == email).first()
    if user:
        db_session.delete(user)
        db_session.commit()

    user = User(email=email, hashed_password=main.pwd_context.hash("password123"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Create associated records
    assessment = Assessment(user_id=user.id, anxiety_score=5.0, depression_score=4.0)
    progress = Progress(user_id=user.id, mood_score=7, note="Feeling better today")
    
    db_session.add(assessment)
    db_session.add(progress)
    db_session.commit()

    # Confirm they exist in DB
    assert db_session.query(Assessment).filter(Assessment.user_id == user.id).count() == 1
    assert db_session.query(Progress).filter(Progress.user_id == user.id).count() == 1

    # Delete the user
    db_session.delete(user)
    db_session.commit()

    # Confirm ORM cascades deleted the children
    assert db_session.query(Assessment).filter(Assessment.user_id == user.id).count() == 0
    assert db_session.query(Progress).filter(Progress.user_id == user.id).count() == 0


def test_persistence_flow(db_session: Session):
    """Verify the full lifecycle of data from Pydantic DTO to SQLAlchemy ORM and finally to the database."""
    email = "persistence_test@example.com"
    user = db_session.query(User).filter(User.email == email).first()
    if user:
        db_session.delete(user)
        db_session.commit()

    # 1. Pydantic DTO mapping representation
    user_dto = main.AuthSchema(email=email, password="SecurePassword123")
    
    # 2. Convert to SQLAlchemy ORM and persist
    hashed_password = main.pwd_context.hash(user_dto.password)
    db_user = User(email=user_dto.email, hashed_password=hashed_password)
    db_session.add(db_user)
    db_session.commit()
    db_session.refresh(db_user)
    
    # 3. Retrieve from database and verify integrity
    retrieved_user = db_session.query(User).filter(User.id == db_user.id).first()
    assert retrieved_user is not None
    assert retrieved_user.email == user_dto.email
    assert main.pwd_context.verify(user_dto.password, retrieved_user.hashed_password) is True

    # 4. Assessment Persistence roundtrip
    assessment_dto = main.AssessmentSubmitSchema(anxiety_score=8.5, depression_score=7.0)
    db_assessment = Assessment(
        user_id=retrieved_user.id,
        anxiety_score=assessment_dto.anxiety_score,
        depression_score=assessment_dto.depression_score
    )
    db_session.add(db_assessment)
    db_session.commit()
    db_session.refresh(db_assessment)

    retrieved_assessment = db_session.query(Assessment).filter(Assessment.id == db_assessment.id).first()
    assert retrieved_assessment is not None
    assert retrieved_assessment.user_id == retrieved_user.id
    assert retrieved_assessment.anxiety_score == 8.5
    assert retrieved_assessment.depression_score == 7.0

    # Cleanup
    db_session.delete(db_user) # Relies on cascades to wipe assessment
    db_session.commit()


def test_foreign_key_indexes(db_session: Session):
    """Verify that indices exist on the user_id foreign keys to optimize query performance."""
    inspector = inspect(db_session.bind)
    
    # Check 'assessments' table index columns
    assessment_indexes = inspector.get_indexes("assessments")
    assessment_index_columns = []
    for idx in assessment_indexes:
        assessment_index_columns.extend(idx["column_names"])
    
    assert "user_id" in assessment_index_columns, "Index missing on assessments.user_id!"

    # Check 'progress' table index columns
    progress_indexes = inspector.get_indexes("progress")
    progress_index_columns = []
    for idx in progress_indexes:
        progress_index_columns.extend(idx["column_names"])
        
    assert "user_id" in progress_index_columns, "Index missing on progress.user_id!"


# ==============================================================================
# 2. DevOps and Infrastructure Tests
# ==============================================================================

def test_database_connection():
    """Verify database container readiness and connectivity."""
    from sqlalchemy.sql import text
    from backend.main import engine
    
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_environment_validation_missing_db_url():
    """Verify that importing main raises a RuntimeError if DATABASE_URL is missing."""
    env = os.environ.copy()
    if "DATABASE_URL" in env:
        del env["DATABASE_URL"]
    
    result = subprocess.run(
        [sys.executable, "-c", "from backend import main"],
        env=env,
        capture_output=True,
        text=True
    )
    assert result.returncode != 0
    assert "RuntimeError" in result.stderr
    assert "DATABASE_URL environment variable is not set" in result.stderr


def test_environment_validation_missing_secret_key():
    """Verify that importing main raises a RuntimeError if SECRET_KEY is missing."""
    env = os.environ.copy()
    if "SECRET_KEY" in env:
        del env["SECRET_KEY"]
    # Provide DATABASE_URL so it passes that check first
    env["DATABASE_URL"] = "postgresql://localhost/dummy"
    
    result = subprocess.run(
        [sys.executable, "-c", "from backend import main"],
        env=env,
        capture_output=True,
        text=True
    )
    assert result.returncode != 0
    assert "RuntimeError" in result.stderr
    assert "SECRET_KEY environment variable is not set" in result.stderr


def test_health_check_endpoint():
    """Verify health check endpoint returns 200, status 'ok', and UTC timestamp."""
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert "timestamp" in payload
        # Parse timestamp to ensure it is valid ISO format
        dt = datetime.fromisoformat(payload["timestamp"])
        assert dt is not None
