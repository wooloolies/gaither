"""
GitHub API service for fetching user and repository data.
Includes rate limiting, exponential backoff, and caching.
"""
import httpx
import asyncio
import logging
import time
import hashlib
from typing import Dict, List, Optional, Any
from config import settings

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Raised when GitHub API rate limit is exceeded"""
    def __init__(self, reset_time: int, message: str = "Rate limit exceeded"):
        self.reset_time = reset_time
        self.message = message
        super().__init__(self.message)


class SearchCache:
    """Simple in-memory cache for search results with TTL"""
    
    def __init__(self, ttl_seconds: int = 300):  # 5 minute default TTL
        self._cache: Dict[str, tuple[Any, float]] = {}
        self._ttl = ttl_seconds
    
    def _make_key(self, *args, **kwargs) -> str:
        """Create a hash key from arguments"""
        key_str = str(args) + str(sorted(kwargs.items()))
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        """Store value in cache"""
        self._cache[key] = (value, time.time())
    
    def clear(self):
        """Clear all cached values"""
        self._cache.clear()
    
    def cleanup_expired(self):
        """Remove expired entries"""
        current_time = time.time()
        expired_keys = [
            k for k, (_, ts) in self._cache.items() 
            if current_time - ts >= self._ttl
        ]
        for key in expired_keys:
            del self._cache[key]


class GitHubService:
    """Service for interacting with GitHub API with rate limiting and caching"""

    def __init__(self):
        self.base_url = "https://api.github.com"
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if settings.GITHUB_TOKEN:
            self.headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
        self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)

        # Rate limiting state
        self._rate_limit_remaining = 5000  # Default for authenticated requests
        self._rate_limit_reset = 0
        self._search_rate_limit_remaining = 30  # Search has separate limit
        self._search_rate_limit_reset = 0
        
        # Caching
        self._user_cache = SearchCache(ttl_seconds=600)  # 10 min for user profiles
        self._search_cache = SearchCache(ttl_seconds=300)  # 5 min for searches
        self._repo_cache = SearchCache(ttl_seconds=300)  # 5 min for repos

    def _update_rate_limits(self, response: httpx.Response, is_search: bool = False):
        """Update rate limit tracking from response headers"""
        try:
            if is_search:
                self._search_rate_limit_remaining = int(
                    response.headers.get("X-RateLimit-Remaining", self._search_rate_limit_remaining)
                )
                self._search_rate_limit_reset = int(
                    response.headers.get("X-RateLimit-Reset", self._search_rate_limit_reset)
                )
            else:
                self._rate_limit_remaining = int(
                    response.headers.get("X-RateLimit-Remaining", self._rate_limit_remaining)
                )
                self._rate_limit_reset = int(
                    response.headers.get("X-RateLimit-Reset", self._rate_limit_reset)
                )
        except (ValueError, TypeError):
            pass

    async def _check_rate_limit(self, is_search: bool = False):
        """Check if we're rate limited and wait if necessary"""
        remaining = self._search_rate_limit_remaining if is_search else self._rate_limit_remaining
        reset_time = self._search_rate_limit_reset if is_search else self._rate_limit_reset
        
        if remaining <= 1:
            current_time = int(time.time())
            if reset_time > current_time:
                wait_time = reset_time - current_time + 1
                if wait_time > 60:  # Don't wait more than 60 seconds
                    raise RateLimitError(
                        reset_time,
                        f"Rate limit exceeded. Resets in {wait_time} seconds"
                    )
                logger.warning(f"Rate limit low, waiting {wait_time}s before next request")
                await asyncio.sleep(wait_time)

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        max_retries: int = 3,
        is_search: bool = False,
        **kwargs
    ) -> Optional[httpx.Response]:
        """
        Make HTTP request with exponential backoff retry.

        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            max_retries: Maximum number of retry attempts
            is_search: Whether this is a search API request
            **kwargs: Additional arguments for httpx

        Returns:
            Response object or None on failure
        """
        await self._check_rate_limit(is_search)
        
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                if method.upper() == "GET":
                    response = await self.client.get(url, **kwargs)
                elif method.upper() == "POST":
                    response = await self.client.post(url, **kwargs)
                else:
                    response = await self.client.request(method, url, **kwargs)
                
                self._update_rate_limits(response, is_search)
                
                # Success
                if response.status_code == 200:
                    return response
                
                # Not found - don't retry
                if response.status_code == 404:
                    return response
                
                # Rate limited
                if response.status_code in (403, 429):
                    reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                    retry_after = int(response.headers.get("Retry-After", 60))
                    
                    if reset_time > 0:
                        wait_time = max(1, reset_time - int(time.time()))
                    else:
                        wait_time = retry_after
                    
                    if wait_time > 120:  # Don't wait more than 2 minutes
                        logger.error(f"Rate limited for {wait_time}s, raising error")
                        raise RateLimitError(reset_time, f"Rate limit exceeded, resets in {wait_time}s")
                    
                    logger.warning(f"Rate limited, waiting {wait_time}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                    continue
                
                # Server error - retry with backoff
                if response.status_code >= 500:
                    wait_time = (2 ** attempt) + (0.1 * attempt)  # Exponential backoff
                    logger.warning(f"Server error {response.status_code}, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                
                # Other errors - return response to handle in caller
                return response
                
            except httpx.TimeoutException as e:
                last_exception = e
                wait_time = (2 ** attempt) + 1
                logger.warning(f"Request timeout, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
                
            except httpx.RequestError as e:
                last_exception = e
                wait_time = (2 ** attempt) + 1
                logger.warning(f"Request error: {e}, retrying in {wait_time}s")
                await asyncio.sleep(wait_time)
        
        logger.error(f"All {max_retries} retry attempts failed: {last_exception}")
        return None

    async def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get GitHub user profile with caching.
        """
        # Check cache first
        cache_key = f"user:{username}"
        cached = self._user_cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for user: {username}")
            return cached
        
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/users/{username}"
        )
        
        if response and response.status_code == 200:
            user_data = response.json()
            self._user_cache.set(cache_key, user_data)
            logger.info(f"Fetched GitHub user: {username}")
            return user_data
        elif response and response.status_code == 404:
            logger.warning(f"GitHub user not found: {username}")
            return None
        else:
            logger.error(f"Failed to fetch user: {username}")
            return None

    async def get_user_repos(
        self,
        username: str,
        sort: str = "updated",
        per_page: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get user's repositories with caching.
        """
        cache_key = f"repos:{username}:{sort}:{per_page}"
        cached = self._repo_cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for repos: {username}")
            return cached
        
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/users/{username}/repos",
            params={"sort": sort, "per_page": per_page}
        )

        if response and response.status_code == 200:
            repos = response.json()
            self._repo_cache.set(cache_key, repos)
            logger.info(f"Fetched {len(repos)} repos for {username}")
            return repos
        else:
            logger.error(f"Failed to fetch repos for {username}")
            return []

    async def get_repo(
        self,
        username: str,
        repo_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific repository.
        """
        cache_key = f"repo:{username}/{repo_name}"
        cached = self._repo_cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/repos/{username}/{repo_name}"
        )
        
        if response and response.status_code == 200:
            repo = response.json()
            self._repo_cache.set(cache_key, repo)
            logger.info(f"Fetched repo details: {username}/{repo_name}")
            return repo
        elif response and response.status_code == 404:
            logger.warning(f"Repository not found: {username}/{repo_name}")
            return None
        else:
            return None

    async def get_repo_commits(
        self,
        username: str,
        repo_name: str,
        per_page: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get recent commits from a repository.
        """
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/repos/{username}/{repo_name}/commits",
            params={"per_page": per_page}
        )

        if response and response.status_code == 200:
            commits = response.json()
            logger.info(f"Fetched {len(commits)} commits from {username}/{repo_name}")
            return commits
        else:
            return []

    async def get_repo_languages(
        self,
        username: str,
        repo_name: str
    ) -> Dict[str, int]:
        """
        Get languages used in a repository with byte counts.
        """
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/repos/{username}/{repo_name}/languages"
        )
        
        if response and response.status_code == 200:
            return response.json()
        return {}

    async def get_repo_contributors(
        self,
        username: str,
        repo_name: str,
        per_page: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top contributors to a repository.
        """
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/repos/{username}/{repo_name}/contributors",
            params={"per_page": per_page}
        )
        
        if response and response.status_code == 200:
            return response.json()
        return []

    async def get_repo_readme(self, username: str, repo_name: str) -> str:
        """
        Get the raw content of the repository's README file.
        """
        try:
            filenames = ["README.md", "README.rst", "README.txt", "README"]
            
            for filename in filenames:
                url = f"https://raw.githubusercontent.com/{username}/{repo_name}/master/{filename}"
                response = await self.client.get(url)
                
                if response.status_code == 404:
                    url = f"https://raw.githubusercontent.com/{username}/{repo_name}/main/{filename}"
                    response = await self.client.get(url)

                if response.status_code == 200:
                    logger.info(f"Fetched README for {username}/{repo_name}")
                    return response.text
            
            return ""
        except Exception as e:
            logger.error(f"Error fetching README for {username}/{repo_name}: {e}")
            return ""

    async def search_users(
        self,
        query: str,
        per_page: int = 20,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Search for GitHub users with caching and rate limit handling.
        """
        cache_key = f"search_users:{query}:{per_page}:{page}"
        cached = self._search_cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for search: {query[:50]}...")
            return cached
        
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/search/users",
            params={"q": query, "per_page": per_page, "page": page},
            is_search=True
        )
        
        if response and response.status_code == 200:
            data = response.json()
            users = data.get("items", [])
            self._search_cache.set(cache_key, users)
            logger.info(f"GitHub search found {len(users)} users for query: {query[:50]}...")
            return users
        else:
            logger.error(f"GitHub search failed for query: {query[:50]}...")
            return []

    async def search_repositories(
        self,
        query: str,
        sort: str = "stars",
        per_page: int = 10,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Search for GitHub repositories.

        Args:
            query: Search query (e.g., "machine learning language:python stars:>100")
            sort: Sort by (stars, forks, updated)
            per_page: Number of results per page
            page: Page number

        Returns:
            List of repository data
        """
        cache_key = f"search_repos:{query}:{sort}:{per_page}:{page}"
        cached = self._search_cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for repo search: {query[:50]}...")
            return cached
        
        response = await self._request_with_retry(
            "GET",
            f"{self.base_url}/search/repositories",
            params={"q": query, "sort": sort, "per_page": per_page, "page": page},
            is_search=True
        )

        if response and response.status_code == 200:
            data = response.json()
            repos = data.get("items", [])
            self._search_cache.set(cache_key, repos)
            logger.info(f"GitHub repo search found {len(repos)} repos for: {query[:50]}...")
            return repos
        else:
            return []

    async def get_rate_limit(self) -> Dict[str, Any]:
        """Get current API rate limit status"""
        try:
            response = await self.client.get(f"{self.base_url}/rate_limit")
            if response.status_code == 200:
                data = response.json()
                # Update our tracking
                if "resources" in data:
                    core = data["resources"].get("core", {})
                    search = data["resources"].get("search", {})
                    self._rate_limit_remaining = core.get("remaining", self._rate_limit_remaining)
                    self._rate_limit_reset = core.get("reset", self._rate_limit_reset)
                    self._search_rate_limit_remaining = search.get("remaining", self._search_rate_limit_remaining)
                    self._search_rate_limit_reset = search.get("reset", self._search_rate_limit_reset)
                return data
            return {}
        except Exception as e:
            logger.error(f"Error fetching rate limit: {e}")
            return {}

    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limit status from tracking (no API call)"""
        return {
            "core": {
                "remaining": self._rate_limit_remaining,
                "reset": self._rate_limit_reset
            },
            "search": {
                "remaining": self._search_rate_limit_remaining,
                "reset": self._search_rate_limit_reset
            }
        }

    def clear_cache(self):
        """Clear all caches"""
        self._user_cache.clear()
        self._search_cache.clear()
        self._repo_cache.clear()
        logger.info("GitHub service cache cleared")

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global GitHub service instance
github_service = GitHubService()
