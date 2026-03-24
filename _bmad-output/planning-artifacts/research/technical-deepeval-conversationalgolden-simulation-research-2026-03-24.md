---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'deepeval ConversationGolden for conversation simulation'
research_goals: 'Getting started with building ConversationGolden datasets and running conversation simulation tests in deepeval'
user_name: 'Corey'
date: '2026-03-24'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-24
**Author:** Corey
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** deepeval ConversationGolden for conversation simulation
**Research Goals:** Getting started with building ConversationGolden datasets and running conversation simulation tests in deepeval

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

**Scope Confirmed:** 2026-03-24

---

## Technology Stack Analysis

### Programming Languages

deepeval is a Python-only framework (Python `>3.9, <4.0`; tested on 3.9–3.11, compatible to 3.13). There is no JavaScript/TypeScript SDK. The `ConversationalGolden` and `ConversationSimulator` APIs are implemented as Pydantic v2 `BaseModel` classes, so all test authoring is done in Python.

_Popular Language:_ Python 3.10–3.12 (most common in CI pipelines per the official docs)
_Language Evolution:_ Optional integrations (crewai, openai-agents, llama-index) require Python >=3.10; Python 3.9 support is maintained for core only
_Source: https://pypi.org/project/deepeval/ — https://github.com/confident-ai/deepeval_

### Development Frameworks and Libraries

**Core deepeval package (v3.9.2, released 2026-03-20):**

| Package | Role |
|---|---|
| `pydantic ^2.11.7` | Data model for `ConversationalGolden`, `Turn`, `LLMTestCase`, etc. |
| `openai` (latest) | Default simulator/judge LLM provider |
| `pytest` + `pytest-xdist`, `pytest-asyncio` | Test runner integration (bundled) |
| `tenacity >=8.0.0` | Retry logic for LLM API calls |
| `aiohttp` | Async HTTP for concurrent simulation |
| `nest_asyncio` | Allows `asyncio.run()` inside Jupyter |
| `rich` | Console output formatting |
| `tqdm ^4.66.1` | Progress bars during `simulate()` |
| `jinja2` | Prompt templating |

**Optional framework integrations** (Python >=3.10):
- `crewai`, `pydantic-ai`, `openai-agents ^0.3.3`, `llama-index ^0.14.4`, `langchain 1.2.4`, `langgraph 1.0.7`

_Source: https://github.com/confident-ai/deepeval — pyproject.toml_

### Database and Storage Technologies

