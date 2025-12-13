"""
Claude API service for AI-powered analysis and generation.
"""
import anthropic
import asyncio
import logging
from typing import Dict, Any
from config import settings
from .base import (
    AbstractLLMService,
    LLMServiceError,
    LLMConfigurationError,
    LLMAPIError,
    LLMResponseError,
    LLMTimeoutError
)

logger = logging.getLogger(__name__)


class ClaudeService(AbstractLLMService):
    """Service for interacting with Claude API"""

    def __init__(self):
        # Validate API key configuration
        if not settings.ANTHROPIC_API_KEY:
            raise LLMConfigurationError(
                "ANTHROPIC_API_KEY is not configured. "
                "Set it in your .env file or environment variables."
            )

        try:
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.model = settings.CLAUDE_MODEL
            logger.info(f"Claude service initialized with model: {self.model}")
        except Exception as e:
            raise LLMConfigurationError(f"Failed to initialize Claude client: {e}") from e

    async def function_call(
        self,
        prompt: str,
        function_name: str,
        schema: Dict[str, Any],
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Call Claude with function calling for structured output.

        Args:
            prompt: The prompt to send to Claude
            function_name: Name of the function to call
            schema: JSON schema for the function parameters
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            Parsed function call arguments as dict
        """
        return await self._retry_with_backoff(
            self._function_call_impl,
            prompt,
            function_name,
            schema,
            max_tokens,
            timeout
        )

    async def _function_call_impl(
        self,
        prompt: str,
        function_name: str,
        schema: Dict[str, Any],
        max_tokens: int,
        timeout: int
    ) -> Dict[str, Any]:
        """Implementation of function call with timeout"""
        try:
            # Run sync client in thread pool with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
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
                ),
                timeout=timeout
            )

            # Extract tool use from response
            for content in response.content:
                if content.type == "tool_use":
                    logger.info(f"Claude function call successful: {function_name}")
                    return content.input

            # No function call in response - this is an error
            logger.error(f"No function call in Claude response for {function_name}")
            raise LLMResponseError(
                f"Claude did not return a function call for '{function_name}'. "
                "This may indicate the prompt was unclear or the model refused to use the tool."
            )

        except asyncio.TimeoutError:
            logger.error(f"Claude API timeout after {timeout}s for {function_name}")
            raise LLMTimeoutError(f"Claude API call timed out after {timeout} seconds") from None

        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            raise LLMAPIError(f"Claude API error: {e}") from e

        except Exception as e:
            logger.error(f"Unexpected error calling Claude API: {e}")
            # Wrap generic exceptions in LLMAPIError
            if not isinstance(e, (LLMServiceError, asyncio.TimeoutError)):
                raise LLMAPIError(f"Claude API error: {e}")
            raise

    async def analyze(
        self,
        prompt: str,
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> str:
        """
        Simple text analysis with Claude.

        Args:
            prompt: The prompt to send to Claude
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            Claude's response as string
        """
        return await self._retry_with_backoff(
            self._analyze_impl,
            prompt,
            max_tokens,
            timeout
        )

    async def _analyze_impl(
        self,
        prompt: str,
        max_tokens: int,
        timeout: int
    ) -> str:
        """Implementation of analyze with timeout"""
        try:
            # Run sync client in thread pool with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.messages.create,
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[{
                        "role": "user",
                        "content": prompt
                    }]
                ),
                timeout=timeout
            )

            # Extract text from response
            text_content = ""
            for content in response.content:
                if content.type == "text":
                    text_content += content.text

            if not text_content:
                raise LLMResponseError("Claude returned empty response")

            logger.info("Claude analysis successful")
            return text_content

        except asyncio.TimeoutError:
            logger.error(f"Claude API timeout after {timeout}s")
            raise LLMTimeoutError(f"Claude API call timed out after {timeout} seconds") from None

        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            raise LLMAPIError(f"Claude API error: {e}") from e

        except Exception as e:
            logger.error(f"Unexpected error calling Claude API: {e}")
            raise LLMAPIError(f"Unexpected Claude API error: {e}") from e

    async def _retry_with_backoff(self, func, *args, max_retries: int = 3, **kwargs):
        """
        Retry function with exponential backoff.

        Args:
            func: The async function to retry
            *args: Positional arguments for func
            max_retries: Maximum number of retry attempts (default: 3)
            **kwargs: Keyword arguments for func

        Returns:
            Result from func

        Raises:
            LLMAPIError: After all retries exhausted
        """
        last_exception = None

        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)

            except (LLMAPIError, anthropic.APIError) as e:
                last_exception = e

                # Don't retry on non-retryable errors
                if isinstance(e, anthropic.AuthenticationError):
                    logger.error("Authentication error - not retrying")
                    raise

                if attempt < max_retries - 1:
                    # Exponential backoff: 1s, 2s, 4s
                    wait_time = 2 ** attempt
                    logger.warning(
                        f"API error (attempt {attempt + 1}/{max_retries}): {e}. "
                        f"Retrying in {wait_time}s..."
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"All {max_retries} retry attempts failed")

            except LLMTimeoutError:
                # Don't retry timeouts
                raise

            except LLMResponseError:
                # Don't retry response parsing errors
                raise

        # All retries exhausted
        raise LLMAPIError(f"Failed after {max_retries} attempts: {last_exception}") from last_exception
