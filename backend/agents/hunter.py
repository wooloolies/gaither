"""
Hunter Agent - Finds candidates matching job descriptions.
"""
import asyncio
import logging
from typing import Dict, List, Any
from agents.base import BaseAgent
from services.llm import get_llm_service
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
        Extract comprehensive search keywords from job description using LLM with semantic understanding.

        Args:
            job_data: Job description and requirements

        Returns:
            Dictionary with programming_languages, frameworks, domains, related_technologies, and search_terms
        """
        location = job_data.get('location', '')

        prompt = f"""
Analyze this job description and extract comprehensive search keywords to find the BEST matching candidates on GitHub.

Title: {job_data.get('title', '')}
Company: {job_data.get('company', '')}
Location: {location}
Description: {job_data.get('description', '')}
Requirements: {', '.join(job_data.get('requirements', []))}

Extract and categorize:

1. **core_languages**: Primary programming languages (max 3) - prioritize languages that will appear in repositories
   Examples: Python, JavaScript, Go, Rust, Java, TypeScript

2. **primary_frameworks**: Most important frameworks/libraries (max 4) - these are MUST-HAVEs
   Examples: React, PyTorch, TensorFlow, Kubernetes, Django, FastAPI, Next.js

3. **related_technologies**: Related/complementary technologies (max 6) - these show broader expertise
   Include: databases (PostgreSQL, MongoDB), tools (Docker, Git), cloud (AWS, GCP), etc.

4. **repository_topics**: GitHub topics that relevant repositories might have (max 5)
   Examples: machine-learning, deep-learning, web-development, devops, artificial-intelligence

5. **domain_keywords**: Domain-specific terms for bio/profile search (max 4)
   Examples: "machine learning engineer", "full-stack developer", "MLOps", "data scientist"

6. **seniority_level**: junior, mid-level, senior, or staff

7. **alternative_terms**: Alternative names for key technologies (max 5)
   Examples: ML→machine learning, k8s→kubernetes, postgres→postgresql, js→javascript

Think about:
- What repositories would this person have?
- What would be in their GitHub bio?
- What topics would their repos be tagged with?
- What related technologies should they know?

