# Story E5-2: MCP HTTP Client and model_callback

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer running evals**,
I want an `McpHttpClient` class and a `model_callback` function that wire Claude API ↔ MCP server over HTTP,
so that DeepEval's `ConversationSimulator` can drive simulated conversations against the real chatbot stack.

## Acceptance Criteria

1. `model_callback` reads the system prompt from `../system-prompt/agent-instructions.md` at module load time (relative path from `evals/`). The file exists at `system-prompt/agent-instructions.md` in the repo root.
2. `model_callback` accepts `thread_id` as a parameter and uses it to get or create a per-conversation `McpHttpClient` instance — one MCP session per conversation, required for concurrent simulator runs.
3. Tool call proxying: when Claude returns a `tool_use` block, `model_callback` extracts the tool name and args, calls `McpHttpClient.call_tool()`, creates `MCPToolCall(name, args, result)`, feeds the `tool_result` back to Claude, and loops until no more `tool_use` blocks.
4. Multi-tool handling: if Claude calls `lookup_legislator` then `search_bills` in sequence within one turn, both are proxied correctly and both appear in `mcp_tools_called`.
5. `McpHttpClient` initializes a UUID for `mcp-session-id` and, after the MCP `initialize` handshake, uses the server-returned `Mcp-Session-Id` response header as the canonical session ID for all subsequent requests (see Dev Notes — the server generates its own UUID via `sessionIdGenerator`, not the client-provided one).
6. Errors from the MCP server (4xx, 5xx, `httpx.TimeoutException`) are caught and their message surfaced in the `Turn.content` — the LLM sees the error string and responds appropriately. They are NOT raised as exceptions from `model_callback`.
7. `model_callback` returns `Turn(role="assistant", content=<final text string>, mcp_tools_called=<list or None>)` — no `tool_use` content blocks leak into `Turn.content`.
8. Conversation history is reconstructed from `turns: list[Turn]` on every `model_callback` invocation (stateless callback design — no external state beyond the `McpHttpClient` pool).
9. `model_callback` filters consecutive same-role turns from the `turns` list before building the Anthropic messages array, as a workaround for ConversationSimulator bug #1884 which produces duplicate initial user turns in `async_mode=True`.
10. If the MCP server returns HTTP 429, `McpHttpClient.call_tool()` retries with exponential backoff (1 s, 2 s, 4 s) — up to 3 retries (4 total attempts) — before raising `RuntimeError` containing `"MCP rate limit exceeded"`.

## Tasks / Subtasks

- [ ] Task 1: Create `evals/mcp_client.py` (AC: 2, 5, 6, 10)
  - [ ] `class McpHttpClient` with `__init__(self, base_url: str = "http://localhost:3001")`
  - [ ] `async def initialize(self) -> None` — sends MCP `initialize` JSON-RPC, captures `Mcp-Session-Id` response header as `self._session_id`
  - [ ] `async def call_tool(self, name: str, arguments: dict) -> Any` — sends `tools/call` JSON-RPC, parses result, retries on 429 with backoff (1s, 2s, 4s up to 3 retries), surfaces non-429 errors in return value (not raised)
  - [ ] `self._request_id` counter for JSON-RPC `id` field (increment per request)
  - [ ] All requests include `mcp-session-id` header after `initialize()` sets `self._session_id`
  - [ ] Use `httpx.AsyncClient` (async — required by `model_callback` which is async)

- [ ] Task 2: Create `evals/chatbot.py` (AC: 1, 2, 3, 4, 7, 8, 9)
  - [ ] Load `SYSTEM_PROMPT` from `REPO_ROOT / "system-prompt" / "agent-instructions.md"` at module load
  - [ ] Define `MCP_TOOL_SCHEMAS` — hardcoded Anthropic tool schema list for both MCP tools (see Dev Notes — do NOT fetch dynamically)
  - [ ] `_clients: dict[str, McpHttpClient]` module-level pool, keyed by `thread_id`
  - [ ] `async def get_or_create_client(thread_id: str, port: int = 3001) -> McpHttpClient` — returns existing or creates + initializes new client
  - [ ] `async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn` with full agentic loop
  - [ ] Bug #1884 workaround: filter `turns` to remove consecutive same-role entries before building Anthropic messages
  - [ ] Agentic loop: query Claude API → if `tool_use` → `call_tool()` → append `tool_result` → loop; on `end_turn` → extract text → return `Turn`
  - [ ] Error from `call_tool()` → append as `tool_result` with error text so Claude sees it; include in `Turn.content` on `end_turn` if it was the last response

