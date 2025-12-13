"""
Analyzer Agent - Evaluates candidate skills and generates fit scores.
"""
import asyncio
import logging
from typing import Dict, Any, List
from agents.base import BaseAgent
from services.claude_service import claude_service
from services.github_service import github_service

logger = logging.getLogger(__name__)


class AnalyzerAgent(BaseAgent):
    """Agent responsible for analyzing candidate technical skills"""

    def __init__(self):
        super().__init__("analyzer")

    async def execute(
        self,
        job_id: str,
        job_data: Dict[str, Any],
        input_queue: asyncio.Queue,
        output_queue: asyncio.Queue
    ):
        """
        Analyze candidates from the Hunter agent.

        Args:
            job_id: The job ID
            job_data: Job description and requirements
            input_queue: Queue receiving candidates from Hunter
            output_queue: Queue to send analyzed candidates to Engager
        """
        try:
            while True:
                # Get candidate from Hunter
                candidate = await input_queue.get()

                # None signals end of candidates
                if candidate is None:
                    await output_queue.put(None)
                    break

                await self.emit_event(
                    "started",
                    {"candidate": candidate["username"]},
                    job_id,
                    message=f"🧠 Analyzing @{candidate['username']}'s technical skills..."
                )

                # Analyze the candidate
                analysis = await self._analyze_candidate(candidate, job_data, job_id)

                if analysis:
                    # Add analysis to candidate
                    candidate["analysis"] = analysis

                    # Send to Engager
                    await output_queue.put(candidate)

                    # Emit completion event
                    await self.emit_event(
                        "completed",
                        {
                            "candidate_id": f"{job_id}_{candidate['username']}",
                            "username": candidate["username"],
                            "profile_url": candidate["profile_url"],
                            "avatar_url": candidate.get("avatar_url"),
                            "fit_score": analysis["fit_score"],
                            "skills": analysis["skills"],
                            "strengths": analysis["strengths"]
                        },
                        job_id,
                        message=f"✨ @{candidate['username']} scored {analysis['fit_score']}/100 - {', '.join(analysis['skills'][:3])}"
                    )

                # Small delay for demo visibility
                await asyncio.sleep(1)

            logger.info("Analyzer agent completed")

        except Exception as e:
            logger.error(f"Analyzer agent error: {e}")
            await output_queue.put(None)
            raise

    async def _analyze_candidate(
        self,
        candidate: Dict[str, Any],
        job_data: Dict[str, Any],
        job_id: str
    ) -> Dict[str, Any]:
        """
        Analyze a candidate's GitHub profile and generate fit score.

        Args:
            candidate: Candidate profile data
            job_data: Job requirements
            job_id: Job ID for event emission

        Returns:
            Analysis results with fit score and skills
        """
        try:
            username = candidate["username"]

            # Fetch candidate's repositories
            repos = await github_service.get_user_repos(username, per_page=10)

            if not repos:
                logger.warning(f"No repos found for {username}")
                return None

            # Get top repos by stars
            top_repos = sorted(repos, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:5]

            # Emit repo analysis events
            for repo in top_repos[:3]:
                await self.emit_event(
                    "repo_analyzed",
                    {
                        "repo": repo["name"],
                        "stars": repo.get("stargazers_count", 0),
                        "language": repo.get("language", "Unknown")
                    },
                    job_id,
                    message=f"📦 Reviewing project: {repo['name']} (⭐ {repo.get('stargazers_count', 0)}, {repo.get('language', 'Unknown')})"
                )
                await asyncio.sleep(0.3)

            # Sample commit messages from top repo
            commit_messages = []
            if top_repos:
                commits = await github_service.get_repo_commits(
                    username,
                    top_repos[0]["name"],
                    per_page=5
                )
                commit_messages = [
                    commit["commit"]["message"].split("\n")[0]
                    for commit in commits
                ]

            # Build analysis prompt for Claude
            analysis_result = await self._claude_analyze(
                candidate,
                top_repos,
                commit_messages,
                job_data
            )

            return analysis_result

        except Exception as e:
            logger.error(f"Error analyzing candidate {candidate.get('username')}: {e}")
            return None

    async def _claude_analyze(
        self,
        candidate: Dict[str, Any],
        repos: List[Dict[str, Any]],
        commit_messages: List[str],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Use Claude to analyze candidate fit.

        Args:
            candidate: Candidate profile
            repos: List of repositories
            commit_messages: Sample commit messages
            job_data: Job requirements

        Returns:
            Analysis with fit score, skills, and strengths
        """
        # Build repository summary
        repo_summary = "\n".join([
            f"- {repo['name']}: {repo.get('description', 'No description')} "
            f"(⭐ {repo.get('stargazers_count', 0)}, Language: {repo.get('language', 'Unknown')})"
            for repo in repos[:5]
        ])

        prompt = f"""
Analyze this GitHub profile for the following role:

JOB TITLE: {job_data.get('title', '')}
JOB DESCRIPTION: {job_data.get('description', '')}

CANDIDATE PROFILE:
Username: {candidate['username']}
Bio: {candidate.get('bio', 'No bio')}
Location: {candidate.get('location', 'Unknown')}
Public Repos: {candidate.get('public_repos', 0)}
Followers: {candidate.get('followers', 0)}

TOP REPOSITORIES:
{repo_summary}

RECENT COMMIT MESSAGES:
{chr(10).join(f'- {msg}' for msg in commit_messages[:5])}

Based on this information, evaluate:
1. Technical skill level and fit for the role (0-100 score)
2. Main technical skills demonstrated
3. Key strengths (3-5 specific points)
4. Any concerns (if any)

Be specific and reference actual projects or indicators from their profile.
"""

        schema = {
            "type": "object",
            "properties": {
                "fit_score": {
                    "type": "integer",
                    "description": "Overall fit score from 0-100"
                },
                "skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of technical skills (5-10)"
                },
                "strengths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Key strengths with specific examples (3-5 points)"
                },
                "concerns": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Any concerns or gaps (0-2 points)"
                },
                "top_repositories": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "stars": {"type": "integer"},
                            "description": {"type": "string"}
                        }
                    },
                    "description": "Top 3 repositories with context"
                }
            },
            "required": ["fit_score", "skills", "strengths", "concerns", "top_repositories"]
        }

        try:
            analysis = await claude_service.function_call(
                prompt=prompt,
                function_name="analyze_candidate",
                schema=schema,
                max_tokens=2000
            )

            logger.info(f"Analyzed {candidate['username']}: score {analysis.get('fit_score', 0)}")
            return analysis

        except Exception as e:
            logger.error(f"Error in Claude analysis: {e}")
            # Return fallback analysis
            return {
                "fit_score": 50,
                "skills": ["GitHub contributor"],
                "strengths": ["Active on GitHub"],
                "concerns": ["Analysis failed - manual review needed"],
                "top_repositories": [{"name": repo["name"], "stars": repo.get("stargazers_count", 0), "description": repo.get("description", "")} for repo in repos[:3]]
            }
