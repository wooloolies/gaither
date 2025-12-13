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


def get_llm_service(provider: str = None) -> AbstractLLMService:
    """
    Factory function to get the configured LLM service.

    Args:
        provider: Optional provider override ("claude" or "gemini").
                  If not specified, uses settings.MODEL_PROVIDER

    Returns:
        Configured LLM service instance based on provider

    Raises:
        ValueError: If provider is not recognized
        LLMConfigurationError: If service configuration is invalid
    """
    provider = provider or settings.MODEL_PROVIDER

    if provider == "claude":
        logger.info("Initializing Claude LLM service")
        return ClaudeService()
    elif provider == "gemini":
        logger.info("Initializing Gemini LLM service")
        return GeminiService()
    else:
        raise ValueError(f"Unknown MODEL_PROVIDER: {provider}")


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