- [ ] Task 3: Update `evals/conftest.py` (AC: 2)
  - [ ] Add session-scoped fixture `mcp_client_factory` that validates `ANTHROPIC_API_KEY` is set, yields a callable `(thread_id: str) -> McpHttpClient` backed by `chatbot.get_or_create_client`
  - [ ] Keep existing `mcp_server` fixture unchanged

- [ ] Task 4: Create `evals/tests/test_chatbot.py` (AC: 3, 5, 6, 9, 10)
  - [ ] `test_tool_call_proxied`: mock Anthropic client (one `tool_use` then `end_turn`) + mock `McpHttpClient.call_tool()` → verify `MCPToolCall` in returned `Turn.mcp_tools_called`
  - [ ] `test_multi_tool_sequence`: mock Claude returning `lookup_legislator` then `search_bills` tool_use blocks → verify both appear in `mcp_tools_called`
  - [ ] `test_bug_1884_workaround`: pass `turns` list with consecutive `role="user"` entries → verify filtered before building Anthropic messages (patch `anthropic.Anthropic.messages.create` and inspect `messages` arg)
  - [ ] `test_mcp_error_surfaced_not_raised`: mock `McpHttpClient.call_tool()` to raise `httpx.HTTPStatusError` (500) → verify `model_callback` returns a `Turn` (does not raise), `Turn.content` contains error info
  - [ ] `test_429_retry_backoff`: mock `httpx.AsyncClient.post` to return 429 three times then 200 → verify `call_tool()` retried with delays (mock `asyncio.sleep`), succeeds on 4th attempt
  - [ ] `test_429_exhausted`: mock `httpx.AsyncClient.post` to always return 429 → verify `call_tool()` raises `RuntimeError` containing `"MCP rate limit exceeded"` after 4 attempts
  - [ ] `test_model_callback_live(mcp_server)`: integration test requiring real server + `ANTHROPIC_API_KEY` — send a message that will NOT trigger tool calls (e.g., a greeting) and verify a `Turn` is returned with `mcp_tools_called=None`

## Dev Notes

### Architecture Context

This story builds on E5-1's `evals/server.py` and `evals/conftest.py`. The key addition is the bridge between DeepEval's `ConversationSimulator` and the real chatbot stack:

```
ConversationSimulator
  ↓ model_callback(input, turns, thread_id)
chatbot.py
  ├── Anthropic API (claude-sonnet-4-6, system=SYSTEM_PROMPT, tools=MCP_TOOL_SCHEMAS)
  │     ↓ tool_use blocks
  └── mcp_client.py (McpHttpClient)
        ↓ httpx POST /mcp (JSON-RPC)
        MCP server (localhost:3001)
        ↑ JSON-RPC response with tool result
  ↑ Turn(role="assistant", content=final_text, mcp_tools_called=[...])
```

### MCP Session Management — CRITICAL Implementation Detail

The tech spec (AC5) says "the client generates and owns the session ID." **This is incorrect based on the actual server code.** The server implementation in `apps/mcp-server/src/index.ts` uses:

```typescript
transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),  // server generates its own UUID
    onsessioninitialized: (newSessionId) => {
        transports.set(newSessionId, transport)  // stored under server UUID
    },
})
```

**What actually happens:**
1. Client sends `POST /mcp` with `initialize` JSON-RPC (any or no `mcp-session-id` header)
2. Server creates transport, generates its own UUID via `sessionIdGenerator()`
3. Server fires `onsessioninitialized(server-uuid)` → transport stored under `server-uuid`
4. Server returns `Mcp-Session-Id: server-uuid` in the response header
5. Client MUST capture this header and use `server-uuid` for all subsequent requests

**Correct `McpHttpClient` initialization:**
```python
async def initialize(self) -> None:
    payload = {
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
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
        # Server returns its generated session ID in response header
        server_session_id = response.headers.get("mcp-session-id")
        if server_session_id:
            self._session_id = server_session_id
        # Send initialized notification (required by MCP protocol)
        await self._notify_initialized()
```

After `initialize()`, `self._session_id` holds the server-assigned UUID. All subsequent `POST /mcp` requests include `headers={"mcp-session-id": self._session_id}`.

### MCP JSON-RPC Framing for StreamableHTTP

The server's `StreamableHTTPServerTransport.handleRequest()` processes JSON-RPC bodies. You must frame requests manually (we're not using the MCP Python SDK's stdio transport).

**Initialize request** (one-time, on `McpHttpClient.__init__` / `initialize()`):
```python
{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "on-record-evals", "version": "0.1.0"},
    },
    "id": 0,
}
```

