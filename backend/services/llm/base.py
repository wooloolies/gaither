"""
Base class for LLM service implementations.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


# Data classes for chat functionality

@dataclass
class ChatMessage:
    """Represents a message in a conversation"""
    role: str  # "user", "assistant", or "system"
    content: str


@dataclass
class ToolCall:
    """Represents a tool/function call made by the LLM"""
    tool_name: str
    arguments: Dict[str, Any]


@dataclass
class ChatResponse:
    """Response from a chat method call"""
    content: str  # The text response from the LLM
    tool_calls: List[ToolCall] = field(default_factory=list)  # Any tools the LLM wants to call


# Exception classes

class LLMServiceError(Exception):
    """Base exception for LLM service errors"""
    pass


class LLMConfigurationError(LLMServiceError):
    """Raised when LLM service is misconfigured"""
    pass


class LLMAPIError(LLMServiceError):
    """Raised when LLM API call fails"""
    pass


class LLMResponseError(LLMServiceError):
    """Raised when LLM response cannot be parsed"""
    pass


class LLMTimeoutError(LLMServiceError):
    """Raised when LLM API call times out"""
    pass


class AbstractLLMService(ABC):
    """Abstract base class for LLM services"""

    @abstractmethod
    async def function_call(
        self,
        prompt: str,
        function_name: str,
        schema: Dict[str, Any],
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Call LLM with function calling for structured output.

        Args:
            prompt: The prompt to send to the LLM
            function_name: Name of the function to call
            schema: JSON schema for function parameters
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            Parsed function call arguments as dict

        Raises:
            LLMAPIError: If the LLM API call fails
            LLMResponseError: If response cannot be parsed
            LLMTimeoutError: If request times out
        """
        pass

    @abstractmethod
    async def analyze(
        self,
        prompt: str,
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> str:
        """
        Simple text analysis with LLM.

        Args:
            prompt: The prompt to send to the LLM
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            LLM response as string

        Raises:
            LLMAPIError: If the LLM API call fails
            LLMTimeoutError: If request times out
        """
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> ChatResponse:
        """
        Multi-turn chat with optional tool calling.

        Args:
            messages: Conversation history (system, user, assistant messages)
            tools: Optional list of tool definitions in standard format
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            ChatResponse with content and any tool calls

        Raises:
            LLMAPIError: If the LLM API call fails
            LLMResponseError: If response cannot be parsed
            LLMTimeoutError: If request times out
        """
        pass
