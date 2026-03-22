# Story E5-4: ConversationalGolden Scenarios

Status: backlog

## Story

As a **developer running evals**,
I want a set of ConversationalGolden scenario definitions covering happy paths, failure modes, and edge cases,
so that ConversationSimulator can drive realistic conversations across the full behavioral envelope of the chatbot.

## Goal

Define eval scenarios as ConversationalGolden objects — 10–20 scenarios covering happy paths, failure modes, and edge cases.

## Deliverables

- `evals/goldens.py` — all ConversationalGolden definitions
- Scenarios: Deb happy path (email), Deb happy path (SMS), Marcus happy path (SMS), Marcus happy path (email), bad address, zero-result fallback, scope boundary probe, confirmation gate (ambiguous "OK"), revision loop, vague concern with redirect, multiple tool calls in sequence

## Acceptance Criteria

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

## Context

**Personas (from `system-prompt/test-runs.md`):**

| Persona | Input | Address | Expected Theme |
| ------- | ----- | ------- | -------------- |
| Deb | "I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers." | 6856 W Windy Ridge Dr, Herriman UT 84096 | public education funding |
| Marcus | "Things just feel wrong lately. Like my neighbors are struggling and I don't know why." | 12997 Summerharvest Dr, Draper | economic hardship / housing / unemployment |

- Tags are consumed by `get_metrics_for_scenario()` in `evals/metrics.py` (Story E5-5)
- Use `additional_metadata={"tag": "<tag-string>"}` on each `ConversationalGolden`
- See tech spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` (Phase 2, Story E5-4)
