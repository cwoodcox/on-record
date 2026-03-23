"""Unit and integration tests for chatbot.py (model_callback) and mcp_client.py."""

import os
from unittest.mock import AsyncMock, MagicMock, call, patch

import httpx
import pytest
from deepeval.test_case import MCPToolCall, Turn

from mcp.types import CallToolResult, TextContent

import chatbot
from mcp_client import McpHttpClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mcp_calls(name: str, args: dict, result_text: str) -> list[MCPToolCall]:
    """Build a list with one MCPToolCall for testing."""
    return [
        MCPToolCall(
            name=name,
            args=args,
            result=CallToolResult(
                content=[TextContent(type="text", text=result_text)],
                isError=False,
            ),
        )
    ]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def clear_client_pool():
    """Clear the module-level MCP client pool before and after every test."""
    chatbot._clients.clear()
    yield
    chatbot._clients.clear()


def _mock_mcp_client(call_tool_return=None, call_tool_side_effect=None) -> AsyncMock:
    """Return an AsyncMock McpHttpClient with configurable call_tool behaviour."""
    mock = AsyncMock(spec=McpHttpClient)
    if call_tool_side_effect is not None:
        mock.call_tool = AsyncMock(side_effect=call_tool_side_effect)
    else:
        mock.call_tool = AsyncMock(return_value=call_tool_return or "tool-result")
    return mock


# ---------------------------------------------------------------------------
# AC3 — single tool_use block proxied correctly
# ---------------------------------------------------------------------------


async def test_tool_call_proxied():
    """AC3: tool_use block is proxied via McpHttpClient; MCPToolCall appears in Turn."""
    mock_mcp = _mock_mcp_client(call_tool_return='{"name": "Rep. Jane Smith", "district": 12}')

    mcp_calls = _make_mcp_calls(
        "lookup_legislator",
        {"street": "123 Main St", "zone": "84101"},
        '{"name": "Rep. Jane Smith", "district": 12}',
    )

    mock_provider = AsyncMock()
    mock_provider.run_agentic_loop = AsyncMock(
        return_value=("Your legislator is Rep. Jane Smith.", mcp_calls)
    )

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._get_provider", return_value=mock_provider):
            result = await chatbot.model_callback(
                input="Who is my legislator?",
                turns=[],
                thread_id="thread-tool-proxied",
            )

    assert result.role == "assistant"
    assert result.content == "Your legislator is Rep. Jane Smith."
    assert result.mcp_tools_called is not None
    assert len(result.mcp_tools_called) == 1
    tool_call = result.mcp_tools_called[0]
    assert tool_call.name == "lookup_legislator"
    assert isinstance(tool_call.result, CallToolResult)


# ---------------------------------------------------------------------------
# AC4 — multi-tool sequence: both tools appear in mcp_tools_called
# ---------------------------------------------------------------------------


async def test_multi_tool_sequence():
    """AC4: sequential tool calls (lookup then search) both appear in mcp_tools_called."""
    mock_mcp = _mock_mcp_client()

    mcp_calls = [
        MCPToolCall(
            name="lookup_legislator",
            args={"street": "456 Oak Ave", "zone": "Salt Lake City"},
            result=CallToolResult(
                content=[TextContent(type="text", text='{"legislatorId": "JSMith"}')],
                isError=False,
            ),
        ),
        MCPToolCall(
            name="search_bills",
            args={"legislatorId": "JSMith", "theme": "clean water"},
            result=CallToolResult(
                content=[TextContent(type="text", text='[{"bill": "HB0001"}]')],
                isError=False,
            ),
        ),
    ]

    mock_provider = AsyncMock()
    mock_provider.run_agentic_loop = AsyncMock(
        return_value=("Here are the relevant water quality bills.", mcp_calls)
    )

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._get_provider", return_value=mock_provider):
            result = await chatbot.model_callback(
                input="What water bills has my legislator sponsored?",
                turns=[],
                thread_id="thread-multi-tool",
            )

    assert result.mcp_tools_called is not None
    assert len(result.mcp_tools_called) == 2
    names = [c.name for c in result.mcp_tools_called]
    assert "lookup_legislator" in names
    assert "search_bills" in names


# ---------------------------------------------------------------------------
# AC9 — bug #1884: consecutive same-role turns are filtered
# ---------------------------------------------------------------------------


