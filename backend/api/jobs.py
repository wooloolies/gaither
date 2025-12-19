"""
Job API endpoints.
"""
import asyncio
import hashlib
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config import settings
from database import get_db, DBJob, DBCandidate
from models import JobCreate, Job, JobStatus, JobStartResponse
from agents.orchestrator import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def calculate_job_content_hash(title: str, company_name: str, key_responsibilities: str = '') -> str:
    """
    Calculate a hash of job content for duplicate detection.
    """
    key_resp = (key_responsibilities or "").strip().lower()
    content = f"{title.strip().lower()}|{company_name.strip().lower()}|{key_resp}"
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def db_job_to_response(db_job: DBJob) -> Job:
    """Convert DBJob to Job response model."""
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


def prepare_job_data(db_job: DBJob) -> dict:
    """Prepare job data dict for agent pipeline."""
    recruiter_data = db_job.recruiter_form_data or {}
    return {
        "title": db_job.title,
        "description": db_job.description,
        "requirements": db_job.requirements or [],
        "location": db_job.location,
        "company_name": db_job.company_name,
        "company_highlights": db_job.company_highlights or [],
        "model_provider": db_job.model_provider or settings.MODEL_PROVIDER,
        "key_responsibilities": recruiter_data.get("key_responsibilities") or db_job.description,
        "recruiter_name": recruiter_data.get("recruiter_name"),
        "language_requirement": recruiter_data.get("language_requirement"),
        "core_skill_requirement": recruiter_data.get("core_skill_requirement"),
        "familiar_with": recruiter_data.get("familiar_with"),
        "work_type": recruiter_data.get("work_type"),
        "years_of_experience": recruiter_data.get("years_of_experience"),
        "minimum_required_degree": recruiter_data.get("minimum_required_degree"),
        "grade": recruiter_data.get("grade"),
    }


async def run_pipeline_background(job_id: str, job_data: dict):
    """Run the agent pipeline in the background."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        await orchestrator.start_job(job_id, job_data, db)
    except Exception as e:
        logger.error(f"Error in background pipeline: {e}")
    finally:
        db.close()


@router.post("", response_model=Job)
async def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new recruiting job.

    Uses content-based duplicate detection: if a job with identical content already exists,
    returns the existing job instead of creating a duplicate.
    """
    try:
        model_provider = job_data.model_provider or settings.MODEL_PROVIDER
        key_responsibilities = job_data.key_responsibilities or job_data.description

        content_hash = calculate_job_content_hash(
            title=job_data.title,
            company_name=job_data.company_name,
            key_responsibilities=key_responsibilities
        )

        # Check for duplicate jobs
        existing_job = db.query(DBJob).filter(DBJob.content_hash == content_hash).first()

        if existing_job:
            logger.info(f"Duplicate job detected, returning existing job: {existing_job.id}")
            return db_job_to_response(existing_job)

        # Prepare recruiter form data
        recruiter_form_data = {
            "recruiter_name": job_data.recruiter_name,
            "language_requirement": job_data.language_requirement,
            "key_responsibilities": job_data.key_responsibilities,
            "core_skill_requirement": job_data.core_skill_requirement,
            "familiar_with": job_data.familiar_with,
            "work_type": job_data.work_type,
            "years_of_experience": job_data.years_of_experience,
            "minimum_required_degree": job_data.minimum_required_degree,
            "grade": job_data.grade,
        }
        recruiter_form_data = {k: v for k, v in recruiter_form_data.items() if v is not None}

        # Create new job
        db_job = DBJob(
            title=job_data.title,
            description=job_data.description,
            requirements=job_data.requirements,
            location=job_data.location,
            company_name=job_data.company_name,
            company_highlights=job_data.company_highlights,
            model_provider=model_provider,
            content_hash=content_hash,
            status=JobStatus.PENDING.value,
            recruiter_form_data=recruiter_form_data if recruiter_form_data else None
        )

        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        logger.info(f"Created new job: {db_job.id} - {db_job.title}")
        return db_job_to_response(db_job)

    except Exception as e:
        logger.error(f"Error creating job: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get job details by ID."""
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job_to_response(db_job)


@router.get("", response_model=List[Job])
async def list_jobs(db: Session = Depends(get_db)):
    """List all jobs."""
    db_jobs = db.query(DBJob).order_by(DBJob.created_at.desc()).all()
    return [db_job_to_response(job) for job in db_jobs]


@router.post("/{job_id}/start", response_model=JobStartResponse)
async def start_job(job_id: str, db: Session = Depends(get_db)):
    """Start the agent pipeline for a job."""
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()

    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if db_job.status == JobStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Job is already running")

    db_job.status = JobStatus.RUNNING.value
    db.commit()

    logger.info(f"Starting agent pipeline for job {job_id}")
    job_data = prepare_job_data(db_job)
    asyncio.create_task(run_pipeline_background(job_id, job_data))

    return JobStartResponse(
        message="Agent pipeline started",
        job_id=job_id,
        status=JobStatus.RUNNING.value
    )


@router.post("/{job_id}/find-more", response_model=JobStartResponse)
async def find_more_candidates(job_id: str, db: Session = Depends(get_db)):
    """
    Find more candidates for an existing job.
    Re-runs the pipeline but excludes already-found candidates.
    """
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()

    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if db_job.status == JobStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Job is already running")

    db_job.status = JobStatus.RUNNING.value
    db.commit()

    logger.info(f"Finding more candidates for job {job_id}")
    job_data = prepare_job_data(db_job)
    asyncio.create_task(run_pipeline_background(job_id, job_data))

    return JobStartResponse(
        message="Finding more candidates",
        job_id=job_id,
        status=JobStatus.RUNNING.value
    )


@router.delete("/{job_id}")
async def delete_job(job_id: str, db: Session = Depends(get_db)):
    """Delete a job and all associated data."""
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()

    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if db_job.status == JobStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Cannot delete a running job")

    try:
        # Delete associated candidates first
        db.query(DBCandidate).filter(DBCandidate.job_id == job_id).delete()
        db.delete(db_job)
        db.commit()

        logger.info(f"Deleted job {job_id}")
        return {"message": "Job deleted", "job_id": job_id}
    except Exception as e:
        logger.error(f"Error deleting job: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete job")


