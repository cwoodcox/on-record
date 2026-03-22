---
title: 'Research-to-Requirements: Automated Conversation Eval Harness'
slug: 'research-to-requirements'
created: '2026-03-21'
status: 'complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['python', 'deepeval', 'anthropic-sdk', 'openai', 'httpx']
files_to_modify:
  - 'evals/ (new directory — isolated Python eval harness)'
  - 'evals/metrics.py (new — built-in MCP metrics + custom ConversationalGEval rubrics)'
  - 'evals/goldens.py (new — ConversationalGolden scenario definitions, 10–20 scenarios)'
  - 'evals/tests/ (new — pytest test files that run simulations + scoring)'
  - 'evals/chatbot.py (new — model_callback wrapping Claude API + MCP tool proxying)'
  - 'evals/mcp_client.py (new — MCP HTTP client for StreamableHTTP tool calls)'
  - 'evals/server.py (new — MCP server lifecycle: spawn, health-check, teardown)'
code_patterns:
  - 'MCP StreamableHTTP: POST /mcp with mcp-session-id header for session management'
  - 'Health check: GET /health → { status: "ok", service: "on-record-mcp-server" }'
  - 'DeepEval ConversationSimulator drives conversation via model_callback'
  - 'model_callback signature: async (input, turns, thread_id) -> Turn with mcp_tools_called'
  - 'MCPToolCall tracking: populate mcp_tools_called on Turn objects for built-in MCP metrics'
  - 'ConversationalGolden defines persona scenarios (Deb, Marcus) with expected_outcome'
  - 'model_callback: Claude API call → tool_use → HTTP POST to MCP → MCPToolCall → return Turn'
  - 'Built-in metrics: MultiTurnMCPUseMetric, MCPTaskCompletionMetric, KnowledgeRetentionMetric, ConversationCompletenessMetric'
  - 'Custom metrics: ConversationalGEval with evaluation_steps for domain-specific rubrics'
  - 'AnthropicModel as judge model for DeepEval metrics'
  - 'deepeval test run (not bare pytest) for caching, parallelism, identifier tagging'
  - 'Hyperparameters logging: system_prompt + model tracked per run for regression comparison'
test_patterns:
  - 'Persona-based scenarios: Deb (specific concern) and Marcus (vague concern)'
  - 'Built-in MCP metrics (tool use correctness, task completion, knowledge retention) + custom GEval rubrics (11 domain-specific dimensions)'
  - 'Phased adoption: Phase 1 manual test cases, Phase 2 ConversationSimulator, Phase 3 CI gating'
  - 'Target: 10–20 ConversationalGoldens covering happy paths + failure modes + edge cases'
  - 'Cost target: ~$0.40–0.80 per full eval run (20 goldens, 6 turns)'
---

# Tech-Spec: Research-to-Requirements: Automated Conversation Eval Harness

**Created:** 2026-03-21

## Overview

### Problem Statement

The chatbot's 4-step conversational flow (warm open → address/legislator lookup → bill surfacing → draft generation) is verified entirely through manual test sessions. This doesn't scale — prompt changes, model upgrades, or tool behavior changes can silently regress quality with no automated safety net.

### Solution

Build an all-Python conversation evaluation harness using DeepEval's `ConversationSimulator`:

1. **ConversationalGolden scenarios** define personas (Deb, Marcus) with scenario descriptions, user personas, and expected outcomes.
2. **ConversationSimulator** generates simulated user messages and drives the conversation via a `model_callback`.
3. **model_callback** wraps the full pipeline: sends user input to Claude API with the system prompt, handles tool calls by proxying them to the local MCP server via HTTP, collects `MCPToolCall` objects, and returns the final assistant Turn.
4. **Dual metrics** — built-in MCP metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) score structural/task quality; custom `ConversationalGEval` rubrics score domain-specific behavioral dimensions (tone, citation format, editorializing, confirmation gates, etc.).

