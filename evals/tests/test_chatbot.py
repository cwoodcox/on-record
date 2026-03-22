"""Unit and integration tests for chatbot.py (model_callback) and mcp_client.py."""

import os
from unittest.mock import AsyncMock, MagicMock, call, patch

import httpx
import pytest
from deepeval.test_case import MCPToolCall, Turn

from mcp.types import CallToolResult

import chatbot
from mcp_client import McpHttpClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _text_response(text: str) -> MagicMock:
    """Return a mock Anthropic response with stop_reason='end_turn'."""
    block = MagicMock()
    block.type = "text"
    block.text = text

    resp = MagicMock()
    resp.stop_reason = "end_turn"
    resp.content = [block]
    return resp


def _tool_use_response(name: str, args: dict, tool_id: str = "toolu_001") -> MagicMock:
    """Return a mock Anthropic response with stop_reason='tool_use'."""
    block = MagicMock()
    block.type = "tool_use"
    block.name = name
    block.input = args
    block.id = tool_id

    resp = MagicMock()
    resp.stop_reason = "tool_use"
    resp.content = [block]
    return resp


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

    tool_resp = _tool_use_response(
        "lookup_legislator",
        {"street": "123 Main St", "zone": "84101"},
        tool_id="toolu_abc",
    )
    end_resp = _text_response("Your legislator is Rep. Jane Smith.")

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._anthropic") as mock_anthropic:
            mock_anthropic.messages.create.side_effect = [tool_resp, end_resp]

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
    mock_mcp.call_tool.assert_called_once_with(
        "lookup_legislator", {"street": "123 Main St", "zone": "84101"}
    )


# ---------------------------------------------------------------------------
# AC4 — multi-tool sequence: both tools appear in mcp_tools_called
# ---------------------------------------------------------------------------


async def test_multi_tool_sequence():
    """AC4: sequential tool calls (lookup then search) both appear in mcp_tools_called."""
    mock_mcp = _mock_mcp_client(
        call_tool_side_effect=[
            '{"legislatorId": "JSMith"}',
            '[{"bill": "HB0001", "title": "Water Quality Act"}]',
        ]
    )

    resp_lookup = _tool_use_response(
        "lookup_legislator",
        {"street": "456 Oak Ave", "zone": "Salt Lake City"},
        tool_id="toolu_001",
    )
    resp_search = _tool_use_response(
        "search_bills",
        {"legislatorId": "JSMith", "theme": "clean water"},
        tool_id="toolu_002",
    )
    resp_end = _text_response("Here are the relevant water quality bills.")

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._anthropic") as mock_anthropic:
            mock_anthropic.messages.create.side_effect = [resp_lookup, resp_search, resp_end]

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
    """AC9: consecutive same-role turns in history are filtered before Anthropic call."""
    mock_mcp = _mock_mcp_client()
    end_resp = _text_response("Hello there!")

    # Simulate ConversationSimulator bug: two consecutive user turns in history
    duplicate_user_turns = [
        Turn(role="user", content="Hello"),
        Turn(role="user", content="Hello again (duplicate)"),
    ]

    captured_messages: list = []

    def capture_and_return(*args, **kwargs):
        captured_messages.extend(kwargs.get("messages", []))
        return end_resp

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._anthropic") as mock_anthropic:
            mock_anthropic.messages.create.side_effect = capture_and_return

            await chatbot.model_callback(
                input="Is anyone there?",
                turns=duplicate_user_turns,
                thread_id="thread-bug-1884",
            )

    # 2 history turns → filtered to 1, plus current input (also user) → filtered
    # together = still only 1 user message (the last one wins via filter).
    # The key invariant: NO consecutive same-role messages in the final list.
    for i in range(1, len(captured_messages)):
        assert captured_messages[i]["role"] != captured_messages[i - 1]["role"], (
            f"Consecutive same-role messages at index {i - 1} and {i}: "
            f"{captured_messages[i - 1]} / {captured_messages[i]}"
        )
    # All messages should be user role in this case (only user turns in input),
    # so filter collapses everything to just the first user turn.
    assert len(captured_messages) == 1
    assert captured_messages[0]["role"] == "user"


