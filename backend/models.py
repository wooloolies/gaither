"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    """Job status enum"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobCreate(BaseModel):
    """Schema for creating a new job"""
    model_config = ConfigDict(protected_namespaces=())
    
    # Required fields
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10)
    company_name: str = Field(..., min_length=1)
    
    # Optional fields
    requirements: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    company_highlights: List[str] = Field(default_factory=list)
    model_provider: Optional[str] = Field(default=None, pattern="^(claude|gemini)$")
    
    # Additional recruiter form fields
    recruiter_name: Optional[str] = None
    language_requirement: Optional[str] = None
    key_responsibilities: Optional[str] = None
    core_skill_requirement: Optional[str] = None
    familiar_with: Optional[str] = None
    work_type: Optional[str] = None
    years_of_experience: Optional[int] = None
    minimum_required_degree: Optional[str] = None
    grade: Optional[int] = None


class Job(JobCreate):
    """Schema for job response"""
    id: str
    created_at: datetime
    status: JobStatus


class CandidateBase(BaseModel):
    """Base candidate schema"""
    username: str
    profile_url: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None


class CandidateAnalysis(BaseModel):
    """Candidate analysis results"""
    fit_score: int = Field(..., ge=0, le=100)
    skills: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    top_repositories: List[dict] = Field(default_factory=list)


class Candidate(CandidateBase):
    """Full candidate schema"""
    id: str
    job_id: str
    created_at: datetime
    analysis: Optional[CandidateAnalysis] = None


class OutreachMessage(BaseModel):
    """Outreach message schema"""
    id: str
    candidate_id: str
    subject: str
    body: str
    generated_at: datetime


class WebSocketEvent(BaseModel):
    """WebSocket event schema"""
    event: str
    timestamp: datetime
    job_id: str
    data: dict


class JobStartResponse(BaseModel):
    """Response for starting a job"""
    message: str
    job_id: str
    status: str