No TypeScript orchestrator. No transcript bridge. DeepEval drives the conversation AND scores it — single tool, single language.

### Scope

**In Scope:**
- DeepEval ConversationSimulator with model_callback (Variant B) wrapping Claude API + MCP HTTP proxy
- 10–20 ConversationalGolden scenarios covering happy paths, failure modes, and edge cases
- Built-in MCP metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`)
- Custom ConversationalGEval rubrics for all 11 domain-specific eval dimensions
- MCP server lifecycle management (spawn as child process, health-check, teardown)
- Phased adoption: manual test cases → ConversationSimulator → CI gating readiness
- Isolated Python directory within the monorepo

**Out of Scope:**
- CI pipeline integration / gating (Phase 3 — tracked but not implemented here)
- Promptfoo integration
- Performance benchmarks / latency tracking
- Cost tracking per eval run (cost model documented but not automated)
- Public MCP server deployment

## Context for Development

### Codebase Patterns

- MCP server uses StreamableHTTP transport (Hono 4.12.1) on port 3001
- MCP endpoint: `POST /mcp` with `mcp-session-id` header; `GET /mcp` for SSE; `DELETE /mcp` to close
- Two MCP tools: `lookup_legislator({ street, zone })` and `search_bills({ legislatorId, theme })`
- System prompt lives at `system-prompt/agent-instructions.md` (not in apps/)
- Server startup: env validation → schema init → seed sessions → warm-up legislators (blocking) → warm-up bills (may fail) → listen
- Required env vars: `UTAH_LEGISLATURE_API_KEY`, `UGRC_API_KEY`, optional `PORT` (default 3001)
- Start command: `node dist/index.js` (after `pnpm build`) or `tsx watch --env-file=.env src/index.ts` for dev
- All shared types in `packages/types/` — `LookupLegislatorResult`, `SearchBillsResult`, `AppError`
- SQLite boundary (Boundary 4): only `apps/mcp-server/src/cache/` imports better-sqlite3
- Rate limit: 60 req/min per IP on `/mcp`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `system-prompt/agent-instructions.md` | Finalized 4-step agent instructions — the system prompt under test (load from `evals/` as `../system-prompt/agent-instructions.md`) |
| `system-prompt/testing-notes.md` | Expected behavior guide — reference for scoring rubrics (confirmed present) |
| `system-prompt/test-runs.md` | Manual test run log (5 runs, 2 personas) — templates for eval scenarios (confirmed present) |
| `apps/mcp-server/src/index.ts` | MCP server entry point — startup, route handlers, session management |
| `apps/mcp-server/src/env.ts` | Environment validation schema (PORT, API keys) |
| `apps/mcp-server/src/tools/legislator-lookup.ts` | `lookup_legislator` tool implementation |
| `apps/mcp-server/src/tools/search-bills.ts` | `search_bills` tool implementation |
| `packages/types/index.ts` | Shared type contracts (Legislator, Bill, AppError, etc.) |
| `_bmad-output/planning-artifacts/research/technical-chatbot-automated-testing-research-2026-03-16.md` | Prior research on chatbot testing frameworks |
| `_bmad-output/planning-artifacts/research/technical-deepeval-conversationsimulator-research-2026-03-21.md` | Deep dive: ConversationSimulator API, MCP metrics, model_callback variants, phased adoption, risk register |

### Technical Decisions

- **All-Python architecture:** DeepEval's ConversationSimulator drives conversations AND scores them. Eliminates the TypeScript orchestrator, transcript bridge, and cross-language boundary. The MCP server is just an HTTP endpoint — Python calls it with `httpx`.
- **ConversationSimulator over custom orchestrator:** DeepEval handles user message generation, turn management, stopping criteria (via `expected_outcome`), and feeds directly into scoring. No glue code needed.
- **model_callback as the integration point:** Single async function (`async def model_callback(input, turns, thread_id) -> Turn`) that wraps Claude API + MCP tool proxying. Returns `Turn` with `mcp_tools_called` populated for MCP metrics. This is the only custom code that touches the LLM.
- **HTTP transport over stdio:** The research doc recommends `stdio` via the Python `mcp` SDK, but our MCP server only supports StreamableHTTP (Hono/`StreamableHTTPServerTransport`). We use `httpx` to POST JSON-RPC to `localhost:3001/mcp` instead. This means we manage our own JSON-RPC framing and `mcp-session-id` header, but avoids modifying the production server.
- **MCPToolCall tracking:** Each tool invocation inside `model_callback` creates an `MCPToolCall(name, args, result)` object. These are attached to the returned `Turn.mcp_tools_called` so DeepEval's built-in `MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, and other MCP metrics can score tool usage automatically. `MultiTurnMCPUseMetric` is a valid built-in metric (introduced in deepeval 3.7.x) that scores whether the correct MCP primitives and arguments were used across multi-turn interactions.
- **Dual metric strategy:** Built-in MCP metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) cover structural/task-level quality. Custom `ConversationalGEval` rubrics cover domain-specific behavioral dimensions (warm open, no-editorializing, citation format, etc.). Both layers run on every test case.
- **Local MCP server as child process:** Python `subprocess.Popen` starts the Node server, polls `GET /health` until ready, tears down after eval run.
- **Phased adoption (from research):** Phase 1: manual `ConversationalTestCase` with hard-coded turns to validate metrics work. Phase 2: `ConversationSimulator` with 10–20 goldens. Phase 3: CI gating via `deepeval test run`.
- **Hyperparameters logging:** Log `{"model": "...", "system_prompt": "..."}` to `evaluate()` for regression comparison across prompt/model changes. Omit system prompt from Confident AI uploads if sensitive.
- **Cost model:** ~$0.40–0.80 per full run (20 goldens, 6 turns). Use `max_user_simulations=3` during dev, 6+ for pre-release. Cache (`-c` flag) eliminates re-evaluation cost for unchanged test cases.

