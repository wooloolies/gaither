"""
Chat tools service for grounding AI responses with real data.
Provides tools for searching repositories, comparing candidates, analyzing activity, and web search.
"""
import logging
import asyncio
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from database import DBCandidate, DBJob
from services.github_service import GitHubService
from services.llm import get_llm_service

# Web search imports
try:
    from ddgs import DDGS
    DDGS_AVAILABLE = True
except ImportError:
    DDGS_AVAILABLE = False

logger = logging.getLogger(__name__)


class ChatToolService:
    """Service for executing grounding tools during chat conversations"""

    def __init__(self, db: Session, candidate_id: str, job_id: str):
        """
        Initialize chat tools service.

        Args:
            db: Database session
            candidate_id: ID of the candidate being discussed
            job_id: ID of the job the candidate is associated with
        """
        self.db = db
        self.candidate_id = candidate_id
        self.job_id = job_id
        self.github_service = GitHubService()

    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool and return its results.

        Args:
            tool_name: Name of the tool to execute
            arguments: Tool-specific arguments

        Returns:
            Tool execution results as dict

        Raises:
            ValueError: If tool name is unknown
        """
        tool_map = {
            "search_candidate_repositories": self._search_repos,
            "get_repository_details": self._get_repo_details,
            "compare_candidate_to_job": self._compare_to_job,
            "search_similar_candidates": self._search_similar,
            "analyze_github_activity": self._analyze_activity,
            "generate_interview_questions": self._generate_questions,
            "web_search": self._web_search,
        }

        if tool_name not in tool_map:
            logger.error(f"Unknown tool: {tool_name}")
            raise ValueError(f"Unknown tool: {tool_name}")

        logger.info(f"Executing tool: {tool_name} with arguments: {arguments}")

        try:
            result = await tool_map[tool_name](arguments)
            logger.info(f"Tool {tool_name} executed successfully")
            return result
        except Exception as e:
            logger.error(f"Tool {tool_name} failed: {e}")
            return {"error": str(e), "tool": tool_name}

    async def _search_repos(self, args: Dict) -> Dict:
        """
        Search through candidate's repositories for specific topics or technologies.

        Args:
            args: {"query": str, "limit": int (optional, default 5)}

        Returns:
            {"query": str, "total_matches": int, "repositories": List[dict]}
        """
        query = args.get("query", "").lower()
        limit = args.get("limit", 5)

        # Fetch candidate
        candidate = self.db.query(DBCandidate).filter_by(id=self.candidate_id).first()
        if not candidate:
            return {"error": "Candidate not found"}

        # Get all candidate's repositories from GitHub
        try:
            repos = await self.github_service.get_user_repos(
                candidate.username, sort="updated", per_page=30
            )
        except Exception as e:
            logger.error(f"Failed to fetch repos for {candidate.username}: {e}")
            return {"error": f"Failed to fetch repositories: {str(e)}"}

        # Search repos by name, description, or topics
        matching = []
        for repo in repos:
            name_match = query in repo.get("name", "").lower()
            desc_match = query in repo.get("description", "").lower() if repo.get("description") else False
            topic_match = any(query in topic.lower() for topic in repo.get("topics", []))

            if name_match or desc_match or topic_match:
                matching.append({
                    "name": repo.get("name"),
                    "description": repo.get("description"),
                    "language": repo.get("language"),
                    "stars": repo.get("stargazers_count", 0),
                    "url": repo.get("html_url"),
                    "topics": repo.get("topics", [])
                })

        return {
            "query": query,
            "total_matches": len(matching),
            "repositories": matching[:limit]
        }

    async def _get_repo_details(self, args: Dict) -> Dict:
        """
        Get detailed information about a specific repository.

        Args:
            args: {"repo_name": str, "include_readme": bool (optional, default False)}

        Returns:
            Detailed repo information with recent commits, languages, and contributors
        """
        repo_name = args.get("repo_name")
        include_readme = args.get("include_readme", False)

        if not repo_name:
            return {"error": "repo_name is required"}

        # Fetch candidate
        candidate = self.db.query(DBCandidate).filter_by(id=self.candidate_id).first()
        if not candidate:
            return {"error": "Candidate not found"}

        username = candidate.username

        try:
            # Fetch repo details, commits, and languages in parallel
            import asyncio
            repo_task = self.github_service.get_repo(username, repo_name)
            commits_task = self.github_service.get_repo_commits(username, repo_name, per_page=10)
            languages_task = self.github_service.get_repo_languages(username, repo_name)
            contributors_task = self.github_service.get_repo_contributors(username, repo_name, per_page=5)

            tasks = [repo_task, commits_task, languages_task, contributors_task]

            # Optionally fetch README
            if include_readme:
                readme_task = self.github_service.get_repo_readme(username, repo_name)
                tasks.append(readme_task)

            results = await asyncio.gather(*tasks, return_exceptions=True)

            repo_info = results[0] if not isinstance(results[0], Exception) else None
            commits = results[1] if not isinstance(results[1], Exception) else []
            languages = results[2] if not isinstance(results[2], Exception) else {}
            contributors = results[3] if not isinstance(results[3], Exception) else []
            readme = results[4] if len(results) > 4 and not isinstance(results[4], Exception) else None

            if not repo_info:
                return {"error": f"Repository '{repo_name}' not found for user '{username}'"}

            # Format recent commits
            recent_commits = [
                {
                    "message": commit.get("commit", {}).get("message", "").split("\n")[0],
                    "date": commit.get("commit", {}).get("author", {}).get("date"),
                    "author": commit.get("commit", {}).get("author", {}).get("name")
                }
                for commit in (commits or [])[:10]
            ]

            # Format languages (convert bytes to percentages)
            total_bytes = sum(languages.values()) if languages else 0
            language_breakdown = [
                {
                    "language": lang,
                    "percentage": round((bytes_count / total_bytes) * 100, 1) if total_bytes > 0 else 0
                }
                for lang, bytes_count in sorted(languages.items(), key=lambda x: x[1], reverse=True)
            ] if languages else []

            # Format contributors
            top_contributors = [
                {
                    "username": c.get("login"),
                    "contributions": c.get("contributions", 0),
                    "avatar_url": c.get("avatar_url")
                }
                for c in (contributors or [])[:5]
            ]

            result = {
                "name": repo_info.get("name"),
                "full_name": repo_info.get("full_name"),
                "description": repo_info.get("description"),
                "primary_language": repo_info.get("language"),
                "languages": language_breakdown,
                "stars": repo_info.get("stargazers_count", 0),
                "forks": repo_info.get("forks_count", 0),
                "watchers": repo_info.get("watchers_count", 0),
                "open_issues": repo_info.get("open_issues_count", 0),
                "url": repo_info.get("html_url"),
                "homepage": repo_info.get("homepage"),
                "topics": repo_info.get("topics", []),
                "is_fork": repo_info.get("fork", False),
                "default_branch": repo_info.get("default_branch"),
                "created_at": repo_info.get("created_at"),
                "updated_at": repo_info.get("updated_at"),
                "pushed_at": repo_info.get("pushed_at"),
                "recent_commits": recent_commits,
                "top_contributors": top_contributors,
                "license": repo_info.get("license", {}).get("name") if repo_info.get("license") else None
            }

            # Add README summary if requested
            if include_readme and readme:
                # Truncate README to first 500 chars for summary
                result["readme_summary"] = readme[:500] + "..." if len(readme) > 500 else readme

            return result

        except Exception as e:
            logger.error(f"Failed to get details for {username}/{repo_name}: {e}")
            return {"error": f"Failed to fetch repository details: {str(e)}"}

    async def _compare_to_job(self, args: Dict) -> Dict:
        """
        Compare candidate's skills and experience against job requirements.

        Args:
            args: {} (no arguments needed, uses candidate and job from context)

        Returns:
            Structured comparison with matched and missing requirements
        """
        # Fetch candidate and job
        candidate = self.db.query(DBCandidate).filter_by(id=self.candidate_id).first()
        job = self.db.query(DBJob).filter_by(id=self.job_id).first()

        if not candidate or not job:
            return {"error": "Candidate or job not found"}

        # Extract data
        candidate_skills = set(skill.lower() for skill in (candidate.skills or []))
        job_requirements = [req.lower() for req in (job.requirements or [])]

        # Match requirements
        matched_requirements = []
        missing_requirements = []

        for req in job_requirements:
            # Check if any candidate skill contains the requirement or vice versa
            is_match = any(
                req in skill or skill in req
                for skill in candidate_skills
            )

            if is_match:
                matched_requirements.append(req)
            else:
                missing_requirements.append(req)

        # Calculate match percentage
        total_reqs = len(job_requirements)
        match_percentage = (len(matched_requirements) / total_reqs * 100) if total_reqs > 0 else 0

        return {
            "job_title": job.title,
            "company": job.company_name,
            "candidate_fit_score": candidate.fit_score,
            "match_percentage": round(match_percentage, 1),
            "matched_requirements": matched_requirements,
            "missing_requirements": missing_requirements,
            "candidate_skills": list(candidate_skills),
            "strengths": candidate.strengths or [],
            "concerns": candidate.concerns or []
        }

    async def _search_similar(self, args: Dict) -> Dict:
        """
        Find candidates with similar skills for comparison.

        Args:
            args: {"skill_focus": str (optional), "limit": int (optional, default 3)}

        Returns:
            List of similar candidates with their skills and fit scores
        """
        skill_focus = args.get("skill_focus")
        limit = args.get("limit", 3)

        # Get current candidate
        current_candidate = self.db.query(DBCandidate).filter_by(id=self.candidate_id).first()
        if not current_candidate:
            return {"error": "Candidate not found"}

        # Get all candidates for the same job
        candidates = self.db.query(DBCandidate).filter(
            DBCandidate.job_id == self.job_id,
            DBCandidate.id != self.candidate_id
        ).all()

        if not candidates:
            return {
                "message": "No other candidates found for this job",
                "similar_candidates": []
            }

        # Calculate similarity scores
        current_skills = set(skill.lower() for skill in (current_candidate.skills or []))

        similar_candidates = []
        for candidate in candidates:
            candidate_skills = set(skill.lower() for skill in (candidate.skills or []))

            # If skill_focus is provided, prioritize candidates with that skill
            if skill_focus:
                has_focus_skill = skill_focus.lower() in candidate_skills
                if not has_focus_skill:
                    continue

            # Calculate Jaccard similarity (intersection / union)
            if len(current_skills) == 0 and len(candidate_skills) == 0:
                similarity = 0
            elif len(current_skills) == 0 or len(candidate_skills) == 0:
                similarity = 0
            else:
                intersection = len(current_skills & candidate_skills)
                union = len(current_skills | candidate_skills)
                similarity = intersection / union if union > 0 else 0

            similar_candidates.append({
                "username": candidate.username,
                "fit_score": candidate.fit_score,
                "skills": candidate.skills or [],
                "strengths": (candidate.strengths or [])[:2],  # Top 2 strengths
                "similarity_score": round(similarity * 100, 1),
                "shared_skills": list(current_skills & candidate_skills)
            })

        # Sort by similarity score (descending) and limit results
        similar_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

        return {
            "current_candidate": current_candidate.username,
            "skill_focus": skill_focus,
            "total_similar": len(similar_candidates),
            "similar_candidates": similar_candidates[:limit]
        }

    async def _analyze_activity(self, args: Dict) -> Dict:
        """
        Analyze candidate's recent GitHub activity patterns.

        Args:
            args: {"months": int (optional, default 6)}

        Returns:
            Activity summary with trends and active languages
        """
        months = args.get("months", 6)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)

        # Fetch candidate
        candidate = self.db.query(DBCandidate).filter_by(id=self.candidate_id).first()
        if not candidate:
            return {"error": "Candidate not found"}

        try:
            # Get all repositories sorted by most recently pushed
            repos = await self.github_service.get_user_repos(
                candidate.username, sort="pushed", per_page=50
            )

            # Analyze recent activity
            active_repos = []
            language_counts = {}

            for repo in repos:
                pushed_at = repo.get("pushed_at")
                if not pushed_at:
                    continue

                # Parse date
                pushed_date = datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))

                if pushed_date >= cutoff_date:
                    active_repos.append({
                        "name": repo.get("name"),
                        "language": repo.get("language"),
                        "last_activity": pushed_at,
                        "stars": repo.get("stargazers_count", 0)
                    })

                    # Count languages
                    lang = repo.get("language")
                    if lang:
                        language_counts[lang] = language_counts.get(lang, 0) + 1

            # Sort active repos by last activity
            active_repos.sort(key=lambda x: x["last_activity"], reverse=True)

            # Get top languages
            top_languages = sorted(language_counts.items(), key=lambda x: x[1], reverse=True)[:5]

            # Determine activity level
            active_repo_count = len(active_repos)
            if active_repo_count >= 10:
                activity_level = "Very Active"
            elif active_repo_count >= 5:
                activity_level = "Active"
            elif active_repo_count >= 2:
                activity_level = "Moderately Active"
            else:
                activity_level = "Low Activity"

            return {
                "analysis_period": f"Last {months} months",
                "activity_level": activity_level,
                "active_repositories_count": active_repo_count,
                "top_active_repos": active_repos[:10],
                "top_languages": [{"language": lang, "repo_count": count} for lang, count in top_languages],
                "most_recent_activity": active_repos[0]["last_activity"] if active_repos else None
            }

        except Exception as e:
            logger.error(f"Failed to analyze activity for {candidate.username}: {e}")
            return {"error": f"Failed to analyze activity: {str(e)}"}

    async def _generate_questions(self, args: Dict) -> Dict:
        """
        Generate interview questions based on candidate's profile.

        Args:
            args: {"focus_area": str (optional), "difficulty": str (optional, default "mid")}

        Returns:
            List of interview questions with rationale
        """
        focus_area = args.get("focus_area")
        difficulty = args.get("difficulty", "mid")

        # Fetch candidate and job
        candidate = self.db.query(DBCandidate).filter_by(id=self.candidate_id).first()
        job = self.db.query(DBJob).filter_by(id=self.job_id).first()

        if not candidate or not job:
            return {"error": "Candidate or job not found"}

        # Build context for LLM
        context = f"""Generate 5-7 interview questions for a candidate.

