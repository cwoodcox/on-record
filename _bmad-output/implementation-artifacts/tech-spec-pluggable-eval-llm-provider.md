---
title: 'Pluggable LLM Provider for Eval Harness model_callback'
slug: 'pluggable-eval-llm-provider'
created: '2026-03-22'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['python', 'anthropic-sdk', 'openai-sdk', 'deepeval']
files_to_modify:
  - 'evals/chatbot.py'
  - 'evals/providers/__init__.py (new)'
  - 'evals/providers/base.py (new)'
  - 'evals/providers/anthropic_provider.py (new)'
  - 'evals/providers/openai_provider.py (new)'
  - 'evals/conftest.py'
code_patterns:
  - 'Strategy pattern: abstract base class LLMProvider with concrete Anthropic/OpenAI implementations'
  - 'model_callback signature unchanged: async def model_callback(input, turns, thread_id) -> Turn'
  - 'Provider selected at module load via EVAL_LLM_PROVIDER env var'
  - 'MCP_TOOL_SCHEMAS stored in canonical (provider-agnostic) format; each provider transforms to its native format'
  - 'MCPToolCall construction and McpHttpClient usage shared across providers'
test_patterns:
  - 'Unit tests mock at LLM API boundary (anthropic.Anthropic.messages.create / openai.OpenAI.chat.completions.create)'
  - 'Integration tests use EVAL_LLM_PROVIDER env var to select provider'
  - 'Error path tests use toContain-style substring matching on error messages'
---

# Tech-Spec: Pluggable LLM Provider for Eval Harness model_callback

**Created:** 2026-03-22

## Overview

### Problem Statement

The eval harness `model_callback` in `evals/chatbot.py` is hardcoded to the Anthropic Claude API. The user cannot access the Anthropic API (billing issue) and needs to run evals using OpenAI instead. The current implementation tightly couples the LLM call, tool_use parsing, and agentic loop to Anthropic's specific API format, making it impossible to swap providers without rewriting the entire function.

### Solution

Extract the LLM-specific code from `model_callback` into a provider abstraction using the Strategy pattern. Each provider implements the agentic loop (LLM call + tool_use/function_calling parsing) while sharing the common infrastructure (MCP client pool, tool schema definitions, MCPToolCall construction, conversation history filtering). Provider selection is controlled by `EVAL_LLM_PROVIDER` env var (default: `openai`), and model name by `EVAL_LLM_MODEL` env var.

### Scope

**In Scope:**
- Abstract `LLMProvider` base class defining the provider contract
- Anthropic provider (extracted from existing `chatbot.py` implementation)
- OpenAI provider (new implementation using `openai` SDK, already a dependency)
- `EVAL_LLM_PROVIDER` env var to select provider (`anthropic` or `openai`)
- `EVAL_LLM_MODEL` env var to configure model name (e.g., `gpt-4.1`, `claude-sonnet-4-6`)
- Tool schema transformation from canonical format to each provider's native format
- Shared MCPToolCall construction and McpHttpClient usage

**Out of Scope:**
- DeepEval judge model configuration (separate concern -- E5-5 metrics use `AnthropicModel` judge independently)
- ConversationSimulator `simulator_model` configuration (already uses OpenAI by default)
- Adding new providers beyond Anthropic and OpenAI
- Changes to `mcp_client.py` (already provider-agnostic)
- Changes to the MCP server

## Context for Development

### Codebase Patterns

- `evals/chatbot.py` is the sole file containing the hardcoded Anthropic implementation
- `model_callback` signature: `async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn` -- this MUST NOT change
- `MCP_TOOL_SCHEMAS` is a list of dicts with `name`, `description`, `input_schema` keys -- this is Anthropic's native format but the `input_schema` content is standard JSON Schema, making it provider-agnostic
- `_filter_consecutive_same_role()` is a workaround for DeepEval bug #1884 -- shared across providers
- `get_or_create_client()` and `close_all_clients()` manage the MCP client pool -- shared across providers
- `_anthropic = anthropic.Anthropic()` is instantiated at module level -- provider should follow similar pattern
- `conftest.py` checks for `ANTHROPIC_API_KEY` -- needs to check for the correct provider's key
- Python project uses no type: ignore or any (consistent with CLAUDE.md rules adapted for Python)
- No barrel files pattern: `evals/providers/__init__.py` should only contain the factory function, not re-exports

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `evals/chatbot.py` | Current hardcoded Anthropic implementation -- extract provider logic from here |
| `evals/mcp_client.py` | MCP HTTP client -- shared, no changes needed |
| `evals/conftest.py` | Pytest fixtures -- update API key validation to be provider-aware |
| `evals/pyproject.toml` | Dependencies -- `openai` already listed, no changes needed |
| `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` | Parent tech spec for full eval harness context |

