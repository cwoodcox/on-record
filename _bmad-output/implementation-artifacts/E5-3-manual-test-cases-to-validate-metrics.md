# Story E5-3: Manual Test Cases to Validate Metrics

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer building the eval harness**,
I want a set of hard-coded `ConversationalTestCase` objects with turns sourced from synthesized transcripts,
so that I can validate that DeepEval metrics score correctly before adding simulation complexity.

## Acceptance Criteria

1. At least 3 hard-coded test cases with turns drawn from the synthesized transcripts in `evals/synthesis-outputs/`. Best transcripts are the `claude-sonnet-4-6` ones. Three required cases:
   - **Case 1** (happy path, bill found, email): Jordan/Park — housing affordability, full flow through draft generation and one revision. Source: `evals/synthesis-outputs/01-happy-path-email-casual/claude-sonnet-4-6-20260326-215705.md`.
   - **Case 2** (happy path, SMS): Ty/Sorensen — air quality / asthma, full flow through SMS draft and one revision. Source: `evals/synthesis-outputs/02-happy-path-sms-casual/claude-sonnet-4-6-20260326-215742.md`.
   - **Case 3** (zero-result fallback + full flow without citation): Sarah/Rivera — teen mental health, two failed searches, proceeds to draft without a bill reference. Source: `evals/synthesis-outputs/04-zero-result-fallback/claude-sonnet-4-6-20260326-215846.md`.

1a. **Critical structural requirement — two-turn split for MCP calls:** Each MCP tool call must be its own assistant turn. The turn that contains `mcp_tools_called` must have:
   - `mcp_tools_called` containing exactly one `MCPToolCall` (one tool per turn), unless turns were genuinely parallel — treat each as sequential.
   - `content` set to a brief human-readable descriptor of what the agent is doing (e.g. `"Looking up your address..."`, `"Searching for air quality bills sponsored by Rep. Sorensen..."`). Do NOT use empty string.
   - The assistant's reply to the user is always a **separate subsequent turn** with NO `mcp_tools_called` parameter (omit entirely — do not pass `mcp_tools_called=None`). Do NOT combine an MCP tool call and a user-facing response in the same turn.
   - This two-turn structure is required for `MultiTurnMCPUseMetric` to score correctly — `_get_tasks()` silently skips unit interactions with ≤ 2 turns, and a combined turn counts as only 1 element.
   - When a transcript shows sequential calls (e.g., search → second search), each call is its own MCP turn followed by the user-facing response turn only after all searches complete (or after each search, depending on the transcript flow).

1b. **MCPToolCall.result type:** `MCPToolCall.result` must be `mcp.types.CallToolResult` with both `content` and `structuredContent` populated:
   ```python
   mcp.types.CallToolResult(
       content=[mcp.types.TextContent(type="text", text=json.dumps(payload))],
       structuredContent={"result": payload},  # REQUIRED — dict, not JSON string
       isError=False,
   )
   ```
   The `structuredContent={"result": payload}` field is required by `MultiTurnMCPUseMetric` and `MCPTaskCompletionMetric` — their `_get_tasks()` accesses `tool.result.structuredContent['result']` to render tool output in the LLM evaluation prompt. If `structuredContent` is `None`, `_get_tasks()` raises `TypeError` silently and the metric scores `0.0`.

1c. **Do NOT include `mcp_tools_called=None` on non-MCP turns** — omit the parameter entirely. Passing `None` explicitly causes Pydantic validation issues in some DeepEval versions.

1d. **`_mcp_interaction` flag is set automatically** by a Pydantic validator when `mcp_tools_called` is non-null — do not set it manually.

2. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) are defined in `evals/metrics.py` with initial threshold `0.5`. All four use `AnthropicModel(model="claude-sonnet-4-6", temperature=0)` as the judge.

3. At least 3 custom `ConversationalGEval` metrics implemented in `evals/metrics.py`:
   - `WARM_OPEN`: checks the assistant opens with a concern question, not an address request or category menu
   - `VALIDATE_BEFORE_INFORM`: checks substantive emotional acknowledgment BEFORE address solicitation; a single pivoting acknowledgment is insufficient
   - `NO_EDITORIALIZING`: checks no intent/motivation claims about legislators; facts only
   - `CITATION_FORMAT`: checks citation uses human-readable session label (e.g., `"2026 General Session"`), not raw IDs like `"2026GS"`. Zero-result cases should score N/A/pass since citation is correctly absent.

