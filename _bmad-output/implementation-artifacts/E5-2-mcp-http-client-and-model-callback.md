# Story E5-2: MCP HTTP Client and model_callback

Status: backlog

## Story

As a **developer running evals**,
I want a `model_callback` function that wraps the full Claude API + MCP tool-proxying pipeline,
so that ConversationSimulator can drive real end-to-end conversations and collect `MCPToolCall` records for scoring.

## Goal

Build the `model_callback` function (Variant B — returns `Turn` with `mcp_tools_called`) that ConversationSimulator calls on each turn.

## Deliverables

- `evals/mcp_client.py` — `McpHttpClient` class: generates a UUID for `mcp-session-id` on init and sends it in every request header (client-owned session ID per MCP StreamableHTTP spec), sends JSON-RPC requests via `httpx` to `POST /mcp`, parses responses. One client instance per `thread_id` (concurrent conversations need independent sessions).
- `evals/chatbot.py` — `model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn`: builds Claude messages from turn history, calls Claude API, handles agentic tool_use loop, collects `MCPToolCall` objects, returns final `Turn` with `mcp_tools_called`.
- `evals/conftest.py` update — fixture providing `McpHttpClient` factory keyed by `thread_id`.

## Acceptance Criteria

1. `model_callback` reads system prompt from `../system-prompt/agent-instructions.md` at startup (relative path from `evals/`; file confirmed to exist at `system-prompt/agent-instructions.md` in repo root). `system-prompt/testing-notes.md` and `system-prompt/test-runs.md` also exist and are the source material for manual test cases in E5-3
2. `model_callback` accepts `thread_id` parameter and uses it to get/create a per-conversation `McpHttpClient` (one MCP session per conversation, as required for concurrent runs)
3. Tool call proxying: when Claude returns `tool_use`, callback extracts tool name + args, sends to MCP server via `McpHttpClient`, creates `MCPToolCall(name, args, result)`, feeds `tool_result` back to Claude, loops until no more tool_use blocks
4. Multi-tool handling: if Claude calls `lookup_legislator` then `search_bills` in sequence within one turn, both are proxied correctly and both appear in `mcp_tools_called`
5. `McpHttpClient` generates a UUID for `mcp-session-id` on initialization and sends it in every request header. In MCP StreamableHTTP, the client is responsible for generating and owning the session ID — the server does not generate or return one. Each `McpHttpClient` instance (one per `thread_id`) has its own UUID, ensuring concurrent conversations use independent sessions
6. Errors from MCP server (4xx, 5xx, timeout) are surfaced in the Turn content, not swallowed — the LLM should see the error and respond appropriately
7. `model_callback` returns `Turn(role="assistant", content=<final text>, mcp_tools_called=[...])` — no tool_use blocks leak into the Turn content
8. Conversation history is reconstructed from `turns` on every call (stateless callback design per research recommendation)
9. `model_callback` filters consecutive same-role turns from the `turns` history before building the Anthropic messages list, as a workaround for ConversationSimulator bug #1884 which can generate duplicate initial user messages in async_mode
10. If the MCP server returns a 429 response, `McpHttpClient.call_tool()` retries with exponential backoff (1s, 2s, 4s) up to 3 times before raising. This prevents concurrent eval runs from permanently failing due to transient rate limit hits

## Context

- `model_callback` confirmed signature (deepeval 3.7+): `async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn`
- MCP endpoint: `POST /mcp` with `mcp-session-id` header; client generates UUID on init
- Two MCP tools: `lookup_legislator({ street, zone })` and `search_bills({ legislatorId, theme })`
- Rate limit: 60 req/min per IP on `/mcp` — 429 retry logic required for concurrent runs
- Bug #1884 reference: https://github.com/confident-ai/deepeval/issues/1884
- See tech spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` (Phase 1, Story E5-2)
