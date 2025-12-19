"""
FastAPI main application with REST API and WebSocket endpoints.
"""
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from services.websocket_manager import ws_manager
from api import (
    jobs_router,
    candidates_router,
    chat_router,
    search_router,
    analysis_router,
    neo4j_router,
)

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

    # Generate and save OpenAPI spec (only in non-production environments)
    if settings.ENVIRONMENT != "production":
        try:
            openapi_spec = app.openapi()
            backend_dir = Path(__file__).parent
            openapi_path = backend_dir / "openapi.json"

            with open(openapi_path, "w", encoding="utf-8") as f:
                json.dump(openapi_spec, f, indent=2, ensure_ascii=False)

            logger.info(f"OpenAPI spec saved to {openapi_path}")
        except Exception as e:
            logger.error(f"Error generating OpenAPI spec: {e}")
    else:
        logger.debug("Skipping OpenAPI spec generation in production")

    yield  # Application runs here

    # Shutdown (cleanup if needed)


# Initialize FastAPI app
app = FastAPI(
    title="Autonomous Recruiting Agent Swarm",
    description="AI-powered multi-agent system for recruiting",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(jobs_router)
app.include_router(candidates_router)
app.include_router(chat_router)
app.include_router(search_router)
app.include_router(analysis_router)
app.include_router(neo4j_router)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# WebSocket endpoint
@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time agent updates"""
    await ws_manager.connect(websocket, job_id)

    try:
        # Send initial connection confirmation
        await ws_manager.broadcast(job_id, "connected", {"message": "Connected to agent swarm"})

        # Keep connection alive and listen for client messages
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received from client: {data}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
        ws_manager.disconnect(websocket, job_id)
    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {e}")
        ws_manager.disconnect(websocket, job_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.BACKEND_PORT)
