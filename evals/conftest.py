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
