"""
Weaviate Vector Database Service for candidate embeddings.

This service handles storing and retrieving candidate information with semantic search
capabilities. It embeds candidate strengths and concerns for similarity-based matching.
"""

import os
from typing import Any, Dict, List, Optional

import weaviate
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.init import Auth
from weaviate.classes.query import MetadataQuery, Filter

from loguru import logger


class WeaviateService:
    """Service for managing candidate embeddings in Weaviate."""

    COLLECTION_NAME = "Candidates"

    def __init__(self):
        """Initialize Weaviate client and setup collections."""
        self.client = None
        self._connect()
        self._setup_schema()

    def _connect(self):
        """Connect to Weaviate Cloud instance."""
        try:
            weaviate_url = os.environ.get("WEAVIATE_URL")
            weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
            gemini_api_key = os.environ.get("GEMINI_API_KEY")

            if not weaviate_url or not weaviate_api_key:
                raise ValueError(
                    "WEAVIATE_URL and WEAVIATE_API_KEY must be set in environment"
                )

            if not gemini_api_key:
                raise ValueError(
                    "GEMINI_API_KEY must be set in environment for vectorization"
                )

            # Setup headers for Google AI Studio
            headers = {
                "X-Goog-Studio-Api-Key": gemini_api_key,
            }

            self.client = weaviate.connect_to_weaviate_cloud(
                cluster_url=weaviate_url,
                auth_credentials=Auth.api_key(weaviate_api_key),
                headers=headers,
            )

            if self.client.is_ready():
                logger.info("Successfully connected to Weaviate")
            else:
                raise ConnectionError("Weaviate client is not ready")

        except Exception as e:
            logger.error(f"Failed to connect to Weaviate: {e}")
            raise

    def _setup_schema(self):
        """Setup the Candidate collection schema if it doesn't exist."""
        try:
            # Check if collection already exists
            if self.client.collections.exists(self.COLLECTION_NAME):
                logger.info(f"Collection '{self.COLLECTION_NAME}' already exists")
                return

            # Create collection with vectorizer configuration
            self.client.collections.create(
                name=self.COLLECTION_NAME,
                description="Candidate profiles with analysis data for job matching",
                vector_config=Configure.Vectors.text2vec_google_aistudio(
                    name="strengths_vector",
                    source_properties=["strengths"],
                    model="gemini-embedding-001",
                ),
                properties=[
                    Property(
                        name="candidateId",
                        data_type=DataType.TEXT,
                        description="Unique candidate ID from our database",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="jobId",
                        data_type=DataType.TEXT,
                        description="Associated job ID",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="username",
                        data_type=DataType.TEXT,
                        description="GitHub username",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="profileUrl",
                        data_type=DataType.TEXT,
                        description="GitHub profile URL",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="strengths",
                        data_type=DataType.TEXT,
                        description="Candidate strengths (vectorized for semantic search)",
                        vectorize_property_name=False,
                    ),
                    Property(
                        name="concerns",
                        data_type=DataType.TEXT,
                        description="Candidate concerns (vectorized for semantic search)",
                        vectorize_property_name=False,
                    ),
                    Property(
                        name="skills",
                        data_type=DataType.TEXT_ARRAY,
                        description="List of candidate skills",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="fitScore",
                        data_type=DataType.NUMBER,
                        description="Overall fit score (0-100)",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="location",
                        data_type=DataType.TEXT,
                        description="Candidate location",
                        skip_vectorization=True,
                    ),
                    Property(
                        name="bio",
                        data_type=DataType.TEXT,
                        description="Candidate bio",
                        skip_vectorization=True,
                    ),
                ],
            )

            logger.info(f"Created collection '{self.COLLECTION_NAME}'")

        except Exception as e:
            logger.error(f"Failed to setup schema: {e}")
            raise

    def get_candidate_by_id(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a candidate by their candidate_id.

        Args:
            candidate_id: Unique candidate ID from database

        Returns:
            Candidate data with Weaviate UUID if found, None otherwise
        """
        try:
            collection = self.client.collections.get(self.COLLECTION_NAME)

            # Query for candidate by candidateId
            response = collection.query.fetch_objects(
                filters=Filter.by_property("candidateId").equal(candidate_id),
                limit=1
            )

            if response.objects:
                obj = response.objects[0]
                return {
                    "uuid": str(obj.uuid),
                    "candidate_id": obj.properties.get("candidateId"),
                    "job_id": obj.properties.get("jobId"),
                    "username": obj.properties.get("username"),
                }
            return None

        except Exception as e:
            logger.error(f"Failed to get candidate {candidate_id}: {e}")
            return None

    def store_candidate(
        self,
        candidate_id: str,
        job_id: str,
        username: str,
        profile_url: str,
        strengths: List[str],
        concerns: List[str],
        skills: List[str],
        fit_score: int,
        location: Optional[str] = None,
        bio: Optional[str] = None,
    ) -> str:
        """
        Store a candidate's embedding in Weaviate with duplicate prevention.
        If candidate already exists, updates the existing record instead of creating a new one.

        Args:
            candidate_id: Unique candidate ID
            job_id: Associated job ID
            username: GitHub username
            profile_url: GitHub profile URL
            strengths: List of candidate strengths
            concerns: List of candidate concerns
            skills: List of skills
            fit_score: Overall fit score (0-100)
            location: Candidate location
            bio: Candidate bio

        Returns:
            UUID of the stored/updated object in Weaviate
        """
        try:
            collection = self.client.collections.get(self.COLLECTION_NAME)

            # Combine strengths and concerns into text for embedding
            strengths_text = " | ".join(strengths) if strengths else ""
            concerns_text = " | ".join(concerns) if concerns else ""

            # Prepare properties
            properties = {
                "candidateId": candidate_id,
                "jobId": job_id,
                "username": username,
                "profileUrl": profile_url,
                "strengths": strengths_text,
                "concerns": concerns_text,
                "skills": skills,
                "fitScore": fit_score,
                "location": location or "",
                "bio": bio or "",
            }

            # Check if candidate already exists
            existing = self.get_candidate_by_id(candidate_id)

            if existing:
                # Update existing candidate
                uuid = existing["uuid"]
                collection.data.update(
                    uuid=uuid,
                    properties=properties
                )
                logger.info(f"Updated candidate {username} (ID: {candidate_id}) in Weaviate")
                return uuid
            else:
                # Insert new candidate
                uuid = collection.data.insert(properties=properties)
                logger.info(f"Stored new candidate {username} (ID: {candidate_id}) in Weaviate")
                return str(uuid)

        except Exception as e:
            logger.error(f"Failed to store candidate {candidate_id}: {e}")
            raise

    def search_by_strengths(
        self, query: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search candidates by semantic similarity to strengths.

        Args:
            query: Search query describing desired strengths
            limit: Maximum number of results

        Returns:
            List of candidate objects with similarity scores
        """
        try:
            collection = self.client.collections.get(self.COLLECTION_NAME)

            # Execute the query with named vector
            # Since we use Configure.Vectors with name="strengths_vector",
            # we need to specify target_vector
            try:
                response = collection.query.near_text(
                    query=query,
                    target_vector="strengths_vector",  # Use the named vector
                    limit=limit,
                    return_metadata=MetadataQuery(distance=True, score=True),
                )
            except Exception as e:
                # Fallback: try without target_vector in case it's a default vector
                logger.warning(f"Query with target_vector failed, trying without: {e}")
                response = collection.query.near_text(
                    query=query,
                    limit=limit,
                    return_metadata=MetadataQuery(distance=True, score=True),
                )

            # Format results
            results = []
            for item in response.objects:
                results.append(
                    {
                        "candidate_id": item.properties.get("candidateId"),
                        "job_id": item.properties.get("jobId"),
                        "username": item.properties.get("username"),
                        "profile_url": item.properties.get("profileUrl"),
                        "strengths": item.properties.get("strengths", "").split(" | ")
                        if item.properties.get("strengths")
                        else [],
                        "concerns": item.properties.get("concerns", "").split(" | ")
                        if item.properties.get("concerns")
                        else [],
                        "skills": item.properties.get("skills", []),
                        "fit_score": item.properties.get("fitScore"),
                        "location": item.properties.get("location"),
                        "bio": item.properties.get("bio"),
                        "similarity_score": item.metadata.score
                        if hasattr(item.metadata, "score")
                        else None,
                        "distance": item.metadata.distance
                        if hasattr(item.metadata, "distance")
                        else None,
                    }
                )

            logger.info(f"Found {len(results)} candidates matching query")
            return results

        except Exception as e:
            logger.error(f"Failed to search candidates: {e}")
            raise

    def get_candidates_by_job(
        self, job_id: str, min_fit_score: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all candidates for a specific job.

        Args:
            job_id: Job ID to filter by
            min_fit_score: Minimum fit score filter

        Returns:
            List of candidate objects
        """
        try:
            collection = self.client.collections.get(self.COLLECTION_NAME)

            # Build filter
            query_filter = Filter.by_property("jobId").equal(job_id)

            if min_fit_score is not None:
                # Combine filters with AND
                query_filter = query_filter & Filter.by_property("fitScore").greater_or_equal(min_fit_score)

            # Execute query - fetch_objects uses 'filters' parameter
            query = collection.query.fetch_objects(filters=query_filter)

            # Format results
            results = []
            for item in query.objects:
                results.append(
                    {
                        "candidate_id": item.properties.get("candidateId"),
                        "job_id": item.properties.get("jobId"),
                        "username": item.properties.get("username"),
                        "profile_url": item.properties.get("profileUrl"),
                        "strengths": item.properties.get("strengths", "").split(" | ")
                        if item.properties.get("strengths")
                        else [],
                        "concerns": item.properties.get("concerns", "").split(" | ")
                        if item.properties.get("concerns")
                        else [],
                        "skills": item.properties.get("skills", []),
                        "fit_score": item.properties.get("fitScore"),
                        "location": item.properties.get("location"),
                        "bio": item.properties.get("bio"),
                    }
                )

            logger.info(f"Retrieved {len(results)} candidates for job {job_id}")
            return results

        except Exception as e:
            logger.error(f"Failed to get candidates for job {job_id}: {e}")
            raise

    def delete_candidates_by_job(self, job_id: str) -> int:
        """
        Delete all candidates associated with a job.

        Args:
            job_id: Job ID to delete candidates for

        Returns:
            Number of deleted candidates
        """
        try:
            collection = self.client.collections.get(self.COLLECTION_NAME)

            # Build filter
            query_filter = Filter.by_property("jobId").equal(job_id)

            # Delete objects matching the filter
            result = collection.data.delete_many(where=query_filter)

            deleted_count = result.matched if hasattr(result, "matched") else 0
            logger.info(f"Deleted {deleted_count} candidates for job {job_id}")
            return deleted_count

        except Exception as e:
            logger.error(f"Failed to delete candidates for job {job_id}: {e}")
            raise

    def close(self):
        """Close the Weaviate client connection."""
        if self.client:
            self.client.close()
            logger.info("Weaviate connection closed")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensures connection is closed."""
        self.close()
        return False


# Singleton instance
_weaviate_service = None


def get_weaviate_service() -> WeaviateService:
    """Get or create the singleton WeaviateService instance."""
    global _weaviate_service
    if _weaviate_service is None:
        _weaviate_service = WeaviateService()
    return _weaviate_service
