"""
Hunter Agent - Finds candidates matching job descriptions.
"""
import asyncio
import logging
from typing import Dict, List, Any
from agents.base import BaseAgent
from services.llm import llm_service
from services.github_service import github_service
from config import settings

logger = logging.getLogger(__name__)


class HunterAgent(BaseAgent):
    """Agent responsible for finding candidate profiles"""

    def __init__(self):
        super().__init__("hunter")

    async def execute(
        self,
        job_id: str,
        job_data: Dict[str, Any],
        output_queue: asyncio.Queue
    ):
        """
        Find candidates matching the job description.

        Args:
            job_id: The job ID
            job_data: Job description and requirements
            output_queue: Queue to send found candidates to Analyzer
        """
        try:
            await self.emit_event(
                "search_started",
                {"job_title": job_data.get("title", "Unknown")},
                job_id,
                message=f"🔍 Searching GitHub for {job_data.get('title', 'candidates')}..."
            )

            # Store location for use in search
            self._current_job_location = job_data.get("location")

            # Step 1: Extract keywords from job description
            keywords = await self._extract_keywords(job_data)

            # Step 2: Search GitHub for candidates (multi-strategy)
            candidates = await self._search_github(keywords)

            # Step 3: Send candidates to analyzer queue
            for candidate in candidates:
                await output_queue.put(candidate)
                await self.emit_event(
                    "profile_found",
                    {
                        "username": candidate["username"],
                        "url": candidate["profile_url"],
                        "avatar_url": candidate.get("avatar_url")
                    },
                    job_id,
                    message=f"✅ Found candidate: @{candidate['username']}"
                )

                # Small delay to make demo more visible
                await asyncio.sleep(0.5)

            await self.emit_event(
                "search_completed",
                {"total_found": len(candidates)},
                job_id,
                message=f"🎯 Search complete: Found {len(candidates)} qualified candidates"
            )

            # Signal end of candidates
            await output_queue.put(None)

            logger.info(f"Hunter completed: found {len(candidates)} candidates")

        except Exception as e:
            logger.error(f"Hunter agent error: {e}")
            await output_queue.put(None)
            raise

    async def _extract_keywords(self, job_data: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Extract search keywords from job description using LLM.

        Args:
            job_data: Job description and requirements

        Returns:
            Dictionary with programming_languages, frameworks, domains, and location
        """
        location = job_data.get('location', '')

        prompt = f"""
Extract search keywords from this job description to find candidates on GitHub:

Title: {job_data.get('title', '')}
Company: {job_data.get('company', '')}
Location: {location}
Description: {job_data.get('description', '')}
Requirements: {', '.join(job_data.get('requirements', []))}

Extract the most relevant:
1. Programming languages (e.g., Python, JavaScript, Go) - MAX 2
2. Frameworks/technologies (e.g., PyTorch, TensorFlow, React, Kubernetes) - MAX 5, prioritize the most specific
3. Domain areas (e.g., machine learning, backend, DevOps)
4. Seniority level (junior, mid, senior, staff)

Focus on technical skills that can be verified through GitHub activity.
Prioritize frameworks over generic terms.
"""

        schema = {
            "type": "object",
            "properties": {
                "programming_languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Main programming languages (max 2)"
                },
                "frameworks": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific frameworks and technologies (max 5)"
                },
                "domains": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Domain areas or specializations"
                },
                "seniority": {
                    "type": "string",
                    "description": "Required seniority level"
                }
            },
            "required": ["programming_languages", "frameworks", "domains"]
        }

        try:
            keywords = await llm_service.function_call(
                prompt=prompt,
                function_name="extract_keywords",
                schema=schema
            )
            logger.info(f"Extracted keywords: {keywords}")
            return keywords
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            # Fallback to basic extraction
            return {
                "programming_languages": ["Python"],
                "frameworks": [],
                "domains": []
            }

    async def _search_github(self, keywords: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """
        Search GitHub for candidates using targeted, multi-faceted search strategy.

        Args:
            keywords: Extracted keywords from job description

        Returns:
            List of candidate profile data (actual hireable individuals)
        """
        candidates = []
        seen_usernames = set()

        try:
            languages = keywords.get("programming_languages", [])
            frameworks = keywords.get("frameworks", [])

            # Extract location from job_data (passed through in execute)
            job_location = getattr(self, '_current_job_location', None)
            if isinstance(job_location, str):
                job_location = job_location.strip() or None

            def _fmt_location(loc: str) -> str:
                # Quote multi-word locations to avoid turning it into AND terms.
                # e.g. location:"San Francisco"
                if any(ch.isspace() for ch in loc):
                    return f'location:"{loc}"'
                return f"location:{loc}"

            # Strategy 1: Search by specific frameworks/technologies in repos
            # This finds people who actually USE the tech, not just know the language
            framework_queries = []
            for framework in frameworks[:3]:  # Top 3 frameworks
                fw_lower = framework.lower()
                # Expand list of searchable frameworks
                if any(tech in fw_lower for tech in [
                    'pytorch', 'tensorflow', 'langchain', 'hugging', 'transformers',
                    'react', 'vue', 'angular', 'django', 'flask', 'fastapi',
                    'kubernetes', 'docker', 'terraform', 'kafka', 'spark'
                ]):
                    framework_queries.append(fw_lower)

            for fw in framework_queries:
                query_parts = [
                    # User search does NOT support repo "description" qualifier.
                    # Use bio to find people who claim/use the tech.
                    f"{fw} in:bio",
                    "type:user",  # CRITICAL: Only individual users, not organizations
                    "repos:>5",  # At least 5 repos (shows sustained activity)
                    "followers:5..1000"  # Sweet spot: experienced but not celebrity/org
                ]

                # Add location if specified
                if job_location:
                    query_parts.append(_fmt_location(job_location))

                query = " ".join(query_parts)
                logger.info(f"GitHub search query (framework): {query}")

                users = await github_service.search_users(query, per_page=settings.MAX_CANDIDATES_PER_JOB)
                candidates.extend(await self._process_github_users(users, seen_usernames))

                if len(candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                    break

                await asyncio.sleep(0.3)

            # Strategy 2: Language-specific search with quality filters
            if len(candidates) < settings.MAX_CANDIDATES_PER_JOB and languages:
                query_parts = [
                    f"language:{languages[0]}",
                    "type:user",
                    "repos:>5",
                    "followers:10..500",  # Avoid celebrities and orgs
                    "created:<2023-01-01"  # Account older than 2 years (established developers)
                ]

                # Add location if specified
                if job_location:
                    query_parts.append(_fmt_location(job_location))

                query = " ".join(query_parts)
                logger.info(f"GitHub search query (language): {query}")

                users = await github_service.search_users(query, per_page=settings.MAX_CANDIDATES_PER_JOB * 2)
                candidates.extend(await self._process_github_users(users, seen_usernames))

            # Strategy 3: Search for specific tech combinations in bio
            if len(candidates) < settings.MAX_CANDIDATES_PER_JOB and len(frameworks) >= 2:
                # Combine top 2 frameworks for more targeted search
                combined = f"{frameworks[0]} {frameworks[1]}"
                query_parts = [
                    f"{combined} in:bio",
                    "type:user",
                    "repos:>3",
                    "followers:>5"
                ]

                # Add location if specified
                if job_location:
                    query_parts.append(_fmt_location(job_location))

                query = " ".join(query_parts)
                logger.info(f"GitHub search query (combined): {query}")

                users = await github_service.search_users(query, per_page=settings.MAX_CANDIDATES_PER_JOB)
                candidates.extend(await self._process_github_users(users, seen_usernames))

            logger.info(f"Found {len(candidates)} candidates on GitHub (after filtering)")

        except Exception as e:
            logger.error(f"Error searching GitHub: {e}")

        return candidates[:settings.MAX_CANDIDATES_PER_JOB]

    async def _process_github_users(
        self,
        users: List[Dict],
        seen_usernames: set
    ) -> List[Dict[str, Any]]:
        """
        Process and filter GitHub users to find actual hireable candidates.

        Filters out:
        - Organizations (type != User)
        - Duplicate users
        - Users with suspicious patterns (too many/too few repos)
        - Educational/tutorial-only accounts
        """
        candidates = []

        for user in users:
            username = user["login"]

            # Skip duplicates
            if username in seen_usernames:
                continue

            # Get full user profile
            user_profile = await github_service.get_user(username)

            if not user_profile:
                continue

            # CRITICAL FILTER: Skip organizations
            if user_profile.get("type") == "Organization":
                logger.info(f"Skipping organization: {username}")
                continue

            # Skip users with company name patterns (likely org accounts)
            bio = (user_profile.get("bio") or "").lower()
            name = (user_profile.get("name") or "").lower()
            if any(org in bio or org in name for org in ["organization", "company", "official", "team"]):
                logger.info(f"Skipping company account: {username}")
                continue

            # Check for real individual activity
            public_repos = user_profile.get("public_repos", 0)
            followers = user_profile.get("followers", 0)
            following = user_profile.get("following", 0)

            # Filter out tutorial/education-only accounts
            # These typically have many repos but low engagement
            if public_repos > 100 and followers < 50:
                logger.info(f"Skipping tutorial account: {username} (too many repos, low followers)")
                continue

            # Filter out inactive accounts
            if public_repos < 3:
                continue

            # Filter out bot-like accounts (following way more than followers)
            if following > followers * 3 and followers > 10:
                logger.info(f"Skipping bot-like account: {username}")
                continue

            candidate = {
                "username": user_profile["login"],
                "profile_url": user_profile["html_url"],
                "avatar_url": user_profile.get("avatar_url"),
                "bio": user_profile.get("bio"),
                "name": user_profile.get("name"),
                "location": user_profile.get("location"),
                "email": user_profile.get("email"),
                "hireable": user_profile.get("hireable"),
                "company": user_profile.get("company"),
                "public_repos": public_repos,
                "followers": followers,
                "following": following,
            }

            candidates.append(candidate)
            seen_usernames.add(username)

            # Rate limiting
            await asyncio.sleep(0.2)

        return candidates
