from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from .models import Base, User, Assessment, Progress
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Any
from jwt import PyJWTError as JWTError
import jwt
import httpx
from datetime import datetime, timedelta, timezone
import os

from contextlib import asynccontextmanager

# Database config
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    raise RuntimeError("DATABASE_URL environment variable is not set")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: Add cleanup logic here if needed

app = FastAPI(lifespan=lifespan)
security = HTTPBearer()


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# Security Configs
SECRET_KEY = os.environ.get("SECRET_KEY")
if SECRET_KEY is None:
    raise RuntimeError("SECRET_KEY environment variable is not set")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")  # Changed from bcrypt to pbkdf2

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Pydantic Schemas
class AuthSchema(BaseModel):
    email: str
    password: str

class TokenSchema(BaseModel):
    token: str
    userId: int

class AssessmentSubmitSchema(BaseModel):
    anxiety_score: float
    depression_score: float

class AssessmentHistoryItem(BaseModel):
    id: int
    depression_score: float
    anxiety_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssessmentHistoryResponse(BaseModel):
    items: List[AssessmentHistoryItem]

class MLClassifyRequest(BaseModel):
    text: str

class MLClassifyResponse(BaseModel):
    label: str
    confidence: float
    error: str | None = None

    model_config = ConfigDict(from_attributes=True)

class MoodCreate(BaseModel):
    mood_score: int  # 1-10 scale
    note: str | None = None

class MoodResponse(BaseModel):
    id: int
    mood_score: int
    note: str | None
    recorded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Auth Endpoints