### Architecture

```
ConversationalGolden                    MCP Server (child process)
  scenario: "Deb, education cuts"       localhost:3001/mcp
  user_description: "upset parent"          ↑
  expected_outcome: "draft email"           │ httpx POST (JSON-RPC tool calls)
        ↓                                   │
ConversationSimulator                       │
  simulator_model: GPT-4.1 (user sim)      │
  async_mode: True                          │
        ↓ generates user message            │
  model_callback(input, turns, thread_id)   │
        │                                   │
        ├──→ Claude API ──→ tool_use? ──yes─┘
        │         ↓              │
        │    agentic loop   MCPToolCall(name, args, result)
        │         ↓              │
        │    final text     mcp_tools_called=[...]
        │         ↓
        ├──→ Turn(role="assistant", content=..., mcp_tools_called=[...])
        ↓
ConversationalTestCase (full transcript with tool call records)
        ↓
   ┌────┴────┐
   │ Built-in MCP metrics          │ Custom ConversationalGEval
   │ MultiTurnMCPUseMetric         │ Warm Open, No-Editorializing,
   │ MCPTaskCompletionMetric       │ Citation Format, Confirmation Gate,
   │ KnowledgeRetentionMetric      │ Validate-Before-Inform, etc.
   │ ConversationCompletenessMetric│
   └──────────────────────────────────────────────────────────┘
```

### Eval Scenarios Mapped from Manual Testing

**Personas (from `system-prompt/test-runs.md`):**

| Persona | Input | Address | Expected Theme |
| ------- | ----- | ------- | -------------- |
| Deb | "I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers." | 6856 W Windy Ridge Dr, Herriman UT 84096 | public education funding |
| Marcus | "Things just feel wrong lately. Like my neighbors are struggling and I don't know why." | 12997 Summerharvest Dr, Draper | economic hardship / housing / unemployment |

**Eval Dimensions:**

