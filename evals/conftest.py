"""Pytest configuration and session-scoped fixtures for eval harness."""

import atexit
import os

import pytest

from server import start_mcp_server, stop_mcp_server


@pytest.fixture(scope="session")
def mcp_server():
    """Session-scoped fixture that starts and stops the MCP server.

    Validates required environment variables before starting.
    Registers an atexit handler as a belt-and-suspenders teardown guard.

    Yields:
        The Popen handle for the running MCP server process.
    """
    missing = [
        var
        for var in ("UTAH_LEGISLATURE_API_KEY", "UGRC_API_KEY")
        if not os.environ.get(var)
    ]
    if missing:
        pytest.fail(f"Missing required env vars: {', '.join(missing)}")

    port = int(os.environ.get("PORT", "3001"))
    proc = start_mcp_server(port=port)
    atexit.register(stop_mcp_server, proc)

    yield proc

    stop_mcp_server(proc)


@pytest.fixture(scope="session")
def mcp_client_factory(mcp_server):
    """Session-scoped fixture yielding a factory for McpHttpClient instances.

    Validates that ANTHROPIC_API_KEY is present before any client is created.
    The factory is backed by chatbot.get_or_create_client, so the same
    McpHttpClient is reused for the same thread_id across a test session.

    Yields:
        Callable ``(thread_id: str) -> Awaitable[McpHttpClient]``
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.fail("Missing required env var: ANTHROPIC_API_KEY")

    from chatbot import get_or_create_client

    yield get_or_create_client
