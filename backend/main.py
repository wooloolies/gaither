"""
FastAPI main application with REST API and WebSocket endpoints.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
from datetime import datetime
from typing import List
import json
from pathlib import Path
import hashlib

from config import settings
from database import init_db, get_db, DBJob, DBCandidate, DBMessage
from models import (
    JobCreate, Job, JobStatus, Candidate, CandidateAnalysis,
    OutreachMessage, JobStartResponse
)
from services.websocket_manager import ws_manager
from services.weaviate import get_weaviate_service
from agents.orchestrator import orchestrator
import asyncio

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Autonomous Recruiting Agent Swarm",
    description="AI-powered multi-agent system for recruiting",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables and generate OpenAPI spec on startup"""
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
    
    # Generate and save OpenAPI spec (only in non-production environments)
    if settings.ENVIRONMENT != "production":
        try:
            openapi_spec = app.openapi()
            backend_dir = Path(__file__).parent
            openapi_path = backend_dir / "openapi.json"
            
            with open(openapi_path, "w", encoding="utf-8") as f:
                json.dump(openapi_spec, f, indent=2, ensure_ascii=False)
            
            logger.info(f"OpenAPI spec saved to {openapi_path}")
        except Exception as e:
            logger.error(f"Error generating OpenAPI spec: {e}")
    else:
        logger.debug("Skipping OpenAPI spec generation in production")


# Helper functions

def calculate_job_content_hash(title: str, company_name: str, description: str, requirements: list) -> str:
    """
    Calculate a hash of job content for duplicate detection.

    Uses SHA256 hash of normalized job content (title + company + description + requirements).
    This allows detecting duplicate jobs regardless of when they were created.

    Args:
        title: Job title
        company_name: Company name
        description: Job description
        requirements: List of requirements

    Returns:
        SHA256 hash string (hex)
    """
    # Normalize content (lowercase, strip whitespace)
    content = f"{title.strip().lower()}|{company_name.strip().lower()}|{description.strip().lower()}|{'|'.join(sorted(r.strip().lower() for r in requirements))}"

    # Calculate SHA256 hash
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Job endpoints

@app.post("/api/jobs", response_model=Job, tags=["Jobs"])
async def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new recruiting job.

    Uses content-based duplicate detection: if a job with identical content already exists,
    returns the existing job instead of creating a duplicate. This prevents multiple job_ids
    for the same logical job regardless of when it was created.
    """
    try:
        # Use provided model_provider or default to settings
        model_provider = job_data.model_provider or settings.MODEL_PROVIDER

        # Calculate content hash for duplicate detection
        content_hash = calculate_job_content_hash(
            title=job_data.title,
            company_name=job_data.company_name,
            description=job_data.description,
            requirements=job_data.requirements or []
        )

        # Check for duplicate jobs using content hash
        # This detects duplicates regardless of when they were created
        existing_job = db.query(DBJob).filter(
            DBJob.content_hash == content_hash
        ).first()

        if existing_job:
            logger.info(f"Duplicate job detected (by content hash), returning existing job: {existing_job.id} - {existing_job.title}")
            return Job(
                id=existing_job.id,
                title=existing_job.title,
                description=existing_job.description,
                requirements=existing_job.requirements or [],
                location=existing_job.location,
                company_name=existing_job.company_name,
                company_highlights=existing_job.company_highlights or [],
                model_provider=existing_job.model_provider,
                created_at=existing_job.created_at,
                status=JobStatus(existing_job.status)
            )

        # Create new job with content hash
        db_job = DBJob(
            title=job_data.title,
            description=job_data.description,
            requirements=job_data.requirements,
            location=job_data.location,
            company_name=job_data.company_name,
            company_highlights=job_data.company_highlights,
            model_provider=model_provider,
            content_hash=content_hash,
            status=JobStatus.PENDING.value
        )

        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        logger.info(f"Created new job: {db_job.id} - {db_job.title} (model: {model_provider}, hash: {content_hash[:8]}...)")

        return Job(
            id=db_job.id,
            title=db_job.title,
            description=db_job.description,
            requirements=db_job.requirements or [],
            location=db_job.location,
            company_name=db_job.company_name,
            company_highlights=db_job.company_highlights or [],
            model_provider=db_job.model_provider,
            created_at=db_job.created_at,
            status=JobStatus(db_job.status)
        )
    except Exception as e:
        logger.error(f"Error creating job: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/{job_id}", response_model=Job, tags=["Jobs"])
async def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get job details by ID"""
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()

    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    return Job(
        id=db_job.id,
        title=db_job.title,
        description=db_job.description,
        requirements=db_job.requirements or [],
        location=db_job.location,
        company_name=db_job.company_name,
        company_highlights=db_job.company_highlights or [],
        model_provider=db_job.model_provider,
        created_at=db_job.created_at,
        status=JobStatus(db_job.status)
    )


