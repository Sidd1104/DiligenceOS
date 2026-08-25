"""
DiligenceOS — AI Provider Abstraction Layer.

Defines the AIProvider interface and a factory function to instantiate
the configured provider at runtime. Supports Anthropic (Claude) and
Google Gemini as interchangeable backends.

Architecture reference: SRS §3.4 — Provider-agnostic AI layer.
"""

import logging
from abc import ABC, abstractmethod
from typing import Generator, List, Optional, Tuple

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


class FallbackAIProvider(AIProvider):
    """
    Composite provider that tries primary provider (Anthropic) first.
    If primary fails (rate limit, credit error, timeout, or any exception),
    it automatically falls back to secondary provider (Gemini).
    """

    def __init__(self, primary: AIProvider, fallback: Optional[AIProvider] = None):
        self._primary = primary
        self._fallback = fallback
        self._last_active_provider = primary

    @property
    def provider_name(self) -> str:
        return self._last_active_provider.provider_name

    @property
    def model_name(self) -> str:
        return self._last_active_provider.model_name

    def generate_answer(self, system_prompt: str, user_prompt: str) -> str:
        try:
            logger.info(f"[AI Provider] Attempting primary provider: {self._primary.provider_name} ({self._primary.model_name})")
            answer = self._primary.generate_answer(system_prompt, user_prompt)
            self._last_active_provider = self._primary
            logger.info(f"[AI Provider] Primary provider ({self._primary.provider_name}) succeeded.")
            return answer
        except Exception as primary_err:
            logger.warning(
                f"[AI Provider] Primary provider ({self._primary.provider_name}) failed: {primary_err}. "
                f"Attempting automatic fallback..."
            )
            if self._fallback:
                try:
                    logger.info(f"[AI Provider] Attempting fallback provider: {self._fallback.provider_name} ({self._fallback.model_name})")
                    answer = self._fallback.generate_answer(system_prompt, user_prompt)
                    self._last_active_provider = self._fallback
                    logger.info(f"[AI Provider] Fallback provider ({self._fallback.provider_name}) succeeded!")
                    return answer
                except Exception as fallback_err:
                    logger.error(f"[AI Provider] Fallback provider ({self._fallback.provider_name}) also failed: {fallback_err}")
                    raise fallback_err
            raise primary_err

    def stream_answer(
        self, system_prompt: str, user_prompt: str
    ) -> Generator[str, None, None]:
        try:
            logger.info(f"[AI Provider Stream] Attempting primary provider: {self._primary.provider_name} ({self._primary.model_name})")
            # Consume tokens from primary
            token_count = 0
            for token in self._primary.stream_answer(system_prompt, user_prompt):
                token_count += 1
                self._last_active_provider = self._primary
                yield token
            logger.info(f"[AI Provider Stream] Primary provider ({self._primary.provider_name}) finished after {token_count} tokens.")
            return
        except Exception as primary_err:
            logger.warning(
                f"[AI Provider Stream] Primary provider ({self._primary.provider_name}) failed: {primary_err}. "
                f"Attempting automatic fallback..."
            )
            if self._fallback:
                try:
                    logger.info(f"[AI Provider Stream] Attempting fallback provider: {self._fallback.provider_name} ({self._fallback.model_name})")
                    token_count = 0
                    for token in self._fallback.stream_answer(system_prompt, user_prompt):
                        token_count += 1
                        self._last_active_provider = self._fallback
                        yield token
                    logger.info(f"[AI Provider Stream] Fallback provider ({self._fallback.provider_name}) finished after {token_count} tokens.")
                    return
                except Exception as fallback_err:
                    logger.error(f"[AI Provider Stream] Fallback provider ({self._fallback.provider_name}) also failed: {fallback_err}")
                    raise fallback_err
            raise primary_err


def get_ai_provider() -> AIProvider:
    """
    Factory function that returns the configured AI provider instance.

    Always configures Anthropic as PRIMARY and Gemini as SECONDARY (fallback)
    if both API keys are configured, enabling seamless automatic runtime failover.
    """
    anthropic_key = settings.anthropic_api_key
    gemini_key = settings.gemini_api_key

    has_anthropic = bool(anthropic_key and not anthropic_key.startswith("your-"))
    has_gemini = bool(gemini_key and not gemini_key.startswith("your-"))

    primary_provider: Optional[AIProvider] = None
    fallback_provider: Optional[AIProvider] = None

    if has_anthropic:
        primary_provider = AnthropicProvider(api_key=anthropic_key)
        logger.info(f"[AI Provider Factory] Primary: Anthropic ({AnthropicProvider.CLAUDE_MODEL})")

    if has_gemini:
        gem_prov = GeminiProvider(api_key=gemini_key)
        if primary_provider is None:
            primary_provider = gem_prov
            logger.info(f"[AI Provider Factory] Primary: Gemini ({GeminiProvider.GEMINI_MODEL})")
        else:
            fallback_provider = gem_prov
            logger.info(f"[AI Provider Factory] Fallback: Gemini ({GeminiProvider.GEMINI_MODEL})")

    if not primary_provider:
        raise RuntimeError(
            "Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is configured in environment. "
            "Please configure at least one valid AI provider key in .env."
        )

    if fallback_provider:
        return FallbackAIProvider(primary=primary_provider, fallback=fallback_provider)
    return primary_provider


def get_provider_api_key() -> str:
    """Returns an active API key (Anthropic or Gemini)."""
    anthropic_key = settings.anthropic_api_key
    if anthropic_key and not anthropic_key.startswith("your-"):
        return anthropic_key
    return settings.gemini_api_key or ""

