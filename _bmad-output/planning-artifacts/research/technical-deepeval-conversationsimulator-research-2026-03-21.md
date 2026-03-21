---
stepsCompleted: [1, 2, 3]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'DeepEval ConversationSimulator with cloud LLM, custom system prompt, and local MCP tools'
research_goals: 'Understand how to use DeepEval ConversationSimulator to run test conversations against a cloud LLM with custom system prompt additions and custom local MCP tools'
user_name: 'Corey'
date: '2026-03-21'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-21
**Author:** Corey
**Research Type:** technical

---

## Research Overview

## Technical Research Scope Confirmation

**Research Topic:** DeepEval ConversationSimulator with cloud LLM, custom system prompt, and local MCP tools
**Research Goals:** Understand how to use DeepEval ConversationSimulator to run test conversations against a cloud LLM with custom system prompt additions and custom local MCP tools

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-21

---

## Technology Stack Analysis

### Programming Languages

DeepEval is a **Python-native framework** — the entire API surface is Python-only. No JavaScript/TypeScript equivalent exists for `ConversationSimulator`.

_Primary Language: Python 3.10+ (required for async/await patterns used by ConversationSimulator)_
_MCP SDK: Python MCP SDK (`mcp` PyPI package) — also TypeScript but Python is needed to match DeepEval_
_LLM Provider SDKs: `anthropic` Python SDK, `openai` Python SDK — used inside the `model_callback`_
_Test Runner: pytest (deepeval integrates via `@pytest.mark.parametrize` and `assert_test()`)_
_Source: [DeepEval Getting Started](https://deepeval.com/docs/getting-started), [MCP PyPI](https://pypi.org/project/mcp/)_

### Development Frameworks and Libraries

| Library | Role | Version/Notes |
|---|---|---|
| `deepeval` | Core evaluation + ConversationSimulator | pip install deepeval |
| `mcp` | MCP Python SDK (client/server) | stdio + SSE transports |
| `anthropic` | Cloud LLM SDK for SUT (system under test) | Any Claude model |
| `openai` | Cloud LLM SDK for SUT or simulator_model | GPT-4.1 is the default simulator |
| `pytest` | Test runner integration | Standard deepeval CI/CD approach |
| `asyncio` | Required for async model_callback | Built-in Python |

_ConversationSimulator defaults `simulator_model` to `gpt-4.1` (the fake-user driver), but accepts any `DeepEvalBaseLLM` — meaning Anthropic models can drive both the simulated user AND the chatbot under test._
_Source: [DeepEval Conversation Simulator](https://deepeval.com/docs/conversation-simulator), [DeepEval Anthropic Integration](https://deepeval.com/integrations/models/anthropic)_

### Database and Storage Technologies

_No database is required for local ConversationSimulator runs. All test state is in-memory during a session._
_Optional Confident AI cloud platform: stores results, hyperparameters, and traces for comparison across runs._
_LangChain/LlamaIndex session stores (e.g. `ChatMemoryBuffer`, `SQLiteSession`) can be used inside the `model_callback` to give the SUT conversation memory — this is application-layer, not deepeval infrastructure._
_Source: [Multi-Turn Evaluation Guide](https://deepeval.com/guides/guides-multi-turn-evaluation)_

### Development Tools and Platforms

_CLI: `deepeval` CLI for provider setup (`deepeval set-anthropic`, `deepeval set-litellm`, etc.)_
_IDE support: Standard Python tooling (any IDE); no deepeval-specific plugins required_
_Testing: pytest with `assert_test()` + `@pytest.mark.parametrize` for CI/CD integration_
_Tracing: Confident AI MCP server can be used as a data persistence layer from Claude Code/Cursor_
_Async execution: `async_mode=True` (default) in ConversationSimulator enables parallel conversation runs_
_Source: [Unit Testing in CI/CD](https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd)_

### Cloud Infrastructure and Deployment

_Supported cloud LLM providers for the SUT (system under test) inside `model_callback`:_
- **Anthropic** — `AnthropicModel` or direct `anthropic` SDK in callback; default model `claude-3-7-sonnet-latest`
- **OpenAI** — `GPTModel` or direct `openai` SDK; default `gpt-4.1`
- **Azure OpenAI** — via `deepeval set-azure-openai` CLI
- **Amazon Bedrock** — native support added 2025, includes Claude/Titan models
- **LiteLLM** — gateway covering 100+ providers via `deepeval set-litellm`
- **Google Vertex AI / Gemini** — supported via custom `DeepEvalBaseLLM` wrapper

_The `simulator_model` (which drives the synthetic user) is separate from the SUT — you can use Anthropic for the SUT and OpenAI to drive user turns, or vice versa._
_Source: [DeepEval Anthropic Docs](https://deepeval.com/integrations/models/anthropic), [LiteLLM Integration](https://deepeval.com/integrations/models/litellm), [Custom LLMs Guide](https://deepeval.com/guides/guides-using-custom-llms)_

### Technology Adoption Trends

_DeepEval added native MCP evaluation support in 2025 with `MCPUseMetric`, `MultiTurnMCPUseMetric`, and `MCPTaskCompletionMetric` — aligning with the rapid adoption of MCP as an interoperability standard._
_`ConversationSimulator` was revamped in 2025 to use `ConversationalGolden` objects (replacing the older `user_intentions`/`user_profile_items` pattern) — the new API is cleaner and scenario-driven._
_Language parameter added to ConversationSimulator in 2025 for non-English test scenarios._
_DeepEval is currently the leading open-source Python LLM eval framework with 50+ metrics and direct pytest integration._
_Source: [DeepEval 2025 Changelog](https://deepeval.com/changelog/changelog-2025), [GitHub confident-ai/deepeval](https://github.com/confident-ai/deepeval)_

## Integration Patterns Analysis

### API Design Patterns

The `ConversationSimulator` integration is organized around a **single mandatory callback boundary** (`model_callback`) — deepeval owns the outer simulation loop; your code owns the inner LLM invocation. This is a clean inversion-of-control pattern.

_model_callback contract_: `async def callback(input: str, turns: List[Turn], thread_id: str) -> Turn`
- `input` — the simulator-generated user message for this turn
- `turns` — full conversation history so far as `List[Turn]` (each Turn has `.role` and `.content`)
- `thread_id` — unique session identifier per simulated conversation (useful for stateful memory stores)
- Returns — a `Turn(role="assistant", content=..., mcp_tools_called=[...])` for this turn

_ConversationalGolden API_: The scenario-driven input contract — `scenario`, `expected_outcome`, `user_description`. The simulator uses these to generate realistic user turns and determine when to stop.
_Source: [Conversation Simulator Docs](https://deepeval.com/docs/conversation-simulator), [Multi-Turn Evaluation Guide](https://deepeval.com/guides/guides-multi-turn-evaluation)_

### Communication Protocols

**Simulator ↔ model_callback**: In-process Python function call. No network protocol involved — the simulator calls your callback directly in the same Python process.

**model_callback ↔ Cloud LLM (SUT)**: HTTPS/REST to the cloud LLM provider API (Anthropic Messages API, OpenAI Chat Completions API, etc.). Your callback is responsible for this network call.

**model_callback ↔ Local MCP Server**: `stdio` transport (subprocess stdin/stdout). The MCP Python SDK manages this via `StdioServerParameters` + `AsyncExitStack`. The local MCP server process is launched as a subprocess:

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="python",  # or "node"
    args=["path/to/your/mcp_server.py"],
    env=None
)
async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tool_list = await session.list_tools()
```

_Source: [DeepEval MCP Evaluation](https://deepeval.com/docs/evaluation-mcp), [MCP Evaluation Quickstart](https://deepeval.com/docs/getting-started-mcp)_

### Data Formats and Standards

_Turn object_: `Turn(role: str, content: str, mcp_tools_called: List[MCPToolCall] = None, mcp_resources_called: List[MCPResourceCall] = None, mcp_prompts_called: List[MCPPromptCall] = None)`
_MCPToolCall_: `MCPToolCall(name: str, args: dict, result: Any)` — one per tool invocation within an assistant turn
_MCPServer_: `MCPServer(server_name: str, transport: str, available_tools: List, available_resources: List, available_prompts: List)` — describes what was available (not what was called)
_ConversationalTestCase_: Wraps `List[Turn]` + `mcp_servers: List[MCPServer]` — the final artifact passed to `evaluate()`
_Hyperparameters dict_: `{"model": str, "system_prompt": str, ...}` — optional metadata logged to Confident AI for run comparison
_Source: [Multi-Turn Test Case Docs](https://deepeval.com/docs/evaluation-multiturn-test-cases)_

### System Interoperability Approaches

**Pattern A — Simple chatbot test (no MCP evaluation scoring):**
Use ConversationSimulator purely to drive turns. Your `model_callback` calls your cloud LLM with a custom system prompt. MCP tools may be called inside the callback but you don't track them as `MCPToolCall` objects — you just test conversation quality via `KnowledgeRetentionMetric`, `RoleAdherenceMetric`, etc.

**Pattern B — Full MCP evaluation (recommended for your use case):**
Your `model_callback` runs a complete agentic loop: query cloud LLM → if tool_use response, call local MCP server → append result → re-query LLM → collect all `MCPToolCall` objects → return `Turn` with `mcp_tools_called` populated. Then evaluate with `MultiTurnMCPUseMetric` and `MCPTaskCompletionMetric`.

**Custom system prompt injection** — done entirely inside `model_callback`, before calling the cloud LLM. Deepeval has no awareness of your system prompt; you reconstruct messages from scratch each turn:

```python
async def model_callback(input: str, turns: List[Turn], thread_id: str) -> Turn:
    messages = [
        {"role": "user", "content": CUSTOM_SYSTEM_PROMPT},  # Anthropic: system via user turn or system param
    ]
    # OR for Anthropic API directly:
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-5",
        system=CUSTOM_SYSTEM_PROMPT,  # <-- system param, separate from messages
        messages=build_history(turns) + [{"role": "user", "content": input}],
        tools=mcp_tool_schemas,  # injected from session.list_tools()
        max_tokens=1024,
    )
    # ... handle tool_use blocks, call MCP, collect MCPToolCall objects
    return Turn(role="assistant", content=final_text, mcp_tools_called=tool_calls_made)
```

_Source: [DeepEval Anthropic Integration](https://deepeval.com/integrations/models/anthropic), [Medical Chatbot Tutorial](https://deepeval.com/tutorials/medical-chatbot/evaluation)_

### MCP Tool Wiring Integration Pattern (Critical)

The complete wiring pattern for a cloud LLM + local MCP server inside `model_callback`:

```python
import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from deepeval.test_case import Turn, MCPToolCall, MCPServer

# Establish MCP connection (do once at test setup, share session)
# session: ClientSession  ← initialized before simulator.simulate() call
# tool_schemas: list ← from await session.list_tools(), converted to Anthropic tool format

CUSTOM_SYSTEM_PROMPT = "You are a helpful assistant for Utah legislative research. " \
                       "You have access to tools for looking up bills and legislators."

async def model_callback(input: str, turns: List[Turn], thread_id: str) -> Turn:
    messages = build_anthropic_messages(turns)  # convert List[Turn] → Anthropic format
    messages.append({"role": "user", "content": input})

    mcp_tool_calls_made: List[MCPToolCall] = []
    final_text = ""

    # Agentic loop
    while True:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-5",
            system=CUSTOM_SYSTEM_PROMPT,
            messages=messages,
            tools=tool_schemas,   # schemas from MCP server's list_tools()
            max_tokens=2048,
        )

        if response.stop_reason == "end_turn":
            final_text = response.content[0].text
            break

        # Handle tool_use blocks
        for block in response.content:
            if block.type == "tool_use":
                result = await session.call_tool(block.name, block.input)
                mcp_tool_calls_made.append(MCPToolCall(
                    name=block.name,
                    args=block.input,
                    result=result.content,
                ))
                # Append tool result back for next LLM call
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": block.id, "content": str(result.content)}
                ]})
                break

    return Turn(
        role="assistant",
        content=final_text,
        mcp_tools_called=mcp_tool_calls_made or None,
    )