### Technical Decisions

- **Strategy pattern over simple if/else:** Two providers with fundamentally different API formats (Anthropic's content blocks vs OpenAI's message/tool_calls structure) warrant separate classes. Adding a third provider later (e.g., Google Gemini) means adding one file, not editing a growing if/else chain.
- **Canonical tool schema format:** Keep `MCP_TOOL_SCHEMAS` in its current Anthropic-like format (`name`, `description`, `input_schema`). Each provider transforms to its native format at initialization. This avoids changing the existing schema definitions and keeps a single source of truth.
- **Default provider = openai:** Since the immediate need is OpenAI access, default `EVAL_LLM_PROVIDER` to `openai` so existing workflows work without setting the env var.
- **Default models:** `gpt-4.1` for OpenAI, `claude-sonnet-4-6` for Anthropic. These are the models already referenced in the tech spec and codebase.
- **Module-level provider instantiation:** The provider is created once at import time (like the current `_anthropic = anthropic.Anthropic()`). This keeps the `model_callback` function stateless and fast.
- **No ABC enforcement with abstractmethod:** Use a simple base class with `NotImplementedError` raises. Python's duck typing and the two concrete implementations make ABC overhead unnecessary. The base class serves as documentation of the contract.
- **Tool schema in chatbot.py stays:** `MCP_TOOL_SCHEMAS` remains in `chatbot.py` as the canonical definition. Providers receive it and transform as needed. No need to move it to a separate file for two providers.

## Implementation Plan

### Tasks

- [ ] Task 1: Create `evals/providers/base.py` -- abstract LLM provider base class
  - File: `evals/providers/base.py` (new)
  - Action: Define `LLMProvider` class with:
    - `__init__(self, model: str, system_prompt: str, tool_schemas: list[dict])` -- stores config
    - `async def run_agentic_loop(self, messages: list[dict], mcp_client: McpHttpClient) -> tuple[str, list[MCPToolCall]]` -- raises `NotImplementedError`. Takes provider-formatted messages and MCP client, returns `(final_text, mcp_calls)`. Each provider implements its own agentic loop (LLM call + tool parsing + MCP proxying + loop until done).
    - `def format_messages(self, filtered_turns: list[Turn], current_input: str) -> list[dict]` -- raises `NotImplementedError`. Converts DeepEval Turn history to provider-native message format.
  - Notes: Import types from `deepeval.test_case` (Turn, MCPToolCall) and `mcp_client` (McpHttpClient). No `from __future__ import annotations` needed -- Python 3.10+.

- [ ] Task 2: Create `evals/providers/anthropic_provider.py` -- extract existing Anthropic logic
  - File: `evals/providers/anthropic_provider.py` (new)
  - Action: Create `AnthropicProvider(LLMProvider)` that:
    - `__init__`: creates `anthropic.Anthropic()` client, stores tool_schemas as-is (already Anthropic format)
    - `format_messages`: converts `list[Turn]` to Anthropic message format (`{"role": ..., "content": ...}`)
    - `run_agentic_loop`: contains the `while True` loop from current `chatbot.py` lines 132-180 (Claude API call, tool_use block processing, tool_result construction, MCPToolCall creation)
  - Notes: This is a direct extraction -- no behavior change from current implementation. The `response.content` serialization for assistant messages with tool_use blocks must handle Anthropic's content block objects (they need to be passed back as-is to the API, not serialized).

