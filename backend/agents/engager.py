"""
Engager Agent - Generates personalized outreach messages.
"""
import asyncio
import logging
from typing import Dict, Any, List
from agents.base import BaseAgent
from services.llm import get_llm_service

logger = logging.getLogger(__name__)


class EngagerAgent(BaseAgent):
    """Agent responsible for generating personalized outreach messages"""

    def __init__(self):
        super().__init__("engager")

    async def execute(
        self,
        job_id: str,
        job_data: Dict[str, Any],
        input_queue: asyncio.Queue
    ) -> List[Dict[str, Any]]:
        """
        [DEPRECATED - BATCH MODE]

        This method is no longer used in the pipeline to save API costs.
        Messages are now generated on-demand via:
        - orchestrator.generate_message_for_candidate() (backend)
        - POST /api/candidates/{candidate_id}/generate-message (API)
        - CandidateCard "Generate Message" button (frontend)

        Kept for potential future batch operations if needed.

        Original functionality:
        Generate outreach messages for analyzed candidates.

        Args:
            job_id: The job ID
            job_data: Job description and company info
            input_queue: Queue receiving analyzed candidates from Analyzer

        Returns:
            List of candidates with messages
        """
        candidates_with_messages = []

        try:
            while True:
                # Get candidate from Analyzer
                candidate = await input_queue.get()

                # None signals end of candidates
                if candidate is None:
                    break

                await self.emit_event(
                    "started",
                    {"candidate": candidate["username"]},
                    job_id,
                    message=f"💬 Writing personalized message for @{candidate['username']}..."
                )

                # Generate personalized message
                message = await self._generate_message(candidate, job_data)

                if message:
                    candidate["message"] = message
                    candidates_with_messages.append(candidate)

                    # Emit completion event
                    await self.emit_event(
                        "message_generated",
                        {
                            "candidate": candidate["username"],
                            "subject": message["subject"],
                            "preview": message["body"][:100] + "..."
                        },
                        job_id,
                        message=f"📧 Message ready for @{candidate['username']}: \"{message['subject']}\""
                    )

                # Small delay for demo visibility
                await asyncio.sleep(0.8)

            logger.info(f"Engager completed: generated {len(candidates_with_messages)} messages")
            return candidates_with_messages

        except Exception as e:
            logger.error(f"Engager agent error: {e}")
            raise

    async def _generate_message(
        self,
        candidate: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate a personalized outreach message using LLM.

        Args:
            candidate: Candidate with analysis
            job_data: Job and company information

        Returns:
            Dictionary with subject and body
        """
        try:
            analysis = candidate.get("analysis", {})
            username = candidate["username"]

            # Get top project for personalization
            top_repos = analysis.get("top_repositories", [])
            top_project = top_repos[0]["name"] if top_repos else "your projects"

            prompt = f"""
Write a personalized recruiting outreach message for this candidate:

CANDIDATE:
- Username: {username}
- GitHub: {candidate.get('profile_url', '')}
- Fit Score: {analysis.get('fit_score', 0)}/100
- Top Skills: {', '.join(analysis.get('skills', [])[:5])}
- Notable Project: {top_project}
- Key Strength: {analysis.get('strengths', [''])[0] if analysis.get('strengths') else 'GitHub contributions'}

OUR COMPANY & ROLE:
- Company: {job_data.get('company_name', 'Our Company')}
- Role: {job_data.get('title', '')}
- Description: {(job_data.get('key_responsibilities') or job_data.get('description', ''))[:200]}

REQUIREMENTS:
1. Professional but warm and genuine tone
2. Mention their specific project "{top_project}" and why it impressed you
3. Connect their skills to our role's needs
4. Keep under 200 words
5. Include a clear call-to-action
6. Make it feel personal, not templated

Write both a subject line and message body.
"""

            schema = {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Email subject line (engaging, specific, under 60 chars)"
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body (professional, personalized, under 200 words)"
                    }
                },
                "required": ["subject", "body"]
            }

            # Get LLM service based on job's model provider
            llm_service = get_llm_service(job_data.get("model_provider"))

            message = await llm_service.function_call(
                prompt=prompt,
                function_name="generate_message",
                schema=schema,
                max_tokens=1000
            )

            logger.info(f"Generated message for {username}")
            return message

        except Exception as e:
            logger.error(f"Error generating message for {candidate.get('username')}: {e}")
            # Fallback message
            return {
                "subject": f"Opportunity at {job_data.get('company_name', 'our company')}",
                "body": f"Hi {candidate['username']},\n\nI came across your GitHub profile and was impressed by your work. We have an exciting opportunity that might interest you.\n\nWould you be open to a conversation?\n\nBest regards"
            }
