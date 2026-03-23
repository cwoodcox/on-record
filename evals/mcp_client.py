"""MCP HTTP client for communicating with the on-record MCP server over StreamableHTTP.

Wraps the Python MCP SDK's built-in StreamableHTTP client and ClientSession,
providing a simple call_tool interface with 429 retry logic.
"""

import asyncio
from contextlib import AsyncExitStack
from typing import Any

from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client
from mcp.types import Implementation, TextContent


class McpHttpClient:
    """Async HTTP client for the on-record MCP server (StreamableHTTP transport).

    Each instance represents one MCP session backed by the Python MCP SDK's
    StreamableHTTP transport and ClientSession.  After construction, call
    ``await client.initialize()`` before any ``call_tool()`` invocations.
    Call ``await client.close()`` when the session is no longer needed.
    """

    def __init__(self, base_url: str = "http://localhost:3001", debug: bool = False) -> None:
        self._base_url = base_url.rstrip("/")
        self._debug = debug
        self._exit_stack: AsyncExitStack | None = None
        self._session: ClientSession | None = None

    def _log(self, msg: str) -> None:
        if self._debug:
            print(f"DEBUG [McpClient]: {msg}")

    async def initialize(self) -> None:
        """Open the SDK transport and session, then perform the MCP handshake."""
        self._exit_stack = AsyncExitStack()
        await self._exit_stack.__aenter__()

        url = f"{self._base_url}/mcp"
        self._log(f"Connecting to {url}...")

        read_stream, write_stream, _get_session_id = await self._exit_stack.enter_async_context(
            streamable_http_client(url)
        )

        session = ClientSession(
            read_stream,
            write_stream,
            client_info=Implementation(name="on-record-evals", version="0.1.0"),
        )
        self._session = await self._exit_stack.enter_async_context(session)

        self._log("Sending initialize...")
        await self._session.initialize()
        self._log("Session initialized.")

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> str:
        """Call an MCP tool by name with 429-retry (exponential backoff: 1s, 2s, 4s).

        Returns the text content string from the first content block.
        """
        if self._session is None:
            raise RuntimeError("McpHttpClient not initialized — call initialize() first")

        delays = [0, 1, 2, 4]
        last_error: Exception | None = None

        for attempt, delay in enumerate(delays):
            if delay:
                await asyncio.sleep(delay)

            try:
                result = await self._session.call_tool(name, arguments)

                if result.isError:
                    # Extract error text from content blocks
                    error_texts = [
                        c.text for c in result.content if isinstance(c, TextContent)
                    ]
                    return f"Tool error: {' '.join(error_texts)}" if error_texts else "Tool error: unknown"

                # Extract text from the first TextContent block
                for content_block in result.content:
                    if isinstance(content_block, TextContent):
                        return content_block.text

                return ""

            except Exception as exc:
                last_error = exc
                # Check if this looks like a 429 rate limit error
                exc_str = str(exc)
                if "429" in exc_str or "rate" in exc_str.lower():
                    self._log(f"Rate limited (attempt {attempt + 1}/{len(delays)}), retrying...")
                    continue
                # For non-rate-limit errors on the last attempt, raise
                if attempt == len(delays) - 1:
                    raise RuntimeError(f"MCP call failed after {attempt + 1} attempts: {exc}") from exc
                # For other transient errors, retry
                self._log(f"Error (attempt {attempt + 1}/{len(delays)}): {exc}, retrying...")

        raise RuntimeError(f"MCP call failed after {len(delays)} attempts: {last_error}")

    async def close(self) -> None:
        """Tear down the SDK session and transport."""
        if self._exit_stack is not None:
            await self._exit_stack.aclose()
            self._exit_stack = None
            self._session = None