| Dimension | Type | What It Checks |
| --------- | ---- | -------------- |
| Warm Open | Deterministic + LLM | Opens with concern question, NOT address request or category menu |
| Validate Before Inform | LLM-as-judge | Substantive emotional acknowledgment BEFORE pivoting to data |
| Tool Parameter Correctness | Deterministic | `street` ≠ zone; no city/ZIP in street field; tool called immediately |
| Theme Inference | Deterministic + LLM | Theme inferred from constituent's words; no category menu presented |
| Confirmation Gate | LLM-as-judge | Ambiguous responses ("OK") trigger re-confirmation, not draft generation |
| No-Editorializing | LLM-as-judge | No intent/motivation claims about legislators; facts only |
| Citation Format | Deterministic + LLM | Human-readable session label; inline or trailing; exactly one; no raw IDs |
| Draft Format | Deterministic | Email: 2–4 para, 150–400 words. SMS: 1–3 sentences, <160 chars each |
| Revision Loop | LLM-as-judge | Draft revised (not restarted); citation preserved; requested changes applied |
| Scope Boundary | LLM-as-judge | Voting record questions redirected to sponsored bills; no hallucination |
| Zero-Result Fallback | LLM-as-judge | Offer re-search (2x), then fallback without citation; no fabricated bills |

### DeepEval Integration Details

**ConversationSimulator + model_callback (Variant B — with MCPToolCall tracking):**
```python
from deepeval.test_case import Turn, MCPToolCall
from deepeval.simulator import ConversationSimulator
from deepeval.dataset import ConversationalGolden

golden = ConversationalGolden(
    scenario="Constituent upset about education funding cuts contacts chatbot for help writing to legislator.",
    expected_outcome="Chatbot produces a draft email to the constituent's state legislator citing a relevant sponsored bill.",
    user_description="Deb, a parent in Herriman UT whose daughter's school lost 3 teachers due to budget cuts.",
)

async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn:
    messages = build_anthropic_messages(turns)  # convert List[Turn] → Anthropic format
    messages.append({"role": "user", "content": input})
    mcp_calls: list[MCPToolCall] = []

    # Agentic loop — handle sequential tool_use blocks
    while True:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            system=SYSTEM_PROMPT,  # loaded from agent-instructions.md
            messages=messages,
            tools=mcp_tool_schemas,  # from MCP server's tool definitions
            max_tokens=2048,
        )
        if response.stop_reason == "end_turn":
            final_text = next(b.text for b in response.content if b.type == "text")
            break
        for block in response.content:
            if block.type == "tool_use":
                result = await mcp_client.call_tool(block.name, block.input)  # httpx POST
                mcp_calls.append(MCPToolCall(name=block.name, args=block.input, result=result))
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": block.id, "content": str(result)}
                ]})
                break

    return Turn(role="assistant", content=final_text, mcp_tools_called=mcp_calls or None)

simulator = ConversationSimulator(
    model_callback=model_callback,
    simulator_model="gpt-4.1",  # default fake-user driver (avoid echo chamber with Claude SUT)
    async_mode=True,           # concurrent simulations; watch for bug #1884
)
test_cases = simulator.simulate(conversational_goldens=[golden], max_user_simulations=8)
```

**Custom rubrics via ConversationalGEval:**
```python
from deepeval.metrics import ConversationalGEval
from deepeval.models import AnthropicModel

judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)
metric = ConversationalGEval(
    name="No Editorializing",
    criteria="Evaluate whether the assistant avoids characterizing legislator intent or motivation.",
    evaluation_steps=[
        "Scan each assistant turn for subjective language about legislators",
        "Check that all claims are grounded in bill sponsorship/status data",
        "Penalize phrases like 'clearly doesn't care', 'opposed to', 'has shown'",
        "Allow factual statements: 'sponsored HB 42', 'bill passed 45-30'"
    ],
    model=judge,
    threshold=0.5  # start at 0.5 per research; tighten to 0.7 once stable
)
```

