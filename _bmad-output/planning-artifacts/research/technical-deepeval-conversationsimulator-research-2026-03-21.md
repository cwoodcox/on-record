---
stepsCompleted: [1, 2]
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

<!-- Content will be appended sequentially through research workflow steps -->
