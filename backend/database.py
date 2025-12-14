"""
Database models and setup using SQLAlchemy.
"""
from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

from config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Database Models

class DBJob(Base):
    """Job database model"""
    __tablename__ = "jobs"
    __table_args__ = (
        # Create index on content_hash for faster duplicate detection
        Index('idx_content_hash', 'content_hash'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(JSON, default=list)
    location = Column(String, nullable=True)
    company_name = Column(String, nullable=False)
    company_highlights = Column(JSON, default=list)
    model_provider = Column(String, nullable=True)  # "claude" or "gemini"
    status = Column(String, default="pending")
    content_hash = Column(String, nullable=True)  # Hash of job content for duplicate detection
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Additional recruiter form fields (stored as JSON)
    recruiter_form_data = Column(JSON, nullable=True)  # Stores: recruiter_name, language_requirement, key_responsibilities, core_skill_requirement, familiar_with, work_type, years_of_experience, minimum_required_degree, grade

    # Relationships
    candidates = relationship("DBCandidate", back_populates="job", cascade="all, delete-orphan")


class DBCandidate(Base):
    """Candidate database model"""
    __tablename__ = "candidates"
    __table_args__ = (
        # Ensure each candidate (username) appears only once per job
        # This prevents duplicate candidates when re-running the same job
        Index('idx_job_username', 'job_id', 'username', unique=True),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    username = Column(String, nullable=False)
    profile_url = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Analysis results (stored as JSON)
    fit_score = Column(Integer, nullable=True)
    skills = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    concerns = Column(JSON, default=list)
    top_repositories = Column(JSON, default=list)

    # Relationships
    job = relationship("DBJob", back_populates="candidates")
    message = relationship("DBMessage", back_populates="candidate", uselist=False, cascade="all, delete-orphan")


class DBMessage(Base):
    """Outreach message database model"""
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    candidate = relationship("DBCandidate", back_populates="message")


# Database initialization

def init_db():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session (dependency injection for FastAPI)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