CANDIDATE: {candidate.username}
- Skills: {', '.join(candidate.skills or [])}
- Strengths: {', '.join(candidate.strengths or [])}
- Concerns: {', '.join(candidate.concerns or [])}
- Top Repositories: {', '.join([repo.get('name', '') for repo in (candidate.top_repositories or [])])}

JOB: {job.title} at {job.company_name}
- Requirements: {', '.join(job.requirements or [])}

INSTRUCTIONS:
- Generate {difficulty}-level questions
- {f'Focus on: {focus_area}' if focus_area else 'Cover various aspects of their experience'}
- Include questions about their repositories when relevant
- Address any concerns or gaps
- Questions should be specific to this candidate's background

Format each question as:
Q: [Question]
Rationale: [Why this question is relevant]
"""

        try:
            # Use LLM to generate questions (get job's model provider)
            llm_service = get_llm_service(job.model_provider)
            response = await llm_service.analyze(context, max_tokens=2000)

            # Parse response into structured format
            questions = []
            lines = response.strip().split("\n")
            current_question = None

            for line in lines:
                line = line.strip()
                if line.startswith("Q:"):
                    if current_question:
                        questions.append(current_question)
                    current_question = {"question": line[2:].strip(), "rationale": ""}
                elif line.startswith("Rationale:") and current_question:
                    current_question["rationale"] = line[10:].strip()

            if current_question:
                questions.append(current_question)

            return {
                "focus_area": focus_area or "general",
                "difficulty": difficulty,
                "total_questions": len(questions),
                "questions": questions
            }

        except Exception as e:
            logger.error(f"Failed to generate questions: {e}")
            return {"error": f"Failed to generate questions: {str(e)}"}

    async def _web_search(self, args: Dict) -> Dict:
        """
        Search the web for information about technologies, best practices, or any topic.

        Args:
            args: {
                "query": str - The search query,
                "max_results": int (optional, default 5) - Maximum number of results,
                "search_type": str (optional, default "text") - Type of search: "text" or "news"
            }

        Returns:
            {"query": str, "results": List[dict], "total_results": int}
        """
        query = args.get("query", "")
        max_results = args.get("max_results", 5)
        search_type = args.get("search_type", "text")

        if not query:
            return {"error": "query is required"}

        if not DDGS_AVAILABLE:
            return {
                "error": "Web search is not available. Please install duckduckgo_search: pip install duckduckgo_search"
            }

        logger.info(f"Web search: '{query}' (type: {search_type}, max: {max_results})")

        try:
            # Run blocking DuckDuckGo search in thread pool
            results = await asyncio.to_thread(
                self._perform_ddg_search,
                query,
                max_results,
                search_type
            )

            return {
                "query": query,
                "search_type": search_type,
                "total_results": len(results),
                "results": results
            }

        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return {"error": f"Web search failed: {str(e)}"}

    def _perform_ddg_search(self, query: str, max_results: int, search_type: str) -> List[Dict]:
        """
        Perform DuckDuckGo search (blocking operation).

        Args:
            query: Search query
            max_results: Maximum number of results
            search_type: "text" or "news"

        Returns:
            List of search results
        """
        results = []

        with DDGS() as ddgs:
            if search_type == "news":
                # Search news articles
                raw_results = list(ddgs.news(query, max_results=max_results))
                for r in raw_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "snippet": r.get("body", ""),
                        "source": r.get("source", ""),
                        "date": r.get("date", ""),
                        "type": "news"
                    })
            else:
                # Default text search
                raw_results = list(ddgs.text(query, max_results=max_results))
                for r in raw_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                        "type": "text"
                    })

        return results


def get_available_tools() -> List[Dict[str, Any]]:
    """
    Get tool definitions for LLM function calling.

    Returns:
        List of tool schemas in standard format (compatible with both Claude and Gemini)
    """
    return [
        {
            "name": "search_candidate_repositories",
            "description": "Search through the candidate's GitHub repositories for specific topics, technologies, or keywords. Use this to find repos related to specific frameworks, languages, or problem domains.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (e.g., 'machine learning', 'React', 'API')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of repositories to return (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        },
        {
            "name": "get_repository_details",
            "description": "Get detailed information about a specific repository, including recent commits, language breakdown, top contributors, and metadata. Use this to deep-dive into a particular project.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "repo_name": {
                        "type": "string",
                        "description": "Name of the repository (without username)"
                    },
                    "include_readme": {
                        "type": "boolean",
                        "description": "Whether to include a summary of the README file (default: false)",
                        "default": False
                    }
                },
                "required": ["repo_name"]
            }
        },
        {
            "name": "compare_candidate_to_job",
            "description": "Compare the candidate's skills and experience against the job requirements. Returns matched requirements, missing requirements, and match percentage.",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "name": "search_similar_candidates",
            "description": "Find other candidates for this job with similar skills. Useful for comparing candidates or understanding the talent pool.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "skill_focus": {
                        "type": "string",
                        "description": "Optional: Focus on candidates with a specific skill"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of similar candidates to return (default: 3)",
                        "default": 3
                    }
                },
                "required": []
            }
        },
        {
            "name": "analyze_github_activity",
            "description": "Analyze the candidate's recent GitHub activity patterns, including active repositories, languages used, and contribution frequency.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "months": {
                        "type": "integer",
                        "description": "Number of months to analyze (default: 6)",
                        "default": 6
                    }
                },
                "required": []
            }
        },
        {
            "name": "generate_interview_questions",
            "description": "Generate relevant interview questions based on the candidate's profile, skills, and the job requirements. Questions are tailored to the candidate's specific background.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "focus_area": {
                        "type": "string",
                        "description": "Optional: Specific area to focus questions on (e.g., 'Python', 'system design')"
                    },
                    "difficulty": {
                        "type": "string",
                        "description": "Question difficulty level: 'junior', 'mid', or 'senior' (default: 'mid')",
                        "enum": ["junior", "mid", "senior"],
                        "default": "mid"
                    }
                },
                "required": []
            }
        },
        {
            "name": "web_search",
            "description": "Search the web for current information about technologies, frameworks, best practices, industry trends, salary benchmarks, or any topic relevant to evaluating the candidate. Use this when you need up-to-date information that isn't available in the candidate's profile.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g., 'React 19 new features', 'Python best practices 2024', 'machine learning engineer salary')"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of search results to return (default: 5)",
                        "default": 5
                    },
                    "search_type": {
                        "type": "string",
                        "description": "Type of search: 'text' for general web search, 'news' for recent news articles (default: 'text')",
                        "enum": ["text", "news"],
                        "default": "text"
                    }
                },
                "required": ["query"]
            }
        }
    ]