@app.post("/auth/register", response_model=TokenSchema)
def register(user_data: AuthSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = pwd_context.hash(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = jwt.encode({"sub": str(new_user.id), "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "userId": new_user.id}

@app.post("/auth/login", response_model=TokenSchema)
def login(user_data: AuthSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not pwd_context.verify(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    token = jwt.encode({"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "userId": user.id}

# Assessment Questions Payload
OPTIONS = [
    {"label": "Not at all", "value": 0},
    {"label": "Several days", "value": 1},
    {"label": "More than half the days", "value": 2},
    {"label": "Nearly every day", "value": 3}
]

MOCK_QUESTIONS = [
    {
        "id": "phq1",
        "text": "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq2",
        "text": "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq3",
        "text": "Over the last 2 weeks, how often have you been bothered by trouble falling or staying asleep, or sleeping too much?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq4",
        "text": "Over the last 2 weeks, how often have you been bothered by feeling tired or having little energy?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq5",
        "text": "Over the last 2 weeks, how often have you been bothered by poor appetite or overeating?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq6",
        "text": "Over the last 2 weeks, how often have you been bothered by feeling bad about yourself or that you are a failure or have let yourself or your family down?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq7",
        "text": "Over the last 2 weeks, how often have you been bothered by trouble concentrating on things, such as reading the newspaper or watching television?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq8",
        "text": "Over the last 2 weeks, how often have you been bothered by moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "phq9",
        "text": "Over the last 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself in some way?",
        "category": "depression",
        "options": OPTIONS
    },
    {
        "id": "gad1",
        "text": "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?",
        "category": "anxiety",
        "options": OPTIONS
    },
    {
        "id": "gad2",
        "text": "Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?",
        "category": "anxiety",
        "options": OPTIONS
    },
    {
        "id": "gad3",
        "text": "Over the last 2 weeks, how often have you been bothered by worrying too much about different things?",
        "category": "anxiety",
        "options": OPTIONS
    },
    {
        "id": "gad4",
        "text": "Over the last 2 weeks, how often have you been bothered by trouble relaxing?",
        "category": "anxiety",
        "options": OPTIONS
    },
    {
        "id": "gad5",
        "text": "Over the last 2 weeks, how often have you been bothered by being so restless that it is hard to sit still?",
        "category": "anxiety",
        "options": OPTIONS
    },
    {
        "id": "gad6",
        "text": "Over the last 2 weeks, how often have you been bothered by becoming easily annoyed or irritable?",
        "category": "anxiety",
        "options": OPTIONS
    },
    {
        "id": "gad7",
        "text": "Over the last 2 weeks, how often have you been bothered by feeling afraid as if something awful might happen?",
        "category": "anxiety",
        "options": OPTIONS
    }
]

@app.get("/assessments/questions")
def get_questions():
    return MOCK_QUESTIONS

@app.post("/assessments")
def submit_assessment(data: AssessmentSubmitSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_assessment = Assessment(
        user_id=current_user.id,
        anxiety_score=data.anxiety_score,
        depression_score=data.depression_score
    )
    
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    
    return {"message": "Assessment submitted successfully", "assessment_id": new_assessment.id}

@app.get("/assessments/history", response_model=AssessmentHistoryResponse)
def get_assessment_history(days: int = 30, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retrieve the authenticated user's past assessment records for the last N days,
    ordered by created_at ascending.
    """
    if days <= 0:
        return AssessmentHistoryResponse(items=[])

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    history = db.query(Assessment).filter(
        Assessment.user_id == current_user.id,
        Assessment.taken_at >= cutoff_date
    ).order_by(Assessment.taken_at.asc()).all()

    formatted_history = [
        {
            "id": item.id,
            "depression_score": item.depression_score,
            "anxiety_score": item.anxiety_score,
            "created_at": item.taken_at
        } for item in history
    ]

    return AssessmentHistoryResponse(items=formatted_history)

@app.post("/ml/classify", response_model=MLClassifyResponse)
async def classify_text(data: MLClassifyRequest, current_user: User = Depends(get_current_user)):
    """
    Classify user text with a HuggingFace model, mapping labels to human-readable risk categories.
    """
    hf_token = os.environ.get("HF_API_TOKEN")
    if not hf_token:
        return JSONResponse(
            status_code=503,
            content={"label": "Unavailable", "confidence": 0.0, "error": "ML service temporarily unavailable"}
        )

    model_url = "https://api-inference.huggingface.co/models/mental/mental-bert-base-uncased"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.post(model_url, json={"inputs": data.text}, headers=headers)
            response.raise_for_status()
            result = response.json()
    except httpx.TimeoutException:
        return JSONResponse(
            status_code=503,
            content={"label": "Unavailable", "confidence": 0.0, "error": "ML service timeout"}
        )
    except (httpx.RequestError, httpx.HTTPStatusError):
        return JSONResponse(
            status_code=503,
            content={"label": "Unavailable", "confidence": 0.0, "error": "ML service temporarily unavailable"}
        )

    if not isinstance(result, list) or len(result) == 0:
        return JSONResponse(
            status_code=503,
            content={"label": "Unavailable", "confidence": 0.0, "error": "ML service temporarily unavailable"}
        )

    predictions = result[0] if isinstance(result[0], list) else result
    if not predictions:
        return JSONResponse(
            status_code=503,
            content={"error": "ML service unavailable", "label": "Unavailable", "confidence": 0.0}
        )

    # Extract top prediction
    top_prediction = max(predictions, key=lambda x: x.get("score", 0))
    raw_label = str(top_prediction.get("label", ""))
    confidence = round(float(top_prediction.get("score", 0.0)), 2)

    # Map labels to human-readable format
    if raw_label in ["LABEL_0", "Positive"]:
        mapped_label = "Low concern"
    elif raw_label in ["LABEL_1", "Negative"]:
        mapped_label = "Elevated concern"
    else:
        mapped_label = raw_label

    return {"label": mapped_label, "confidence": confidence}

# Mood Tracking Endpoints
@app.post("/mood", response_model=MoodResponse)
def record_mood(mood_data: MoodCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Record user's mood score (1-10 scale) with optional note.
    Requires JWT authentication.
    """
    # Validate mood_score is between 1 and 10
    if not (1 <= mood_data.mood_score <= 10):
        raise HTTPException(status_code=422, detail="mood_score must be between 1 and 10")
    
    new_mood = Progress(
        user_id=current_user.id,
        mood_score=mood_data.mood_score,
        note=mood_data.note
    )
    
    db.add(new_mood)
    db.commit()
    db.refresh(new_mood)
    
    return new_mood

@app.get("/mood/history", response_model=List[MoodResponse])
def get_mood_history(days: int = 30, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retrieve user's mood history for the last N days.
    Requires JWT authentication.
    Returns mood entries ordered by recorded_at (most recent first).
    """
    # Validate days parameter
    if days <= 0:
        raise HTTPException(status_code=400, detail="days must be greater than 0")
    
    # Calculate the date N days ago
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Query mood entries for the current user in the specified time range
    mood_history = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.recorded_at >= cutoff_date
    ).order_by(Progress.recorded_at.desc()).all()
    
    return mood_history
