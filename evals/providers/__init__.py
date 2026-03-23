"""Provider factory for the eval harness LLM abstraction.

Only contains the factory function — no re-exports of provider classes.
"""

import os

from providers.base import LLMProvider

# Default models per provider
_DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-4.1",
    "anthropic": "claude-sonnet-4-6",
}


def get_provider(system_prompt: str, tool_schemas: list[dict]) -> LLMProvider:
    """Create and return the appropriate LLM provider based on environment config.

    Reads ``EVAL_LLM_PROVIDER`` (default: ``"openai"``) and ``EVAL_LLM_MODEL``
    (default depends on provider) from environment variables.

    Args:
        system_prompt: System prompt text for the provider.
        tool_schemas: Canonical tool schemas (Anthropic-like format).

    Returns:
        An initialized LLMProvider instance.

    Raises:
        ValueError: If ``EVAL_LLM_PROVIDER`` is set to an unknown provider name.
    """
    provider_name = os.environ.get("EVAL_LLM_PROVIDER", "openai").lower()
    model = os.environ.get("EVAL_LLM_MODEL", _DEFAULT_MODELS.get(provider_name, ""))

    if provider_name == "openai":
        from providers.openai_provider import OpenAIProvider

        if not model:
            model = _DEFAULT_MODELS["openai"]
        return OpenAIProvider(model=model, system_prompt=system_prompt, tool_schemas=tool_schemas)

    if provider_name == "anthropic":
        from providers.anthropic_provider import AnthropicProvider

        if not model:
            model = _DEFAULT_MODELS["anthropic"]
        return AnthropicProvider(model=model, system_prompt=system_prompt, tool_schemas=tool_schemas)

    raise ValueError(
        f"unknown provider '{provider_name}': EVAL_LLM_PROVIDER must be 'openai' or 'anthropic'"
    )
