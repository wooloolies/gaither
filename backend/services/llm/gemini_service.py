"""
Google Gemini API service for AI-powered analysis and generation.
Uses the new google-genai SDK (successor to google-generativeai).
"""
from google import genai
from google.genai import types
import asyncio
import logging
import time
from typing import Dict, Any, List, Optional
from config import settings
from .base import (
    AbstractLLMService,
    ChatMessage,
    ChatResponse,
    ToolCall,
    LLMServiceError,
    LLMConfigurationError,
    LLMAPIError,
    LLMResponseError,
    LLMTimeoutError
)

logger = logging.getLogger(__name__)

# Rate limiting intervals for Gemini Free Tier (only enabled when GEMINI_FREE_TIER=true)
# gemini-2.5-flash: 5 RPM = 12s interval
# gemini-2.5-flash-lite: 15 RPM = 4s interval
RATE_LIMIT_INTERVALS = {
    "gemini-2.5-flash": 13.0,
    "gemini-2.5-flash-lite": 5.0,  # 4s + 1s buffer
}
DEFAULT_RATE_LIMIT_INTERVAL = 13.0  # Conservative default


class GeminiService(AbstractLLMService):
    """Service for interacting with Google Gemini API using new google-genai SDK"""

    # Class-level rate limiting (shared across all instances)
    _last_request_time: float = 0.0
    _rate_limit_lock: asyncio.Lock | None = None

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

    async def _wait_for_rate_limit(self):
        """
        Wait if necessary to respect Gemini's rate limit.
        Rate limits vary by model:
        - gemini-2.5-flash: 5 RPM (12s interval)
        - gemini-2.5-flash-lite: 15 RPM (4s interval)
        Only active when GEMINI_FREE_TIER=true.
        """
        # Skip rate limiting for paid tier
        if not settings.GEMINI_FREE_TIER:
            return

        # Lazily create lock (must be created in async context)
        if GeminiService._rate_limit_lock is None:
            GeminiService._rate_limit_lock = asyncio.Lock()

        # Get model-specific rate limit interval
        min_interval = RATE_LIMIT_INTERVALS.get(self.model_name, DEFAULT_RATE_LIMIT_INTERVAL)

        async with GeminiService._rate_limit_lock:
            now = time.time()
            elapsed = now - GeminiService._last_request_time
            wait_time = min_interval - elapsed

            if wait_time > 0:
                logger.info(f"⏳ Rate limiting ({self.model_name}): waiting {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)

            GeminiService._last_request_time = time.time()

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
        # Wait for rate limit before making request
        await self._wait_for_rate_limit()

        try:
            # Build function declaration using new SDK format
            function_declaration = {
                "name": function_name,
                "description": f"Extract structured data: {function_name}",
                "parameters": schema
            }

            # Create tools and config using new SDK types
            tools = types.Tool(function_declarations=[function_declaration])

            # Force the model to use the function (required for reliable function calling)
            tool_config = types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(
                    mode="ANY",  # Force function calling
                    allowed_function_names=[function_name]
                )
            )

            config = types.GenerateContentConfig(
                temperature=0.1,  # Low temperature for structured output
                max_output_tokens=max_tokens,
                tools=[tools],
                tool_config=tool_config
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
        # Wait for rate limit before making request
        await self._wait_for_rate_limit()

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

    async def chat(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        max_tokens: int = 4096,
        timeout: int = 60
    ) -> ChatResponse:
        """
        Multi-turn chat with Gemini with optional tool calling.

        Args:
            messages: Conversation history (system, user, assistant messages)
            tools: Optional list of tool definitions
            max_tokens: Maximum tokens for response
            timeout: Timeout in seconds (default: 60)

        Returns:
            ChatResponse with content and any tool calls
        """
        return await self._retry_with_backoff(
            self._chat_impl,
            messages,
            tools,
            max_tokens,
            timeout
        )

    async def _chat_impl(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]],
        max_tokens: int,
        timeout: int
    ) -> ChatResponse:
        """Implementation of chat with timeout"""
        # Wait for rate limit before making request
        await self._wait_for_rate_limit()

        try:
            # Convert messages to Gemini contents format
            # Gemini accepts: role="user" or role="model" (model = assistant)
            # System messages can be added as user messages or via system_instruction
            contents = []
            system_instruction = None

            for msg in messages:
                if msg.role == "system":
                    # Collect system messages for system_instruction
                    if system_instruction is None:
                        system_instruction = msg.content
                    else:
                        system_instruction += "\n\n" + msg.content
                elif msg.role == "user":
                    contents.append(types.Content(role="user", parts=[types.Part(text=msg.content)]))
                elif msg.role == "assistant":
                    contents.append(types.Content(role="model", parts=[types.Part(text=msg.content)]))

            # Build config
            config_params = {
                "temperature": 0.7,
                "max_output_tokens": max_tokens
            }

            # Add tools if provided
            if tools:
                # Convert tools to Gemini format
                function_declarations = []
                for tool in tools:
                    function_declarations.append({
                        "name": tool["name"],
                        "description": tool.get("description", ""),
                        "parameters": tool.get("input_schema", tool.get("parameters", {}))
                    })

                gemini_tools = types.Tool(function_declarations=function_declarations)
                config_params["tools"] = [gemini_tools]
                
            if system_instruction:
                config_params["system_instruction"] = system_instruction

            config = types.GenerateContentConfig(**config_params)

            # Build request parameters
            request_params = {
                "model": self.model_name,
                "contents": contents,
                "config": config
            }

            
            # Call Gemini API with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.models.generate_content,
                    **request_params
                ),
                timeout=timeout
            )

            # Extract text content and tool calls from response
            text_content = ""
            tool_calls = []

            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        # Extract text
                        if hasattr(part, 'text') and part.text:
                            text_content += part.text
                        # Extract function calls
                        elif hasattr(part, 'function_call') and part.function_call:
                            tool_calls.append(ToolCall(
                                tool_name=part.function_call.name,
                                arguments=dict(part.function_call.args)
                            ))

            logger.info(f"Gemini chat successful. Tool calls: {len(tool_calls)}")
            return ChatResponse(content=text_content, tool_calls=tool_calls)

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
