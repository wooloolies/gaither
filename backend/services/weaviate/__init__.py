"""
Weaviate vector database service.

This module provides semantic search capabilities for candidate profiles
using Weaviate vector database with Google AI Studio embeddings.
"""

from .service import WeaviateService, get_weaviate_service
from .agent import ask_candidates_agent, get_candidates_query_agent, weaviate_query_agent_available

__all__ = [
    "WeaviateService",
    "get_weaviate_service",
    "ask_candidates_agent",
    "get_candidates_query_agent",
    "weaviate_query_agent_available",
]
