from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
import logging

from services.neo4j.service import get_neo4j_service, Neo4jService
from services.neo4j.models.neo4j_models import CandidateGraph, ForceGraphData

router = APIRouter(prefix="/api/neo4j", tags=["neo4j"])
logger = logging.getLogger(__name__)

async def get_service():
    """Dependency to get Neo4jService instance"""
    try:
        return get_neo4j_service()
    except Exception as e:
        logger.error(f"Failed to get Neo4j service: {e}")
        raise HTTPException(status_code=503, detail="Neo4j service unavailable")

@router.get("/candidates", response_model=ForceGraphData)
async def get_all_candidates_graph(
    limit: int = 50,
    service: Neo4jService = Depends(get_service)
):
    """
    Get a snapshot of the candidate graph.
    Returns nodes and links formatted for react-force-graph-2d.
    """
    try:
        graph = service.get_all_candidates(limit=limit)
        return graph.to_force_graph()
    except Exception as e:
        logger.error(f"Error getting all candidates graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candidates/{username_or_id}", response_model=ForceGraphData)
async def get_candidate_graph(
    username_or_id: str,
    service: Neo4jService = Depends(get_service)
):
    """
    Get the graph for a specific candidate by username or ID.
    Returns nodes and links formatted for react-force-graph-2d.
    """
    try:
        # Try by username first
        graph = service.get_candidate_by_username(username_or_id)
        
        # If no paths found, try by ID as a fallback (rudimentary check)
        if not graph.paths:
             graph_by_id = service.get_candidate_by_id(username_or_id)
             if graph_by_id.paths:
                 graph = graph_by_id
        
        return graph.to_force_graph()
    except Exception as e:
        logger.error(f"Error getting candidate graph for {username_or_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/candidates/{candidate_id}")
async def delete_candidate(
    candidate_id: str,
    service: Neo4jService = Depends(get_service)
):
    """
    Delete a candidate node and its relationships.
    """
    try:
        success = service.delete_by_id(candidate_id)
        if not success:
            raise HTTPException(status_code=404, detail="Candidate not found or could not be deleted")
        return {"message": f"Candidate {candidate_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting candidate {candidate_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/graph/filter", response_model=ForceGraphData)
async def get_graph_by_filter(
    type: str = Query(..., description="Filter type: skill, location, education, repo"),
    value: str = Query(..., description="Value to filter by (e.g., 'Python', 'Thailand')"),
    service: Neo4jService = Depends(get_service)
):
    """
    Get graph centered around a specific entity (Skill, Location, etc.).
    Returns nodes and links formatted for react-force-graph-2d.
    """
    try:
        graph = service.get_graph_by_filter(filter_type=type, value=value)
        return graph.to_force_graph()
    except Exception as e:
        logger.error(f"Error filtering graph by {type}={value}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
