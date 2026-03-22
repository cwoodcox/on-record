"""Chatbot bridge: wires Claude API ↔ MCP server for DeepEval ConversationSimulator."""

import os
import pathlib

import anthropic
from deepeval.test_case import MCPToolCall, Turn
from mcp.types import CallToolResult, TextContent

from mcp_client import McpHttpClient

REPO_ROOT = pathlib.Path(__file__).parent.parent
SYSTEM_PROMPT = (REPO_ROOT / "system-prompt" / "agent-instructions.md").read_text()

# Hardcoded Anthropic tool schemas derived from production MCP tool registrations.
# Do NOT fetch dynamically — schemas are stable and dynamic fetching requires a
# live server at import time.
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

_anthropic = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY from env
_clients: dict[str, McpHttpClient] = {}


async def get_or_create_client(thread_id: str, port: int = 3001) -> McpHttpClient:
    """Return existing McpHttpClient for thread_id, or create and initialize a new one."""
    if thread_id not in _clients:
        client = McpHttpClient(base_url=f"http://localhost:{port}")
        await client.initialize()
        _clients[thread_id] = client
    return _clients[thread_id]


def _filter_consecutive_same_role(turns: list[Turn]) -> list[Turn]:
    """Remove consecutive same-role turns (workaround for ConversationSimulator bug #1884)."""
    filtered: list[Turn] = []
    for turn in turns:
        if not filtered or filtered[-1].role != turn.role:
            filtered.append(turn)
    return filtered


async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn:
    """DeepEval model_callback: drives the Claude ↔ MCP agentic loop for one simulator turn.

    Args:
        input: The latest user message from the ConversationSimulator.
        turns: Full conversation history up to (but not including) this turn.
        thread_id: Unique ID for this conversation; used to key the MCP session pool.

    Returns:
        Turn(role="assistant", content=<final text>, mcp_tools_called=<list or None>)
    """
    port = int(os.environ.get("PORT", "3001"))
    mcp_client = await get_or_create_client(thread_id, port=port)

    # Bug #1884: ConversationSimulator (async_mode=True) may produce consecutive
    # same-role turns on the first call. Anthropic API rejects these.
    # We append the current user input BEFORE filtering so the filter also
    # collapses any collision between the last history turn and the new input.
    all_turns = list(turns) + [Turn(role="user", content=input)]
    filtered_turns = _filter_consecutive_same_role(all_turns)
    messages: list[dict] = [
        {"role": t.role, "content": t.content} for t in filtered_turns
    ]

    mcp_calls: list[MCPToolCall] = []

    while True:
        response = _anthropic.messages.create(
            model="claude-sonnet-4-6",
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=MCP_TOOL_SCHEMAS,  # type: ignore[arg-type]
            max_tokens=2048,
        )

        if response.stop_reason == "end_turn":
            final_text = next(
                (b.text for b in response.content if b.type == "text"), ""
            )
            break

        # Process tool_use blocks — proxy each call to the MCP server
        for block in response.content:
            if block.type == "tool_use":
                is_error = False
                try:
                    result = await mcp_client.call_tool(block.name, block.input)
                    result_text = str(result)
                except Exception as exc:
                    result_text = f"Tool error: {exc}"
                    is_error = True

                call_tool_result = CallToolResult(
                    content=[TextContent(type="text", text=result_text)],
                    isError=is_error,
                )
                mcp_calls.append(
                    MCPToolCall(
                        name=block.name,
                        args=block.input,
                        result=call_tool_result,
                    )
                )
                # Append assistant response and tool result, then loop back to Claude
                messages.append({"role": "assistant", "content": response.content})
                messages.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text,
                        }
                    ],
                })
                break  # Re-query Claude with the accumulated tool result

    return Turn(
        role="assistant",
        content=final_text,
        mcp_tools_called=mcp_calls or None,
    )
