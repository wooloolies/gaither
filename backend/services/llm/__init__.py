"""
LLM service factory and exports.
"""
from config import settings
from .base import (
    AbstractLLMService,
    LLMServiceError,
    LLMConfigurationError,
    LLMAPIError,
    LLMResponseError,
    LLMTimeoutError
)
from .claude_service import ClaudeService
from .gemini_service import GeminiService
import logging

logger = logging.getLogger(__name__)


def get_llm_service() -> AbstractLLMService:
    """
    Factory function to get the configured LLM service.

    Returns:
        Configured LLM service instance based on MODEL_PROVIDER setting

    Raises:
        ValueError: If MODEL_PROVIDER is not recognized
        LLMConfigurationError: If service configuration is invalid
    """
    if settings.MODEL_PROVIDER == "claude":
        logger.info("Initializing Claude LLM service")
        return ClaudeService()
    elif settings.MODEL_PROVIDER == "gemini":
        logger.info("Initializing Gemini LLM service")
        return GeminiService()
    else:
        raise ValueError(f"Unknown MODEL_PROVIDER: {settings.MODEL_PROVIDER}")


# Global service instance
llm_service = get_llm_service()

# Export for use by agents
__all__ = [
    "llm_service",
    "get_llm_service",
    "AbstractLLMService",
    "LLMServiceError",
    "LLMConfigurationError",
    "LLMAPIError",
    "LLMResponseError",
    "LLMTimeoutError"
]