deepeval itself has no database dependency. Dataset persistence is handled two ways:
- **Local:** `EvaluationDataset` serialized to JSON via `add_goldens_from_json_file()` / `export_to_json()`. Known bug: `comments`, `custom_column_key_values` fields not correctly deserialized from JSON (GitHub Issue #2056).
- **Cloud:** Confident AI platform via `dataset.push(alias="...")` / `dataset.pull(alias="...")`. SOC 2 Type II compliant. Supports `finalized=False` for draft datasets not yet active in evaluation.

_Source: https://deepeval.com/docs/evaluation-datasets_

### Development Tools and Platforms

- **CLI:** `deepeval test run`, `deepeval set-openai-key`, `deepeval set-gemini`, etc.
- **Test runner:** `deepeval test run test_file.py -n 4 -c -v` — wraps pytest with deepeval plugin
- **Evaluation modes:** `assert_test()` (pytest path) or `evaluate()` (notebook/script path) — cannot mix in same test file
- **Jupyter support:** Full support via `nest_asyncio`; `evaluate()` preferred over `assert_test()` in notebooks
- **IDE:** Standard Python tooling (no deepeval-specific IDE plugin)

_Source: https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd_

### Cloud Infrastructure and Deployment

- **LLM Judge (default):** OpenAI GPT-4.1 — requires `OPENAI_API_KEY`
- **Alternate judges:** Azure OpenAI, Gemini, Anthropic Claude, Ollama (local), any `DeepEvalBaseLLM` subclass — swap via `simulator_model` parameter on `ConversationSimulator`
- **Confident AI Dashboard:** Optional SaaS platform for storing test runs, datasets, and production traces. On-prem deployment available.
- **CI/CD:** `deepeval test run` emits non-zero exit code on failure; drop-in for GitHub Actions, GitLab CI, Jenkins

_Source: https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd_

### Technology Adoption Trends

- deepeval 14,100+ GitHub stars, 1,300+ forks (Apache 2.0) as of March 2026
- Version 3.9.2 adds `language` parameter to `ConversationSimulator` (multi-language simulation)
- MCP tool/resource/prompt fields added to `Turn` for MCP-based agent evaluation
- `ConversationSimulator` introduced in late 2024 (PR #1876); active development continues
- Known open issue: double initial user-turn bug (#1884) in `simulate()` — workaround: filter first turn if needed

_Source: https://deepeval.com/changelog/changelog-2025 — https://github.com/confident-ai/deepeval_

---

## Integration Patterns Analysis

### API Design Patterns — The `model_callback` Contract

The central integration point for `ConversationSimulator` is the `model_callback` callable. deepeval uses Python introspection (`inspect.signature`) to detect which parameters the callback declares, passing only those it asks for. This makes the callback interface additive and non-breaking.

**Minimal stateless callback:**
```python
async def chatbot_callback(input: str) -> Turn:
    response = await my_llm(input)
    return Turn(role="assistant", content=response)
```

**Full stateful callback (all three params):**
```python
async def chatbot_callback(input: str, turns: list[Turn], thread_id: str) -> Turn:
    response = await my_llm(input, history=turns, session_id=thread_id)
    return Turn(role="assistant", content=response, retrieval_context=[...])
```

- `input`: the latest simulated user message
- `turns`: full conversation history (for stateless chatbots that need to reconstruct context)
- `thread_id`: stable UUID per conversation (for stateful chatbots with external session stores)

The callback must return a `Turn(role="assistant", content=...)`. Optionally it can populate `retrieval_context` and `tools_called` fields on the returned `Turn` to enable per-turn RAG and tool-use metrics during evaluation.

_Source: https://deepeval.com/docs/conversation-simulator_

### Communication Protocols — Simulator ↔ Chatbot

`ConversationSimulator` orchestrates a multi-turn exchange using two alternating roles:

1. **Simulated user** — driven by `simulator_model` (GPT-4.1 by default). Given the `scenario`, `user_description`, and conversation history, it generates the next user message.
2. **System under test** — driven by `model_callback`. Receives the user message, returns an assistant `Turn`.

Termination conditions (first hit wins):
- `expected_outcome` is detected as achieved (LLM judge evaluation)
- `max_user_simulations` turns exhausted (default: 10)

The simulator runs asynchronously using `aiohttp` with `max_concurrent=100` parallel conversations by default. Reduce this if hitting LLM rate limits.

_Source: https://deepeval.com/docs/conversation-simulator_

### Data Formats and Standards

All data flows through Pydantic v2 models:

| Class | Import | Key fields |
|---|---|---|
| `ConversationalGolden` | `deepeval.dataset` | `scenario`, `expected_outcome`, `user_description`, `context`, `turns` |
| `Turn` | `deepeval.test_case` | `role`, `content`, `retrieval_context`, `tools_called` |
| `ConversationalTestCase` | `deepeval.test_case` | `turns: List[Turn]`, `scenario`, `expected_outcome` |
| `EvaluationDataset` | `deepeval.dataset` | `goldens: List[ConversationalGolden]` |

Dataset serialization: JSON (local) or Confident AI REST API (cloud). Note the JSON deserialization bug for `comments`/`custom_column_key_values` fields (GitHub #2056).

_Source: https://deepeval.com/docs/evaluation-datasets — https://deepeval.com/docs/evaluation-multiturn-test-cases_

### System Interoperability — pytest Plugin

deepeval ships a pytest plugin that hooks into pytest's collection and reporting lifecycle:

- Test files follow `test_*.py` / `*_test.py` naming
- Test functions use `assert_test(test_case, metrics)` instead of plain `assert`
- Plugin entry point registered as `deepeval` in pyproject.toml (renamed from `plugins` in 2025)
- `deepeval test run` wraps `pytest` — do NOT call `pytest` directly (plugin registration differs)
- `-n <N>` flag enables `pytest-xdist` parallel workers across test cases

**Incompatibility constraint:** `ConversationalTestCase` and `LLMTestCase` cannot appear in the same `evaluate()` call — they use different metric systems.

_Source: https://deepeval.com/docs/getting-started — https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd_

### Microservices / Agent Integration Patterns

For multi-agent and agentic systems, deepeval provides component-level tracing via the `@observe` decorator. For conversation simulation specifically, the integration pattern is:

1. **Wrap each agent/component** with `@observe` — creates spans in the trace tree
2. **Use `thread_id`** to correlate conversation turns across distributed services
3. **Populate `tools_called`** on the returned `Turn` to enable `ToolCorrectnessMetric` and `AgentTaskCompletionMetric`

Framework-specific integrations (Python >=3.10):
- **LangChain/LangGraph:** Auto-instrumentation via `langchain` optional group
- **CrewAI:** `crewai` optional group
- **OpenAI Agents SDK:** `openai-agents ^0.3.3` optional group
- **LlamaIndex:** `llama-index ^0.14.4` optional group

_Source: https://deepeval.com/docs/evaluation-component-level-llm-evals — https://deepeval.com/docs/evaluation-llm-tracing_

### Event-Driven / Streaming Integration

The `on_simulation_complete` callback provides a streaming-style hook — called immediately when each individual conversation finishes (before all conversations in the batch complete):

```python
def on_done(test_case: ConversationalTestCase, index: int):
    # Process or store immediately — don't wait for the full batch
    store_result(index, test_case)

test_cases = simulator.simulate(
    conversational_goldens=goldens,
    on_simulation_complete=on_done,
)
```

This is useful for large datasets where you want incremental persistence or early visibility into results.

_Source: https://deepeval.com/docs/conversation-simulator_

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
- name: Run deepeval conversation tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    DEEPEVAL_API_KEY: ${{ secrets.DEEPEVAL_API_KEY }}  # optional: Confident AI
  run: |
    pip install deepeval
    deepeval test run tests/test_chatbot.py -n 4 -id "ci-run-${{ github.run_id }}"
```

- Non-zero exit on any metric threshold failure — pipeline fails as expected
- `-id` flag labels the run for Confident AI dashboard correlation
- `-c` flag enables local caching to skip re-evaluation of unchanged test cases (speeds up CI)

_Source: https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd_

---

## Architectural Patterns and Design

### System Architecture — The Three-Layer Eval Pipeline

deepeval is organized into three distinct evaluation layers that compose cleanly:

```
Layer 1: End-to-End (Black Box)
  ConversationalGolden → ConversationSimulator → ConversationalTestCase → evaluate()

Layer 2: Component-Level (Tracing)
  @observe decorator on individual functions → Span → Trace tree → per-span metrics

Layer 3: Production Monitoring
  Instrumented app in prod → traces pushed to Confident AI → continuous eval
```

For conversation simulation, you operate entirely in Layer 1. Layers 2 and 3 become relevant when you want to trace which internal component (retriever, reranker, generator) is degrading conversation quality.

_Source: https://deepeval.com/docs/evaluation-component-level-llm-evals — https://deepeval.com/docs/evaluation-llm-tracing_

### Design Principles

**Separation of golden spec from simulation execution.** `ConversationalGolden` holds the *intent* (what the conversation should accomplish); `ConversationSimulator` handles *execution* (generating the actual turns). You can maintain a stable dataset of goldens and re-simulate as your chatbot changes — the spec is independent of the system under test.

**Callback introspection over rigid interfaces.** Rather than requiring a fixed interface, `ConversationSimulator` uses `inspect.signature` to adapt to whatever the callback declares. This avoids forcing stateless chatbots to accept parameters they don't need.

**Metric orthogonality.** Each metric scores independently on a 0–1 scale with its own `threshold`. There is no combined score — you get per-metric pass/fail, making failures directly actionable.

**Async-first design.** `simulate()` is async by default (`async_mode=True`), running up to `max_concurrent=100` conversations in parallel via `aiohttp`. This scales to large golden datasets without serial bottlenecks.

_Source: https://deepeval.com/docs/conversation-simulator — https://deepeval.com/docs/getting-started_

### Scalability and Performance Patterns

**Parallelism levers:**
- `max_concurrent` on `ConversationSimulator` — controls parallel conversations within a `simulate()` call
- `-n <N>` on `deepeval test run` — controls parallel pytest-xdist workers across test functions
- These are independent axes and can be combined

**Caching:** `-c` flag in `deepeval test run` caches evaluation results keyed on test case content. Re-runs with unchanged goldens skip LLM judge calls entirely — critical for CI cost control.

**Dataset sizing:** Minimum ~20 goldens for a meaningful benchmark. Each golden produces one `ConversationalTestCase`; all run concurrently up to `max_concurrent`.

**Rate limit management:** If `max_concurrent=100` triggers provider rate limits, reduce to 10–20. `tenacity` (bundled) handles transient API failures automatically with retries.

_Source: https://deepeval.com/docs/conversation-simulator — https://deepeval.com/docs/evaluation-flags-and-configs_

### Data Flow Architecture

```
EvaluationDataset
  └── List[ConversationalGolden]
         │  scenario, expected_outcome, user_description, context, turns(seed)
         ▼
ConversationSimulator.simulate()
  ├── simulator_model (LLM) generates user turns
  ├── model_callback() generates assistant turns
  └── Terminates at expected_outcome OR max_user_simulations
         │
         ▼
  List[ConversationalTestCase]
    └── turns: List[Turn]
          ├── role, content
          ├── retrieval_context  (optional — enables RAG metrics)
          └── tools_called       (optional — enables tool metrics)
         │
         ▼
evaluate(test_cases, metrics)
  ├── ConversationCompletenessMetric
  ├── ConversationRelevancyMetric (window_size)
  ├── RoleAdherenceMetric
  ├── KnowledgeRetentionMetric
  └── ConversationalGEval (custom criteria)
         │
         ▼
  Results: per-metric score (0–1) + pass/fail vs threshold
  Optional: push to Confident AI dashboard
```

_Source: https://deepeval.com/docs/conversation-simulator — https://deepeval.com/docs/evaluation-multiturn-test-cases_

### Security Architecture Patterns

- **API key management:** deepeval auto-loads `.env.local` then `.env` at import time. Set `DEEPEVAL_DISABLE_DOTENV=1` to opt out. Inject keys as CI secrets, not committed `.env` files.
- **Data sensitivity:** Conversation turn contents are sent to the `simulator_model` LLM provider. For sensitive domains, use a self-hosted `DeepEvalBaseLLM` subclass pointing to a local model (Ollama) to keep data on-premise.
- **Confident AI platform:** SOC 2 Type II compliant. On-prem deployment available for regulated environments.

_Source: https://deepeval.com/docs/conversation-simulator — https://www.confident-ai.com/docs_

### Data Architecture Patterns

**Golden dataset lifecycle:**
1. **Author locally** — `ConversationalGolden` objects in Python or loaded from JSON
2. **Push to Confident AI** (optional) — `dataset.push(alias="...", finalized=False)` for collaborative editing
3. **Pull for CI** — `dataset.pull(alias="...")`
4. **Simulate at runtime** — goldens → `ConversationalTestCase` via `ConversationSimulator`

**Key constraint:** A single `EvaluationDataset` cannot mix `Golden` (single-turn) and `ConversationalGolden` (multi-turn). Maintain separate datasets.

**Seed turns pattern:** Populate `ConversationalGolden.turns` with assistant-role seed turns to start simulation mid-conversation — useful for testing specific branches without re-simulating the full opening.

_Source: https://deepeval.com/docs/evaluation-datasets_

### Deployment and Operations Architecture

**Hyperparameter tuning workflow:**
1. Start small: 5–10 goldens, `max_user_simulations=5` — validate callback correctness cheaply
2. Expand: 20+ goldens, `max_user_simulations=10` — full benchmark
3. Tune `simulator_model` to balance quality vs cost (GPT-4.1 vs GPT-4o-mini)
4. Review first simulation transcripts, then add `user_description` to all goldens to improve persona fidelity

_Source: https://deepeval.com/docs/conversation-simulator — https://deepeval.com/docs/getting-started-chatbots_
