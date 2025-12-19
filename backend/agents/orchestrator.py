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
from services.neo4j.service import get_neo4j_service

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

            # Fetch existing candidates for this job to avoid duplicates
            existing_candidates = db.query(DBCandidate).filter(
                DBCandidate.job_id == job_id
            ).all()
            existing_usernames = {c.username for c in existing_candidates}

            if existing_usernames:
                logger.info(f"Found {len(existing_usernames)} existing candidates, will exclude them from search")

            # Create queues for agent communication
            hunter_to_analyzer_queue = asyncio.Queue()
            analyzer_output_queue = asyncio.Queue()

            # Run Hunter and Analyzer only (Engager is now on-demand)
            hunter_task = asyncio.create_task(
                self.hunter.execute(job_id, job_data, hunter_to_analyzer_queue, existing_usernames)
            )

            analyzer_task = asyncio.create_task(
                self.analyzer.execute(
                    job_id,
                    job_data,
                    hunter_to_analyzer_queue,
                    analyzer_output_queue
                )
            )

            # Wait for Hunter and Analyzer to complete
            await hunter_task
            await analyzer_task

            # Collect analyzed candidates (without messages)
            analyzed_candidates = []
            while not analyzer_output_queue.empty():
                candidate = await analyzer_output_queue.get()
                if candidate is not None:
                    analyzed_candidates.append(candidate)

            # Save candidates to database (without messages)
            await self._save_results(job_id, analyzed_candidates, db)

            # Update job status
            db_job = db.query(DBJob).filter(DBJob.id == job_id).first()
            if db_job:
                db_job.status = "completed"
                db.commit()

            # Emit pipeline completion event
            # Note: messages_generated is not included because messages are now generated on-demand
            await ws_manager.broadcast(job_id, "pipeline.completed", {
                "total_candidates": len(analyzed_candidates),
                "average_score": sum(c["analysis"]["fit_score"] for c in analyzed_candidates) // len(analyzed_candidates) if analyzed_candidates else 0
            })

            logger.info(f"Pipeline completed for job {job_id}: {len(analyzed_candidates)} candidates analyzed (messages will be generated on-demand)")

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

        Uses upsert logic to prevent duplicates:
        - If candidate (username) already exists for this job, update their data
        - If candidate is new, create a new record

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
                logger.warning(f"Weaviate service unavailable: {weaviate_init_error}")

            # Get Neo4j service for graph storage (optional)
            neo4j_service = None
            try:
                neo4j_service = await asyncio.to_thread(get_neo4j_service)
            except Exception as neo4j_init_error:
                logger.warning(f"Neo4j service unavailable: {neo4j_init_error}")

            for candidate in candidates:
                analysis = candidate.get("analysis", {})
                message = candidate.get("message", {})

                # Check if candidate already exists for this job (by username)
                existing_candidate = db.query(DBCandidate).filter(
                    DBCandidate.job_id == job_id,
                    DBCandidate.username == candidate["username"]
                ).first()

                if existing_candidate:
                    # Update existing candidate with new analysis
                    logger.info(f"Updating existing candidate: {candidate['username']} for job {job_id}")
                    existing_candidate.profile_url = candidate["profile_url"]
                    existing_candidate.avatar_url = candidate.get("avatar_url")
                    existing_candidate.bio = candidate.get("bio")
                    existing_candidate.location = candidate.get("location")
                    existing_candidate.fit_score = analysis.get("fit_score")
                    existing_candidate.skills = analysis.get("skills", [])
                    existing_candidate.strengths = analysis.get("strengths", [])
                    existing_candidate.concerns = analysis.get("concerns", [])
                    existing_candidate.top_repositories = analysis.get("top_repositories", [])

                    db_candidate = existing_candidate
                else:
                    # Create new candidate record with pre-generated UUID from Analyzer
                    logger.info(f"Creating new candidate: {candidate['username']} for job {job_id}")
                    db_candidate = DBCandidate(
                        id=candidate.get("id"),  # Use pre-generated UUID from Analyzer
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

                # Store in Neo4j for graph relationships (if service is available)
                if neo4j_service is not None:
                    try:
                        await asyncio.to_thread(
                            neo4j_service.store_candidate,
                            candidate_id=str(db_candidate.id), # pass db ID as string if needed, or keep using username as ID logic
                            job_id=job_id,
                            username=candidate["username"],
                            profile_url=candidate["profile_url"],
                            avatar_url=candidate.get("avatar_url"),
                            strengths=analysis.get("strengths", []),
                            concerns=analysis.get("concerns", []),
                            skills=analysis.get("skills", []),
                            fit_score=analysis.get("fit_score", 0),
                            location=candidate.get("location"),
                            bio=candidate.get("bio"),
                            top_repo=analysis.get("top_repositories", []),
                            education=[] # Add education if available in candidate data
                        )
                        logger.info(f"Stored candidate {candidate['username']} in Neo4j")
                    except Exception as neo4j_error:
                        logger.error(f"Failed to store candidate in Neo4j: {neo4j_error}")

                # Messages are now generated on-demand, not in pipeline
                # Skip message creation here
                message = candidate.get("message")
                if message:
                    # Only save if message was explicitly generated (e.g., via on-demand endpoint)
                    existing_message = db.query(DBMessage).filter(
                        DBMessage.candidate_id == db_candidate.id
                    ).first()

                    if existing_message:
                        existing_message.subject = message.get("subject", "")
                        existing_message.body = message.get("body", "")
                    else:
                        db_message = DBMessage(
                            candidate_id=db_candidate.id,
                            subject=message.get("subject", ""),
                            body=message.get("body", "")
                        )
                        db.add(db_message)

            db.commit()
            weaviate_status = "and Weaviate" if weaviate_service is not None else "(Weaviate unavailable)"
            neo4j_status = ", Neo4j" if neo4j_service is not None else "(Neo4j unavailable)"
            logger.info(f"Saved {len(candidates)} candidates to SQLite {weaviate_status} {neo4j_status}")

        except Exception as e:
            logger.error(f"Error saving results to database: {e}")
            db.rollback()
            raise

    async def generate_message_for_candidate(
        self,
        candidate_id: str,
        job_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Generate outreach message for a specific candidate on-demand.

        Args:
            candidate_id: The candidate UUID
            job_id: The job ID
            db: Database session

        Returns:
            Dictionary with message subject and body
        """
        try:
            # Fetch candidate from database
            candidate_db = db.query(DBCandidate).filter(DBCandidate.id == candidate_id).first()
            if not candidate_db:
                raise ValueError(f"Candidate {candidate_id} not found")

            # Fetch job from database
            job_db = db.query(DBJob).filter(DBJob.id == job_id).first()
            if not job_db:
                raise ValueError(f"Job {job_id} not found")

            # Prepare job data
            recruiter_data = job_db.recruiter_form_data or {}
            job_data = {
                "title": job_db.title,
                "description": job_db.description,
                "company_name": job_db.company_name,
                "model_provider": job_db.model_provider,
                "key_responsibilities": recruiter_data.get("key_responsibilities") or job_db.description,
                "recruiter_name": recruiter_data.get("recruiter_name"),
            }

            # Prepare candidate data
            candidate_data = {
                "id": candidate_db.id,
                "username": candidate_db.username,
                "profile_url": candidate_db.profile_url,
                "bio": candidate_db.bio,
                "location": candidate_db.location,
                "analysis": {
                    "fit_score": candidate_db.fit_score,
                    "skills": candidate_db.skills or [],
                    "strengths": candidate_db.strengths or [],
                    "concerns": candidate_db.concerns or [],
                    "top_repositories": candidate_db.top_repositories or []
                }
            }

            # Emit engager started event for UI animation
            await ws_manager.broadcast(job_id, "engager.started", {
                "candidate": candidate_db.username,
                "message": f"💬 Writing personalized message for @{candidate_db.username}..."
            })

            # Generate message using Engager
            logger.info(f"Generating message for candidate {candidate_db.username}")
            message = await self.engager._generate_message(candidate_data, job_data)

            if message:
                # Save message to database
                existing_message = db.query(DBMessage).filter(
                    DBMessage.candidate_id == candidate_id
                ).first()

                if existing_message:
                    existing_message.subject = message.get("subject", "")
                    existing_message.body = message.get("body", "")
                else:
                    db_message = DBMessage(
                        candidate_id=candidate_id,
                        subject=message.get("subject", ""),
                        body=message.get("body", "")
                    )
                    db.add(db_message)

                db.commit()
                logger.info(f"Saved message for candidate {candidate_db.username}")

                # Emit message generated event for UI animation
                await ws_manager.broadcast(job_id, "engager.message_generated", {
                    "candidate": candidate_db.username,
                    "subject": message.get("subject", ""),
                    "preview": message.get("body", "")[:100] + "...",
                    "message": f"📧 Message ready for @{candidate_db.username}: \"{message.get('subject', '')}\""
                })

                # Emit engager completed event to reset UI state
                await ws_manager.broadcast(job_id, "engager.completed", {
                    "candidate": candidate_db.username,
                    "message": f"✅ Message complete for @{candidate_db.username}"
                })

                return message
            else:
                raise ValueError("Failed to generate message")

        except Exception as e:
            logger.error(f"Error generating message for candidate {candidate_id}: {e}")
            db.rollback()
            raise


# Global orchestrator instance
orchestrator = RecruitingOrchestrator()
