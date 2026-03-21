---
title: 'Research-to-Requirements: Automated Conversation Eval Harness'
slug: 'research-to-requirements'
created: '2026-03-21'
status: 'in-progress'
stepsCompleted: [1, 2]
tech_stack: ['python', 'deepeval', 'anthropic-sdk', 'httpx']
files_to_modify:
  - 'evals/ (new directory — isolated Python eval harness)'
  - 'evals/metrics/ (new — custom ConversationalGEval rubrics)'
  - 'evals/goldens/ (new — ConversationalGolden scenario definitions)'
  - 'evals/tests/ (new — pytest test files that run simulations + scoring)'
  - 'evals/chatbot.py (new — model_callback wrapping Claude API + MCP HTTP proxy)'
  - 'evals/mcp_client.py (new — httpx client for MCP server tool calls)'
  - 'evals/server.py (new — MCP server lifecycle: spawn, health-check, teardown)'
code_patterns:
  - 'MCP StreamableHTTP: POST /mcp with mcp-session-id header for session management'
  - 'Health check: GET /health → { status: "ok", service: "on-record-mcp-server" }'
  - 'DeepEval ConversationSimulator drives conversation via model_callback'
  - 'ConversationalGolden defines persona scenarios (Deb, Marcus) with expected_outcome'
  - 'model_callback: Claude API call → tool_use → HTTP POST to MCP server → feed result back → return Turn'
  - 'ConversationalGEval with custom evaluation_steps for rubric-based scoring'
  - 'AnthropicModel as judge model for DeepEval metrics'
test_patterns:
  - 'Persona-based scenarios: Deb (specific concern) and Marcus (vague concern)'
  - '10+ eval dimensions: warm open, validate-before-inform, tool params, theme inference, confirmation gate, no-editorializing, citation format, revision loop, scope boundary'
  - 'Tiered evaluation: deterministic checks first (JSON schema, tool call structure), LLM-as-judge second'
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
3. **model_callback** wraps the full pipeline: sends user input to Claude API with the system prompt, handles tool calls by proxying them to the local MCP server via HTTP, feeds results back, and returns the final assistant Turn.
4. **ConversationalGEval metrics** score the resulting transcripts on tone, citation format, editorializing, confirmation gates, etc.

No TypeScript orchestrator. No transcript bridge. DeepEval drives the conversation AND scores it — single tool, single language.

### Scope

**In Scope:**
- DeepEval ConversationSimulator with model_callback wrapping Claude API + MCP HTTP proxy
- ConversationalGolden scenarios for happy path, bad address, no bills found, vague concern, scope boundary
- Custom ConversationalGEval rubrics for all 11 eval dimensions
- MCP server lifecycle management (spawn as child process, health-check, teardown)
- Isolated Python directory within the monorepo

**Out of Scope:**
- CI pipeline integration / gating
- Promptfoo integration
- Performance benchmarks / latency tracking
- Cost tracking per eval run
- Public MCP server deployment
- TypeScript orchestrator (eliminated — DeepEval handles orchestration)

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
| `system-prompt/agent-instructions.md` | Finalized 4-step agent instructions — the system prompt under test |
| `system-prompt/testing-notes.md` | Expected behavior guide — reference for scoring rubrics |
| `system-prompt/test-runs.md` | Manual test run log (5 runs, 2 personas) — templates for eval scenarios |
| `apps/mcp-server/src/index.ts` | MCP server entry point — startup, route handlers, session management |
| `apps/mcp-server/src/env.ts` | Environment validation schema (PORT, API keys) |
| `apps/mcp-server/src/tools/legislator-lookup.ts` | `lookup_legislator` tool implementation |
| `apps/mcp-server/src/tools/search-bills.ts` | `search_bills` tool implementation |
| `packages/types/index.ts` | Shared type contracts (Legislator, Bill, AppError, etc.) |
| `_bmad-output/planning-artifacts/research/technical-chatbot-automated-testing-research-2026-03-16.md` | Prior research on chatbot testing frameworks |

### Technical Decisions

