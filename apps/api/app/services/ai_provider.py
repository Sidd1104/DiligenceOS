"""
DiligenceOS — AI Provider Abstraction Layer.

Defines the AIProvider interface and a factory function to instantiate
the configured provider at runtime. Supports Anthropic (Claude) and
Google Gemini as interchangeable backends.

Architecture reference: SRS §3.4 — Provider-agnostic AI layer.
"""

import logging
from abc import ABC, abstractmethod
from typing import Generator, List, Tuple

from app.config import settings

logger = logging.getLogger("diligenceos.ai_provider")


class AIProvider(ABC):
    """
    Abstract base class for AI providers.

    Each provider must implement both synchronous generation and streaming
    generation, using the same system prompt / user prompt contract.
    """

    @abstractmethod
    def generate_answer(
        self, system_prompt: str, user_prompt: str
    ) -> str:
        """
        Generate a complete answer synchronously.

        Args:
            system_prompt: The system instruction context.
            user_prompt: The user question with evidence chunks.

        Returns:
            The full answer text as a string.
        """
        ...

    @abstractmethod
    def stream_answer(
        self, system_prompt: str, user_prompt: str
    ) -> Generator[str, None, None]:
        """
        Stream answer tokens incrementally.

        Args:
            system_prompt: The system instruction context.
            user_prompt: The user question with evidence chunks.

        Yields:
            Text delta strings as they become available.
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name for logging."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Model identifier string for logging."""
        ...


class AnthropicProvider(AIProvider):
    """
    Anthropic Claude provider — wraps existing Claude API logic.
    Model: claude-3-5-sonnet-20241022
    """

    CLAUDE_MODEL = "claude-3-5-sonnet-20241022"

    def __init__(self, api_key: str):
        self._api_key = api_key

    @property
    def provider_name(self) -> str:
        return "Anthropic"

    @property
    def model_name(self) -> str:
        return self.CLAUDE_MODEL

    def generate_answer(self, system_prompt: str, user_prompt: str) -> str:
        import anthropic

        client = anthropic.Anthropic(api_key=self._api_key)
        response = client.messages.create(
            model=self.CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content_block = response.content[0]
        return getattr(content_block, "text", str(content_block))

    def stream_answer(
        self, system_prompt: str, user_prompt: str
    ) -> Generator[str, None, None]:
        import anthropic

        client = anthropic.Anthropic(api_key=self._api_key)
        with client.messages.stream(
            model=self.CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for text_delta in stream.text_stream:
                yield text_delta


class GeminiProvider(AIProvider):
    """
    Google Gemini provider.
    Model: gemini-2.5-flash
    Uses the google-genai SDK.
    Supports streaming via generate_content_stream.
    """

    GEMINI_MODEL = "gemini-3.6-flash"
    FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"]

    def __init__(self, api_key: str):
        self._api_key = api_key

    @property
    def provider_name(self) -> str:
        return "Gemini"

    @property
    def model_name(self) -> str:
        return self.GEMINI_MODEL

    def generate_answer(self, system_prompt: str, user_prompt: str) -> str:
        from google import genai
        from google.genai.errors import ClientError

        client = genai.Client(api_key=self._api_key)
        models_to_try = [self.GEMINI_MODEL] + self.FALLBACK_MODELS

        last_err = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=user_prompt,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        max_output_tokens=1024,
                        temperature=0.3,
                    ),
                )
                return response.text
            except ClientError as e:
                if e.code == 404:
                    logger.warning(f"Gemini model '{m}' returned 404. Trying next model...")
                    last_err = e
                    continue
                raise e
        raise last_err

    def stream_answer(
        self, system_prompt: str, user_prompt: str
    ) -> Generator[str, None, None]:
        from google import genai
        from google.genai.errors import ClientError

        client = genai.Client(api_key=self._api_key)
        models_to_try = [self.GEMINI_MODEL] + self.FALLBACK_MODELS

        last_err = None
        for m in models_to_try:
            try:
                response_stream = client.models.generate_content_stream(
                    model=m,
                    contents=user_prompt,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        max_output_tokens=1024,
                        temperature=0.3,
                    ),
                )
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return
            except ClientError as e:
                if e.code == 404:
                    logger.warning(f"Gemini model '{m}' returned 404. Trying next model...")
                    last_err = e
                    continue
                raise e
        raise last_err


def get_ai_provider() -> AIProvider:
    """
    Factory function that returns the configured AI provider instance.

    Reads AI_PROVIDER from settings to determine which provider to use.
    Raises RuntimeError if the selected provider has no API key configured.
    """
    provider_name = settings.ai_provider.lower().strip()

    if provider_name == "gemini":
        api_key = settings.gemini_api_key
        if not api_key or api_key.startswith("your-"):
            raise RuntimeError(
                "AI_PROVIDER is set to 'gemini' but GEMINI_API_KEY is not configured. "
                "Set GEMINI_API_KEY in your .env file."
            )
        logger.info(f"[AI Provider] Using GeminiProvider (model={GeminiProvider.GEMINI_MODEL})")
        return GeminiProvider(api_key=api_key)

    elif provider_name == "anthropic":
        api_key = settings.anthropic_api_key
        if not api_key or api_key.startswith("your-"):
            raise RuntimeError(
                "AI_PROVIDER is set to 'anthropic' but ANTHROPIC_API_KEY is not configured. "
                "Set ANTHROPIC_API_KEY in your .env file."
            )
        logger.info(f"[AI Provider] Using AnthropicProvider (model={AnthropicProvider.CLAUDE_MODEL})")
        return AnthropicProvider(api_key=api_key)

    else:
        raise RuntimeError(
            f"Unknown AI_PROVIDER value: {provider_name!r}. "
            f"Supported values: 'anthropic', 'gemini'."
        )


def get_provider_api_key() -> str:
    """Returns the API key for the currently configured provider."""
    provider_name = settings.ai_provider.lower().strip()
    if provider_name == "gemini":
        return settings.gemini_api_key
    return settings.anthropic_api_key
