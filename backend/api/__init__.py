"""
API routers module.
"""
from api.jobs import router as jobs_router
from api.candidates import router as candidates_router
from api.chat import router as chat_router
from api.search import router as search_router
from api.analysis_routes import router as analysis_router
from api.neo4j_routes import router as neo4j_router

__all__ = [
    "jobs_router",
    "candidates_router", 
    "chat_router",
    "search_router",
    "analysis_router",
    "neo4j_router",
]


