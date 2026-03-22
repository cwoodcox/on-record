"""MCP HTTP client for communicating with the on-record MCP server over StreamableHTTP."""

import asyncio
from typing import Any

import httpx


class McpHttpClient:
    """Async HTTP client for the on-record MCP server (StreamableHTTP transport).

    Each instance represents one MCP session backed by a single
    ``httpx.AsyncClient`` for connection pooling.  After construction, call
    ``await client.initialize()`` before any ``call_tool()`` invocations.
    Call ``await client.close()`` when the session is no longer needed.
    """

    def __init__(self, base_url: str = "http://localhost:3001") -> None:
        self._base_url = base_url.rstrip("/")
        self._session_id: str = ""
        self._request_counter: int = 0
        self._http = httpx.AsyncClient()

    def _next_id(self) -> int:
        self._request_counter += 1
        return self._request_counter

    async def close(self) -> None:
        """Close the underlying HTTP client and release connection pool resources."""
        await self._http.aclose()

    async def initialize(self) -> None:
        """Send MCP initialize + initialized notification; capture server session ID.

        Raises:
            RuntimeError: If the server returns a non-2xx status or is unreachable,
                so that ``get_or_create_client`` can surface the error without crashing
                the ConversationSimulator.
        """
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
        try:
            response = await self._http.post(
                f"{self._base_url}/mcp",
                json=init_payload,
                timeout=10.0,
            )
            if response.status_code >= 400:
                raise RuntimeError(
                    f"MCP initialize failed: HTTP {response.status_code}"
                )
            server_session_id = response.headers.get("mcp-session-id")
            if server_session_id:
                self._session_id = server_session_id
        except httpx.TimeoutException as exc:
            raise RuntimeError(f"MCP initialize timed out: {exc}") from exc
        except httpx.ConnectError as exc:
            raise RuntimeError(f"MCP server unreachable: {exc}") from exc

        # Send required initialized notification
        await self._notify_initialized()

    async def _notify_initialized(self) -> None:
        """Send the MCP notifications/initialized message (no response expected).

        Notifications may return 202/204 or error; all are silently ignored
        since the server has already acknowledged the session via ``initialize()``.
        """
        notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {},
        }
        headers = {}
        if self._session_id:
            headers["mcp-session-id"] = self._session_id

        try:
            await self._http.post(
                f"{self._base_url}/mcp",
                json=notification,
                headers=headers,
                timeout=10.0,
            )
        except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.ConnectError):
            # Notifications are fire-and-forget; errors are non-fatal
            pass

    async def call_tool(self, name: str, arguments: dict) -> Any:
        """Call an MCP tool by name, retrying up to 3 times on HTTP 429.

        Args:
            name: MCP tool name (e.g. "lookup_legislator").
            arguments: Tool input arguments dict.

        Returns:
            Tool result text string from the first content block, or the
            JSON-RPC error message if the server returned an error object.

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

            response = await self._http.post(
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

            # JSON-RPC error response — surface the error message
            if "error" in result:
                error = result["error"]
                return f"JSON-RPC error {error.get('code', '?')}: {error.get('message', 'unknown')}"

            content_blocks = result.get("result", {}).get("content", [])
            return content_blocks[0]["text"] if content_blocks else ""

        raise last_exc  # type: ignore[misc]