4. All metrics produce scores and reasons without crashing or returning empty results. Run `cd evals && deepeval test run tests/test_manual_cases.py` to verify.

5. Test outcomes:
   - Case 1 (Jordan/Park, happy path email): should pass all metrics at threshold 0.5.
   - Case 2 (Ty/Sorensen, happy path SMS): should pass all metrics at threshold 0.5.
   - Case 3 (Sarah/Rivera, zero-result fallback): `CITATION_FORMAT` should score N/A or pass (citation is correctly absent); `WARM_OPEN` and `VALIDATE_BEFORE_INFORM` should both pass (transcript shows good validation behavior by claude-sonnet-4-6).

6. Tests run via `deepeval test run` (not bare `pytest`) to verify caching and output formatting work correctly.

7. `test_manual_cases.py` includes a `@deepeval.log_hyperparameters` decorated `hyperparameters()` function logging at minimum: `model` (the chatbot-under-test model, sourced from the transcript filename, e.g. `"claude-sonnet-4-6"`), `prompt_template` (system prompt version or path), and `temperature`. This establishes the hyperparameter tracking pattern for E5-4+ where the SUT is live.

8. `ConversationalTestCase` objects each include `mcp_servers=[_ON_RECORD_MCP_SERVER]` where `_ON_RECORD_MCP_SERVER` is an `MCPServer` instance with both `lookup_legislator` and `search_bills` tool definitions. This is required for `MultiTurnMCPUseMetric` to evaluate tool usage correctness.

## Tasks / Subtasks

- [ ] Task 1: Create `evals/metrics.py` (AC: 2, 3)
  - [ ] Import `ConversationalGEval`, `MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric` from `deepeval.metrics`
  - [ ] Import `AnthropicModel` from `deepeval.models`
  - [ ] Create `_judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)`
  - [ ] Define `BUILT_IN_METRICS = [MultiTurnMCPUseMetric(...), MCPTaskCompletionMetric(...), KnowledgeRetentionMetric(...), ConversationCompletenessMetric(...)]` — all threshold 0.5, model=_judge
  - [ ] Define `WARM_OPEN = ConversationalGEval(...)` with criteria and 3-5 evaluation_steps
  - [ ] Define `VALIDATE_BEFORE_INFORM = ConversationalGEval(...)` with criteria and 4-5 evaluation_steps
  - [ ] Define `NO_EDITORIALIZING = ConversationalGEval(...)` with criteria and 4-5 evaluation_steps
  - [ ] Define `CITATION_FORMAT = ConversationalGEval(...)` with criteria and 4-5 evaluation_steps
  - [ ] Define `CUSTOM_METRICS = [WARM_OPEN, VALIDATE_BEFORE_INFORM, NO_EDITORIALIZING, CITATION_FORMAT]`
  - [ ] Define `ALL_METRICS = BUILT_IN_METRICS + CUSTOM_METRICS`
  - [ ] Add docstring note explaining the `structuredContent` requirement for built-in metrics scoring correctly

- [ ] Task 2: Create `evals/tests/test_manual_cases.py` (AC: 1, 1a-1d, 5, 7, 8)
  - [ ] Module-level `ANTHROPIC_API_KEY` guard with `pytest.skip(allow_module_level=True)` (must come before `from metrics import ...` because `AnthropicModel` requires the key at init)
  - [ ] Import `deepeval`, `assert_test`, `ConversationalTestCase`, `MCPToolCall`, `Turn` from deepeval
  - [ ] Import `MCPServer` from `deepeval.test_case.mcp`
  - [ ] Import `mcp.types` for `CallToolResult`, `TextContent`, `Tool`
  - [ ] Define `_make_tool_result(payload: dict) -> mcp.types.CallToolResult` helper — wraps payload with both `content=[TextContent(...)]` and `structuredContent={"result": payload}`
  - [ ] Define `_ON_RECORD_MCP_SERVER = MCPServer(server_name="on-record", available_tools=[...])` with both tool definitions (schema from `chatbot.py`)
  - [ ] Implement `TEST_CASE_JORDAN_PARK` from `01-happy-path-email-casual/claude-sonnet-4-6` — two-turn split for each MCP call (lookup_legislator turn + response turn; search_bills turn + response turn); include revision turn pair
  - [ ] Implement `TEST_CASE_TY_SORENSEN` from `02-happy-path-sms-casual/claude-sonnet-4-6` — same two-turn split pattern; SMS draft + revision
  - [ ] Implement `TEST_CASE_SARAH_RIVERA` from `04-zero-result-fallback/claude-sonnet-4-6` — two search calls (teen mental health → youth counseling), both return empty bills; includes full draft generation without bill reference; two revisions
  - [ ] Define `hyperparameters()` function with `@deepeval.log_hyperparameters` decorator logging `model`, `prompt_template`, `temperature`
  - [ ] `test_jordan_park_happy_path_email()` — assert_test with ALL_METRICS, `run_async=False`
  - [ ] `test_ty_sorensen_happy_path_sms()` — assert_test with ALL_METRICS, `run_async=False`
  - [ ] `test_sarah_rivera_zero_result()` — assert_test with `BUILT_IN_METRICS + [WARM_OPEN, VALIDATE_BEFORE_INFORM, CITATION_FORMAT]`, `run_async=False` (CitationFormat should pass because citation correctly absent)

