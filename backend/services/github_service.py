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
        self.headers = {
            "Authorization": f"token {settings.GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
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
                logger.error(f"GitHub API error: {response.status_code}")
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
                logger.error(f"Error fetching repos: {response.status_code}")
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
                logger.warning(f"Error fetching commits: {response.status_code}")
                return []

        except Exception as e:
            logger.error(f"Error fetching commits for {username}/{repo_name}: {e}")
            return []

    async def search_users(
        self,
        query: str,
        per_page: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for GitHub users.

        Args:
            query: Search query (e.g., "language:python location:sf")
            per_page: Number of results

        Returns:
            List of user data
        """
        try:
            response = await self.client.get(
                f"{self.base_url}/search/users",
                params={"q": query, "per_page": per_page}
            )

            if response.status_code == 200:
                data = response.json()
                users = data.get("items", [])
                logger.info(f"GitHub search found {len(users)} users for query: {query}")
                return users
            else:
                logger.error(f"GitHub search error: {response.status_code}")
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
