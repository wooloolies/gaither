"""
Hunter Agent - Finds candidates matching job descriptions.
Features: Parallel search strategies, caching, progress events, rate limit handling.
"""
import asyncio
import logging
import random
from typing import Dict, List, Any, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from agents.base import BaseAgent
from services.llm import get_llm_service
from services.github_service import github_service, RateLimitError
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class SearchStrategy:
    """Represents a single search strategy with its results"""
    name: str
    description: str
    query: str
    page: int = 1
    per_page: int = 10


@dataclass
class SearchResult:
    """Result from a single search strategy"""
    strategy_name: str
    candidates: List[Dict[str, Any]]
    success: bool
    error: str = None


class HunterAgent(BaseAgent):
    """Agent responsible for finding candidate profiles with parallel search strategies"""

    def __init__(self):
        super().__init__("hunter")
        self._processed_usernames: Set[str] = set()

    async def execute(
        self,
        job_id: str,
        job_data: Dict[str, Any],
        output_queue: asyncio.Queue,
        existing_usernames: set = None
    ):
        """
        Find candidates matching the job description using parallel search strategies.

        Args:
            job_id: The job ID
            job_data: Job description and requirements
            output_queue: Queue to send found candidates to Analyzer
            existing_usernames: Set of usernames already found for this job (to exclude)
        """
        try:
            await self.emit_event(
                "search_started",
                {"job_title": job_data.get("title", "Unknown")},
                job_id,
                message=f"🔍 Starting parallel search for {job_data.get('title', 'candidates')}..."
            )

            # Initialize tracking
            self._processed_usernames = set(existing_usernames) if existing_usernames else set()
            self._current_job_location = job_data.get("location")
            
            # Log rate limit status before starting
            rate_status = github_service.get_rate_limit_status()
            logger.info(f"Rate limit status - Core: {rate_status['core']['remaining']}, Search: {rate_status['search']['remaining']}")

            # Step 1: Extract keywords from job description
            await self.emit_event(
                "strategy_progress",
                {"phase": "keyword_extraction", "progress": "1/3"},
                job_id,
                message="📝 Analyzing job requirements..."
            )
            
            keywords = await self._extract_keywords(job_data)

            # Step 2: Build search strategies
            await self.emit_event(
                "strategy_progress",
                {"phase": "building_strategies", "progress": "2/3"},
                job_id,
                message="🎯 Building search strategies..."
            )
            
            strategies = self._build_search_strategies(keywords, len(self._processed_usernames))

            # Step 3: Execute strategies in parallel
            await self.emit_event(
                "strategy_progress",
                {"phase": "parallel_search", "progress": "3/3", "strategy_count": len(strategies)},
                job_id,
                message=f"⚡ Running {len(strategies)} search strategies in parallel..."
            )
            
            candidates = await self._execute_parallel_searches(strategies, job_id)

            # Step 4: Send candidates to analyzer queue
            for candidate in candidates:
                await output_queue.put(candidate)
                await self.emit_event(
                    "profile_found",
                    {
                        "username": candidate["username"],
                        "url": candidate["profile_url"],
                        "avatar_url": candidate.get("avatar_url"),
                        "quality_score": candidate.get("quality_score", 0)
                    },
                    job_id,
                    message=f"✅ Found candidate: @{candidate['username']} (quality: {candidate.get('quality_score', 0)}/10)"
                )
                await asyncio.sleep(0.3)

            await self.emit_event(
                "search_completed",
                {
                    "total_found": len(candidates),
                    "strategies_used": len(strategies),
                    "excluded_existing": len(existing_usernames) if existing_usernames else 0
                },
                job_id,
                message=f"🎯 Search complete: Found {len(candidates)} qualified candidates"
            )

            # Signal end of candidates
            await output_queue.put(None)
            logger.info(f"Hunter completed: found {len(candidates)} candidates")

        except RateLimitError as e:
            logger.error(f"Rate limit exceeded: {e}")
            await self.emit_event(
                "rate_limit_error",
                {"reset_time": e.reset_time, "message": str(e)},
                job_id,
                message="⚠️ GitHub rate limit reached. Try again later."
            )
            await output_queue.put(None)
            raise
        except Exception as e:
            logger.error(f"Hunter agent error: {e}")
            await output_queue.put(None)
            raise

    async def _extract_keywords(self, job_data: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Extract comprehensive search keywords from job description using LLM.
        Includes improved fallback logic.
        """
        location = job_data.get('location', '')
        key_responsibilities = job_data.get('key_responsibilities') or job_data.get('description', '')
        requirements = job_data.get('requirements', [])

        prompt = f"""Analyze this job description and extract comprehensive search keywords to find the BEST matching candidates on GitHub.

Title: {job_data.get('title', '')}
Company: {job_data.get('company_name', '')}
Location: {location}
Description: {key_responsibilities}
Requirements: {', '.join(requirements)}
Core Skill Requirement: {job_data.get('core_skill_requirement', '')}
Familiar With: {job_data.get('familiar_with', '')}
Language Requirement: {job_data.get('language_requirement', '')}
Work Type: {job_data.get('work_type', '')}
Years of Experience: {job_data.get('years_of_experience', '')}
Minimum Required Degree: {job_data.get('minimum_required_degree', '')}

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
            llm_service = get_llm_service(job_data.get("model_provider"))
            keywords = await llm_service.function_call(
                prompt=prompt,
                function_name="extract_comprehensive_keywords",
                schema=schema
            )
            logger.info(f"Extracted keywords: {keywords}")
            return keywords
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            # Improved fallback: extract from requirements
            return self._fallback_keyword_extraction(job_data)

    def _fallback_keyword_extraction(self, job_data: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Fallback keyword extraction when LLM fails.
        Extracts keywords directly from job requirements and description.
        """
        requirements = job_data.get('requirements', [])
        core_skill = job_data.get('core_skill_requirement', '')
        familiar_with = job_data.get('familiar_with', '')
        title = job_data.get('title', '').lower()

        # Common programming languages
        languages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'c++', 'ruby', 'php', 'swift', 'kotlin']
        # Common frameworks
        frameworks = ['react', 'vue', 'angular', 'django', 'fastapi', 'flask', 'spring', 'express', 'nextjs', 'pytorch', 'tensorflow']

        all_text = ' '.join([
            ' '.join(requirements),
            core_skill,
            familiar_with,
            title,
            job_data.get('description', '')
        ]).lower()

        detected_languages = [lang for lang in languages if lang in all_text]
        detected_frameworks = [fw for fw in frameworks if fw in all_text]

        # Ensure we have at least something
        if not detected_languages:
            detected_languages = ['python']
        if not detected_frameworks and 'machine learning' in all_text:
            detected_frameworks = ['pytorch', 'tensorflow']
        if not detected_frameworks and 'web' in all_text:
            detected_frameworks = ['react', 'nodejs']

        return {
            "core_languages": detected_languages[:3],
            "primary_frameworks": detected_frameworks[:4],
            "related_technologies": [],
            "repository_topics": [],
            "domain_keywords": [title] if title else [],
            "seniority_level": "mid-level",
            "alternative_terms": []
        }

    def _build_search_strategies(
        self,
        keywords: Dict[str, List[str]],
        existing_count: int
    ) -> List[SearchStrategy]:
        """
        Build a list of search strategies based on extracted keywords.
        """
        strategies = []
        search_page = max(1, (existing_count // 10) + 1)
        
        # Shuffle keywords for variety
        core_languages = keywords.get("core_languages", []).copy()
        primary_frameworks = keywords.get("primary_frameworks", []).copy()
        related_tech = keywords.get("related_technologies", []).copy()
        repo_topics = keywords.get("repository_topics", []).copy()
        domain_keywords = keywords.get("domain_keywords", []).copy()
        alt_terms = keywords.get("alternative_terms", []).copy()
        
        random.shuffle(core_languages)
        random.shuffle(primary_frameworks)
        random.shuffle(related_tech)
        random.shuffle(repo_topics)
        random.shuffle(domain_keywords)
        random.shuffle(alt_terms)

        one_year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        location = getattr(self, '_current_job_location', None)
        location_query = self._format_location(location) if location else ""

        # Strategy 1: Repository Topics
        for topic in repo_topics[:2]:
            query = f"{topic.replace(' ', '-')} in:bio type:user repos:>3 created:<{one_year_ago} followers:>5"
            if location_query:
                query += f" {location_query}"
            strategies.append(SearchStrategy(
                name=f"topic_{topic}",
                description=f"Search by topic: {topic}",
                query=query,
                page=search_page,
                per_page=12
            ))

        # Strategy 2: Framework + Language
        for framework in primary_frameworks[:2]:
            for language in core_languages[:1]:
                query = f"{framework} in:bio language:{language} type:user repos:>5 followers:>3"
                if location_query:
                    query += f" {location_query}"
                strategies.append(SearchStrategy(
                    name=f"framework_{framework}_{language}",
                    description=f"Search {framework} + {language} experts",
                    query=query,
                    page=search_page,
                    per_page=10
                ))

        # Strategy 3: Domain Expertise
        for domain_kw in domain_keywords[:2]:
            search_term = f'"{domain_kw}"' if ' ' in domain_kw else domain_kw
            query = f"{search_term} in:bio type:user repos:>5 created:<{one_year_ago}"
            if core_languages:
                query += f" language:{core_languages[0]}"
            if location_query:
                query += f" {location_query}"
            strategies.append(SearchStrategy(
                name=f"domain_{domain_kw}",
                description=f"Search domain: {domain_kw}",
                query=query,
                page=search_page,
                per_page=10
            ))

        # Strategy 4: Tech Stack Combination
        if len(related_tech) >= 2:
            tech_combo = f"{related_tech[0]} {related_tech[1]}"
            query = f"{tech_combo} in:bio type:user repos:>7"
            if location_query:
                query += f" {location_query}"
            strategies.append(SearchStrategy(
                name=f"tech_stack_{related_tech[0]}_{related_tech[1]}",
                description=f"Search tech stack: {tech_combo}",
                query=query,
                page=search_page,
                per_page=10
            ))

        # Strategy 5: Alternative Terms
        for alt_term in alt_terms[:2]:
            query = f"{alt_term} in:bio type:user repos:>5"
            if core_languages:
                query += f" language:{core_languages[0]}"
            if location_query:
                query += f" {location_query}"
            strategies.append(SearchStrategy(
                name=f"alt_term_{alt_term}",
                description=f"Search alternative term: {alt_term}",
                query=query,
                page=search_page,
                per_page=8
            ))

        # Strategy 6: Repository-based search (find contributors to popular repos)
        if primary_frameworks:
            for framework in primary_frameworks[:1]:
                strategies.append(SearchStrategy(
                    name=f"repo_contributors_{framework}",
                    description=f"Find contributors to {framework} repos",
                    query=f"{framework} stars:>100 pushed:>{one_year_ago}",
                    page=1,
                    per_page=5
                ))

        logger.info(f"Built {len(strategies)} search strategies")
        return strategies

    def _format_location(self, location: str) -> str:
        """Format location for GitHub search query"""
        if not location:
            return ""
        location = location.strip()
        if any(ch.isspace() for ch in location):
            return f'location:"{location}"'
        return f"location:{location}"

    async def _execute_parallel_searches(
        self,
        strategies: List[SearchStrategy],
        job_id: str
    ) -> List[Dict[str, Any]]:
        """
        Execute search strategies in parallel with controlled concurrency.
        """
        all_candidates = []
        
        # Group strategies into batches to avoid overwhelming the API
        batch_size = 3
        strategy_batches = [
            strategies[i:i + batch_size] 
            for i in range(0, len(strategies), batch_size)
        ]

        total_strategies = len(strategies)
        completed_strategies = 0

        for batch_idx, batch in enumerate(strategy_batches):
            # Execute batch in parallel
            tasks = []
            for strategy in batch:
                if strategy.name.startswith("repo_contributors_"):
                    tasks.append(self._execute_repo_contributor_search(strategy))
                else:
                    tasks.append(self._execute_user_search(strategy))

            # Wait for batch to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for i, result in enumerate(results):
                strategy = batch[i]
                completed_strategies += 1
                
                if isinstance(result, Exception):
                    logger.error(f"Strategy {strategy.name} failed: {result}")
                    await self.emit_event(
                        "strategy_failed",
                        {"strategy": strategy.name, "error": str(result)},
                        job_id,
                        message=f"⚠️ Strategy '{strategy.description}' encountered an error"
                    )
                elif isinstance(result, SearchResult):
                    if result.success:
                        all_candidates.extend(result.candidates)
                        await self.emit_event(
                            "strategy_completed",
                            {
                                "strategy": strategy.name,
                                "found": len(result.candidates),
                                "progress": f"{completed_strategies}/{total_strategies}"
                            },
                            job_id,
                            message=f"✓ {strategy.description}: found {len(result.candidates)} candidates ({completed_strategies}/{total_strategies})"
                        )
                    else:
                        logger.warning(f"Strategy {strategy.name} failed: {result.error}")

            # Check if we have enough candidates
            if len(all_candidates) >= settings.MAX_CANDIDATES_PER_JOB:
                logger.info(f"Reached max candidates ({settings.MAX_CANDIDATES_PER_JOB}), stopping search")
                break

            # Small delay between batches to be nice to the API
            if batch_idx < len(strategy_batches) - 1:
                await asyncio.sleep(0.5)

        # Deduplicate and sort by quality score
        unique_candidates = self._deduplicate_candidates(all_candidates)
        unique_candidates.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
        
        return unique_candidates[:settings.MAX_CANDIDATES_PER_JOB]

    async def _execute_user_search(self, strategy: SearchStrategy) -> SearchResult:
        """Execute a user search strategy"""
        try:
            users = await github_service.search_users(
                strategy.query,
                per_page=strategy.per_page,
                page=strategy.page
            )
            
            candidates = await self._process_github_users(users, check_recent_activity=True)
            
            return SearchResult(
                strategy_name=strategy.name,
                candidates=candidates,
                success=True
            )
        except RateLimitError:
            raise  # Re-raise rate limit errors
        except Exception as e:
            return SearchResult(
                strategy_name=strategy.name,
                candidates=[],
                success=False,
                error=str(e)
            )

    async def _execute_repo_contributor_search(self, strategy: SearchStrategy) -> SearchResult:
        """
        Execute a repository-based contributor search.
        Finds contributors to popular repositories as potential candidates.
        """
        try:
            # Search for popular repositories
            repos = await github_service.search_repositories(
                strategy.query,
                sort="stars",
                per_page=strategy.per_page,
                page=strategy.page
            )
            
            candidates = []
            
            for repo in repos[:3]:  # Check top 3 repos
                owner = repo.get("owner", {}).get("login")
                repo_name = repo.get("name")
                
                if not owner or not repo_name:
                    continue
                
                # Get contributors
                contributors = await github_service.get_repo_contributors(
                    owner, repo_name, per_page=5
                )
                
                # Process each contributor as potential candidate
                for contributor in contributors:
                    username = contributor.get("login")
                    
                    if not username or username in self._processed_usernames:
                        continue
                    
                    # Skip the repo owner (might be an org)
                    if username == owner:
                        continue
                    
                    # Get full user profile
                    user_profile = await github_service.get_user(username)
                    
                    if not user_profile:
                        continue
                    
                    # Skip organizations
                    if user_profile.get("type") == "Organization":
                        continue
                    
                    # Basic quality check
                    quality_score = self._calculate_quality_score(user_profile)
                    
                    if quality_score >= 3:
                        candidate = self._build_candidate_profile(user_profile, quality_score)
                        candidates.append(candidate)
                        self._processed_usernames.add(username)
                        
                        logger.info(f"Found contributor candidate: @{username} from {owner}/{repo_name}")
                
                await asyncio.sleep(0.3)  # Rate limit between repos
            
            return SearchResult(
                strategy_name=strategy.name,
                candidates=candidates,
                success=True
            )
        except Exception as e:
            return SearchResult(
                strategy_name=strategy.name,
                candidates=[],
                success=False,
                error=str(e)
            )

    async def _process_github_users(
        self,
        users: List[Dict],
        check_recent_activity: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Process and filter GitHub users with quality checks.
        """
        candidates = []

        for user in users:
            username = user["login"]

            if username in self._processed_usernames:
                continue

            user_profile = await github_service.get_user(username)

            if not user_profile:
                continue

            # Skip organizations
            if user_profile.get("type") == "Organization":
                continue

            # Skip company accounts
            bio = (user_profile.get("bio") or "").lower()
            name = (user_profile.get("name") or "").lower()
            if any(org in bio or org in name for org in ["organization", "company", "official", "team"]):
                continue

            # Basic filters
            public_repos = user_profile.get("public_repos", 0)
            followers = user_profile.get("followers", 0)
            following = user_profile.get("following", 0)

            # Filter tutorial accounts
            if public_repos > 100 and followers < 50:
                continue

            if public_repos < 3:
                continue

            # Filter bot-like accounts
            if following > followers * 3 and followers > 10:
                continue

            # Bio check
            has_bio = bio and len(bio.strip()) > 0
            has_strong_activity = public_repos >= 10 or followers >= 50

            if not has_bio and not has_strong_activity:
                continue

            # Recent activity check
            if check_recent_activity:
                has_recent = await self._check_recent_activity(username)
                if not has_recent:
                    continue

            # Quality scoring
            quality_score = self._calculate_quality_score(user_profile)

            if quality_score < 3:
                continue

            candidate = self._build_candidate_profile(user_profile, quality_score)
            candidates.append(candidate)
            self._processed_usernames.add(username)

            logger.info(f"Quality candidate: @{username} (score: {quality_score}/10)")
            await asyncio.sleep(0.15)

        return candidates

    def _build_candidate_profile(
        self,
        user_profile: Dict[str, Any],
        quality_score: int
    ) -> Dict[str, Any]:
        """Build a candidate profile dict from user data"""
        return {
            "username": user_profile["login"],
            "profile_url": user_profile["html_url"],
            "avatar_url": user_profile.get("avatar_url"),
            "bio": user_profile.get("bio"),
            "name": user_profile.get("name"),
            "location": user_profile.get("location"),
            "email": user_profile.get("email"),
            "hireable": user_profile.get("hireable"),
            "company": user_profile.get("company"),
            "public_repos": user_profile.get("public_repos", 0),
            "followers": user_profile.get("followers", 0),
            "following": user_profile.get("following", 0),
            "quality_score": quality_score,
            "created_at": user_profile.get("created_at"),
        }

    def _deduplicate_candidates(
        self,
        candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Remove duplicate candidates by username"""
        seen = set()
        unique = []
        for c in candidates:
            if c["username"] not in seen:
                seen.add(c["username"])
                unique.append(c)
        return unique

    async def _check_recent_activity(self, username: str) -> bool:
        """Check if user has recent activity (within 6 months)"""
        try:
            repos = await github_service.get_user_repos(username, sort="pushed", per_page=5)

            if not repos:
                return False

            six_months_ago = datetime.now() - timedelta(days=180)

            for repo in repos[:5]:
                pushed_at = repo.get("pushed_at")
                if pushed_at:
                    pushed_date = datetime.strptime(pushed_at[:19], "%Y-%m-%dT%H:%M:%S")
                    if pushed_date > six_months_ago:
                        return True

            return False
        except Exception as e:
            logger.warning(f"Error checking recent activity for {username}: {e}")
            return True  # Benefit of doubt

    def _calculate_quality_score(self, user_profile: Dict[str, Any]) -> int:
        """Calculate quality score (0-10) for a user profile"""
        score = 0

        # Public repos (max 3 points)
        repos = user_profile.get("public_repos", 0)
        if repos >= 20:
            score += 3
        elif repos >= 10:
            score += 2
        elif repos >= 5:
            score += 1

        # Bio completeness (max 2 points)
        bio = user_profile.get("bio") or ""
        bio_length = len(bio.strip())
        if bio_length >= 50:
            score += 2
        elif bio_length >= 20:
            score += 1

        # Profile completeness (2 points)
        if user_profile.get("name"):
            score += 1
        if user_profile.get("location") or user_profile.get("email") or user_profile.get("company"):
            score += 1

        # Followers (max 2 points)
        followers = user_profile.get("followers", 0)
        if followers >= 100:
            score += 2
        elif followers >= 25:
            score += 1

        # Hireable flag (1 point)
        if user_profile.get("hireable"):
            score += 1

        # Engagement ratio bonus (1 point)
        following = user_profile.get("following", 0)
        if followers > 0 and following > 0:
            ratio = followers / following
            if 0.3 <= ratio <= 10:
                score += 1

        return min(score, 10)
