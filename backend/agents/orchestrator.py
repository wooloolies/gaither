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
from services.weaviate import get_weaviate_service

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
        Save candidates and messages to database (SQLite + Weaviate).

        Args:
            job_id: The job ID
            candidates: List of candidates with analysis and messages
            db: Database session
        """
        try:
            # Get Weaviate service for vector storage (optional - don't fail if misconfigured)
            # Run in thread pool to avoid blocking event loop during connection setup
            weaviate_service = None
            try:
                weaviate_service = await asyncio.to_thread(get_weaviate_service)
            except Exception as weaviate_init_error:
                # Log error but continue with SQLite-only saves
                logger.warning(f"Weaviate service unavailable, continuing with SQLite-only saves: {weaviate_init_error}")

            for candidate in candidates:
                analysis = candidate.get("analysis", {})
                message = candidate.get("message", {})

                # Create candidate record in SQLite
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

                # Store in Weaviate for semantic search (if service is available)
                # Run in thread pool to avoid blocking event loop during I/O operations
                if weaviate_service is not None:
                    try:
                        await asyncio.to_thread(
                            weaviate_service.store_candidate,
                            candidate_id=db_candidate.id,
                            job_id=job_id,
                            username=candidate["username"],
                            profile_url=candidate["profile_url"],
                            strengths=analysis.get("strengths", []),
                            concerns=analysis.get("concerns", []),
                            skills=analysis.get("skills", []),
                            fit_score=analysis.get("fit_score", 0),
                            location=candidate.get("location"),
                            bio=candidate.get("bio")
                        )
                        logger.info(f"Stored candidate {candidate['username']} in Weaviate")
                    except Exception as weaviate_error:
                        # Log error but don't fail the entire save operation
                        logger.error(f"Failed to store candidate in Weaviate: {weaviate_error}")

                # Create message record
                if message:
                    db_message = DBMessage(
                        candidate_id=db_candidate.id,
                        subject=message.get("subject", ""),
                        body=message.get("body", "")
                    )
                    db.add(db_message)

            db.commit()
            weaviate_status = "and Weaviate" if weaviate_service is not None else "(Weaviate unavailable)"
            logger.info(f"Saved {len(candidates)} candidates to SQLite {weaviate_status}")

        except Exception as e:
            logger.error(f"Error saving results to database: {e}")
            db.rollback()
            raise


# Global orchestrator instance
orchestrator = RecruitingOrchestrator()