@app.get("/api/jobs", response_model=List[Job], tags=["Jobs"])
async def list_jobs(db: Session = Depends(get_db)):
    """List all jobs"""
    db_jobs = db.query(DBJob).order_by(DBJob.created_at.desc()).all()

    return [
        Job(
            id=job.id,
            title=job.title,
            description=job.description,
            requirements=job.requirements or [],
            location=job.location,
            company_name=job.company_name,
            company_highlights=job.company_highlights or [],
            model_provider=job.model_provider,
            created_at=job.created_at,
            status=JobStatus(job.status)
        )
        for job in db_jobs
    ]


@app.post("/api/jobs/{job_id}/start", response_model=JobStartResponse, tags=["Jobs"])
async def start_job(job_id: str, db: Session = Depends(get_db)):
    """Start the agent pipeline for a job"""
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()

    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if db_job.status == JobStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Job is already running")

    # Update job status
    db_job.status = JobStatus.RUNNING.value
    db.commit()

    logger.info(f"Starting agent pipeline for job {job_id}")

    # Prepare job data for agents
    job_data = {
        "title": db_job.title,
        "description": db_job.description,
        "requirements": db_job.requirements or [],
        "location": db_job.location,
        "company_name": db_job.company_name,
        "company_highlights": db_job.company_highlights or [],
        "model_provider": db_job.model_provider or settings.MODEL_PROVIDER
    }

    # Start agent orchestrator in background
    # Note: We need to create a new DB session for the background task
    asyncio.create_task(run_pipeline_background(job_id, job_data))

    return JobStartResponse(
        message="Agent pipeline started",
        job_id=job_id,
        status=JobStatus.RUNNING.value
    )


async def run_pipeline_background(job_id: str, job_data: dict):
    """Run the agent pipeline in the background"""
    # Create new DB session for background task
    from database import SessionLocal
    db = SessionLocal()
    try:
        await orchestrator.start_job(job_id, job_data, db)
    except Exception as e:
        logger.error(f"Error in background pipeline: {e}")
    finally:
        db.close()


@app.post("/api/jobs/{job_id}/find-more", response_model=JobStartResponse, tags=["Jobs"])
async def find_more_candidates(job_id: str, db: Session = Depends(get_db)):
    """
    Find more candidates for an existing job.

    This endpoint re-runs the agent pipeline but excludes already-found candidates,
    uses pagination to get different results, and randomizes search strategies.
    """
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()

    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if db_job.status == JobStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Job is already running")

    # Update job status
    db_job.status = JobStatus.RUNNING.value
    db.commit()

    logger.info(f"Finding more candidates for job {job_id}")

    # Prepare job data for agents
    job_data = {
        "title": db_job.title,
        "description": db_job.description,
        "requirements": db_job.requirements or [],
        "location": db_job.location,
        "company_name": db_job.company_name,
        "company_highlights": db_job.company_highlights or [],
        "model_provider": db_job.model_provider or settings.MODEL_PROVIDER
    }

    # Start agent orchestrator in background
    asyncio.create_task(run_pipeline_background(job_id, job_data))

    return JobStartResponse(
        message="Finding more candidates",
        job_id=job_id,
        status=JobStatus.RUNNING.value
    )


# Candidate endpoints

@app.get("/api/candidates", response_model=List[Candidate], tags=["Candidates"])
async def list_candidates(job_id: str = None, db: Session = Depends(get_db)):
    """List candidates, optionally filtered by job_id"""
    query = db.query(DBCandidate)

    if job_id:
        query = query.filter(DBCandidate.job_id == job_id)

    db_candidates = query.order_by(DBCandidate.created_at.desc()).all()

    return [
        Candidate(
            id=c.id,
            job_id=c.job_id,
            username=c.username,
            profile_url=c.profile_url,
            avatar_url=c.avatar_url,
            bio=c.bio,
            location=c.location,
            created_at=c.created_at,
            analysis=CandidateAnalysis(
                fit_score=c.fit_score,
                skills=c.skills or [],
                strengths=c.strengths or [],
                concerns=c.concerns or [],
                top_repositories=c.top_repositories or []
            ) if c.fit_score is not None else None
        )
        for c in db_candidates
    ]


