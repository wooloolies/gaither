"""
Claude API service for AI-powered analysis and generation.
"""
import anthropic
import asyncio
import logging
from typing import Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)


class ClaudeService:
    """Service for interacting with Claude API"""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def function_call(
        self,
        prompt: str,
        function_name: str,
        schema: Dict[str, Any],
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Call Claude with function calling for structured output.

        Args:
            prompt: The prompt to send to Claude
            function_name: Name of the function to call
            schema: JSON schema for the function parameters
            max_tokens: Maximum tokens for response

        Returns:
            Parsed function call arguments as dict
        """
        try:
            # Run sync client in thread pool to avoid blocking
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=max_tokens,
                tools=[{
                    "name": function_name,
                    "description": f"Extract structured data: {function_name}",
                    "input_schema": schema
                }],
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Extract tool use from response
            for content in response.content:
                if content.type == "tool_use":
                    logger.info(f"Claude function call successful: {function_name}")
                    return content.input

            # Fallback if no tool use found
            logger.warning("No tool use in Claude response, returning empty dict")
            return {}

        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            raise

    async def analyze(
        self,
        prompt: str,
        max_tokens: int = 4096
    ) -> str:
        """
        Simple text analysis with Claude.

        Args:
            prompt: The prompt to send to Claude
            max_tokens: Maximum tokens for response

        Returns:
            Claude's response as string
        """
        try:
            # Run sync client in thread pool to avoid blocking
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=max_tokens,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Extract text from response
            text_content = ""
            for content in response.content:
                if content.type == "text":
                    text_content += content.text

            logger.info("Claude analysis successful")
            return text_content

        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            raise


# Global Claude service instance
claude_service = ClaudeService()