Be specific and prioritize searchable, verifiable terms over generic descriptions.
"""

        schema = {
            "type": "object",
            "properties": {
                "core_languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Primary programming languages (max 3)"
                },
                "primary_frameworks": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Must-have frameworks and technologies (max 4)"
                },
                "related_technologies": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Related/complementary technologies (max 6)"
                },
                "repository_topics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "GitHub repository topics (max 5)"
                },
                "domain_keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Domain-specific terms for profiles (max 4)"
                },
                "seniority_level": {
                    "type": "string",
                    "description": "Required seniority: junior, mid-level, senior, or staff"
                },
                "alternative_terms": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Alternative names for key technologies (max 5)"
                }
            },
            "required": ["core_languages", "primary_frameworks", "related_technologies", "repository_topics", "domain_keywords"]
        }

        try:
            # Get LLM service based on job's model provider
            llm_service = get_llm_service(job_data.get("model_provider"))

            keywords = await llm_service.function_call(
                prompt=prompt,
                function_name="extract_comprehensive_keywords",
                schema=schema
            )
            logger.info(f"Extracted comprehensive keywords: {keywords}")
            return keywords
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            # Fallback to basic extraction
            return {
                "core_languages": ["Python"],
                "primary_frameworks": [],
                "related_technologies": [],
                "repository_topics": [],
                "domain_keywords": []
            }

    async def _search_github(self, keywords: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """
        Advanced multi-strategy GitHub search to find highly relevant, active candidates.

        Strategies:
        1. Repository topic + recent activity search
        2. Primary framework + language combination search
        3. Domain expertise search (bio + repos + activity)
        4. Related technology stack search
        5. Alternative terms search

        Args:
            keywords: Comprehensive extracted keywords from job description

        Returns:
            List of high-quality candidate profile data (actual hireable individuals)
        """
        candidates = []
        seen_usernames = set()

        try:
            # Extract keyword categories
            core_languages = keywords.get("core_languages", [])
            primary_frameworks = keywords.get("primary_frameworks", [])
            related_tech = keywords.get("related_technologies", [])
            repo_topics = keywords.get("repository_topics", [])
            domain_keywords = keywords.get("domain_keywords", [])
            alt_terms = keywords.get("alternative_terms", [])

            # Get date threshold for account age filtering
            from datetime import datetime, timedelta
            one_year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

            # Extract location from job_data (passed through in execute)
            job_location = getattr(self, '_current_job_location', None)
            if isinstance(job_location, str):
                job_location = job_location.strip() or None

            def _fmt_location(loc: str) -> str:
                if any(ch.isspace() for ch in loc):
                    return f'location:"{loc}"'
                return f"location:{loc}"

            logger.info(f"🎯 Starting advanced GitHub search with {len(primary_frameworks)} primary frameworks, "
                       f"{len(core_languages)} languages, {len(repo_topics)} topics")

            # ==================================================================
            # STRATEGY 1: Repository Topics + Recent Activity
            # Find developers with repos tagged with relevant topics who are ACTIVE
            # ==================================================================
            if repo_topics and len(candidates) < settings.MAX_CANDIDATES_PER_JOB:
                for topic in repo_topics[:3]:  # Top 3 most relevant topics
                    query_parts = [
                        f"{topic.replace(' ', '-')} in:bio",  # Topics often appear in bio
                        "type:user",
                        "repos:>3",
                        f"created:<{one_year_ago}",  # Account at least 1 year old
                        "followers:>5"  # Minimum to filter spam/bot accounts only
                    ]

                    if job_location:
                        query_parts.append(_fmt_location(job_location))

                    query = " ".join(query_parts)
                    logger.info(f"🔍 Strategy 1 (Topic + Activity): {query}")

                    users = await github_service.search_users(query, per_page=15)
                    new_candidates = await self._process_github_users(users, seen_usernames, check_recent_activity=True)
                    candidates.extend(new_candidates)

                    logger.info(f"  → Found {len(new_candidates)} candidates from topic '{topic}'")

                    if len(candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                        break

                    await asyncio.sleep(0.4)

            # ==================================================================
            # STRATEGY 2: Primary Framework + Language Combination
            # Find experts who use specific tech stack combinations
            # ==================================================================
            if primary_frameworks and core_languages and len(candidates) < settings.MAX_CANDIDATES_PER_JOB:
                for framework in primary_frameworks[:2]:  # Top 2 must-have frameworks
                    for language in core_languages[:2]:  # Top 2 languages
                        query_parts = [
                            f"{framework} in:bio",
                            f"language:{language}",
                            "type:user",
                            "repos:>5",
                            "followers:>3"  # Minimal filter for spam only
                        ]

                        if job_location:
                            query_parts.append(_fmt_location(job_location))

                        query = " ".join(query_parts)
                        logger.info(f"🔍 Strategy 2 (Framework + Language): {query}")

                        users = await github_service.search_users(query, per_page=10)
                        new_candidates = await self._process_github_users(users, seen_usernames, check_recent_activity=True)
                        candidates.extend(new_candidates)

                        logger.info(f"  → Found {len(new_candidates)} candidates for {framework} + {language}")

                        if len(candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                            break

                        await asyncio.sleep(0.4)

                    if len(candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                        break

            # ==================================================================
            # STRATEGY 3: Domain Expertise Search
            # Find people who self-identify with domain keywords and have quality repos
            # ==================================================================
            if domain_keywords and len(candidates) < settings.MAX_CANDIDATES_PER_JOB:
                for domain_kw in domain_keywords[:2]:  # Top 2 domain keywords
                    # Use quotes for multi-word domains
                    search_term = f'"{domain_kw}"' if ' ' in domain_kw else domain_kw

                    query_parts = [
                        f"{search_term} in:bio",
                        "type:user",
                        "repos:>5",
                        f"created:<{one_year_ago}"
                        # No follower constraint - let quality scoring handle it
                    ]

                    if core_languages:
                        query_parts.append(f"language:{core_languages[0]}")

                    if job_location:
                        query_parts.append(_fmt_location(job_location))

                    query = " ".join(query_parts)
                    logger.info(f"🔍 Strategy 3 (Domain Expertise): {query}")

                    users = await github_service.search_users(query, per_page=12)
                    new_candidates = await self._process_github_users(users, seen_usernames, check_recent_activity=True)
                    candidates.extend(new_candidates)

                    logger.info(f"  → Found {len(new_candidates)} domain experts for '{domain_kw}'")

                    if len(candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                        break

                    await asyncio.sleep(0.4)

            # ==================================================================
            # STRATEGY 4: Technology Stack Search
            # Combine multiple related technologies to find well-rounded developers
            # ==================================================================
            if len(related_tech) >= 2 and len(candidates) < settings.MAX_CANDIDATES_PER_JOB:
                # Combine technologies that often go together
                tech_combo = f"{related_tech[0]} {related_tech[1]}"

                query_parts = [
                    f"{tech_combo} in:bio",
                    "type:user",
                    "repos:>7"  # More repos = more experienced
                    # No follower constraint - tech skills matter, not popularity
                ]

                if job_location:
                    query_parts.append(_fmt_location(job_location))

                query = " ".join(query_parts)
                logger.info(f"🔍 Strategy 4 (Tech Stack): {query}")

                users = await github_service.search_users(query, per_page=10)
                new_candidates = await self._process_github_users(users, seen_usernames, check_recent_activity=True)
                candidates.extend(new_candidates)

                logger.info(f"  → Found {len(new_candidates)} candidates with tech stack combination")

                await asyncio.sleep(0.4)

            # ==================================================================
            # STRATEGY 5: Alternative Terms Search
            # Use alternative names/abbreviations for technologies
            # ==================================================================
            if alt_terms and len(candidates) < settings.MAX_CANDIDATES_PER_JOB:
                for alt_term in alt_terms[:2]:
                    query_parts = [
                        f"{alt_term} in:bio",
                        "type:user",
                        "repos:>5"
                        # No follower constraint - alternative terms might be used by niche experts
                    ]

                    if core_languages:
                        query_parts.append(f"language:{core_languages[0]}")

                    if job_location:
                        query_parts.append(_fmt_location(job_location))

                    query = " ".join(query_parts)
                    logger.info(f"🔍 Strategy 5 (Alternative Terms): {query}")

                    users = await github_service.search_users(query, per_page=8)
                    new_candidates = await self._process_github_users(users, seen_usernames, check_recent_activity=True)
                    candidates.extend(new_candidates)

                    logger.info(f"  → Found {len(new_candidates)} candidates using alternative term '{alt_term}'")

                    if len(candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                        break

                    await asyncio.sleep(0.4)

            logger.info(f"✅ Advanced search complete: Found {len(candidates)} high-quality candidates")

        except Exception as e:
            logger.error(f"Error in advanced GitHub search: {e}")

        # Return top candidates (sorted by quality if we have extras)
        return candidates[:settings.MAX_CANDIDATES_PER_JOB]

    async def _process_github_users(
        self,
        users: List[Dict],
        seen_usernames: set,
        check_recent_activity: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Process and filter GitHub users with advanced quality checks.

        Filters out:
        - Organizations (type != User)
        - Duplicate users
        - Inactive users (no recent contributions if check_recent_activity=True)
        - Low-quality profiles (tutorial-only, bots, fake accounts)
        - Users with suspicious activity patterns

        Args:
            users: List of GitHub user search results
            seen_usernames: Set of already processed usernames
            check_recent_activity: Whether to check for recent repository activity

        Returns:
            List of high-quality candidate profiles
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
                logger.debug(f"Skipping organization: {username}")
                continue

            # Skip users with company name patterns (likely org accounts)
            bio = (user_profile.get("bio") or "").lower()
            name = (user_profile.get("name") or "").lower()
            if any(org in bio or org in name for org in ["organization", "company", "official", "team"]):
                logger.debug(f"Skipping company account: {username}")
                continue

            # Extract metrics
            public_repos = user_profile.get("public_repos", 0)
            followers = user_profile.get("followers", 0)
            following = user_profile.get("following", 0)
            created_at = user_profile.get("created_at", "")

            # Filter out tutorial/education-only accounts
            # These typically have many repos but low engagement
            if public_repos > 100 and followers < 50:
                logger.debug(f"Skipping tutorial account: {username} (too many repos, low followers)")
                continue

            # Filter out inactive accounts (too few repos)
            if public_repos < 3:
                logger.debug(f"Skipping low-activity account: {username} (< 3 repos)")
                continue

            # Filter out bot-like accounts (following way more than followers)
            if following > followers * 3 and followers > 10:
                logger.debug(f"Skipping bot-like account: {username}")
                continue

            # Bio check: Allow empty bio if they have strong activity signals
            # Some talented developers don't maintain GitHub bios
            has_bio = bio and len(bio.strip()) > 0
            has_strong_activity = public_repos >= 10 or followers >= 50

            # Skip only if: no bio AND weak activity (likely spam/bot)
            if not has_bio and not has_strong_activity:
                logger.debug(f"Skipping account with no bio and weak activity: {username}")
                continue

            # ==================================================================
            # RECENT ACTIVITY CHECK
            # Fetch user's repos and check for recent contributions
            # ==================================================================
            if check_recent_activity:
                has_recent_activity = await self._check_recent_activity(username)
                if not has_recent_activity:
                    logger.debug(f"Skipping inactive user: {username} (no activity in 6 months)")
                    continue

            # ==================================================================
            # QUALITY SCORING
            # Calculate a simple quality score based on multiple signals
            # ==================================================================
            quality_score = self._calculate_quality_score(user_profile)

            # Only include candidates with a minimum quality score
            if quality_score < 3:  # Score range: 0-10
                logger.debug(f"Skipping low-quality profile: {username} (score: {quality_score})")
                continue

            # Build candidate profile
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
                "quality_score": quality_score,  # Add quality score for potential ranking
                "created_at": created_at,
            }

            candidates.append(candidate)
            seen_usernames.add(username)

            logger.info(f"✅ Quality candidate: @{username} (score: {quality_score}/10)")

            # Rate limiting
            await asyncio.sleep(0.2)

        return candidates

    async def _check_recent_activity(self, username: str) -> bool:
        """
        Check if a user has recent GitHub activity (within last 6 months).

        Args:
            username: GitHub username

        Returns:
            True if user has recent activity, False otherwise
        """
        try:
            from datetime import datetime, timedelta

            # Get user's recent repositories (sorted by pushed date)
            repos = await github_service.get_user_repos(username, sort="pushed", per_page=5)

            if not repos:
                return False

            # Check if any repo was updated in the last 6 months
            six_months_ago = datetime.now() - timedelta(days=180)

            for repo in repos[:5]:  # Check top 5 most recently pushed repos
                pushed_at = repo.get("pushed_at")
                if pushed_at:
                    # Parse ISO datetime
                    pushed_date = datetime.strptime(pushed_at[:19], "%Y-%m-%dT%H:%M:%S")
                    if pushed_date > six_months_ago:
                        return True

            return False

        except Exception as e:
            logger.warning(f"Error checking recent activity for {username}: {e}")
            # If we can't check, don't filter out (benefit of doubt)
            return True

    def _calculate_quality_score(self, user_profile: Dict[str, Any]) -> int:
        """
        Calculate a quality score for a GitHub user profile (0-10).

        Balanced scoring that doesn't over-emphasize followers.
        Focus on genuine activity signals over popularity metrics.

        Factors:
        - Public repos count (max 3 points) - shows sustained activity
        - Bio completeness (max 2 points) - shows professionalism
        - Profile completeness (2 points) - name, location, company/email
        - Followers (max 2 points) - considered but not primary
        - Hireable flag (1 point) - shows job-seeking intent
        - Engagement ratio (1 point bonus) - quality over quantity

        Args:
            user_profile: GitHub user profile data

        Returns:
            Quality score (0-10)
        """
        score = 0

        # Public repos (max 3 points) - PRIMARY signal of activity
        repos = user_profile.get("public_repos", 0)
        if repos >= 20:
            score += 3
        elif repos >= 10:
            score += 2
        elif repos >= 5:
            score += 1

        # Bio completeness (max 2 points) - shows professionalism
        bio = user_profile.get("bio") or ""
        bio_length = len(bio.strip())
        if bio_length >= 50:
            score += 2
        elif bio_length >= 20:
            score += 1

        # Profile completeness (2 points total)
        # Has name (1 point)
        if user_profile.get("name"):
            score += 1

        # Has location OR (email/company) (1 point)
        if user_profile.get("location") or user_profile.get("email") or user_profile.get("company"):
            score += 1

        # Followers (max 2 points) - REDUCED weight, still considered
        followers = user_profile.get("followers", 0)
        if followers >= 100:
            score += 2
        elif followers >= 25:
            score += 1
        # 0-24 followers = 0 points (still acceptable!)

        # Hireable flag (1 point) - actively looking
        if user_profile.get("hireable"):
            score += 1

        # Bonus: Healthy engagement ratio (1 point)
        # Quality engagement matters more than raw follower count
        followers = user_profile.get("followers", 0)
        following = user_profile.get("following", 0)
        if followers > 0 and following > 0:
            ratio = followers / following
            if 0.3 <= ratio <= 10:  # Very flexible range - avoids spam but allows different styles
                score += 1

        return min(score, 10)  # Cap at 10
