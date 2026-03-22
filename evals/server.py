"""MCP server lifecycle management for eval harness."""

import os
import shutil
import subprocess
import time
import pathlib

import httpx

REPO_ROOT = pathlib.Path(__file__).parent.parent  # evals/ → repo root
MCP_SERVER_DIR = REPO_ROOT / "apps" / "mcp-server"


def _dist_entry_exists() -> bool:
    """Return True if the MCP server dist entry point exists."""
    return (MCP_SERVER_DIR / "dist" / "index.js").exists()


def start_mcp_server(port: int = 3001) -> subprocess.Popen:
    """Start the MCP server and wait for it to become healthy.

    Args:
        port: Port to start the server on. Defaults to 3001.

    Returns:
        The Popen handle for the running server process.

    Raises:
        RuntimeError: If Node.js is not found, the build is missing, or the
            server does not become healthy within 30 retries.
    """
    if shutil.which("node") is None:
        raise RuntimeError(
            "Node.js not found on PATH — ensure Node.js 20+ is installed"
        )

    if not _dist_entry_exists():
        raise RuntimeError(
            f"MCP server not built — run 'pnpm build' from {MCP_SERVER_DIR}"
        )

    env = {**os.environ, "PORT": str(port)}

    proc = subprocess.Popen(
        ["node", "dist/index.js"],
        cwd=str(MCP_SERVER_DIR),
        env=env,
    )

    retries = 30
    for _ in range(retries):
        time.sleep(1)
        try:
            response = httpx.get(f"http://localhost:{port}/health", timeout=2.0)
            if response.status_code == 200:
                return proc
        except Exception:
            pass

    proc.kill()
    proc.wait()
    raise RuntimeError(
        f"MCP server did not become healthy on port {port} after {retries} retries"
    )


def stop_mcp_server(proc: subprocess.Popen) -> None:
    """Stop the MCP server process gracefully.

    Args:
        proc: The Popen handle returned by start_mcp_server.
    """
    if proc.poll() is not None:
        return  # already exited
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
