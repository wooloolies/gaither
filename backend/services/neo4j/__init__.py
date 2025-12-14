"""
Neo4j graph database service.

This module provides graph database capabilities for candidate profiles
and relationships using Neo4j.
"""

from .service import Neo4jService, get_neo4j_service

__all__ = ["Neo4jService", "get_neo4j_service"]
