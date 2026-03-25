# Story E5.3: Manual Test Cases to Validate Metrics

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer running evals**,
I want a `test_manual_cases.py` file with hard-coded `ConversationalTestCase` objects built from actual manual test transcripts, plus an initial `metrics.py` with built-in MCP metrics and custom `ConversationalGEval` rubrics,
so that I can validate the complete DeepEval scoring stack works end-to-end before adding simulation complexity in E5-4.

## Acceptance Criteria

1. At least 3 hard-coded test cases with turns from actual manual test runs (Runs 1, 2, 3 from the manual test log).
2. `mcp_tools_called` on all assistant `Turn` objects that made tool calls must be populated with synthetic `MCPToolCall` objects derived from tool call blocks visible in the transcript files. Built-in MCP metrics score tool usage via `mcp_tools_called` — without it they produce misleading zero-tool scores.
3. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) configured with `threshold=0.5` and `AnthropicModel` as their `model`.
4. At least 3 custom `ConversationalGEval` metrics implemented: **Warm Open**, **No-Editorializing**, and **Validate Before Inform**. Each has `criteria`, `evaluation_steps` (3–6 steps), `model=judge`, and `threshold=0.5`.
5. All metrics produce scores and reasons — no crashes, no empty score fields, no `None` score values.
6. Test for Run 2 (Marcus/Claude, bill found — the known-good run) asserts all applicable metrics pass. Test for Run 3 (Deb/Gemini, validate-before-inform gap) captures the Validate Before Inform metric score and asserts it is below the threshold (`< 0.5`) — confirming the harness detects this known behavioral gap.
7. Tests execute via `deepeval test run tests/test_manual_cases.py` (not bare `pytest`) and produce metric scores + reasons in output. Caching flag (`-c`) confirmed to skip re-evaluation when re-run with unchanged test cases.

**Key phrases for error path assertions (AC 6 — if using score assertions with toContain equivalent):**
- Validate-before-inform gap detection: score `< 0.5`
- No metric result crash: assert `score is not None` and is a float

## Tasks / Subtasks

- [ ] Task 1: Create `evals/metrics.py` (AC: 3, 4, 5)
  - [ ] Import and instantiate `AnthropicModel(model="claude-sonnet-4-6", temperature=0)` as `judge`
  - [ ] Instantiate all 4 built-in metrics with `threshold=0.5` and `model=judge`:
    - `MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`
  - [ ] Define `warm_open_metric`: ConversationalGEval with criteria checking that the first assistant turn opens with a question about the constituent's concern — NOT an address request or a category menu
  - [ ] Define `no_editorializing_metric`: ConversationalGEval checking that the assistant never claims legislator intent/motivation; all legislative claims are grounded in bill sponsorship data
  - [ ] Define `validate_before_inform_metric`: ConversationalGEval checking that the assistant shows substantive emotional acknowledgment BEFORE pivoting to address/legislator lookup
  - [ ] Export all metrics as module-level names for import in tests

- [ ] Task 2: Create `evals/tests/test_manual_cases.py` (AC: 1, 2, 5, 6, 7)
  - [ ] Read transcripts at `../on-record-test/test 1/conversation 1.txt` (Run 1 — Deb/Claude/zero-result), `conversation 2.txt` (Run 2 — Marcus/Claude/bill found), `conversation 3.txt` (Run 3 — Deb/Gemini/validate gap) to extract exact turn content and tool call args/results
  - [ ] Build Turn objects for each run (see Dev Notes for structure and transcript data summary)
  - [ ] Populate `mcp_tools_called` on every assistant Turn that invoked a tool with `MCPToolCall(name=..., args=..., result=CallToolResult(content=[TextContent(type="text", text=<json_string>)], isError=False))`
  - [ ] Wrap each run's turns in a `ConversationalTestCase(turns=[...])`
  - [ ] `test_run2_passes_all_applicable_metrics`: call `assert_test(run2_case, [all_metrics_from_metrics_py])` — should pass cleanly
  - [ ] `test_run3_validate_gap_detected`: use `evaluate(test_cases=[run3_case], metrics=[validate_before_inform_metric])` and assert `result.test_results[0].metrics_data[0].score < 0.5`
  - [ ] `test_all_metrics_produce_scores`: use `evaluate(test_cases=[run1_case, run2_case, run3_case], metrics=[...all metrics...])` and assert no result has a `None` score field (AC 5 — no crashes)
  - [ ] Do NOT add `mcp_server` fixture dependency — manual test cases do not need a live MCP server
  - [ ] Validate that `ANTHROPIC_API_KEY` is set at test module load time and skip (not fail) if absent