- [ ] Task 3: Create `evals/providers/openai_provider.py` -- new OpenAI implementation
  - File: `evals/providers/openai_provider.py` (new)
  - Action: Create `OpenAIProvider(LLMProvider)` that:
    - `__init__`: creates `openai.OpenAI()` client (uses `OPENAI_API_KEY` from env), transforms `tool_schemas` to OpenAI format: `[{"type": "function", "function": {"name": s["name"], "description": s["description"], "parameters": s["input_schema"]}} for s in tool_schemas]`
    - `format_messages`: converts `list[Turn]` to OpenAI message format. System prompt becomes `{"role": "system", "content": system_prompt}` as the first message (unlike Anthropic which uses a separate `system` param). User/assistant turns map directly.
    - `run_agentic_loop`: implements the OpenAI agentic loop:
      1. Call `client.chat.completions.create(model=..., messages=[system_msg, ...messages], tools=..., max_tokens=2048)`
      2. Check `response.choices[0].finish_reason` -- if `"stop"`, extract `response.choices[0].message.content` and break
      3. If `finish_reason == "tool_calls"`, iterate `response.choices[0].message.tool_calls`:
         - Parse `tool_call.function.arguments` (JSON string) with `json.loads()`
         - Call `await mcp_client.call_tool(tool_call.function.name, args)`
         - Create `MCPToolCall(name=..., args=..., result=CallToolResult(...))`
         - Append assistant message (with tool_calls) and tool result messages (`{"role": "tool", "tool_call_id": tool_call.id, "content": result_text}`)
      4. Loop until no more tool_calls
  - Notes: OpenAI tool_calls come as a list on the message object. Multiple tool_calls in one response = parallel tool calling. Each needs a separate `role: "tool"` response message (not batched like Anthropic's tool_result blocks). `json.loads` on `tool_call.function.arguments` can raise -- catch and surface as error tool result. OpenAI uses `OPENAI_API_KEY` env var by default.

- [ ] Task 4: Create `evals/providers/__init__.py` -- provider factory
  - File: `evals/providers/__init__.py` (new)
  - Action: Implement `get_provider(system_prompt: str, tool_schemas: list[dict]) -> LLMProvider` factory function:
    - Read `EVAL_LLM_PROVIDER` from env (default: `"openai"`)
    - Read `EVAL_LLM_MODEL` from env (default depends on provider: `"gpt-4.1"` for openai, `"claude-sonnet-4-6"` for anthropic)
    - Map `"anthropic"` -> `AnthropicProvider`, `"openai"` -> `OpenAIProvider`
    - Raise `ValueError` with clear message for unknown provider names
  - Notes: Lazy imports of concrete providers to avoid importing unused SDKs. Only import `AnthropicProvider` when `EVAL_LLM_PROVIDER=anthropic`, etc.

- [ ] Task 5: Refactor `evals/chatbot.py` -- use provider abstraction
  - File: `evals/chatbot.py`
  - Action:
    - Remove `import anthropic` and `_anthropic = anthropic.Anthropic()`
    - Add `from providers import get_provider`
    - Add `_provider = get_provider(SYSTEM_PROMPT, MCP_TOOL_SCHEMAS)` at module level
    - Refactor `model_callback`:
      1. Keep: MCP client creation (`get_or_create_client`), error handling for connection failures
      2. Keep: `_filter_consecutive_same_role` applied to turns + current input
      3. Replace: inline Anthropic API call + agentic loop with `_provider.format_messages(filtered_turns, input)` then `_provider.run_agentic_loop(messages, mcp_client)`
      4. Keep: Return `Turn(role="assistant", content=final_text, mcp_tools_called=mcp_calls or None)`
    - Keep `MCP_TOOL_SCHEMAS`, `get_or_create_client`, `close_all_clients`, `_filter_consecutive_same_role` -- these are shared infrastructure
    - Update module docstring to reflect provider-pluggable design
  - Notes: The `model_callback` signature MUST NOT change. The function body becomes ~15 lines (client setup, format messages, run loop, return Turn).

- [ ] Task 6: Update `evals/conftest.py` -- provider-aware API key validation
  - File: `evals/conftest.py`
  - Action:
    - In `mcp_client_factory` fixture, replace hardcoded `ANTHROPIC_API_KEY` check with provider-aware check:
      - Read `EVAL_LLM_PROVIDER` from env (default: `"openai"`)
      - If `"anthropic"`: check `ANTHROPIC_API_KEY`
      - If `"openai"`: check `OPENAI_API_KEY`
      - Fail with clear message indicating which provider was selected and which key is missing
  - Notes: The `mcp_server` fixture doesn't need changes -- it only checks MCP server env vars.

- [ ] Task 7: Add unit tests for provider abstraction
  - File: `evals/tests/test_providers.py` (new)
  - Action: Write unit tests that:
    1. Test `get_provider()` returns `OpenAIProvider` when `EVAL_LLM_PROVIDER=openai` or unset
    2. Test `get_provider()` returns `AnthropicProvider` when `EVAL_LLM_PROVIDER=anthropic`
    3. Test `get_provider()` raises `ValueError` with key phrase `"unknown provider"` for invalid provider names
    4. Test `OpenAIProvider` tool schema transformation (canonical -> OpenAI function format)
    5. Test `AnthropicProvider` passes tool schemas through unchanged
    6. Test `OpenAIProvider.format_messages` includes system prompt as first message with `role: "system"`
    7. Test `AnthropicProvider.format_messages` does NOT include system prompt in messages (it goes in separate `system` param)
    8. Test `model_callback` end-to-end with mocked provider (mock `_provider.run_agentic_loop` to return canned response, verify Turn construction)
  - Notes: Mock at LLM SDK boundary. Use `monkeypatch.setenv` for env var tests. Tests should NOT require API keys. Key phrases for error assertions: `"unknown provider"`.

### Acceptance Criteria

- [ ] AC 1: Given `EVAL_LLM_PROVIDER=openai` (or unset) and `OPENAI_API_KEY` set, when `model_callback` is called, then it uses the OpenAI API to generate responses and handle tool calls.
- [ ] AC 2: Given `EVAL_LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` set, when `model_callback` is called, then it uses the Anthropic API (identical behavior to current implementation).
- [ ] AC 3: Given `EVAL_LLM_MODEL=gpt-4.1` and `EVAL_LLM_PROVIDER=openai`, when the provider makes an API call, then it uses the specified model name.
- [ ] AC 4: Given `EVAL_LLM_PROVIDER=unsupported`, when `get_provider()` is called, then it raises `ValueError` with message containing `"unknown provider"`.
- [ ] AC 5: Given the OpenAI provider, when Claude-format tool schemas are provided, then they are transformed to OpenAI's `{"type": "function", "function": {..., "parameters": ...}}` format correctly.
- [ ] AC 6: Given the OpenAI provider, when the LLM returns tool_calls, then each tool call is proxied to the MCP server via `McpHttpClient`, an `MCPToolCall` is created with the result, and the tool result is fed back to the LLM in OpenAI's `role: "tool"` format.
- [ ] AC 7: Given either provider, when `model_callback` returns, then the `Turn` has `mcp_tools_called` populated with all tool calls made during the agentic loop (or `None` if no tools were called). The `model_callback` signature remains `async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn`.
- [ ] AC 8: Given `json.loads` fails on OpenAI's `tool_call.function.arguments`, when processing the tool call, then the error is surfaced as a tool result content string (not raised), allowing the LLM to recover.
- [ ] AC 9: Given the provider abstraction, when `_filter_consecutive_same_role` and MCP client pool management are used, then they are shared across both providers (not duplicated).
- [ ] AC 10: Given `evals/conftest.py`, when `EVAL_LLM_PROVIDER=openai`, then the fixture checks for `OPENAI_API_KEY` (not `ANTHROPIC_API_KEY`).

## Additional Context

### Dependencies

- `openai` -- already in `pyproject.toml` dependencies, no changes needed
- `anthropic` -- already in `pyproject.toml` dependencies, no changes needed
- No new packages required

### Testing Strategy

**Unit tests (`evals/tests/test_providers.py`):**
- Provider factory: correct provider returned for each env var value, error for unknown
- Tool schema transformation: canonical -> OpenAI format, canonical passthrough for Anthropic
- Message formatting: system prompt placement differs between providers
- model_callback integration: mocked provider, verify Turn construction

**Integration tests (existing `test_bridge.py` and future tests):**
- Set `EVAL_LLM_PROVIDER` and `EVAL_LLM_MODEL` env vars
- Run existing eval tests against OpenAI to validate end-to-end
- Existing Anthropic tests should continue to work with `EVAL_LLM_PROVIDER=anthropic`

**Manual validation:**
- Run `EVAL_LLM_PROVIDER=openai EVAL_LLM_MODEL=gpt-4.1 deepeval test run tests/` and confirm conversations complete successfully
- Compare OpenAI eval scores against Anthropic baseline to ensure provider doesn't drastically affect quality

### Notes

- **High risk: OpenAI parallel tool calling.** OpenAI may return multiple tool_calls in a single response (parallel function calling). The implementation must handle this by iterating all tool_calls in the response, calling each tool, and returning all results before the next LLM call. This differs from Anthropic where multiple tool_use blocks in one response are also possible but less common.
- **High risk: OpenAI argument parsing.** OpenAI returns `tool_call.function.arguments` as a JSON string, not a parsed dict. Must `json.loads()` it. Malformed JSON is possible (rare but documented) -- handle gracefully.
- **Medium risk: System prompt placement.** Anthropic uses a separate `system` parameter. OpenAI uses a `role: "system"` message. The provider abstraction must handle this correctly -- `format_messages` for OpenAI prepends the system message, while Anthropic's `run_agentic_loop` passes it as a kwarg.
- **Future consideration:** If a third provider is needed (e.g., Google Gemini), add `evals/providers/gemini_provider.py` implementing `LLMProvider` and register it in the factory. No changes to `chatbot.py` or shared infrastructure needed.
- **DeepEval judge model is separate.** The `AnthropicModel` used as judge for ConversationalGEval metrics (E5-5) is independent of this provider abstraction. That uses DeepEval's own model wrapper, not `model_callback`. Configuring the judge model is a separate concern.
- **`_clients` dict and `get_or_create_client` stay in chatbot.py.** These manage the MCP client pool (one client per thread_id). They are provider-agnostic and don't need to move.