- **All-Python architecture:** DeepEval's ConversationSimulator drives conversations AND scores them. Eliminates the TypeScript orchestrator, transcript bridge, and cross-language boundary. The MCP server is just an HTTP endpoint — Python calls it with `httpx`.
- **ConversationSimulator over custom orchestrator:** DeepEval handles user message generation, turn management, stopping criteria (via `expected_outcome`), and feeds directly into ConversationalGEval scoring. No glue code needed.
- **model_callback as the integration point:** Single async function that wraps Claude API + MCP tool proxying. This is the only custom code that touches the LLM — everything else is DeepEval configuration.
- **Local MCP server as child process:** Python `subprocess.Popen` starts the Node server, polls `GET /health` until ready, tears down after eval run.
- **httpx for MCP tool proxying:** Lightweight async HTTP client. The model_callback intercepts Claude's `tool_use` blocks, sends them as HTTP POST to `localhost:3001/mcp`, and feeds results back to Claude as `tool_result` messages.
- **Tiered evaluation cascade:** Deterministic checks first (tool call structure, address parsing, draft format). LLM-as-judge (ConversationalGEval) only for subjective quality dimensions (tone, editorializing, acknowledgment quality).

### Architecture

```
ConversationalGolden                    MCP Server (child process)
  scenario: "Deb, education cuts"       localhost:3001/mcp
  user_description: "upset parent"          ↑
  expected_outcome: "draft email"           │ HTTP POST (tool calls)
        ↓                                   │
ConversationSimulator                       │
  simulator_model: Claude (user sim)        │
        ↓ generates user message            │
  model_callback(input, turns) ─────→ Claude API ──→ tool_use?
        ↑                              ↓              yes → httpx POST /mcp
        │                         Turn(assistant)     ← tool_result
        │                              ↓              no → return Turn
        ↓
ConversationalTestCase (full transcript)
        ↓
ConversationalGEval metrics (score it)
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

**ConversationSimulator + model_callback:**
```python
from deepeval.test_case import Turn
from deepeval.simulator import ConversationSimulator
from deepeval.dataset import ConversationalGolden

golden = ConversationalGolden(
    scenario="Constituent upset about education funding cuts contacts chatbot for help writing to legislator.",
    expected_outcome="Chatbot produces a draft email to the constituent's state legislator citing a relevant sponsored bill.",
    user_description="Deb, a parent in Herriman UT whose daughter's school lost 3 teachers due to budget cuts.",
)

async def model_callback(input: str, turns: list[Turn]) -> Turn:
    # 1. Build messages from turns + new input
    # 2. Call Claude API with system prompt from agent-instructions.md
    # 3. If tool_use in response → POST to localhost:3001/mcp → feed result back
    # 4. Return Turn(role="assistant", content=final_response)
    ...

simulator = ConversationSimulator(
    model_callback=model_callback,
    simulator_model=AnthropicModel(model="claude-sonnet-4-6"),  # simulates user
)
test_cases = simulator.simulate(conversational_goldens=[golden])
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
    threshold=0.8
)
```

## Implementation Plan

### Tasks

_To be filled in Step 3_

### Acceptance Criteria

_To be filled in Step 3_

## Additional Context

### Dependencies

**Python (entire harness):**
- `deepeval>=1.0.0` — ConversationSimulator + ConversationalGEval + dashboard
- `anthropic>=0.29.0` — Claude API client (model_callback) + judge model for DeepEval
- `httpx>=0.28.0` — async HTTP client for MCP server tool call proxying
- `pydantic>=2.11.7` — data validation (DeepEval dependency)
- `pytest>=8.0.0` — test runner

**Infrastructure:**
- MCP server env vars: `UTAH_LEGISLATURE_API_KEY`, `UGRC_API_KEY`
- LLM API key: `ANTHROPIC_API_KEY` (for model_callback, user simulation, and judge)
- Node.js runtime for MCP server child process

### Testing Strategy

_To be filled in Step 3_

### Notes

- Story 4.1 AC 13 originally required manual testing (4 of 5 clean sessions). This harness automates that verification.
- The `system-prompt/test-runs.md` file contains 5 manual test runs with 2 personas (Deb and Marcus) — direct templates for eval scenarios.
- Prior research doc covers DeepEval, promptfoo, and custom approaches — DeepEval selected for this phase.
- Rate limit (60 req/min) shouldn't be an issue for eval runs since conversations are sequential within a simulation, but worth noting for `max_concurrent` tuning.
- `simulator_model` can use Claude to simulate realistic user behavior (personas with emotional context, vague language, etc.) rather than defaulting to GPT-4.1.
- Known DeepEval issue: ConversationSimulator may generate two initial user messages instead of one (GitHub #1884). Monitor and work around if needed.
