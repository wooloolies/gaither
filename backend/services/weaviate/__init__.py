"""
Weaviate vector database service.

This module provides semantic search capabilities for candidate profiles
using Weaviate vector database with Google AI Studio embeddings.
"""

from .service import WeaviateService, get_weaviate_service

__all__ = ["WeaviateService", "get_weaviate_service"]
