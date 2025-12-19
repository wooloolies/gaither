"""
WebSocket manager for handling real-time connections.
"""
from fastapi import WebSocket
from typing import Dict, List
import json
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasts events"""

    def __init__(self):
        # Map of job_id -> list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()

        if job_id not in self.active_connections:
            self.active_connections[job_id] = []

        self.active_connections[job_id].append(websocket)
        logger.info(f"WebSocket connected for job {job_id}. Total connections: {len(self.active_connections[job_id])}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove a WebSocket connection"""
        if job_id in self.active_connections:
            try:
                self.active_connections[job_id].remove(websocket)
                logger.info(f"WebSocket disconnected for job {job_id}")

                # Clean up empty job entries
                if not self.active_connections[job_id]:
                    del self.active_connections[job_id]
            except ValueError:
                pass

    async def broadcast(self, job_id: str, event: str, data: dict):
        """Send event to all connected clients for a specific job"""
        if job_id not in self.active_connections:
            logger.debug(f"No connections for job {job_id}, skipping broadcast")
            return

        message = json.dumps({
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "job_id": job_id,
            "data": data
        })

        # Track dead connections
        dead_connections = []

        for connection in self.active_connections[job_id]:
            try:
                await connection.send_text(message)
                logger.debug(f"Sent event {event} to job {job_id}")
            except Exception as e:
                logger.error(f"Error sending message to WebSocket: {e}")
                dead_connections.append(connection)

        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection, job_id)

    def get_connection_count(self, job_id: str) -> int:
        """Get number of active connections for a job"""
        return len(self.active_connections.get(job_id, []))


# Global WebSocket manager instance
ws_manager = WebSocketManager()