## Implementation Plan

### Stories

#### Phase 1 — Story E5-1: Python Project Scaffold and MCP Server Lifecycle

**Goal:** Set up the `evals/` directory with Python tooling and a reliable MCP server lifecycle manager.

**Deliverables:**
- `evals/pyproject.toml` — Python project config (dependencies, pytest config)
- `evals/.python-version` — pin Python 3.10+ (required for async/await patterns used by ConversationSimulator)
- `evals/conftest.py` — pytest fixtures for server lifecycle (session-scoped)
- `evals/server.py` — `start_mcp_server()` / `stop_mcp_server()` using `subprocess.Popen`, polling `GET /health` with retry, teardown on exit
- `evals/.gitignore` — ignore `.venv/`, `__pycache__/`, `.deepeval/`
- Root `.gitignore` update — ignore `evals/.venv/`

**AC:**
1. `cd evals && uv sync` (or `pip install -e .`) installs all dependencies including `deepeval`, `anthropic`, `httpx`, `openai` (for default `simulator_model`)
2. `pytest --co` discovers test files without errors
3. Server fixture starts MCP server, confirms health check passes within 30s (the server performs a blocking warm-up of legislators from an external API on startup), tears down on scope exit. The fixture polls `GET /health` with 1-second intervals up to 30 retries before failing
4. Server fixture fails fast with clear error if `PORT`, API keys, or Node.js unavailable
5. No pnpm workspace changes — `evals/` is isolated Python, not a pnpm package

#### Phase 1 — Story E5-2: MCP HTTP Client and model_callback

**Goal:** Build the `model_callback` function (Variant B — returns `Turn` with `mcp_tools_called`) that ConversationSimulator calls on each turn.

**Deliverables:**
- `evals/mcp_client.py` — `McpHttpClient` class: generates a UUID for `mcp-session-id` on init and sends it in every request header (client-owned session ID per MCP StreamableHTTP spec), sends JSON-RPC requests via `httpx` to `POST /mcp`, parses responses. One client instance per `thread_id` (concurrent conversations need independent sessions).
- `evals/chatbot.py` — `model_callback(input, turns, thread_id) -> Turn`: builds Claude messages from turn history, calls Claude API, handles agentic tool_use loop, collects `MCPToolCall` objects, returns final `Turn` with `mcp_tools_called`.
- `evals/conftest.py` update — fixture providing `McpHttpClient` factory keyed by `thread_id`.

**AC:**
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

#### Phase 1 — Story E5-3: Manual Test Cases to Validate Metrics

**Goal:** Write 3–5 `ConversationalTestCase` objects with hard-coded turns (from manual test run transcripts). Validate that metrics score as expected before adding simulation complexity.

**Rationale (from research):** "Start with `evaluate()` directly, then layer `ConversationSimulator`." Proves the evaluation stack works before the simulation layer is added.

**Deliverables:**
- `evals/tests/test_manual_cases.py` — pytest tests with hard-coded `ConversationalTestCase` objects (turns copied from `system-prompt/test-runs.md`)
- `evals/metrics.py` — initial metric definitions (both built-in MCP metrics and 3–4 custom ConversationalGEval rubrics)

**AC:**
1. At least 3 hard-coded test cases with turns from actual manual test runs (Runs 1, 2, 3)
1a. For hard-coded test cases, `mcp_tools_called` on assistant `Turn` objects must be populated with synthetic `MCPToolCall` objects derived from the tool call blocks visible in the manual test transcripts. For example, if the transcript shows a `lookup_legislator` call with known arguments (street, zone) and result (legislator name, district), create `MCPToolCall(name="lookup_legislator", args={...}, result={...})` for that turn. This is required because built-in MCP metrics need `mcp_tools_called` to score tool usage — without it they will produce misleading zero-tool scores.
2. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) are configured with initial threshold 0.5
3. At least 3 custom ConversationalGEval metrics implemented (warm open, no-editorializing, citation format)
4. All metrics produce scores and reasons — no crashes, no empty results
5. Manual test case that's known-good (Run 2) passes all metrics; manual test case with known gap (Run 3 — Gemini skipped validation) shows lower score on validate-before-inform metric
6. Tests run via `deepeval test run` (not bare `pytest`) to verify caching and output formatting