## Dev Notes

### Architecture Context

This story sits between E5-2 (model_callback completed, proven working) and E5-4 (ConversationalGolden + ConversationSimulator). The goal is proving the *scoring stack* works — not the simulation stack. No `model_callback`, no live server, no API calls to the chatbot LLM.

```
Manual test transcripts (../on-record-test/test 1/conversation N.txt)
  ↓ read and parse turns by hand
ConversationalTestCase(turns=[Turn(role=..., content=..., mcp_tools_called=[...])])
  ↓
evaluate() / assert_test()
  ↓
metrics (AnthropicModel judge calls Anthropic API to score)
  ↓
scores + reasons per metric
```

Only external dependency: `ANTHROPIC_API_KEY` for the `AnthropicModel` judge.

### DeepEval API — Exact Imports (Verified from E5-2 Implementation)

```python
# Confirmed working in this codebase:
from deepeval.test_case import MCPToolCall, Turn

# ConversationalTestCase — expected import (verify against deepeval source at venv):
from deepeval.test_case import ConversationalTestCase
# If that fails, try:
# from deepeval.test_case.conversational_test_case import ConversationalTestCase

# For evaluation:
from deepeval import evaluate, assert_test

# Metrics:
from deepeval.metrics import (
    ConversationalGEval,
    MultiTurnMCPUseMetric,
    MCPTaskCompletionMetric,
    KnowledgeRetentionMetric,
    ConversationCompletenessMetric,
)
from deepeval.models import AnthropicModel

# For MCPToolCall result construction (same pattern as test_chatbot.py):
from mcp.types import CallToolResult, TextContent
```

### MCPToolCall Construction Pattern

Use the same pattern as `test_chatbot.py` (confirmed working):

```python
MCPToolCall(
    name="lookup_legislator",
    args={"street": "12997 Summerharvest", "zone": "Draper"},
    result=CallToolResult(
        content=[TextContent(type="text", text='{"legislators": [...], "session": "2026GS", "resolvedAddress": "..."}')],
        isError=False,
    ),
)
```

The `result` field must be a `CallToolResult`, not a plain dict or string. The `args` field is a dict. See `evals/providers/anthropic_provider.py` lines 99–109 for the production construction pattern.

### Transcript Data Summary — Extracted Tool Calls

Read the full transcripts at `../on-record-test/test 1/conversation N.txt` to get exact turn content. Key tool call data extracted from review:

**Run 1 — Deb / Claude Sonnet 4.6 / Zero-Result Path:**
- `lookup_legislator(street="742 Evergreen Terrace", zone="Salt Lake")` → legislators: Grant Amjad Miller (house, D24) + Jen Plumb (PLUMBJ, senate, D9); resolvedAddress visible in transcript
- `search_bills(legislatorId="PLUMBJ", theme="public education funding")` → bills: []
- `search_bills(legislatorId="PLUMBJ", theme="arts education")` → bills: []
- `search_bills(legislatorId="PLUMBJ", theme="teacher staffing")` → bills: []
- No bill cited. Email draft produced to jplumb@le.utah.gov. Revised with constituent name "Deb".
- Behavioral notes: ✅ Warm open (asked about daughter's situation), ✅ Validate (deep empathy about art teacher before pivoting to address), ✅ Tool params correct

**Run 2 — Marcus / Claude Sonnet 4.6 / Bill Found (Known Good):**
- `lookup_legislator(street="12997 Summerharvest", zone="Draper")` → legislators: Calvin Roberts (ROBERC, house, D46) + Kirk A. Cullimore (senate, D19)
- `search_bills(legislatorId="ROBERC", theme="transit housing cost of living")` → bills: []
- `search_bills(legislatorId="ROBERC", theme="housing affordability")` → bills: []
- `search_bills(legislatorId="ROBERC", theme="transportation")` → bills: [HB 586 Transportation Funding Amendments (2026GS, filed in House), HB 471 Transportation Procurement Amendments (2025GS, signed by Governor)]
- SMS draft produced citing HB 586 with citation: "(HB 586, 2026 General Session, currently filed in House)"
- Revised with constituent name "Marcus" and offer to help move bill forward.
- Behavioral notes: ✅ All behavioral checks pass. This is the known-good reference case.

**Run 3 — Deb / Gemini Flash 2.5 / Validate-Before-Inform Gap:**
- `lookup_legislator(street="6856 W Windy Ridge Dr", zone="84096")` → legislators: Candice B. Pierucci (PIERUC, house, D49) + Emily Buss (senate, D11); resolvedAddress: "6856 W WINDY RIDGE DR, SALT LAKE CITY"
- Multiple `search_bills(legislatorId="PIERUC", theme=...)` calls — extract exact args and results from conversation 3.txt
- Behavioral notes: ✅ Warm open, ❌ Validate-before-inform FAILED — after user said "I'm upset about education cuts", Gemini gave brief acknowledgment then immediately requested address instead of asking follow-up questions to understand concern more deeply. Exact Gemini response: "Losing teachers from your daughter's school—that's not just a budget line, that's your family's daily life. It sounds incredibly stressful to see that kind of impact firsthand. To find your specific representatives so we can address this, I'll need your address—just the street address and city or ZIP is fine."

### Metric Definitions — ConversationalGEval Template

```python
judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)

warm_open_metric = ConversationalGEval(
    name="Warm Open",
    criteria="Evaluate whether the assistant opens with a question about the constituent's concern — not a request for their address and not a category menu of issues.",
    evaluation_steps=[
        "Check the first assistant turn in the conversation.",
        "Verify it asks an open-ended question about what's on the constituent's mind, not their address.",
        "Penalize if the first assistant turn requests an address or location.",
        "Penalize if the first assistant turn presents a list of issue categories.",
        "Award full score if the opening question is about the constituent's concern or situation.",
    ],
    model=judge,
    threshold=0.5,
)

validate_before_inform_metric = ConversationalGEval(
    name="Validate Before Inform",
    criteria="Evaluate whether the assistant provides substantive emotional acknowledgment of the constituent's concern before transitioning to information gathering (address, legislator lookup).",
    evaluation_steps=[
        "Identify the transition point where the assistant first asks for the constituent's address.",
        "Examine all assistant turns before that transition point.",
        "Check whether the assistant asked at least one follow-up question about the constituent's situation or expressed specific empathy tied to their stated concern.",
        "Penalize if the assistant immediately requested the address after the first user message with only a minimal acknowledgment (one sentence or fewer).",
        "Award full score if at least one exchange occurred validating the constituent's concern before transitioning to the informational task.",
    ],
    model=judge,
    threshold=0.5,
)

no_editorializing_metric = ConversationalGEval(
    name="No Editorializing",
    criteria="Evaluate whether the assistant avoids characterizing legislator intent, motivation, or positions. All legislative claims should be grounded in bill sponsorship data only.",
    evaluation_steps=[
        "Scan each assistant turn for language about legislators' views or motivations.",
        "Check that all claims about legislators are grounded in bill sponsorship, bill status, or factual data from tool results.",
        "Penalize phrases like 'clearly doesn't care', 'opposed to', 'has shown' when expressing intent.",
        "Allow factual statements: 'sponsored HB 42', 'bill passed 45-30', 'currently filed in House'.",
        "Penalize speculation about what a legislator 'wants' or 'believes' without data backing.",
    ],
    model=judge,
    threshold=0.5,
)
```

### test_manual_cases.py Structure Pattern

```python
import os
import pytest
from deepeval import assert_test, evaluate
from deepeval.test_case import ConversationalTestCase, MCPToolCall, Turn
from mcp.types import CallToolResult, TextContent

# Skip all tests if judge API key absent
if not os.environ.get("ANTHROPIC_API_KEY"):
    pytest.skip("ANTHROPIC_API_KEY not set — skipping metric evaluation tests", allow_module_level=True)

# Import metrics from metrics.py
from metrics import (
    warm_open_metric,
    validate_before_inform_metric,
    no_editorializing_metric,
    mtp_use_metric,       # MultiTurnMCPUseMetric
    task_completion_metric,  # MCPTaskCompletionMetric
    knowledge_retention_metric,
    conversation_completeness_metric,
)

# --- Build test cases ---
# (hard-coded turns from transcripts; see Dev Notes for data)

run2_case = ConversationalTestCase(turns=[
    Turn(role="user", content="hi!"),
    Turn(role="assistant", content="Hi there!..."),
    # ... all turns from conversation 2.txt
    Turn(
        role="assistant",
        content="...<search response>...",
        mcp_tools_called=[
            MCPToolCall(
                name="lookup_legislator",
                args={"street": "12997 Summerharvest", "zone": "Draper"},
                result=CallToolResult(content=[TextContent(type="text", text='...')], isError=False),
            ),
        ],
    ),
    # ... remaining turns
])

# --- Tests ---

ALL_METRICS = [
    mtp_use_metric, task_completion_metric, knowledge_retention_metric,
    conversation_completeness_metric, warm_open_metric,
    validate_before_inform_metric, no_editorializing_metric,
]

def test_run2_passes_all_applicable_metrics():
    assert_test(run2_case, ALL_METRICS)

def test_run3_validate_gap_detected():
    results = evaluate(test_cases=[run3_case], metrics=[validate_before_inform_metric])
    score = results.test_results[0].metrics_data[0].score
    assert score is not None, "validate_before_inform_metric returned None score"
    assert score < 0.5, f"Expected Gemini Run 3 to fail validate-before-inform (score={score})"

def test_all_metrics_produce_scores():
    results = evaluate(test_cases=[run1_case, run2_case, run3_case], metrics=ALL_METRICS)
    for test_result in results.test_results:
        for metric_data in test_result.metrics_data:
            assert metric_data.score is not None, f"Metric {metric_data.name} returned None score"
```

### Running the Tests

```bash
# From evals/ directory — NOT bare pytest
cd evals
deepeval test run tests/test_manual_cases.py

# Verbose output:
deepeval test run tests/test_manual_cases.py -v

# Re-run with cache (skips re-evaluation of unchanged cases):
deepeval test run tests/test_manual_cases.py -c
```

### Do NOT Use `mcp_server` Fixture

Manual test cases do not call `model_callback` and do not connect to the MCP server. Do not import or depend on the `mcp_server` or `mcp_client_factory` fixtures from `conftest.py`. The only live API call is the `AnthropicModel` judge scoring the transcripts.

### Environment Variables Required for This Story

| Variable | Purpose | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | AnthropicModel judge for all metric scoring | YES |
| `EVAL_LLM_PROVIDER` | NOT needed — no model_callback in this story | No |
| `UTAH_LEGISLATURE_API_KEY` | NOT needed — no live MCP server | No |
| `UGRC_API_KEY` | NOT needed — no live MCP server | No |

### References

- Tech-spec: `_bmad-output/implementation-artifacts/tech-spec-eval-harness.md` — Phase 1 Story E5-3 (lines 293–310), Eval Dimensions table, DeepEval Integration Details
- DeepEval research: `_bmad-output/planning-artifacts/research/technical-deepeval-conversationsimulator-research-2026-03-21.md` — metric selection guide, ConversationalGEval rubric examples
- Manual test run log: `system-prompt/test-runs.md` — run summaries, behavioral gaps per run
- Conversation transcripts: `../on-record-test/test 1/conversation 1.txt` (Run 1), `conversation 2.txt` (Run 2), `conversation 3.txt` (Run 3)
- MCPToolCall construction pattern: `evals/providers/anthropic_provider.py` lines 99–109, `evals/tests/test_chatbot.py` `_make_mcp_calls` helper (lines 21–32)
- E5-2 story (done): `_bmad-output/implementation-artifacts/E5-2-mcp-http-client-and-model-callback.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `evals/metrics.py` (new)
- `evals/tests/test_manual_cases.py` (new)