## Dev Notes

### Architecture Context

This story builds on E5-1 (project scaffold) and E5-2 (MCP client + model_callback). It is a **Phase 1 validation story** — the purpose is to prove the metric stack works with hard-coded turns before layering in ConversationSimulator (E5-4+).

```
evals/
├── metrics.py             (NEW — built-in + 4 custom GEval metrics)
└── tests/
    └── test_manual_cases.py   (NEW — 3 hard-coded ConversationalTestCase objects)
```

No modifications to existing files are needed (`conftest.py`, `chatbot.py`, `mcp_client.py`, `pyproject.toml` are untouched).

### Critical: Two-Turn Split for MCP Calls

This is the most common implementation mistake for this story. The `MultiTurnMCPUseMetric._get_tasks()` method counts "unit interactions" (turns between user messages). An MCP call turn + its response turn combined into one Turn counts as only 1 element in the unit — the method silently skips units with ≤ 2 elements, producing 0.0 scores.

**Correct pattern (two turns per MCP call):**
```python
# Turn N: MCP interaction — content is a descriptor, not empty string
Turn(
    role="assistant",
    content="Looking up your address...",
    mcp_tools_called=[
        MCPToolCall(
            name="lookup_legislator",
            args={"street": "847 N Freedom Blvd", "zone": "Provo"},
            result=_make_tool_result({
                "legislators": [...],
                "session": "2026GS",
                "resolvedAddress": "847 N FREEDOM BLVD, PROVO",
            }),
        ),
    ],
),
# Turn N+1: User-facing response — NO mcp_tools_called parameter at all
Turn(
    role="assistant",
    content="Got it, Jordan. Based on your address, your state representatives are:\n\n- **Maria Chen**, House District 61\n- **David Park**, Senate District 16\n\nWhich one would you like to write to?",
),
```

**Incorrect (combined into one turn — silently fails):**
```python
Turn(
    role="assistant",
    content="Got it, Jordan...",   # user-facing response
    mcp_tools_called=[...],        # combined with MCP call — WRONG
),
```

### Critical: MCPToolCall.result Type

`MCPToolCall.result` must be `mcp.types.CallToolResult`, not a raw string or dict. The `structuredContent={"result": payload}` field is what `MultiTurnMCPUseMetric._get_tasks()` actually reads to render tool output in the judge prompt.

```python
import json
import mcp.types

def _make_tool_result(payload: dict) -> mcp.types.CallToolResult:
    """Wrap a dict payload into the CallToolResult format required by DeepEval MCP metrics."""
    return mcp.types.CallToolResult(
        content=[mcp.types.TextContent(type="text", text=json.dumps(payload))],
        structuredContent={"result": payload},  # dict, not JSON string
        isError=False,
    )
```

### MCPServer Definition

`MultiTurnMCPUseMetric` and `MCPTaskCompletionMetric` require `ConversationalTestCase.mcp_servers` to be populated with tool schemas so the judge can evaluate whether the correct tools were called with correct arguments.