#### Phase 2 — Story E5-4: ConversationalGolden Scenarios

**Goal:** Define eval scenarios as ConversationalGolden objects — 10–20 scenarios covering happy paths, failure modes, and edge cases.

**Deliverables:**
- `evals/goldens.py` — all ConversationalGolden definitions
- Scenarios: Deb happy path (email), Deb happy path (SMS), Marcus happy path (SMS), Marcus happy path (email), bad address, zero-result fallback, scope boundary probe, confirmation gate (ambiguous "OK"), revision loop, vague concern with redirect, multiple tool calls in sequence

**AC:**
1. Minimum 10 distinct goldens (DeepEval recommends 20 for meaningful coverage; 10 is MVP)
2. Each golden has `scenario`, `user_description`, and `expected_outcome` filled with enough detail for ConversationSimulator to generate realistic user messages
3. `user_description` includes persona emotional state, address, and communication preferences (so the simulated user provides them naturally when prompted)
4. Failure-mode goldens included: bad address (non-Utah), zero-result (legislator with no matching bills), scope boundary (voting record question)
5. Goldens are importable from `evals/goldens.py` — no JSON files, pure Python for IDE support and type checking
6. Each golden has a `tag` in `additional_metadata` for metric routing. The full tag taxonomy is:

| Tag | Scenario | Custom Metrics Applied |
| --- | -------- | ---------------------- |
| `happy-path-email` | Deb or Marcus happy path, email delivery | All 11 custom metrics |
| `happy-path-sms` | Deb or Marcus happy path, SMS delivery | All 11 except Draft Format (email-specific length check replaced with SMS check) |
| `bad-address` | Non-Utah or unresolvable address entered | Tool Parameter Correctness, Scope Boundary, Zero-Result Fallback |
| `zero-result` | Legislator found but no matching bills | Zero-Result Fallback, No-Editorializing, Confirmation Gate (skips Citation Format, Draft Format) |
| `scope-boundary` | Constituent asks about voting record | Scope Boundary, No-Editorializing (skips Draft Format, Citation Format) |
| `confirmation-gate` | Constituent responds ambiguously ("OK", "I guess") | Confirmation Gate, Validate-Before-Inform |
| `revision-loop` | Constituent requests a draft revision | Revision Loop, Citation Format, Draft Format, No-Editorializing |
| `vague-concern` | Marcus-style vague concern needing redirect | Warm Open, Validate-Before-Inform, Theme Inference, Tool Parameter Correctness |
| `multi-tool` | Conversation requires both tools in sequence | Tool Parameter Correctness, MCPTaskCompletionMetric (all built-in metrics) |
| `formal-email` | Constituent requests formal tone email | Draft Format, Citation Format, No-Editorializing |
| `conversational-sms` | Constituent requests conversational SMS | Draft Format, No-Editorializing |

#### Phase 2 — Story E5-5: Complete Metrics Suite

**Goal:** Complete all 11 custom ConversationalGEval rubrics and wire up metric routing by scenario tag.

**Deliverables:**
- `evals/metrics.py` — complete metric definitions (built-in MCP metrics + all 11 custom ConversationalGEval rubrics)
- `get_metrics_for_scenario(tag) -> list[metric]` — routes applicable metrics based on golden tag