@app.get("/api/candidates/{candidate_id}", response_model=Candidate, tags=["Candidates"])
async def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Get candidate details"""
    db_candidate = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()

    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return Candidate(
        id=db_candidate.id,
        job_id=db_candidate.job_id,
        username=db_candidate.username,
        profile_url=db_candidate.profile_url,
        avatar_url=db_candidate.avatar_url,
        bio=db_candidate.bio,
        location=db_candidate.location,
        created_at=db_candidate.created_at,
        analysis=CandidateAnalysis(
            fit_score=db_candidate.fit_score,
            skills=db_candidate.skills or [],
            strengths=db_candidate.strengths or [],
            concerns=db_candidate.concerns or [],
            top_repositories=db_candidate.top_repositories or []
        ) if db_candidate.fit_score is not None else None
    )


@app.get("/api/candidates/{candidate_id}/message", response_model=OutreachMessage, tags=["Candidates"])
async def get_candidate_message(candidate_id: str, db: Session = Depends(get_db)):
    """Get outreach message for a candidate"""
    db_message = db.query(DBMessage).filter(DBMessage.candidate_id == candidate_id).first()

    if not db_message:
        raise HTTPException(status_code=404, detail="Message not found")

    return OutreachMessage(
        id=db_message.id,
        candidate_id=db_message.candidate_id,
        subject=db_message.subject,
        body=db_message.body,
        generated_at=db_message.generated_at
    )


# Semantic search endpoints (Weaviate)

@app.get("/api/search/candidates", tags=["Search"])
async def search_candidates_by_strengths(
    query: str,
    limit: int = 10
):
    """
    Search candidates using semantic similarity across ALL jobs.

    This endpoint searches the entire candidate pool globally, not filtered by job.
    A candidate who applied for one position might be perfect for another based on
    their strengths and skills.

    Args:
        query: Natural language query describing desired candidate strengths (min 3 chars)
        limit: Maximum number of results (default 10, max 100)

    Returns:
        List of candidates ranked by similarity across all jobs
    """
    # Input validation
    if not query or len(query.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Query must be at least 3 characters long"
        )

    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Limit must be at least 1"
        )
    try:
        # Run blocking Weaviate operations in thread pool to avoid blocking event loop
        # get_weaviate_service() can block during initialization (connection setup)
        weaviate_service = await asyncio.to_thread(get_weaviate_service)

        # search_by_strengths() performs blocking I/O (network calls to Weaviate)
        results = await asyncio.to_thread(
            weaviate_service.search_by_strengths,
            query=query.strip(),
            limit=limit
        )

        return {
            "query": query.strip(),
            "total_results": len(results),
            "candidates": results
        }
    except ValueError as e:
        # Configuration errors (missing env vars, etc.)
        logger.error(f"Weaviate configuration error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Vector search is not configured. Please check Weaviate settings."
        )
    except ConnectionError as e:
        # Weaviate service unavailable
        logger.error(f"Weaviate connection error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Vector search service is temporarily unavailable"
        )
    except Exception as e:
        # Other unexpected errors
        logger.error(f"Error searching candidates: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while searching candidates"
        )


@app.get("/api/vector/candidates", tags=["Vector"])
async def get_vector_candidates(
    job_id: str,
    min_fit_score: int = None
):
    """
    Get all candidates for a job from Weaviate vector database.

    Args:
        job_id: Job ID to filter by (required)
        min_fit_score: Minimum fit score threshold (optional)

    Returns:
        List of candidates from vector database
    """
    try:
        # Run blocking Weaviate operations in thread pool to avoid blocking event loop
        weaviate_service = await asyncio.to_thread(get_weaviate_service)

        # get_candidates_by_job() performs blocking I/O (network calls to Weaviate)
        results = await asyncio.to_thread(
            weaviate_service.get_candidates_by_job,
            job_id=job_id,
            min_fit_score=min_fit_score
        )

        return {
            "job_id": job_id,
            "min_fit_score": min_fit_score,
            "total_results": len(results),
            "candidates": results
        }
    except Exception as e:
        logger.error(f"Error retrieving candidates from vector database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint

@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time agent updates"""
    await ws_manager.connect(websocket, job_id)

    try:
        # Send initial connection confirmation
        await ws_manager.broadcast(job_id, "connected", {"message": "Connected to agent swarm"})

        # Keep connection alive and listen for client messages
        while True:
            # Receive messages from client (if any)
            data = await websocket.receive_text()
            logger.debug(f"Received from client: {data}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
        ws_manager.disconnect(websocket, job_id)
    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {e}")
        ws_manager.disconnect(websocket, job_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.BACKEND_PORT)
