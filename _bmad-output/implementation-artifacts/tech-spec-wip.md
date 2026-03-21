---
title: 'Research-to-Requirements: Automated Conversation Eval Harness'
slug: 'research-to-requirements'
created: '2026-03-21'
status: 'in-progress'
stepsCompleted: [1, 2]
tech_stack: ['typescript', 'python', 'deepeval', 'anthropic-sdk', '@anthropic-ai/sdk', 'hono', '@modelcontextprotocol/sdk']
files_to_modify:
  - 'evals/ (new directory — isolated Python + TypeScript eval harness)'
  - 'evals/orchestrator/ (new — TypeScript conversation driver)'
  - 'evals/scoring/ (new — Python DeepEval metrics and test cases)'
  - 'evals/scenarios/ (new — JSON conversation scenario definitions)'
  - 'evals/transcripts/ (new — generated conversation transcripts, gitignored)'
code_patterns:
  - 'MCP StreamableHTTP: POST /mcp with mcp-session-id header for session management'
  - 'Health check: GET /health → { status: "ok", service: "on-record-mcp-server" }'
  - 'Provider abstraction: interface with sendMessage() returning response + tool_calls'
  - 'Transcript bridge: TS orchestrator writes JSON → Python DeepEval reads for scoring'
  - 'DeepEval ConversationalTestCase with Turn objects (role + content)'
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

Build a provider-agnostic conversation evaluation harness with two components:

1. **TypeScript orchestrator** — drives multi-turn LLM conversations against a live local MCP server, intercepting tool calls and proxying them to the MCP server's StreamableHTTP transport.
2. **DeepEval scoring layer** (Python, isolated to its own directory) — receives completed conversation transcripts and scores them on correctness, tone, format compliance, and error handling using both pre-built metrics and custom G-Eval rubrics.

Claude API first, with a provider abstraction that supports Gemini free tier and Copilot.

### Scope

**In Scope:**
- Provider-agnostic LLM client abstraction (Claude first, Gemini/Copilot ready)
- Multi-turn conversation orchestrator that proxies MCP tool calls to local server
- Eval scenarios: happy path through 4-step flow, bad address, no bills found, tone/no-editorializing, citation format
- DeepEval scoring with custom rubrics for conversation quality
- Local execution (MCP server started as child process)
- Isolated Python directory within the monorepo for DeepEval

**Out of Scope:**
- CI pipeline integration / gating
- Promptfoo integration
- Performance benchmarks / latency tracking
- Cost tracking per eval run
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
| `system-prompt/agent-instructions.md` | Finalized 4-step agent instructions — the system prompt under test |
| `system-prompt/testing-notes.md` | Expected behavior guide — reference for scoring rubrics |
| `system-prompt/test-runs.md` | Manual test run log (5 runs, 2 personas) — templates for eval scenarios |
| `apps/mcp-server/src/index.ts` | MCP server entry point — startup, route handlers, session management |
| `apps/mcp-server/src/env.ts` | Environment validation schema (PORT, API keys) |
| `apps/mcp-server/src/tools/legislator-lookup.ts` | `lookup_legislator` MCP tool implementation |
| `apps/mcp-server/src/tools/search-bills.ts` | `search_bills` MCP tool implementation |
| `packages/types/index.ts` | Shared type contracts (Legislator, Bill, AppError, etc.) |
| `_bmad-output/planning-artifacts/research/technical-chatbot-automated-testing-research-2026-03-16.md` | Prior research on chatbot testing frameworks |

### Technical Decisions

- **DeepEval over pure TypeScript scoring:** Pre-built metrics (faithfulness, toxicity, relevancy) + dashboard justify the Python dependency. Isolated to `evals/scoring/` to avoid monorepo confusion.
- **Orchestrator in TypeScript:** Keeps MCP tool proxying in the same language as the MCP server. Can reuse type definitions from `packages/types/`.
- **Provider-agnostic LLM abstraction:** Simple interface (`sendMessage()` returning response + tool_calls). Claude first via `@anthropic-ai/sdk`, Gemini and Copilot adapters next.
- **Local MCP server as child process:** No public deployment needed. Orchestrator starts the server, waits for health check (`GET /health`), runs conversations, tears down.
- **Transcript bridge:** Orchestrator outputs conversation transcripts as JSON files to `evals/transcripts/`. Python DeepEval layer reads them for scoring. Clean cross-language boundary via filesystem.
- **Tiered evaluation cascade:** Deterministic checks first (tool call structure, JSON schema, address parsing). LLM-as-judge (ConversationalGEval) only for subjective quality dimensions (tone, editorializing, acknowledgment quality).

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

**ConversationalTestCase API:**
```python
from deepeval.test_case import Turn, ConversationalTestCase
test_case = ConversationalTestCase(
    turns=[Turn(role="user", content="..."), Turn(role="assistant", content="...")],
    scenario="Description of conversation context",
    expected_outcome="What should happen"
)
```

**Custom rubrics via ConversationalGEval:**
```python
from deepeval.metrics import ConversationalGEval
from deepeval.models import AnthropicModel

judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)
metric = ConversationalGEval(
    name="No Editorializing",
    criteria="Evaluate whether the assistant avoids characterizing legislator intent or motivation.",
    evaluation_steps=["Scan for subjective language...", "Check factual grounding..."],
    model=judge,
    threshold=0.8
)
```

**Minimal Python dependencies:** `deepeval>=1.0.0`, `anthropic>=0.29.0`, `pydantic>=2.11.7`

## Implementation Plan

### Tasks

_To be filled in Step 3_

### Acceptance Criteria

_To be filled in Step 3_

## Additional Context

### Dependencies

**TypeScript (orchestrator):**
- `@anthropic-ai/sdk` — Claude API client (provider-agnostic wrapper on top)
- `packages/types` — reuse existing type contracts
- MCP server already built — started as child process

**Python (scoring):**
- `deepeval>=1.0.0` — evaluation framework with ConversationalGEval
- `anthropic>=0.29.0` — Claude as judge model for DeepEval
- `pydantic>=2.11.7` — data validation (DeepEval dependency)

**Infrastructure:**
- MCP server env vars: `UTAH_LEGISLATURE_API_KEY`, `UGRC_API_KEY`
- LLM API key: `ANTHROPIC_API_KEY` (for both orchestrator and judge)

### Testing Strategy

_To be filled in Step 3_

### Notes

- Story 4.1 AC 13 originally required manual testing (4 of 5 clean sessions). This harness automates that verification.
- The `system-prompt/test-runs.md` file contains 5 manual test runs with 2 personas (Deb and Marcus) — direct templates for eval scenarios.
- Prior research doc covers DeepEval, promptfoo, and custom approaches — DeepEval selected for this phase.
- Rate limit (60 req/min) shouldn't be an issue for eval runs since each conversation is sequential, but worth noting for parallel execution later.
- The orchestrator needs to read `system-prompt/agent-instructions.md` at runtime to inject as the LLM's system prompt.
