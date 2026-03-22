# Story E5-6: Simulated Conversations and First Eval Run

Status: backlog

## Story

As a **developer running evals**,
I want to wire ConversationSimulator + model_callback + goldens + metrics together and run the first automated eval,
so that I can verify the harness catches real behavioral gaps and establishes a baseline for regression comparison.

## Goal

Wire ConversationSimulator + model_callback + goldens + metrics. Run first automated eval.

## Deliverables

- `evals/tests/test_conversations.py` — pytest tests that simulate conversations and evaluate them
- `evals/tests/conftest.py` — test-level fixtures (goldens, metrics, simulator)
- Updated `evals/conftest.py` — session-scoped MCP server fixture shared across tests
- `evals/README.md` — setup and run instructions

## Acceptance Criteria

1. `cd evals && deepeval test run tests/test_conversations.py` runs at least 2 conversation simulations (Deb + Marcus happy paths) end-to-end
2. Each test: creates golden → runs ConversationSimulator → gets ConversationalTestCase → evaluates with `assert_test()` using applicable metrics
3. Test output shows per-metric scores, reasons, and overall pass/fail
4. Conversation transcripts printed to stdout on failure for debugging
5. Full eval run (2 happy-path conversations, ~8 turns each) completes in under 5 minutes
6. `deepeval test run -k "deb"` runs only Deb scenarios; `-k "marcus"` runs only Marcus
7. Hyperparameters logged: `{"model": "claude-sonnet-4-6", "system_prompt": SYSTEM_PROMPT}` for regression comparison
8. `max_concurrent` set to 5 initially (conservative, avoid rate limits); `max_user_simulations=8`
9. README documents: prerequisites, env vars, how to run, how to add new scenarios/metrics, cost expectations (~$0.40–0.80/full run)

## Context

- `ConversationSimulator` config: `simulator_model="gpt-4.1"`, `async_mode=True`
- Bug #1884 workaround is implemented in E5-2 (`model_callback` filters consecutive same-role turns)
- `max_concurrent=5` avoids hitting MCP server rate limit (60 req/min) during concurrent simulations
- Cost model: ~$0.40–0.80 per full run (20 goldens, 6 turns); use `max_user_simulations=3` during dev
- Use `deepeval test run -c` for caching — eliminates re-evaluation cost for unchanged test cases
- Validation: compare first automated run results against `system-prompt/test-runs.md` manual observations — harness should flag same gaps (e.g., Gemini skipping validation in Run 3)
- See tech spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` (Phase 2, Story E5-6)