```python
from deepeval.test_case.mcp import MCPServer
import mcp.types

_ON_RECORD_MCP_SERVER = MCPServer(
    server_name="on-record",
    available_tools=[
        mcp.types.Tool(
            name="lookup_legislator",
            description=(
                "Identifies a constituent's Utah House and Senate legislators from their home address "
                "via GIS lookup. Returns structured JSON with legislator name, chamber, district, "
                "email, and phone contact information."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "street": {
                        "type": "string",
                        "description": 'Street portion only: number and street name. Example: "123 S State St"',
                    },
                    "zone": {
                        "type": "string",
                        "description": 'City name or 5-digit ZIP code. Example: "Salt Lake City" or "84111"',
                    },
                },
                "required": ["street", "zone"],
            },
        ),
        mcp.types.Tool(
            name="search_bills",
            description=(
                "Searches bills sponsored by a Utah legislator by issue theme. Returns up to 5 bills "
                "from the SQLite cache matching the theme and legislator. Returns structured JSON with "
                "bill ID, title, summary, status, and session."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "legislatorId": {
                        "type": "string",
                        "description": 'Legislator ID from lookup_legislator output (e.g. "RRabbitt")',
                    },
                    "theme": {
                        "type": "string",
                        "description": "Freeform search term derived from the constituent's stated concern.",
                    },
                },
                "required": ["legislatorId", "theme"],
            },
        ),
    ],
)
```

### Hyperparameters Decorator Pattern

```python
import deepeval

@deepeval.log_hyperparameters(model="claude-sonnet-4-6", prompt_template="system-prompt/agent-instructions.md")
def hyperparameters():
    return {
        "model": "claude-sonnet-4-6",           # model used to generate the transcripts
        "prompt_template": "system-prompt/agent-instructions.md",  # system prompt under test
        "temperature": 1.0,                      # default temperature for Anthropic API
    }
```

### Module-Level API Key Guard

The guard must come BEFORE the `from metrics import ...` line because `AnthropicModel` in `metrics.py` instantiates at import time and raises if `ANTHROPIC_API_KEY` is absent.

```python
import os
import pytest

if not os.environ.get("ANTHROPIC_API_KEY"):
    pytest.skip("ANTHROPIC_API_KEY required", allow_module_level=True)

from metrics import ALL_METRICS, BUILT_IN_METRICS, CITATION_FORMAT, VALIDATE_BEFORE_INFORM, WARM_OPEN  # noqa: E402
```

### Transcript Sources — Exact Content

The three source transcripts are in `evals/synthesis-outputs/`. Read each fully before implementing. Key facts about each:

**Case 1 — Jordan/Park (01-happy-path-email-casual/claude-sonnet-4-6-20260326-215705.md):**
- Concern: housing affordability, rent up 40% in 2 years
- Address: `street="847 N Freedom Blvd"`, `zone="Provo"`
- Legislators: Maria Chen (CHENMA, House D61) and David Park (PARKDA, Senate D16)
- User picks David Park (Senate)
- `search_bills` call: `legislatorId="PARKDA"`, `theme="housing affordability"`
- Bills found: SB0112 (Affordable Housing Development Incentives, Senate/3rd reading), SB0088 (Rental Assistance Fund Amendments, Governor/signed)
- User picks SB0112; chooses email; casual voice
- One revision: add "8 years in Provo" detail
- Citation in draft: "SB0112" with session reference

**Case 2 — Ty/Sorensen (02-happy-path-sms-casual/claude-sonnet-4-6-20260326-215742.md):**
- Concern: air quality / daughter Maya (age 7) has asthma, 2 ER visits from inversions
- Address: `street="3341 W 5400 S"`, `zone="Salt Lake City"`
- Legislators: Tyler Sorensen (SORENT, House D37) and Amanda Wu (WUAMAN, Senate D8)
- User picks Tyler Sorensen
- `search_bills` call: `legislatorId="SORENT"`, `theme="air quality"`
- Bills found: HB0203 (Clean Air Emission Standards Amendments, House/committee)
- Chooses text (SMS); casual voice
- One revision: add daughter's name (Maya)
- Citation in SMS draft: "HB0203" with session reference `"(2026 session)"`

**Case 3 — Sarah/Rivera (04-zero-result-fallback/claude-sonnet-4-6-20260326-215846.md):**
- Concern: teen mental health — 15-year-old daughter with anxiety, school counselor cut, 6-month therapy waitlist
- Address: `street="1822 Gentile St"`, `zone="Layton"`
- Legislators: Kevin Olsen (OLSEKE, House D14) and Tanya Rivera (RIVETA, Senate D20)
- User picks Tanya Rivera
- First `search_bills` call: `legislatorId="RIVETA"`, `theme="teen mental health"` → empty result
- Second `search_bills` call: `legislatorId="RIVETA"`, `theme="youth counseling"` → empty result
- Proceeds to draft email without bill citation (correct behavior)
- One revision: add "taxpayer and voter" framing
- No bill citation in final draft — CITATION_FORMAT should score N/A / pass