# ---------------------------------------------------------------------------
# AC6 — MCP errors are caught; model_callback returns Turn, not exception
# ---------------------------------------------------------------------------


async def test_mcp_error_surfaced_not_raised():
    """AC6: HTTP errors from call_tool are caught; model_callback returns Turn without raising."""
    error_response = MagicMock()
    error_response.status_code = 500
    mock_mcp = _mock_mcp_client(
        call_tool_side_effect=httpx.HTTPStatusError(
            "Internal Server Error",
            request=MagicMock(),
            response=error_response,
        )
    )

    tool_resp = _tool_use_response(
        "lookup_legislator",
        {"street": "789 Pine St", "zone": "Provo"},
        tool_id="toolu_err",
    )
    end_resp = _text_response("I encountered an error looking up your legislator.")

    with patch("chatbot.get_or_create_client", AsyncMock(return_value=mock_mcp)):
        with patch("chatbot._anthropic") as mock_anthropic:
            mock_anthropic.messages.create.side_effect = [tool_resp, end_resp]

            # Must NOT raise
            result = await chatbot.model_callback(
                input="Who represents me?",
                turns=[],
                thread_id="thread-error-surface",
            )

    assert isinstance(result, Turn)
    assert result.role == "assistant"
    assert result.content  # non-empty string
    # Verify the error info was surfaced in the tool call result, not swallowed
    assert result.mcp_tools_called is not None
    assert len(result.mcp_tools_called) == 1
    tool_call = result.mcp_tools_called[0]
    assert tool_call.name == "lookup_legislator"
    assert isinstance(tool_call.result, CallToolResult)
    assert tool_call.result.isError is True
    assert "Tool error:" in tool_call.result.content[0].text


# ---------------------------------------------------------------------------
# AC10 — 429 retry with exponential backoff
# ---------------------------------------------------------------------------


async def test_429_retry_backoff():
    """AC10: 429 triggers retry with 1s, 2s, 4s backoff; succeeds on 4th attempt."""
    call_count = 0

    async def mock_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        mock_resp = MagicMock()
        if call_count <= 3:
            mock_resp.status_code = 429
        else:
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "result": {"content": [{"type": "text", "text": "tool-result-ok"}]}
            }
            mock_resp.raise_for_status = MagicMock()
        return mock_resp

    mock_sleep = AsyncMock()
    with patch("mcp_client.asyncio.sleep", mock_sleep):
        client = McpHttpClient()
        client._session_id = "test-session"
        client._http = MagicMock()
        client._http.post = AsyncMock(side_effect=mock_post)
        result = await client.call_tool(
            "lookup_legislator", {"street": "1 Main St", "zone": "SLC"}
        )

    assert result == "tool-result-ok"
    assert call_count == 4
    # Sleep called with backoff delays for attempts 1, 2, 3 (not 0)
    assert mock_sleep.call_args_list == [call(1), call(2), call(4)]


async def test_429_exhausted():
    """AC10: after 4 attempts all 429, raises RuntimeError containing 'MCP rate limit exceeded'."""

    async def always_429(*args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        return mock_resp

    with patch("mcp_client.asyncio.sleep", AsyncMock()):
        client = McpHttpClient()
        client._session_id = "test-session"
        client._http = MagicMock()
        client._http.post = AsyncMock(side_effect=always_429)
        with pytest.raises(RuntimeError) as exc_info:
            await client.call_tool(
                "lookup_legislator", {"street": "1 Main St", "zone": "SLC"}
            )

    assert "MCP rate limit exceeded" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Integration test — requires running MCP server + ANTHROPIC_API_KEY
# ---------------------------------------------------------------------------


@pytest.mark.integration
async def test_model_callback_live(mcp_server):
    """Integration: real server + real Anthropic API — greeting returns Turn with no tool calls."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY not set — skipping live integration test")

    result = await chatbot.model_callback(
        input="Hi there! Just saying hello.",
        turns=[],
        thread_id="live-thread-integration",
    )

    assert isinstance(result, Turn)
    assert result.role == "assistant"
    assert result.content
    assert result.mcp_tools_called is None
