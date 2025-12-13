"""
Base agent class for all recruiting agents.
"""
import logging
from typing import Dict, Any
from services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base class for all agents in the recruiting pipeline"""

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.logger = logging.getLogger(f"agent.{agent_name}")

    async def emit_event(self, event_type: str, data: Dict[str, Any], job_id: str, message: str = None):
        """
        Emit an event to the WebSocket for real-time updates.

        Args:
            event_type: Type of event (e.g., "search_started", "profile_found")
            data: Event data to send
            job_id: Job ID for routing the event
            message: Human-readable message (optional, will use event_type if not provided)
        """
        # Use custom message or format event_type
        display_message = message or event_type.replace('_', ' ').title()
        full_event = f"{self.agent_name}.{event_type}"

        # Add message to data for frontend display
        data_with_message = {**data, "message": display_message}

        self.logger.info(f"Emitting event: {full_event}")

        try:
            await ws_manager.broadcast(job_id, full_event, data_with_message)
        except Exception as e:
            self.logger.error(f"Error emitting event {full_event}: {e}")

    async def execute(self, *args, **kwargs):
        """
        Execute the agent's main logic.
        Must be implemented by subclasses.
        """
        raise NotImplementedError("Agent must implement execute() method")
