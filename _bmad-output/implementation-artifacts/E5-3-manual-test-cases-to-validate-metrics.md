# Story E5-3: Manual Test Cases to Validate Metrics

Status: backlog

## Story

As a **developer running evals**,
I want hard-coded `ConversationalTestCase` objects with turns from real manual test sessions,
so that I can validate the metrics stack works correctly before adding ConversationSimulator complexity.

## Goal

Write 3–5 `ConversationalTestCase` objects with hard-coded turns (from manual test run transcripts). Validate that metrics score as expected before adding simulation complexity.

**Rationale (from research):** "Start with `evaluate()` directly, then layer `ConversationSimulator`." Proves the evaluation stack works before the simulation layer is added.

## Deliverables

- `evals/tests/test_manual_cases.py` — pytest tests with hard-coded `ConversationalTestCase` objects (turns copied from `system-prompt/test-runs.md`)
- `evals/metrics.py` — initial metric definitions (both built-in MCP metrics and 3–4 custom ConversationalGEval rubrics)

## Acceptance Criteria

1. At least 3 hard-coded test cases with turns from actual manual test runs (Runs 1, 2, 3)
1a. For hard-coded test cases, `mcp_tools_called` on assistant `Turn` objects must be populated with synthetic `MCPToolCall` objects derived from the tool call blocks visible in the manual test transcripts. For example, if the transcript shows a `lookup_legislator` call with known arguments (street, zone) and result (legislator name, district), create `MCPToolCall(name="lookup_legislator", args={...}, result={...})` for that turn. This is required because built-in MCP metrics need `mcp_tools_called` to score tool usage — without it they will produce misleading zero-tool scores.
2. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) are configured with initial threshold 0.5
3. At least 3 custom ConversationalGEval metrics implemented (warm open, no-editorializing, citation format)
4. All metrics produce scores and reasons — no crashes, no empty results
5. Manual test case that's known-good (Run 2) passes all metrics; manual test case with known gap (Run 3 — Gemini skipped validation) shows lower score on validate-before-inform metric
6. Tests run via `deepeval test run` (not bare `pytest`) to verify caching and output formatting

## Context

- Source transcripts: `system-prompt/test-runs.md` (5 runs, 2 personas: Deb and Marcus)
- `system-prompt/testing-notes.md` contains the expected behavior guide — reference for rubric criteria
- Use `MCPToolCall(name, args, result)` from `deepeval.test_case` to populate tool call records on turns
- Built-in MCP metrics require `mcp_tools_called` on Turn objects — synthetic MCPToolCall objects derived from transcript tool call blocks are acceptable for Phase 1 manual cases
- See tech spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` (Phase 1, Story E5-3)