**AC:**
1. All 11 eval dimensions have a corresponding ConversationalGEval metric
2. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) run on ALL scenarios
3. Each custom metric has `criteria`, `evaluation_steps` (3–6 steps), and uses `AnthropicModel` as judge
4. Initial thresholds set conservatively: 0.5 for all metrics (research recommends starting at 0.5, tightening to 0.7 once stable)
5. `get_metrics_for_scenario()` maps scenario tags to applicable custom metrics using the tag taxonomy table defined in Story E5-4 AC #6 (e.g., `zero-result` skips Citation Format; `scope-boundary` skips Draft Format and Citation Format; `happy-path-email` runs all 11 custom metrics)
6. Metrics are importable and composable — tests import what they need

#### Phase 2 — Story E5-6: Simulated Conversations and First Eval Run

**Goal:** Wire ConversationSimulator + model_callback + goldens + metrics. Run first automated eval.

**Deliverables:**
- `evals/tests/test_conversations.py` — pytest tests that simulate conversations and evaluate them
- `evals/tests/conftest.py` — test-level fixtures (goldens, metrics, simulator)
- Updated `evals/conftest.py` — session-scoped MCP server fixture shared across tests
- `evals/README.md` — setup and run instructions

**AC:**
1. `cd evals && deepeval test run tests/test_conversations.py` runs at least 2 conversation simulations (Deb + Marcus happy paths) end-to-end
2. Each test: creates golden → runs ConversationSimulator → gets ConversationalTestCase → evaluates with `assert_test()` using applicable metrics
3. Test output shows per-metric scores, reasons, and overall pass/fail
4. Conversation transcripts printed to stdout on failure for debugging
5. Full eval run (2 happy-path conversations, ~8 turns each) completes in under 5 minutes
6. `deepeval test run -k "deb"` runs only Deb scenarios; `-k "marcus"` runs only Marcus
7. Hyperparameters logged: `{"model": "claude-sonnet-4-6", "system_prompt": SYSTEM_PROMPT}` for regression comparison
8. `max_concurrent` set to 5 initially (conservative, avoid rate limits); `max_user_simulations=8`
9. README documents: prerequisites, env vars, how to run, how to add new scenarios/metrics, cost expectations (~$0.40–0.80/full run)

### Acceptance Criteria (Harness-Level)

1. **Isolated Python:** `evals/` has its own `pyproject.toml` and virtual environment. No changes to pnpm workspace, no TypeScript in `evals/`.
2. **Single command run:** `cd evals && deepeval test run tests/` executes the full eval suite (server lifecycle, conversation simulation, scoring).
3. **MCP server lifecycle:** Server starts automatically, health-checks, and tears down — no manual setup required.
4. **model_callback fidelity:** Claude API calls use the real `agent-instructions.md` system prompt. Tool calls are proxied to the real MCP server via HTTP. `MCPToolCall` objects tracked on every Turn. No mocks in the default test path.
5. **Dual metric coverage:** Built-in MCP metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) + all 11 custom ConversationalGEval rubrics. Each happy-path scenario evaluated by both layers.
6. **Pass rate:** Happy path scenarios (Deb email, Marcus SMS) pass all applicable metrics at their defined thresholds on 4 of 5 runs — matching the manual testing standard.
7. **Extensibility:** Adding a new scenario = adding a ConversationalGolden + tagging it. Adding a new metric = adding a definition + updating `get_metrics_for_scenario()`. No framework changes needed.
8. **No monorepo pollution:** `evals/` doesn't affect `pnpm install`, `pnpm build`, or `pnpm test` in the main workspace.
9. **Regression tracking:** Hyperparameters (model, system prompt) logged per run. `deepeval test run -c` caches unchanged evaluations.

## Additional Context

### Dependencies

**Python (entire harness):**
- `deepeval>=3.7.0` — minimum version that ships ConversationSimulator with MCPToolCall tracking, MultiTurnMCPUseMetric, MCPTaskCompletionMetric, AnthropicModel judge, and built-in MCP metrics (confirmed via PyPI and third-party registry snapshots; 3.7.0 is the earliest confirmed version containing all required components)
- `anthropic>=0.29.0` — Claude API client (model_callback SUT) + AnthropicModel judge for DeepEval metrics
- `openai` — required for default `simulator_model` (GPT-4.1 drives fake user turns)
- `httpx>=0.28.0` — async HTTP client for MCP server tool call proxying (StreamableHTTP)
- `pydantic>=2.11.7` — data validation (DeepEval dependency)
- `pytest>=8.0.0` — test runner (via `deepeval test run` wrapper)

