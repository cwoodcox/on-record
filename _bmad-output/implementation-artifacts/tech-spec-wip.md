---
title: 'Research-to-Requirements: Automated Conversation Eval Harness'
slug: 'research-to-requirements'
created: '2026-03-21'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['deepeval', 'python', 'typescript', 'anthropic-sdk', 'vitest']
files_to_modify: []
code_patterns: []
test_patterns: []
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

- MCP server uses StreamableHTTP transport (Hono 4.12.1)
- Two MCP tools: `lookup_legislator` and `search_bills` with well-defined input/output contracts
- System prompt lives at `system-prompt/agent-instructions.md` (not in apps/)
- MCP server seeds from live Utah Legislature API on startup (~3s, cheap operation)
- All shared types in `packages/types/` — `LookupLegislatorResult`, `SearchBillsResult`, `AppError`
- SQLite boundary (Boundary 4): only `apps/mcp-server/src/cache/` imports better-sqlite3

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `system-prompt/agent-instructions.md` | Finalized 4-step agent instructions (the system prompt under test) |
| `apps/mcp-server/src/index.ts` | MCP server entry point — startup, tool registration, transport |
| `apps/mcp-server/src/tools/legislator-lookup.ts` | `lookup_legislator` tool implementation |
| `apps/mcp-server/src/tools/search-bills.ts` | `search_bills` tool implementation |
| `packages/types/index.ts` | Shared type contracts (Legislator, Bill, AppError, etc.) |
| `system-prompt/test-runs.md` | Manual test run log — reference for eval scenario design |
| `system-prompt/testing-notes.md` | Expected behavior guide — reference for scoring rubrics |
| `_bmad-output/planning-artifacts/research/technical-chatbot-automated-testing-research-2026-03-16.md` | Prior research on chatbot testing frameworks |

### Technical Decisions

- **DeepEval over pure TypeScript scoring:** Pre-built metrics (faithfulness, toxicity, relevancy) + dashboard justify the Python dependency. Isolated to its own directory to avoid monorepo confusion.
- **Orchestrator in TypeScript:** Keeps MCP tool proxying in the same language as the MCP server. Can reuse type definitions from `packages/types/`.
- **Provider-agnostic LLM abstraction:** Simple interface (send messages, get response with tool calls). Claude first, Gemini and Copilot adapters next.
- **Local MCP server as child process:** No public deployment needed. Orchestrator starts the server, waits for health check, runs conversations, tears down.
- **Transcript bridge:** Orchestrator outputs conversation transcripts as JSON. Python DeepEval layer reads them for scoring. Clean cross-language boundary via filesystem.

## Implementation Plan

### Tasks

_To be filled in Step 3_

### Acceptance Criteria

_To be filled in Step 3_

## Additional Context

### Dependencies

_To be investigated in Step 2_

### Testing Strategy

_To be filled in Step 3_

### Notes

- Story 4.1 AC 13 originally required manual testing (4 of 5 clean sessions). This harness automates that verification.
- The `system-prompt/test-runs.md` file contains 5 manual test runs with 2 personas (Deb and Marcus) — these are direct templates for eval scenarios.
- Prior research doc covers DeepEval, promptfoo, and custom approaches — DeepEval selected for this phase.
