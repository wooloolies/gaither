"""
Candidate API endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, DBCandidate, DBMessage
from models import Candidate, CandidateAnalysis, OutreachMessage
from agents.orchestrator import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


def db_candidate_to_response(c: DBCandidate) -> Candidate:
    """Convert DBCandidate to Candidate response model."""
    return Candidate(
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


@router.get("", response_model=List[Candidate])
async def list_candidates(job_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List candidates, optionally filtered by job_id."""
    query = db.query(DBCandidate)

    if job_id:
        query = query.filter(DBCandidate.job_id == job_id)

    db_candidates = query.order_by(DBCandidate.created_at.desc()).all()
    return [db_candidate_to_response(c) for c in db_candidates]


@router.get("/{candidate_id}", response_model=Candidate)
async def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Get candidate details."""
    db_candidate = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()

    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return db_candidate_to_response(db_candidate)


@router.get("/{candidate_id}/message", response_model=OutreachMessage)
async def get_candidate_message(candidate_id: str, db: Session = Depends(get_db)):
    """Get outreach message for a candidate."""
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


@router.post("/{candidate_id}/generate-message", response_model=OutreachMessage)
async def generate_candidate_message(
    candidate_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate outreach message for a candidate on-demand.
    This triggers the Engager agent for just this specific candidate.
    """
    # Verify candidate exists
    db_candidate = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Check if message already exists
    existing_message = db.query(DBMessage).filter(DBMessage.candidate_id == candidate_id).first()
    if existing_message:
        logger.info(f"Message already exists for candidate {candidate_id}, returning existing")
        return OutreachMessage(
            id=existing_message.id,
            candidate_id=existing_message.candidate_id,
            subject=existing_message.subject,
            body=existing_message.body,
            generated_at=existing_message.generated_at
        )

    try:
        # Generate message using orchestrator (also saves to DB)
        await orchestrator.generate_message_for_candidate(
            candidate_id=candidate_id,
            job_id=db_candidate.job_id,
            db=db
        )

        # Fetch the saved message from DB to get id and generated_at
        db_message = db.query(DBMessage).filter(DBMessage.candidate_id == candidate_id).first()
        if not db_message:
            raise HTTPException(status_code=500, detail="Message generation failed")

        logger.info(f"Generated message for candidate {candidate_id}")

        return OutreachMessage(
            id=db_message.id,
            candidate_id=db_message.candidate_id,
            subject=db_message.subject,
            body=db_message.body,
            generated_at=db_message.generated_at
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating message for candidate {candidate_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate message")


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Delete a candidate."""
    db_candidate = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()

    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    try:
        # Delete associated message
        db.query(DBMessage).filter(DBMessage.candidate_id == candidate_id).delete()
        db.delete(db_candidate)
        db.commit()

        logger.info(f"Deleted candidate {candidate_id}")
        return {"message": "Candidate deleted", "candidate_id": candidate_id}
    except Exception as e:
        logger.error(f"Error deleting candidate: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete candidate")


