from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    """
    User model for authentication and basic profile.
    Compliant with HIPAA/GDPR best practices:
    - Passwords are hashed.
    - Sensitive demographic info is stored as an encrypted placeholder.
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # HIPAA/GDPR compliance: Placeholders for encrypted sensitive demographic data
    encrypted_demographics = Column(String, nullable=True) 

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    assessments = relationship("Assessment", back_populates="user", cascade="all, delete-orphan")
    progress_records = relationship("Progress", back_populates="user", cascade="all, delete-orphan")

class Assessment(Base):
    """
    Stores individual subjective Likert-scale results (1-5).
    """
    __tablename__ = 'assessments'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Scores (0-27 scale for PHQ-9 and GAD-7)
    anxiety_score = Column(Float, nullable=False)
    depression_score = Column(Float, nullable=False)
    
    taken_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="assessments")

class Progress(Base):
    """
    Mood tracking and progress records for dashboard queries.
    Allows easy tracking of daily mood and optional notes.
    """
    __tablename__ = 'progress'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Mood tracking (1-10 scale)
    mood_score = Column(Integer, nullable=False)  # 1-10 scale
    note = Column(String, nullable=True)  # Optional user note
    
    # Summary or latest metrics over a specific period 
    avg_anxiety = Column(Float, nullable=True)
    avg_depression = Column(Float, nullable=True)
    avg_stress = Column(Float, nullable=True)
    
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="progress_records")
