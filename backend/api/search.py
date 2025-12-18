"""
Search and Vector API endpoints (Weaviate).
"""
import asyncio
import logging

from fastapi import APIRouter, HTTPException

from models import WeaviateAskRequest, WeaviateAskResponse
from services.weaviate import get_weaviate_service, ask_candidates_agent, weaviate_query_agent_available

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Search"])


@router.get("/api/search/candidates")
async def search_candidates_by_strengths(
    query: str,
    limit: int = 10
):
    """
    Search candidates using semantic similarity across ALL jobs.

    This endpoint searches the entire candidate pool globally, not filtered by job.
    A candidate who applied for one position might be perfect for another based on
    their strengths and skills.

    Args:
        query: Natural language query describing desired candidate strengths (min 3 chars)
        limit: Maximum number of results (default 10, max 100)

    Returns:
        List of candidates ranked by similarity across all jobs
    """
    if not query or len(query.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Query must be at least 3 characters long"
        )

    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Limit must be at least 1"
        )

    try:
        weaviate_service = await asyncio.to_thread(get_weaviate_service)
        results = await asyncio.to_thread(
            weaviate_service.search_by_strengths,
            query=query.strip(),
            limit=limit
        )

        return {
            "query": query.strip(),
            "total_results": len(results),
            "candidates": results
        }
    except ValueError as e:
        logger.error(f"Weaviate configuration error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Vector search is not configured. Please check Weaviate settings."
        )
    except ConnectionError as e:
        logger.error(f"Weaviate connection error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Vector search service is temporarily unavailable"
        )
    except Exception as e:
        logger.error(f"Error searching candidates: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while searching candidates"
        )


@router.get("/api/vector/candidates")
async def get_vector_candidates(
    job_id: str,
    min_fit_score: int = None
):
    """
    Get all candidates for a job from Weaviate vector database.

    Args:
        job_id: Job ID to filter by (required)
        min_fit_score: Minimum fit score threshold (optional)

    Returns:
        List of candidates from vector database
    """
    try:
        weaviate_service = await asyncio.to_thread(get_weaviate_service)
        results = await asyncio.to_thread(
            weaviate_service.get_candidates_by_job,
            job_id=job_id,
            min_fit_score=min_fit_score
        )

        return {
            "job_id": job_id,
            "min_fit_score": min_fit_score,
            "total_results": len(results),
            "candidates": results
        }
    except Exception as e:
        logger.error(f"Error retrieving candidates from vector database: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat", response_model=WeaviateAskResponse)
async def chat_with_candidates(payload: WeaviateAskRequest):
    """
    Conversational candidate search powered by Weaviate QueryAgent.

    Expects a list of chat messages (role/content). The last user message should
    contain the current question; prior messages provide context.
    """
    if not weaviate_query_agent_available():
        raise HTTPException(
            status_code=503,
            detail="Weaviate QueryAgent is not available. Upgrade weaviate-client to enable /api/chat.",
        )

    try:
        answer = await asyncio.to_thread(ask_candidates_agent, payload.messages)
        return WeaviateAskResponse(answer=answer)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in /api/chat: {e}")
        raise HTTPException(status_code=500, detail="Chat service error")