```

_Source: [MCP Eval Multi-Turn Example](https://github.com/confident-ai/deepeval/blob/main/examples/mcp_evaluation/mcp_eval_multi_turn.py), [DeepEval MCP Docs](https://deepeval.com/docs/evaluation-mcp)_

### Event-Driven Integration

_on_simulation_complete hook_: Called after each individual conversation completes (not after all). Receives `(test_case: ConversationalTestCase, index: int)`. Useful for streaming results to a database or logging as conversations finish rather than batching.

```python
def handle_complete(test_case: ConversationalTestCase, index: int):
    # persist, log, or trigger evaluation immediately
    pass

simulator.simulate(
    conversational_goldens=goldens,
    on_simulation_complete=handle_complete
)
```

_async_mode=True (default)_: Conversations run concurrently up to `max_concurrent` (default 100). With MCP stdio servers, each conversation needs its own MCP `ClientSession` instance (stdio is single-client) — sessions should be per-`thread_id`, not shared.
_Source: [Conversation Simulator Docs](https://deepeval.com/docs/conversation-simulator)_

### Integration Security Patterns

_System prompt control_: Fully yours — deepeval never touches or injects into your SUT's system prompt. Pass it via the `system=` parameter in Anthropic's `messages.create()` call, or prepend as a system-role message for OpenAI.

_API key management_: Each provider's key set via `deepeval set-anthropic` (writes to `~/.deepeval`) or as env vars (`ANTHROPIC_API_KEY`). The simulator model (fake user LLM) and SUT LLM can use different keys/providers.

_MCP stdio trust boundary_: `stdio` transport is local-process-only — no network exposure. Safe for local test runs. For CI/CD, the MCP server process is spawned by the test runner in the same environment.

_Prompt injection risk_: When testing with `ConversationSimulator`, the simulated user inputs are LLM-generated (not from real users). Your system prompt additions should treat simulator inputs as potentially adversarial for robustness testing.
_Source: [DeepEval Custom LLMs Guide](https://deepeval.com/guides/guides-using-custom-llms)_

<!-- Content will be appended sequentially through research workflow steps -->