**Infrastructure:**
- MCP server env vars: `UTAH_LEGISLATURE_API_KEY`, `UGRC_API_KEY`
- `ANTHROPIC_API_KEY` — for model_callback (SUT) and AnthropicModel judge
- `OPENAI_API_KEY` — for default `simulator_model` (GPT-4.1 fake user). Can be overridden to Anthropic but risks echo chamber.
- Node.js runtime for MCP server child process

### Testing Strategy

The eval harness IS the testing strategy — it replaces the manual test protocol from Story 4.1:

1. **Conversation simulation** via ConversationSimulator replaces human testers playing Deb/Marcus personas
2. **Automated scoring** via ConversationalGEval replaces the manual pass/fail checklist from `testing-notes.md`
3. **Pass criterion carried forward:** 4 of 5 runs passing all metrics = harness pass (same as manual protocol's "4 of 5 clean sessions")

**What's NOT tested by the harness:**
- MCP server unit tests (already covered by existing Vitest suite)
- Frontend behavior (out of scope — no web app interaction)
- Cost/latency (out of scope for this phase)

**Validation of the harness itself:**
- Compare first automated eval run results against manual test run log (`system-prompt/test-runs.md`)
- The harness should flag the same behavioral gaps found manually (e.g., Gemini skipping validation in Run 3)
- If harness scores diverge significantly from manual observations, recalibrate metric thresholds and evaluation_steps

### Notes

- Story 4.1 AC 13 originally required manual testing (4 of 5 clean sessions). This harness automates that verification.
- The `system-prompt/test-runs.md` file contains 5 manual test runs with 2 personas (Deb and Marcus) — Phase 1 uses these as hard-coded test case turns.
- Prior research doc covers DeepEval, promptfoo, and custom approaches — DeepEval selected for this phase.
- Deep-dive research doc (`technical-deepeval-conversationsimulator-research-2026-03-21.md`) is the authoritative reference for implementation details, API signatures, and risk mitigations.
- **HTTP vs stdio transport:** Research recommends stdio via Python `mcp` SDK, but our server only supports StreamableHTTP. We use `httpx` with JSON-RPC framing and `mcp-session-id` header management. This is more work than `session.call_tool()` but avoids modifying the production server.
- **model_callback signature (confirmed):** DeepEval source (confirmed via docs and PyPI v3.7+) uses `async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn`. All three parameters are required when using Variant B for MCPToolCall tracking. The `input` parameter receives the current user message string; `turns` is the prior conversation history as `List[Turn]`; `thread_id` is a string identifying the concurrent conversation for session isolation.
- **Known bug #1884:** ConversationSimulator may generate two initial user messages when `async_mode=True`. Workaround is specified in Story E5-2 AC #9: filter consecutive same-role turns in `model_callback` before building the Anthropic messages list.
- **Simulator model:** Default GPT-4.1 avoids echo chamber with Claude SUT. Can switch to Anthropic but research warns against same-model SUT + simulator.
- **Rate limits:** MCP server rate limit (60 req/min) and Anthropic API tier limits both relevant. Set `max_concurrent=5` initially; MCP rate limit shouldn't be hit with sequential tool calls per conversation.
- **Cost:** ~$0.40–0.80 per full run (20 goldens, 6 turns). Use `-c` cache flag and `max_user_simulations=3` during dev to reduce costs.
- **Threshold tuning:** Start all metrics at 0.5 (research recommendation). Tighten to 0.7 once scores stabilize. Never chase single-point scores — use score averaging over 2–3 runs.
