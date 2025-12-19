"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
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


class WeaviateChatMessage(BaseModel):
    """Chat message for Weaviate QueryAgent."""
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1)


class WeaviateAskRequest(BaseModel):
    """Request payload for Weaviate QueryAgent ask."""
    messages: List[WeaviateChatMessage] = Field(default_factory=list)


class WeaviateAskResponse(BaseModel):
    """Response payload for Weaviate QueryAgent ask."""
    answer: str


# Chat API Schemas

class ToolCallSchema(BaseModel):
    """Schema for a tool/function call made by the LLM"""
    tool: str = Field(..., description="Name of the tool that was called")
    arguments: dict = Field(..., description="Arguments passed to the tool")
    result: dict = Field(..., description="Result returned by the tool")


class ChatMessageBase(BaseModel):
    """Base chat message schema"""
    role: Literal["user", "assistant", "system"] = Field(..., description="Role of the message sender")
    content: str = Field(..., min_length=1, max_length=10000, description="Message content")


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating a chat message"""
    pass


class ChatMessage(ChatMessageBase):
    """Full chat message schema with metadata"""
    id: str
    session_id: str
    tool_calls: Optional[List[ToolCallSchema]] = None
    created_at: datetime


class ChatSessionCreate(BaseModel):
    """Schema for creating a new chat session"""
    candidate_id: str = Field(..., description="ID of the candidate to chat about")
    job_id: str = Field(..., description="ID of the job the candidate is associated with")


class ChatSession(BaseModel):
    """Full chat session schema"""
    id: str
    candidate_id: str
    job_id: str
    model_provider: str = Field(..., description="LLM provider used for this session")
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage] = Field(default_factory=list, description="Conversation history")


class SendMessageRequest(BaseModel):
    """Request schema for sending a message"""
    content: str = Field(..., min_length=1, max_length=2000, description="Message content (max 2000 chars)")


class SendMessageResponse(BaseModel):
    """Response schema after sending a message"""
    message: ChatMessage = Field(..., description="The assistant's response message")
    tool_calls: List[ToolCallSchema] = Field(default_factory=list, description="Tools used during the response")
