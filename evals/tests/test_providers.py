"""Unit tests for the provider abstraction (factory, schema transform, message format)."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from deepeval.test_case import MCPToolCall, Turn
from mcp.types import CallToolResult, TextContent

# Sample canonical tool schema for tests
SAMPLE_SCHEMAS = [
    {
        "name": "lookup_legislator",
        "description": "Looks up a legislator.",
        "input_schema": {
            "type": "object",
            "properties": {
                "street": {"type": "string"},
                "zone": {"type": "string"},
            },
            "required": ["street", "zone"],
        },
    },
]


# ---------------------------------------------------------------------------
# Factory tests (get_provider)
# ---------------------------------------------------------------------------


class TestGetProvider:
    """Tests for providers.get_provider factory function."""

    def test_default_returns_openai(self, monkeypatch):
        """Default (no EVAL_LLM_PROVIDER set) returns OpenAIProvider."""
        monkeypatch.delenv("EVAL_LLM_PROVIDER", raising=False)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        with patch("providers.openai_provider.openai.OpenAI"):
            from providers import get_provider
            from providers.openai_provider import OpenAIProvider

            provider = get_provider("system prompt", SAMPLE_SCHEMAS)
            assert isinstance(provider, OpenAIProvider)

    def test_openai_explicit(self, monkeypatch):
        """EVAL_LLM_PROVIDER=openai returns OpenAIProvider."""
        monkeypatch.setenv("EVAL_LLM_PROVIDER", "openai")
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        with patch("providers.openai_provider.openai.OpenAI"):
            from providers import get_provider
            from providers.openai_provider import OpenAIProvider

            provider = get_provider("system prompt", SAMPLE_SCHEMAS)
            assert isinstance(provider, OpenAIProvider)

    def test_anthropic_explicit(self, monkeypatch):
        """EVAL_LLM_PROVIDER=anthropic returns AnthropicProvider."""
        monkeypatch.setenv("EVAL_LLM_PROVIDER", "anthropic")
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        with patch("providers.anthropic_provider.anthropic.Anthropic"):
            from providers import get_provider
            from providers.anthropic_provider import AnthropicProvider

            provider = get_provider("system prompt", SAMPLE_SCHEMAS)
            assert isinstance(provider, AnthropicProvider)

    def test_unknown_provider_raises(self, monkeypatch):
        """Unknown EVAL_LLM_PROVIDER raises ValueError with 'unknown provider'."""
        monkeypatch.setenv("EVAL_LLM_PROVIDER", "gemini")

        from providers import get_provider

        with pytest.raises(ValueError, match="unknown provider"):
            get_provider("system prompt", SAMPLE_SCHEMAS)

    def test_custom_model_override(self, monkeypatch):
        """EVAL_LLM_MODEL overrides the default model name."""
        monkeypatch.setenv("EVAL_LLM_PROVIDER", "openai")
        monkeypatch.setenv("EVAL_LLM_MODEL", "gpt-4o")
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        with patch("providers.openai_provider.openai.OpenAI"):
            from providers import get_provider

            provider = get_provider("system prompt", SAMPLE_SCHEMAS)
            assert provider.model == "gpt-4o"

    def test_default_model_openai(self, monkeypatch):
        """OpenAI provider defaults to gpt-4.1."""
        monkeypatch.setenv("EVAL_LLM_PROVIDER", "openai")
        monkeypatch.delenv("EVAL_LLM_MODEL", raising=False)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        with patch("providers.openai_provider.openai.OpenAI"):
            from providers import get_provider

            provider = get_provider("system prompt", SAMPLE_SCHEMAS)
            assert provider.model == "gpt-4.1"

    def test_default_model_anthropic(self, monkeypatch):
        """Anthropic provider defaults to claude-sonnet-4-6."""
        monkeypatch.setenv("EVAL_LLM_PROVIDER", "anthropic")
        monkeypatch.delenv("EVAL_LLM_MODEL", raising=False)
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        with patch("providers.anthropic_provider.anthropic.Anthropic"):
            from providers import get_provider

            provider = get_provider("system prompt", SAMPLE_SCHEMAS)
            assert provider.model == "claude-sonnet-4-6"


# ---------------------------------------------------------------------------
# OpenAI tool schema transformation
# ---------------------------------------------------------------------------


class TestOpenAISchemaTransform:
    """Tests for OpenAI tool schema transformation from canonical format."""

    def test_transforms_to_openai_function_format(self, monkeypatch):
        """Canonical schemas are transformed to OpenAI function calling format."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        with patch("providers.openai_provider.openai.OpenAI"):
            from providers.openai_provider import OpenAIProvider

            provider = OpenAIProvider(
                model="gpt-4.1",
                system_prompt="test",
                tool_schemas=SAMPLE_SCHEMAS,
            )

        assert len(provider._openai_tools) == 1
        tool = provider._openai_tools[0]
        assert tool["type"] == "function"
        assert tool["function"]["name"] == "lookup_legislator"
        assert tool["function"]["description"] == "Looks up a legislator."
        assert tool["function"]["parameters"] == SAMPLE_SCHEMAS[0]["input_schema"]


