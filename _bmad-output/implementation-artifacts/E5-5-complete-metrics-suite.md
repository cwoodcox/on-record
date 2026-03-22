# Story E5-5: Complete Metrics Suite

Status: backlog

## Story

As a **developer running evals**,
I want all 11 domain-specific ConversationalGEval rubrics defined and wired to scenario tags,
so that every golden scenario is evaluated against the correct set of metrics automatically.

## Goal

Complete all 11 custom ConversationalGEval rubrics and wire up metric routing by scenario tag.

## Deliverables

- `evals/metrics.py` — complete metric definitions (built-in MCP metrics + all 11 custom ConversationalGEval rubrics)
- `get_metrics_for_scenario(tag: str) -> list[metric]` — routes applicable metrics based on golden tag

## Acceptance Criteria

1. All 11 eval dimensions have a corresponding ConversationalGEval metric:
   - Warm Open
   - Validate Before Inform
   - Tool Parameter Correctness
   - Theme Inference
   - Confirmation Gate
   - No-Editorializing
   - Citation Format
   - Draft Format
   - Revision Loop
   - Scope Boundary
   - Zero-Result Fallback
2. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) run on ALL scenarios
3. Each custom metric has `criteria`, `evaluation_steps` (3–6 steps), and uses `AnthropicModel` as judge
4. Initial thresholds set conservatively: 0.5 for all metrics (research recommends starting at 0.5, tightening to 0.7 once stable)
5. `get_metrics_for_scenario()` maps scenario tags to applicable custom metrics using the tag taxonomy table defined in Story E5-4 AC #6 (e.g., `zero-result` skips Citation Format; `scope-boundary` skips Draft Format and Citation Format; `happy-path-email` runs all 11 custom metrics)
6. Metrics are importable and composable — tests import what they need

## Context

**Eval Dimensions Reference:**

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

- Judge model: `AnthropicModel(model="claude-sonnet-4-6", temperature=0)` from `deepeval.models`
- Tag taxonomy is defined in Story E5-4 AC #6 — `get_metrics_for_scenario()` must implement that mapping exactly
- See tech spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` (Phase 2, Story E5-5)
