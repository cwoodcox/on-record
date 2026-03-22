"""Tests for MCP server lifecycle management."""

import os
from unittest.mock import MagicMock, patch

import httpx
import pytest

from server import start_mcp_server


def test_health_check_fixture(mcp_server):
    """Verify the mcp_server fixture starts a server responding correctly to /health."""
    port = int(os.environ.get("PORT", "3001"))
    response = httpx.get(f"http://localhost:{port}/health", timeout=5.0)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "on-record-mcp-server"


def test_node_not_found():
    """start_mcp_server raises RuntimeError containing 'Node.js not found' when node is absent."""
    with patch("shutil.which", return_value=None):
        with pytest.raises(RuntimeError, match="Node.js not found"):
            start_mcp_server()


def test_health_check_timeout():
    """start_mcp_server raises RuntimeError containing 'MCP server did not become healthy' on timeout."""
    mock_response = MagicMock()
    mock_response.status_code = 503

    with patch("shutil.which", return_value="/usr/local/bin/node"):
        with patch("server._dist_entry_exists", return_value=True):
            with patch("subprocess.Popen") as mock_popen:
                mock_proc = MagicMock()
                mock_proc.poll.return_value = None
                mock_popen.return_value = mock_proc
                with patch("httpx.get", return_value=mock_response):
                    with patch("time.sleep"):
                        with pytest.raises(
                            RuntimeError, match="MCP server did not become healthy"
                        ):
                            start_mcp_server(port=3001)
