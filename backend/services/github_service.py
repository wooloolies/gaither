"""
GitHub API service for fetching user and repository data.
"""
import httpx
import logging
from typing import Dict, List, Optional, Any
from config import settings

logger = logging.getLogger(__name__)


class GitHubService:
    """Service for interacting with GitHub API"""

    def __init__(self):
        self.base_url = "https://api.github.com"
        # Only attach Authorization if token is present.
        # Sending an empty/invalid token causes 401 and makes searches look like "0 results".
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if settings.GITHUB_TOKEN:
            # Works for classic PATs and fine-grained tokens.
            self.headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
        self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)

    async def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get GitHub user profile.

        Args:
            username: GitHub username

        Returns:
            User profile data or None if not found
        """
        try:
            response = await self.client.get(f"{self.base_url}/users/{username}")

            if response.status_code == 200:
                logger.info(f"Fetched GitHub user: {username}")
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"GitHub user not found: {username}")
                return None
            else:
                logger.error(
                    "GitHub API error (get_user) status=%s body=%s",
                    response.status_code,
                    response.text[:500],
                )
                return None

        except Exception as e:
            logger.error(f"Error fetching GitHub user {username}: {e}")
            return None

    async def get_user_repos(
        self,
        username: str,
        sort: str = "updated",
        per_page: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get user's repositories.

        Args:
            username: GitHub username
            sort: Sort by (created, updated, pushed, full_name)
            per_page: Number of repos to fetch

        Returns:
            List of repository data
        """
        try:
            response = await self.client.get(
                f"{self.base_url}/users/{username}/repos",
                params={"sort": sort, "per_page": per_page}
            )

            if response.status_code == 200:
                repos = response.json()
                logger.info(f"Fetched {len(repos)} repos for {username}")
                return repos
            else:
                logger.error(
                    "GitHub API error (get_user_repos) status=%s body=%s",
                    response.status_code,
                    response.text[:500],
                )
                return []

        except Exception as e:
            logger.error(f"Error fetching repos for {username}: {e}")
            return []

    async def get_repo_commits(
        self,
        username: str,
        repo_name: str,
        per_page: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get recent commits from a repository.

        Args:
            username: GitHub username
            repo_name: Repository name
            per_page: Number of commits to fetch

        Returns:
            List of commit data
        """
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{username}/{repo_name}/commits",
                params={"per_page": per_page}
            )

            if response.status_code == 200:
                commits = response.json()
                logger.info(f"Fetched {len(commits)} commits from {username}/{repo_name}")
                return commits
            else:
                logger.warning(
                    "GitHub API error (get_repo_commits) status=%s body=%s",
                    response.status_code,
                    response.text[:500],
                )
                return []

        except Exception as e:
            logger.error(f"Error fetching commits for {username}/{repo_name}: {e}")
            return []

    async def get_repo_readme(self, username: str, repo_name: str) -> str:
        """
        Get the raw content of the repository's README file.

        Args:
            username: GitHub username
            repo_name: Repository name

        Returns:
            String content of README or empty string if not found
        """
        try:
            # Try fetching common README filenames
            filenames = ["README.md", "README.rst", "README.txt", "README"]
            
            for filename in filenames:
                url = f"https://raw.githubusercontent.com/{username}/{repo_name}/master/{filename}"
                # If master fails, try main
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
        Search for GitHub users.

        Args:
            query: Search query (e.g., "language:python location:sf")
            per_page: Number of results per page
            page: Page number (1-indexed)

        Returns:
            List of user data
        """
        try:
            response = await self.client.get(
                f"{self.base_url}/search/users",
                params={"q": query, "per_page": per_page, "page": page}
            )

            if response.status_code == 200:
                data = response.json()
                users = data.get("items", [])
                logger.info(f"GitHub search found {len(users)} users for query: {query}")
                return users
            else:
                logger.error(
                    "GitHub search error status=%s body=%s query=%s",
                    response.status_code,
                    response.text[:500],
                    query,
                )
                return []

        except Exception as e:
            logger.error(f"Error searching GitHub users: {e}")
            return []

    async def get_rate_limit(self) -> Dict[str, Any]:
        """Get current API rate limit status"""
        try:
            response = await self.client.get(f"{self.base_url}/rate_limit")
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"Error fetching rate limit: {e}")
            return {}

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global GitHub service instance
github_service = GitHubService()
