"""Chatbot bridge: wires LLM provider + MCP server for DeepEval ConversationSimulator.

Provider selection is controlled by EVAL_LLM_PROVIDER env var (default: "openai").
Model name is controlled by EVAL_LLM_MODEL env var (default depends on provider).
"""

import os
import pathlib

from deepeval.test_case import Turn

from mcp_client import McpHttpClient
from providers import get_provider
from providers.base import LLMProvider

REPO_ROOT = pathlib.Path(__file__).parent.parent
SYSTEM_PROMPT = (REPO_ROOT / "system-prompt" / "agent-instructions.md").read_text()

# Hardcoded tool schemas derived from production MCP tool registrations.
# Do NOT fetch dynamically — schemas are stable and dynamic fetching requires a
# live server at import time.
# Canonical format: name, description, input_schema (provider-agnostic JSON Schema).
MCP_TOOL_SCHEMAS = [
    {
        "name": "lookup_legislator",
        "description": (
            "Identifies a constituent's Utah House and Senate legislators from their home "
            "address via GIS lookup. Returns structured JSON with legislator name, chamber, "
            "district, email, and phone contact information."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "street": {
                    "type": "string",
                    "description": 'Street portion only: number and street name. Example: "123 S State St"',
                },
                "zone": {
                    "type": "string",
                    "description": 'City name or 5-digit ZIP code. Example: "Salt Lake City" or "84111"',
                },
            },
            "required": ["street", "zone"],
        },
    },
    {
        "name": "search_bills",
        "description": (
            "Searches bills sponsored by a Utah legislator by issue theme. Returns up to 5 bills "
            "from the SQLite cache matching the theme and legislator. Returns structured JSON with "
            "bill ID, title, summary, status, vote result, vote date, and session."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "legislatorId": {
                    "type": "string",
                    "description": 'Legislator ID from lookup_legislator output (e.g. "RRabbitt")',
                },
                "theme": {
                    "type": "string",
                    "description": (
                        "Freeform search term derived from the constituent's stated concern "
                        "(e.g. 'clean water', 'school funding', 'property taxes'). "
                        "Infer this from the conversation — do not present a list of options."
                    ),
                },
            },
            "required": ["legislatorId", "theme"],
        },
    },
]

_provider: LLMProvider | None = None
_clients: dict[str, McpHttpClient] = {}


def _get_provider() -> LLMProvider:
    """Return the module-level provider, creating it on first use."""
    global _provider
    if _provider is None:
        _provider = get_provider(SYSTEM_PROMPT, MCP_TOOL_SCHEMAS)
    return _provider


async def get_or_create_client(thread_id: str, port: int = 3001) -> McpHttpClient:
    """Return existing McpHttpClient for thread_id, or create and initialize a new one."""
    if thread_id not in _clients:
        client = McpHttpClient(base_url=f"http://localhost:{port}")
        await client.initialize()
        _clients[thread_id] = client
    return _clients[thread_id]


async def close_all_clients() -> None:
    """Close all active MCP clients and clear the pool."""
    for client in _clients.values():
        await client.close()
    _clients.clear()


def _filter_consecutive_same_role(turns: list[Turn]) -> list[Turn]:
    """Remove consecutive same-role turns (workaround for ConversationSimulator bug #1884)."""
    filtered: list[Turn] = []
    for turn in turns:
        if not filtered or filtered[-1].role != turn.role:
            filtered.append(turn)
    return filtered


async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn:
    """DeepEval model_callback: drives the LLM + MCP agentic loop for one simulator turn.

    Args:
        input: The latest user message from the ConversationSimulator.
        turns: Full conversation history up to (but not including) this turn.
        thread_id: Unique ID for this conversation; used to key the MCP session pool.

    Returns:
        Turn(role="assistant", content=<final text>, mcp_tools_called=<list or None>)
    """
    port = int(os.environ.get("PORT", "3001"))
    try:
        mcp_client = await get_or_create_client(thread_id, port=port)
    except Exception as exc:
        # Surface initialization errors in Turn.content, don't crash the simulator
        return Turn(
            role="assistant",
            content=f"MCP server connection failed: {type(exc).__name__}: {exc}",
            mcp_tools_called=None,
        )

    # Bug #1884: ConversationSimulator (async_mode=True) may produce consecutive
    # same-role turns on the first call. Filter history only (without current input)
    # to avoid pop() incorrectly removing a collapsed turn instead of current input.
    filtered_turns = _filter_consecutive_same_role(list(turns))

    provider = _get_provider()
    try:
        final_text, mcp_calls = await provider.run_agentic_loop(
            filtered_turns, input, mcp_client
        )
    except Exception as exc:
        return Turn(
            role="assistant",
            content=f"LLM provider error: {type(exc).__name__}: {exc}",
            mcp_tools_called=None,
        )

    return Turn(
        role="assistant",
        content=final_text,
        mcp_tools_called=mcp_calls or None,
    )
