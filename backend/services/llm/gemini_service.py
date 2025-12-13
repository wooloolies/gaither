"""
Google Gemini API service for AI-powered analysis and generation.
Uses the new google-genai SDK (successor to google-generativeai).
"""
from google import genai
from google.genai import types
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


class GeminiService(AbstractLLMService):
    """Service for interacting with Google Gemini API using new google-genai SDK"""

    def __init__(self):
        # Validate API key configuration
        if not settings.GEMINI_API_KEY:
            raise LLMConfigurationError(
                "GEMINI_API_KEY is not configured. "
                "Set it in your .env file or environment variables."
            )

        try:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
            self.model_name = settings.GEMINI_MODEL
            logger.info(f"Gemini service initialized with model: {self.model_name}")
        except Exception as e:
            raise LLMConfigurationError(f"Failed to initialize Gemini client: {e}") from e

    async def function_call(
        self,
        prompt: str,
        function_name: str,
        schema: Dict[str, Any],
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Call Gemini with function calling for structured output.

        Args:
            prompt: The prompt to send to Gemini
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
            # Build function declaration using new SDK format
            function_declaration = {
                "name": function_name,
                "description": f"Extract structured data: {function_name}",
                "parameters": schema
            }

            # Create tools and config using new SDK types
            tools = types.Tool(function_declarations=[function_declaration])
            config = types.GenerateContentConfig(
                temperature=0.1,  # Low temperature for structured output
                max_output_tokens=max_tokens,
                tools=[tools]
            )

            # Call Gemini API with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                    config=config
                ),
                timeout=timeout
            )

            # Extract function call from response
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            # New SDK returns args as a proper dict
                            result = dict(part.function_call.args)
                            logger.info(f"Gemini function call successful: {function_name}")
                            return result

            # No function call in response - this is an error
            logger.error(f"No function call in Gemini response for {function_name}")
            raise LLMResponseError(
                f"Gemini did not return a function call for '{function_name}'. "
                "This may indicate the prompt was unclear or the model refused to use the tool."
            )

        except asyncio.TimeoutError:
            logger.error(f"Gemini API timeout after {timeout}s for {function_name}")
            raise LLMTimeoutError(f"Gemini API call timed out after {timeout} seconds") from None

        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            # Wrap generic exceptions in LLMAPIError
            if not isinstance(e, (LLMServiceError, asyncio.TimeoutError)):
                raise LLMAPIError(f"Gemini API error: {e}") from e
            raise

    async def analyze(
        self,
        prompt: str,
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> str:
        """
        Simple text analysis with Gemini.

        Args:
            prompt: The prompt to send to Gemini
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            Gemini's response as string
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
            # Create config using new SDK types
            config = types.GenerateContentConfig(
                temperature=0.7,  # Higher temperature for creative analysis
                max_output_tokens=max_tokens
            )

            # Call Gemini API with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                    config=config
                ),
                timeout=timeout
            )

            if not response.text:
                raise LLMResponseError("Gemini returned empty response")

            logger.info("Gemini analysis successful")
            return response.text

        except asyncio.TimeoutError:
            logger.error(f"Gemini API timeout after {timeout}s")
            raise LLMTimeoutError(f"Gemini API call timed out after {timeout} seconds") from None

        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            # Wrap generic exceptions in LLMAPIError
            if not isinstance(e, (LLMServiceError, asyncio.TimeoutError)):
                raise LLMAPIError(f"Gemini API error: {e}") from e
            raise

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

            except LLMAPIError as e:
                last_exception = e

                # Don't retry authentication/config errors
                if "authentication" in str(e).lower() or "api key" in str(e).lower():
                    logger.error("Authentication/config error - not retrying")
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
