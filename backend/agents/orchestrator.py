"""
Orchestrator - Coordinates all agents in the recruiting pipeline.
"""
import asyncio
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from agents.hunter import HunterAgent
from agents.analyzer import AnalyzerAgent
from agents.engager import EngagerAgent
from database import DBJob, DBCandidate, DBMessage
from services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class RecruitingOrchestrator:
    """Coordinates the execution of all recruiting agents"""

    def __init__(self):
        self.hunter = HunterAgent()
        self.analyzer = AnalyzerAgent()
        self.engager = EngagerAgent()

    async def start_job(self, job_id: str, job_data: Dict[str, Any], db: Session):
        """
        Start the full recruiting pipeline for a job.

        Args:
            job_id: The job ID
            job_data: Job description and requirements
            db: Database session
        """
        try:
            logger.info(f"Starting recruiting pipeline for job {job_id}")

            # Create queues for agent communication
            hunter_to_analyzer_queue = asyncio.Queue()
            analyzer_to_engager_queue = asyncio.Queue()

            # Run all agents concurrently
            hunter_task = asyncio.create_task(
                self.hunter.execute(job_id, job_data, hunter_to_analyzer_queue)
            )

            analyzer_task = asyncio.create_task(
                self.analyzer.execute(
                    job_id,
                    job_data,
                    hunter_to_analyzer_queue,
                    analyzer_to_engager_queue
                )
            )

            engager_task = asyncio.create_task(
                self.engager.execute(
                    job_id,
                    job_data,
                    analyzer_to_engager_queue
                )
            )

            # Wait for all agents to complete
            await hunter_task
            await analyzer_task
            candidates_with_messages = await engager_task

            # Save results to database
            await self._save_results(job_id, candidates_with_messages, db)

            # Update job status
            db_job = db.query(DBJob).filter(DBJob.id == job_id).first()
            if db_job:
                db_job.status = "completed"
                db.commit()

            # Emit pipeline completion event
            await ws_manager.broadcast(job_id, "pipeline.completed", {
                "total_candidates": len(candidates_with_messages),
                "average_score": sum(c["analysis"]["fit_score"] for c in candidates_with_messages) // len(candidates_with_messages) if candidates_with_messages else 0,
                "messages_generated": len(candidates_with_messages)
            })

            logger.info(f"Pipeline completed for job {job_id}: {len(candidates_with_messages)} candidates processed")

        except Exception as e:
            logger.error(f"Error in recruiting pipeline for job {job_id}: {e}")

            # Update job status to failed
            db_job = db.query(DBJob).filter(DBJob.id == job_id).first()
            if db_job:
                db_job.status = "failed"
                db.commit()

            raise

    async def _save_results(
        self,
        job_id: str,
        candidates: list,
        db: Session
    ):
        """
        Save candidates and messages to database.

        Args:
            job_id: The job ID
            candidates: List of candidates with analysis and messages
            db: Database session
        """
        try:
            for candidate in candidates:
                analysis = candidate.get("analysis", {})
                message = candidate.get("message", {})

                # Create candidate record
                db_candidate = DBCandidate(
                    job_id=job_id,
                    username=candidate["username"],
                    profile_url=candidate["profile_url"],
                    avatar_url=candidate.get("avatar_url"),
                    bio=candidate.get("bio"),
                    location=candidate.get("location"),
                    fit_score=analysis.get("fit_score"),
                    skills=analysis.get("skills", []),
                    strengths=analysis.get("strengths", []),
                    concerns=analysis.get("concerns", []),
                    top_repositories=analysis.get("top_repositories", [])
                )

                db.add(db_candidate)
                db.flush()  # Get candidate ID

                # Create message record
                if message:
                    db_message = DBMessage(
                        candidate_id=db_candidate.id,
                        subject=message.get("subject", ""),
                        body=message.get("body", "")
                    )
                    db.add(db_message)

            db.commit()
            logger.info(f"Saved {len(candidates)} candidates to database")

        except Exception as e:
            logger.error(f"Error saving results to database: {e}")
            db.rollback()
            raise


# Global orchestrator instance
orchestrator = RecruitingOrchestrator()
