"""
Apify service for web scraping GitHub profiles.
"""
from apify_client import ApifyClient
import logging
from typing import List, Dict, Any
from config import settings

logger = logging.getLogger(__name__)


class ApifyService:
    """Service for interacting with Apify actors"""

    def __init__(self):
        # APIFY_API_TOKEN is optional - if not provided, client will be None
        if settings.APIFY_API_TOKEN:
            self.client = ApifyClient(settings.APIFY_API_TOKEN)
        else:
            self.client = None
            logger.warning("APIFY_API_TOKEN not configured - Apify features will be disabled")

    async def scrape_github_profiles(
        self,
        search_query: str,
        max_results: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Scrape GitHub profiles using Apify GitHub scraper.

        Args:
            search_query: GitHub search query (e.g., "language:python location:sf")
            max_results: Maximum number of profiles to scrape

        Returns:
            List of profile data
        """
        if not self.client:
            logger.warning("Apify client not available - APIFY_API_TOKEN not configured")
            return []

        try:
            logger.info(f"Starting Apify GitHub scrape: {search_query}")

            # Note: Using a simpler approach - just return mock data for now
            # In production, you would use: apify/github-profile-scraper
            # For the demo, we'll use GitHub API search instead (more reliable)

            # This is a placeholder - actual Apify actor would be:
            # run = self.client.actor("apify/github-profile-scraper").call(
            #     run_input={
            #         "search": search_query,
            #         "maxResults": max_results
            #     }
            # )
            # items = self.client.dataset(run["defaultDatasetId"]).list_items().items

            logger.warning("Apify integration not fully implemented - using GitHub API fallback")
            return []

        except Exception as e:
            logger.error(f"Error running Apify actor: {e}")
            return []

    async def scrape_linkedin_profiles(
        self,
        search_query: str,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Scrape LinkedIn profiles (placeholder for future implementation).

        Args:
            search_query: LinkedIn search query
            max_results: Maximum number of profiles

        Returns:
            List of profile data
        """
        if not self.client:
            logger.warning("Apify client not available - APIFY_API_TOKEN not configured")
            return []
        
        logger.warning("LinkedIn scraping not implemented yet")
        return []


# Global Apify service instance
apify_service = ApifyService()