**Initialized notification** (send immediately after initialize response — required by MCP protocol):
```python
{
    "jsonrpc": "2.0",
    "method": "notifications/initialized",
    "params": {},
}
# No "id" field — notifications have no response
```

**Tool call** (for each MCP tool invocation):
```python
{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {"name": tool_name, "arguments": arguments},
    "id": self._next_id(),
}
```

**Tool call response parsing** — the server returns content in `result.content` as a list of content blocks:
```python
response_json = response.json()
result = response_json.get("result", {})
content_blocks = result.get("content", [])
# Each block: {"type": "text", "text": "...json string..."}
# The tool returns JSON-encoded text — parse if needed or pass as-is to MCPToolCall
tool_result = content_blocks[0]["text"] if content_blocks else ""
```

### Hardcoded Tool Schemas (Do Not Fetch Dynamically)

**Do NOT** implement dynamic tool schema fetching via `tools/list` JSON-RPC. The dev agent must hardcode the two tool schemas derived directly from the production tool registrations in `apps/mcp-server/src/tools/`.

Reason: dynamic fetching adds complexity, requires a running server for module import, and the schemas are stable. The dev agent already knows the schemas from the source files.

```python
# evals/chatbot.py — MCP_TOOL_SCHEMAS (Anthropic format)
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
```

### model_callback Implementation Pattern

```python
# evals/chatbot.py
import pathlib
import anthropic
from deepeval.test_case import Turn, MCPToolCall

REPO_ROOT = pathlib.Path(__file__).parent.parent
SYSTEM_PROMPT = (REPO_ROOT / "system-prompt" / "agent-instructions.md").read_text()

_anthropic = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY from env
_clients: dict[str, "McpHttpClient"] = {}

async def get_or_create_client(thread_id: str, port: int = 3001) -> "McpHttpClient":
    if thread_id not in _clients:
        client = McpHttpClient(base_url=f"http://localhost:{port}")
        await client.initialize()
        _clients[thread_id] = client
    return _clients[thread_id]

def _filter_consecutive_same_role(turns: list[Turn]) -> list[Turn]:
    """Remove consecutive same-role turns (bug #1884 workaround)."""
    filtered = []
    for turn in turns:
        if not filtered or filtered[-1].role != turn.role:
            filtered.append(turn)
    return filtered

async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn:
    port = int(os.environ.get("PORT", "3001"))
    mcp_client = await get_or_create_client(thread_id, port=port)

    # Bug #1884: filter consecutive same-role turns before building messages
    filtered_turns = _filter_consecutive_same_role(turns)
    messages = [{"role": t.role, "content": t.content} for t in filtered_turns]
    messages.append({"role": "user", "content": input})

    mcp_calls: list[MCPToolCall] = []

    while True:
        response = _anthropic.messages.create(
            model="claude-sonnet-4-6",
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=MCP_TOOL_SCHEMAS,
            max_tokens=2048,
        )
        if response.stop_reason == "end_turn":
            final_text = next(
                (b.text for b in response.content if b.type == "text"), ""
            )
            break
        for block in response.content:
            if block.type == "tool_use":
                try:
                    result = await mcp_client.call_tool(block.name, block.input)
                    result_text = str(result)
                except Exception as exc:
                    result_text = f"Tool error: {exc}"
                mcp_calls.append(MCPToolCall(
                    name=block.name, args=block.input, result=result_text
                ))
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": block.id, "content": result_text}
                ]})
                break  # re-query Claude with the tool result

    return Turn(
        role="assistant",
        content=final_text,
        mcp_tools_called=mcp_calls or None,
    )
```

### 429 Retry Pattern for `call_tool()`

```python
import asyncio

async def call_tool(self, name: str, arguments: dict) -> Any:
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": name, "arguments": arguments},
        "id": self._next_id(),
    }
    delays = [1, 2, 4]
    last_exc: Exception | None = None
    for attempt, delay in enumerate([0] + delays):  # 4 total attempts
        if delay:
            await asyncio.sleep(delay)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/mcp",
                json=payload,
                headers={"mcp-session-id": self._session_id},
                timeout=30.0,
            )
        if response.status_code == 429:
            last_exc = RuntimeError(f"MCP rate limit exceeded after {attempt + 1} attempt(s)")
            continue
        response.raise_for_status()
        result = response.json()
        content = result.get("result", {}).get("content", [])
        return content[0]["text"] if content else ""
    raise last_exc  # type: ignore[misc]
```

### Bug #1884 — Double Initial User Turn

ConversationSimulator with `async_mode=True` (default) may pass a `turns` list that begins with two consecutive `role="user"` entries on the first turn. The Anthropic API rejects messages with consecutive same-role turns. The `_filter_consecutive_same_role()` helper removes these before building the messages list.