class TestAnthropicSchemaPassthrough:
    """Tests for Anthropic tool schema passthrough."""

    def test_schemas_passed_through_unchanged(self, monkeypatch):
        """Anthropic provider keeps tool schemas in canonical format."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        with patch("providers.anthropic_provider.anthropic.Anthropic"):
            from providers.anthropic_provider import AnthropicProvider

            provider = AnthropicProvider(
                model="claude-sonnet-4-6",
                system_prompt="test",
                tool_schemas=SAMPLE_SCHEMAS,
            )

        assert provider.tool_schemas is SAMPLE_SCHEMAS


# ---------------------------------------------------------------------------
# OpenAI message formatting (system prompt placement)
# ---------------------------------------------------------------------------


class TestOpenAIAgenticLoop:
    """Tests for OpenAI provider agentic loop behavior."""

    def test_system_prompt_as_first_message(self, monkeypatch):
        """OpenAI provider includes system prompt as first message with role 'system'."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        mock_openai_client = MagicMock()
        # Simulate a simple stop response
        mock_choice = MagicMock()
        mock_choice.finish_reason = "stop"
        mock_choice.message.content = "Hello!"
        mock_choice.message.tool_calls = None
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_openai_client.chat.completions.create.return_value = mock_response

        with patch("providers.openai_provider.openai.OpenAI", return_value=mock_openai_client):
            from providers.openai_provider import OpenAIProvider

            provider = OpenAIProvider(
                model="gpt-4.1",
                system_prompt="You are a helpful assistant.",
                tool_schemas=SAMPLE_SCHEMAS,
            )

        import asyncio

        mock_mcp = AsyncMock()
        text, calls = asyncio.get_event_loop().run_until_complete(
            provider.run_agentic_loop([], "Hi", mock_mcp)
        )

        # Verify system prompt is first message
        call_kwargs = mock_openai_client.chat.completions.create.call_args
        messages = call_kwargs.kwargs.get("messages") or call_kwargs[1].get("messages")
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are a helpful assistant."
        assert text == "Hello!"
        assert calls == []

    def test_tool_call_proxied(self, monkeypatch):
        """OpenAI tool calls are proxied through MCP client correctly."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        mock_openai_client = MagicMock()

        # First response: tool call
        tool_call_obj = MagicMock()
        tool_call_obj.id = "call_abc123"
        tool_call_obj.function.name = "lookup_legislator"
        tool_call_obj.function.arguments = json.dumps({"street": "123 Main", "zone": "84101"})

        tool_choice = MagicMock()
        tool_choice.finish_reason = "tool_calls"
        tool_choice.message.content = None
        tool_choice.message.tool_calls = [tool_call_obj]
        tool_response = MagicMock()
        tool_response.choices = [tool_choice]

        # Second response: stop
        stop_choice = MagicMock()
        stop_choice.finish_reason = "stop"
        stop_choice.message.content = "Your legislator is Rep. Smith."
        stop_choice.message.tool_calls = None
        stop_response = MagicMock()
        stop_response.choices = [stop_choice]

        mock_openai_client.chat.completions.create.side_effect = [tool_response, stop_response]

        with patch("providers.openai_provider.openai.OpenAI", return_value=mock_openai_client):
            from providers.openai_provider import OpenAIProvider

            provider = OpenAIProvider(
                model="gpt-4.1",
                system_prompt="test",
                tool_schemas=SAMPLE_SCHEMAS,
            )

        import asyncio

        mock_mcp = AsyncMock()
        mock_mcp.call_tool = AsyncMock(return_value='{"name": "Rep. Smith"}')

        text, calls = asyncio.get_event_loop().run_until_complete(
            provider.run_agentic_loop([], "Who is my legislator?", mock_mcp)
        )

        assert text == "Your legislator is Rep. Smith."
        assert len(calls) == 1
        assert calls[0].name == "lookup_legislator"
        assert calls[0].args == {"street": "123 Main", "zone": "84101"}
        assert isinstance(calls[0].result, CallToolResult)
        assert calls[0].result.isError is False
        mock_mcp.call_tool.assert_called_once_with(
            "lookup_legislator", {"street": "123 Main", "zone": "84101"}
        )

    def test_malformed_json_arguments_surfaced_as_error(self, monkeypatch):
        """Malformed JSON in tool_call.function.arguments is surfaced as error tool result."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        mock_openai_client = MagicMock()

        # Tool call with malformed JSON arguments
        tool_call_obj = MagicMock()
        tool_call_obj.id = "call_bad"
        tool_call_obj.function.name = "lookup_legislator"
        tool_call_obj.function.arguments = "{bad json"

        tool_choice = MagicMock()
        tool_choice.finish_reason = "tool_calls"
        tool_choice.message.content = None
        tool_choice.message.tool_calls = [tool_call_obj]
        tool_response = MagicMock()
        tool_response.choices = [tool_choice]

        # Stop response after error
        stop_choice = MagicMock()
        stop_choice.finish_reason = "stop"
        stop_choice.message.content = "I had trouble with that tool."
        stop_choice.message.tool_calls = None
        stop_response = MagicMock()
        stop_response.choices = [stop_choice]

        mock_openai_client.chat.completions.create.side_effect = [tool_response, stop_response]

        with patch("providers.openai_provider.openai.OpenAI", return_value=mock_openai_client):
            from providers.openai_provider import OpenAIProvider

            provider = OpenAIProvider(
                model="gpt-4.1",
                system_prompt="test",
                tool_schemas=SAMPLE_SCHEMAS,
            )

        import asyncio

        mock_mcp = AsyncMock()

        text, calls = asyncio.get_event_loop().run_until_complete(
            provider.run_agentic_loop([], "Look up my rep", mock_mcp)
        )

        assert len(calls) == 1
        assert calls[0].result.isError is True
        assert "failed to parse arguments" in calls[0].result.content[0].text
        # MCP client should NOT have been called since args couldn't be parsed
        mock_mcp.call_tool.assert_not_called()

    def test_parallel_tool_calls(self, monkeypatch):
        """OpenAI parallel tool calls are all processed before next LLM call."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")

        mock_openai_client = MagicMock()

        # Two tool calls in one response
        tc1 = MagicMock()
        tc1.id = "call_1"
        tc1.function.name = "lookup_legislator"
        tc1.function.arguments = json.dumps({"street": "1 Main", "zone": "84101"})

        tc2 = MagicMock()
        tc2.id = "call_2"
        tc2.function.name = "search_bills"
        tc2.function.arguments = json.dumps({"legislatorId": "JS", "theme": "water"})

        tool_choice = MagicMock()
        tool_choice.finish_reason = "tool_calls"
        tool_choice.message.content = None
        tool_choice.message.tool_calls = [tc1, tc2]
        tool_response = MagicMock()
        tool_response.choices = [tool_choice]

        stop_choice = MagicMock()
        stop_choice.finish_reason = "stop"
        stop_choice.message.content = "Done."
        stop_choice.message.tool_calls = None
        stop_response = MagicMock()
        stop_response.choices = [stop_choice]

        mock_openai_client.chat.completions.create.side_effect = [tool_response, stop_response]

        # Need two schemas for this test
        two_schemas = SAMPLE_SCHEMAS + [
            {
                "name": "search_bills",
                "description": "Search bills.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "legislatorId": {"type": "string"},
                        "theme": {"type": "string"},
                    },
                    "required": ["legislatorId", "theme"],
                },
            },
        ]

        with patch("providers.openai_provider.openai.OpenAI", return_value=mock_openai_client):
            from providers.openai_provider import OpenAIProvider

            provider = OpenAIProvider(
                model="gpt-4.1",
                system_prompt="test",
                tool_schemas=two_schemas,
            )

        import asyncio

        mock_mcp = AsyncMock()
        mock_mcp.call_tool = AsyncMock(side_effect=["result1", "result2"])

        text, calls = asyncio.get_event_loop().run_until_complete(
            provider.run_agentic_loop([], "Do both", mock_mcp)
        )

        assert len(calls) == 2
        assert calls[0].name == "lookup_legislator"
        assert calls[1].name == "search_bills"
        # Only 2 LLM API calls: one returning tool_calls, one returning stop
        assert mock_openai_client.chat.completions.create.call_count == 2


# ---------------------------------------------------------------------------
# Anthropic provider message format
# ---------------------------------------------------------------------------


class TestAnthropicAgenticLoop:
    """Tests for Anthropic provider agentic loop behavior."""

    def test_system_prompt_not_in_messages(self, monkeypatch):
        """Anthropic provider passes system prompt via kwarg, not in messages."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        mock_anthropic_client = MagicMock()
        # Simulate a simple end_turn response
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = "Hello!"
        mock_resp = MagicMock()
        mock_resp.stop_reason = "end_turn"
        mock_resp.content = [text_block]
        mock_anthropic_client.messages.create.return_value = mock_resp

        with patch("providers.anthropic_provider.anthropic.Anthropic", return_value=mock_anthropic_client):
            from providers.anthropic_provider import AnthropicProvider

            provider = AnthropicProvider(
                model="claude-sonnet-4-6",
                system_prompt="You are helpful.",
                tool_schemas=SAMPLE_SCHEMAS,
            )

        import asyncio

        mock_mcp = AsyncMock()
        text, calls = asyncio.get_event_loop().run_until_complete(
            provider.run_agentic_loop([], "Hi", mock_mcp)
        )

        call_kwargs = mock_anthropic_client.messages.create.call_args
        # system is a kwarg, not in messages
        assert call_kwargs.kwargs.get("system") == "You are helpful."
        messages = call_kwargs.kwargs.get("messages") or call_kwargs[1].get("messages")
        # No system message in the messages list
        assert all(m["role"] != "system" for m in messages)
        assert text == "Hello!"
        assert calls == []