### Metric Evaluation Notes

**WARM_OPEN:**
- All three transcripts start with the assistant asking "What's been on your mind?" — should score high.
- Case 1 and 2: explicit warm concern question before any address request.

**VALIDATE_BEFORE_INFORM:**
- All three transcripts (claude-sonnet-4-6) show substantive validation — multiple turns of empathetic engagement before address solicitation. Should score high on all three.
- The `test_deb_validate_skip` type of synthetic gap test is NOT included in this story — the transcripts sourced are all from claude-sonnet-4-6 which behaves correctly. The validation gap detection was handled in the previous story spec via a synthetic case; for this story, all 3 test cases should be known-good or known-partial (zero-result).

**CITATION_FORMAT:**
- Cases 1 and 2 both produce drafts with bill citations.
- Case 3 produces a draft WITHOUT citation (correct zero-result behavior). The metric's evaluation_steps must include a step that treats zero-result no-citation drafts as passing.

**NO_EDITORIALIZING:**
- All three transcripts stay factual. Should score high.

### ConversationalGEval Metric Implementation Pattern

```python
from deepeval.metrics import ConversationalGEval
from deepeval.models import AnthropicModel

_judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)

WARM_OPEN = ConversationalGEval(
    name="Warm Open",
    criteria=(
        "Evaluate whether the assistant opens the conversation by asking about the "
        "constituent's concern or what brought them here — NOT by immediately requesting "
        "their address or presenting a list of issue categories."
    ),
    evaluation_steps=[
        "Check the very first assistant turn for its opening question.",
        "If the first assistant turn asks about the constituent's concern or what's on "
        "their mind, score positively.",
        "If the first assistant turn requests an address, ZIP code, or presents a "
        "menu of issue categories, penalize heavily.",
        "A warm open that also mentions needing an address later (but asks about concern "
        "first) is acceptable.",
    ],
    model=_judge,
    threshold=0.5,
)
```

### Environment Variables Required

| Var | Used By | Required For |
| --- | ------- | ------------ |
| `ANTHROPIC_API_KEY` | `metrics.py` (`AnthropicModel` judge) | All metric measurements |

No MCP server is needed for this story — test cases use hard-coded turns, not live tool calls.

### Running Tests

```bash
cd evals
# Run with DeepEval (not bare pytest) for caching + output formatting
deepeval test run tests/test_manual_cases.py

# Run single test for faster iteration
deepeval test run tests/test_manual_cases.py -k "jordan"

# With DeepEval caching for unchanged cases
deepeval test run tests/test_manual_cases.py -c
```

### Project Structure Notes

New files created by this story:
```
evals/
├── metrics.py                        (NEW)
└── tests/
    └── test_manual_cases.py          (NEW)
```

No existing files are modified. Do not modify `chatbot.py`, `mcp_client.py`, `conftest.py`, `pyproject.toml`, or any file in `providers/`.

Do not touch any file in `apps/` or `packages/`.

### References

- Tech spec (source of truth for AC): [`_bmad-output/implementation-artifacts/tech-spec-eval-harness.md`] — Phase 1, Story E5-3
- Transcript source 1 (Jordan/Park): [`evals/synthesis-outputs/01-happy-path-email-casual/claude-sonnet-4-6-20260326-215705.md`]
- Transcript source 2 (Ty/Sorensen): [`evals/synthesis-outputs/02-happy-path-sms-casual/claude-sonnet-4-6-20260326-215742.md`]
- Transcript source 3 (Sarah/Rivera): [`evals/synthesis-outputs/04-zero-result-fallback/claude-sonnet-4-6-20260326-215846.md`]
- Tool schema reference: [`evals/chatbot.py`] — `MCP_TOOL_SCHEMAS`
- Provider pattern reference: [`evals/providers/anthropic_provider.py`] — `MCPToolCall` + `CallToolResult` usage
- Previous story (E5-2): [`_bmad-output/implementation-artifacts/E5-2-mcp-http-client-and-model-callback.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