**Test for this:** Pass `turns = [Turn(role="user", content="Hello"), Turn(role="user", content="Hello again")]` to `model_callback`. Verify the Anthropic client receives only one user message (inspect the `messages` kwarg passed to `_anthropic.messages.create`).

### Error Surfacing (AC6)

Errors from `McpHttpClient.call_tool()` (network errors, 4xx/5xx responses except 429-with-retries) are caught inside the `model_callback` agentic loop and converted to an error string fed back to Claude as a `tool_result`. Claude then sees the error and can respond appropriately (e.g., "I encountered an error looking up your legislator — please try again."). This matches the expected behavior for eval scoring: the chatbot's error-handling behavior is part of what's being evaluated.

**Do NOT** let exceptions from `call_tool()` propagate out of `model_callback` — this would crash the simulator turn and produce an unusable `ConversationalTestCase`.

### conftest.py Update

Add `ANTHROPIC_API_KEY` to the env var validation in the `mcp_server` fixture, or add a separate fixture:

```python
@pytest.fixture(scope="session")
def mcp_client_factory(mcp_server):
    """Session-scoped fixture yielding a factory for McpHttpClient instances."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.fail("Missing required env var: ANTHROPIC_API_KEY")
    # The factory is backed by chatbot.get_or_create_client
    from chatbot import get_or_create_client
    return get_or_create_client
```

The `mcp_client_factory` fixture depends on `mcp_server` to ensure the server is running before any client is created.

### Test Isolation for Unit Tests

All tests in `test_chatbot.py` except `test_model_callback_live` must run without a real server or real API keys. Use `unittest.mock.patch` and `AsyncMock`:

```python
from unittest.mock import patch, AsyncMock, MagicMock

def test_429_retry_backoff():
    # Mock httpx.AsyncClient to return 429 three times, then 200
    call_count = 0
    async def mock_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        mock_resp = MagicMock()
        mock_resp.status_code = 429 if call_count <= 3 else 200
        mock_resp.json.return_value = {"result": {"content": [{"type": "text", "text": "ok"}]}}
        mock_resp.raise_for_status = MagicMock()
        return mock_resp

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__ = AsyncMock(
            return_value=MagicMock(post=AsyncMock(side_effect=mock_post))
        )
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # ... call client.call_tool() and verify
```

### Environment Variables Required

| Var | Used By | Required For |
| --- | ------- | ------------ |
| `ANTHROPIC_API_KEY` | `chatbot.py` / `_anthropic` client | All `model_callback` calls |
| `UTAH_LEGISLATURE_API_KEY` | MCP server | `mcp_server` fixture (E5-1) |
| `UGRC_API_KEY` | MCP server | `mcp_server` fixture (E5-1) |
| `PORT` | Both server and client | Optional, defaults to 3001 |

### Project Structure Notes

New files created by this story (all paths relative to monorepo root):
```
evals/
├── mcp_client.py            (new — McpHttpClient)
├── chatbot.py               (new — model_callback + tool schemas + system prompt)
└── tests/
    └── test_chatbot.py      (new — unit + integration tests)
```

Modified files:
```
evals/conftest.py            (modified — add mcp_client_factory fixture)
```

Not modified:
- `pnpm-workspace.yaml`
- `apps/` or `packages/` — do not touch
- `evals/pyproject.toml` — no new dependencies needed (`anthropic`, `httpx`, `deepeval` already there)

### References

- Tech spec (authoritative): [`_bmad-output/implementation-artifacts/tech-spec-eval-harness.md`] — Phase 1, Story E5-2
- DeepEval research doc: [`_bmad-output/planning-artifacts/research/technical-deepeval-conversationsimulator-research-2026-03-21.md`] — model_callback patterns, bug #1884
- MCP server session management: [`apps/mcp-server/src/index.ts`] — `StreamableHTTPServerTransport`, `sessionIdGenerator`, `transports` Map
- Existing `lookup_legislator` tool: [`apps/mcp-server/src/tools/legislator-lookup.ts`]
- Existing `search_bills` tool: [`apps/mcp-server/src/tools/search-bills.ts`]
- System prompt under test: [`system-prompt/agent-instructions.md`] (306 lines)
- E5-1 story (previous story learnings): [`_bmad-output/implementation-artifacts/E5-1-python-project-scaffold-and-mcp-server-lifecycle.md`]
- Existing evals codebase: [`evals/server.py`], [`evals/conftest.py`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `evals/mcp_client.py` (new)
- `evals/chatbot.py` (new)
- `evals/tests/test_chatbot.py` (new)
- `evals/conftest.py` (modified)
