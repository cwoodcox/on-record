"""MCP HTTP client for communicating with the on-record MCP server over StreamableHTTP."""

import asyncio
from typing import Any

import httpx


class McpHttpClient:
    """Async HTTP client for the on-record MCP server (StreamableHTTP transport).

    Each instance represents one MCP session. After construction, call
    ``await client.initialize()`` before any ``call_tool()`` invocations.
    """

    def __init__(self, base_url: str = "http://localhost:3001") -> None:
        self._base_url = base_url.rstrip("/")
        self._session_id: str = ""
        self._request_counter: int = 0

    def _next_id(self) -> int:
        self._request_counter += 1
        return self._request_counter

    async def initialize(self) -> None:
        """Send MCP initialize + initialized notification; capture server session ID."""
        init_payload = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "on-record-evals", "version": "0.1.0"},
            },
            "id": self._next_id(),
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/mcp",
                json=init_payload,
                timeout=10.0,
            )
            response.raise_for_status()
            server_session_id = response.headers.get("mcp-session-id")
            if server_session_id:
                self._session_id = server_session_id

        # Send required initialized notification
        await self._notify_initialized()

    async def _notify_initialized(self) -> None:
        """Send the MCP notifications/initialized message (no response expected)."""
        notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {},
        }
        headers = {}
        if self._session_id:
            headers["mcp-session-id"] = self._session_id

        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    f"{self._base_url}/mcp",
                    json=notification,
                    headers=headers,
                    timeout=10.0,
                )
            except httpx.HTTPStatusError:
                # Notifications may return 202 or no-content; ignore errors
                pass

    async def call_tool(self, name: str, arguments: dict) -> Any:
        """Call an MCP tool by name, retrying up to 3 times on HTTP 429.

        Args:
            name: MCP tool name (e.g. "lookup_legislator").
            arguments: Tool input arguments dict.

        Returns:
            Tool result text string from the first content block.

        Raises:
            RuntimeError: If all 4 attempts receive HTTP 429 (rate limited).
        """
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
            "id": self._next_id(),
        }
        headers = {}
        if self._session_id:
            headers["mcp-session-id"] = self._session_id

        delays = [0, 1, 2, 4]  # 4 total attempts; first has no delay
        last_exc: Exception | None = None

        for attempt, delay in enumerate(delays):
            if delay:
                await asyncio.sleep(delay)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self._base_url}/mcp",
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )

            if response.status_code == 429:
                last_exc = RuntimeError(
                    f"MCP rate limit exceeded after {attempt + 1} attempt(s)"
                )
                continue

            response.raise_for_status()
            result = response.json()
            content_blocks = result.get("result", {}).get("content", [])
            return content_blocks[0]["text"] if content_blocks else ""

        raise last_exc  # type: ignore[misc]