async def test_bug_1884_workaround():
    """AC9: consecutive same-role turns in history are filtered before provider call."""
    mock_mcp = _mock_mcp_client()

    captured_turns: list = []
    captured_input: list = []

    async def capture_and_return(filtered_turns, current_input, mcp_client):
        captured_turns.extend(filtered_turns)
        captured_input.append(current_input)
        return ("Hello there!", [])

    mock_provider = MagicMock()
    mock_provider.run_agentic_loop = capture_and_return

    # Simulate ConversationSimulator bug: two consecutive user turns in history
    duplicate_user_turns = [
        Turn(role="user", content="Hello"),
        Turn(role="user", content="Hello again (duplicate)"),
    ]

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._get_provider", return_value=mock_provider):
            await chatbot.model_callback(
                input="Is anyone there?",
                turns=duplicate_user_turns,
                thread_id="thread-bug-1884",
            )

    # 2 history user turns + 1 current user input = 3 user turns
    # Filter collapses all consecutive user turns to 1.
    # The filtered_turns passed to provider should have 0 history turns
    # (the single remaining user turn becomes current_input).
    assert len(captured_turns) == 0
    assert len(captured_input) == 1
    assert captured_input[0] == "Hello"


# ---------------------------------------------------------------------------
# AC6 — MCP connection errors are caught; model_callback returns Turn
# ---------------------------------------------------------------------------


async def test_mcp_connection_error_surfaced():
    """AC6: MCP connection error is surfaced in Turn.content, not raised."""
    with patch(
        "chatbot.get_or_create_client",
        AsyncMock(side_effect=ConnectionError("Connection refused")),
    ):
        result = await chatbot.model_callback(
            input="Who represents me?",
            turns=[],
            thread_id="thread-error-surface",
        )

    assert isinstance(result, Turn)
    assert result.role == "assistant"
    assert "MCP server connection failed" in result.content
    assert result.mcp_tools_called is None


# ---------------------------------------------------------------------------
# AC6 — MCP tool errors are handled by provider (tested in test_providers.py)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# AC10 — 429 retry with exponential backoff
# ---------------------------------------------------------------------------


async def test_429_retry_backoff():
    """AC10: 429 triggers retry with 1s, 2s, 4s backoff; succeeds on 4th attempt."""
    from mcp.types import TextContent as MCP_TextContent

    call_count = 0

    async def mock_call_tool(name, arguments):
        nonlocal call_count
        call_count += 1
        if call_count <= 3:
            raise Exception("429 rate limit exceeded")
        # Return a proper CallToolResult-like object on success
        result = MagicMock()
        result.isError = False
        result.content = [MCP_TextContent(type="text", text="tool-result-ok")]
        return result

    mock_sleep = AsyncMock()
    with patch("mcp_client.asyncio.sleep", mock_sleep):
        client = McpHttpClient()
        mock_session = AsyncMock()
        mock_session.call_tool = mock_call_tool
        client._session = mock_session
        result = await client.call_tool(
            "lookup_legislator", {"street": "1 Main St", "zone": "SLC"}
        )

    assert result == "tool-result-ok"
    assert call_count == 4
    # Sleep called with backoff delays for attempts 1, 2, 3 (not 0)
    assert mock_sleep.call_args_list == [call(1), call(2), call(4)]


async def test_429_exhausted():
    """AC10: after 4 attempts all 429, raises RuntimeError containing 'MCP rate limit'."""

    async def always_429(name, arguments):
        raise Exception("429 rate limit exceeded")

    mock_sleep = AsyncMock()
    with patch("mcp_client.asyncio.sleep", mock_sleep):
        client = McpHttpClient()
        mock_session = AsyncMock()
        mock_session.call_tool = always_429
        client._session = mock_session
        with pytest.raises(RuntimeError) as exc_info:
            await client.call_tool(
                "lookup_legislator", {"street": "1 Main St", "zone": "SLC"}
            )

    assert "MCP call failed after" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Integration test — requires running MCP server + LLM API key
# ---------------------------------------------------------------------------


@pytest.mark.integration
async def test_model_callback_live(mcp_server):
    """Integration: real server + real LLM API — greeting returns Turn with no tool calls."""
    provider = os.environ.get("EVAL_LLM_PROVIDER", "openai").lower()
    key_map = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY"}
    required_key = key_map.get(provider, f"{provider.upper()}_API_KEY")
    if not os.environ.get(required_key):
        pytest.skip(f"{required_key} not set — skipping live integration test")

    result = await chatbot.model_callback(
        input="Hi there! Just saying hello.",
        turns=[],
        thread_id="live-thread-integration",
    )

    assert isinstance(result, Turn)
    assert result.role == "assistant"
    assert result.content
    assert result.mcp_tools_called is None
