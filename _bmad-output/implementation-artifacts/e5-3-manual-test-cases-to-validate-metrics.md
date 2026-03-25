# Story E5.3: Manual Test Cases to Validate Metrics

Status: ready-for-dev

## Story

As a developer running evals,
I want 3 hard-coded `ConversationalTestCase` objects with initial metrics configured and validated end-to-end,
so that I can prove the evaluation stack works correctly before adding simulation complexity in E5-4/E5-6.

## Acceptance Criteria

1. At least 3 hard-coded test cases in `evals/tests/test_manual_cases.py` representing Runs 1, 2, and 3 from `system-prompt/test-runs.md`

1a. Assistant `Turn` objects that correspond to tool calls must include `mcp_tools_called` populated with synthetic `MCPToolCall` objects. `MCPToolCall.result` must be a `mcp.types.CallToolResult` wrapping a JSON string — not a raw string. This is required for built-in MCP metrics to score tool usage; without it they produce misleading zero-tool scores.

2. `evals/metrics.py` defines the 4 built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) each with `threshold=0.5` and a `get_builtin_metrics()` helper that returns a fresh list per call

3. At least 4 custom `ConversationalGEval` metrics defined in `evals/metrics.py`: `warm_open_metric`, `validate_before_inform_metric`, `no_editorializing_metric`, `citation_format_metric` — each with `criteria`, `evaluation_steps` (3–6 steps), `AnthropicModel` judge, and `threshold=0.5`

4. Running `deepeval test run tests/test_manual_cases.py -v` from inside `evals/` produces per-metric scores and reasons with no crashes and no empty results

5. `test_run2_marcus_known_good` passes all metrics at threshold 0.5; `test_run3_deb_validate_before_inform_gap` is marked `@pytest.mark.xfail` because Run 3 (Gemini skipped empathetic validation) is expected to score below threshold on `validate_before_inform_metric`, confirming the metric correctly detects the behavioral gap

6. Tests in `test_manual_cases.py` use `assert_test()` and do NOT require the real MCP server — no `mcp_server` fixture used, no live HTTP calls

## Tasks / Subtasks

- [ ] Task 1: Create `evals/metrics.py` (AC: 2, 3)
  - [ ] 1.1: Define `JUDGE_MODEL = AnthropicModel(model="claude-sonnet-4-6", temperature=0)`
  - [ ] 1.2: Implement `get_builtin_metrics()` returning a fresh list of the 4 built-in metrics with `threshold=0.5`; pass `model=JUDGE_MODEL` to each metric that accepts it (avoids OPENAI_API_KEY requirement)
  - [ ] 1.3: Define `warm_open_metric` with criteria and evaluation_steps from Dev Notes
  - [ ] 1.4: Define `validate_before_inform_metric` with criteria and evaluation_steps from Dev Notes
  - [ ] 1.5: Define `no_editorializing_metric` with criteria and evaluation_steps from Dev Notes
  - [ ] 1.6: Define `citation_format_metric` with criteria and evaluation_steps from Dev Notes

- [ ] Task 2: Create `evals/tests/test_manual_cases.py` (AC: 1, 1a, 4, 5, 6)
  - [ ] 2.1: Add imports (`ConversationalTestCase`, `Turn`, `MCPToolCall`, `CallToolResult`, `TextContent`, `assert_test`, metrics from metrics.py)
  - [ ] 2.2: Define `make_tool_result(data)` helper using `CallToolResult(content=[TextContent(type="text", text=json.dumps(data))], isError=False)`
  - [ ] 2.3: Define synthetic data constants (Herriman legislators/bills, Draper legislators/bills) — use shapes from Dev Notes
  - [ ] 2.4: Define `RUN1_TURNS` — 13-turn Deb/zero-result sequence; 2 assistant turns with `mcp_tools_called`
  - [ ] 2.5: Define `RUN2_TURNS` — 15-turn Marcus/known-good sequence; 2 assistant turns with `mcp_tools_called`
  - [ ] 2.6: Define `RUN3_TURNS` — 13-turn Deb/Gemini-validation-skip sequence; Turn 3 skips empathetic acknowledgment and immediately asks for address; 2 assistant turns with `mcp_tools_called`
  - [ ] 2.7: Write `test_run1_deb_zero_result()` — `assert_test` with builtin + warm_open + validate_before_inform + no_editorializing (exclude citation_format: zero-result path has no bill)
  - [ ] 2.8: Write `test_run2_marcus_known_good()` — `assert_test` with all builtins + all 4 custom metrics
  - [ ] 2.9: Write `@pytest.mark.xfail test_run3_deb_validate_before_inform_gap()` — `assert_test` with `validate_before_inform_metric` only

- [ ] Task 3: Verify and record results (AC: 4, 5)
  - [ ] 3.1: Run `cd evals && deepeval test run tests/test_manual_cases.py -v` and confirm no crashes
  - [ ] 3.2: Confirm Run 2 passes; confirm Run 3 resolves as XFAIL (not XPASS)
  - [ ] 3.3: Record per-metric scores and any threshold observations in Dev Agent Record

## Dev Notes

### Architecture Context

E5-3 is Phase 1 of the phased eval adoption from `tech-spec-eval-harness.md`: prove metrics work on hardcoded conversations BEFORE adding `ConversationSimulator` complexity. E5-4 adds `ConversationalGolden` scenarios; E5-6 runs full simulation.

New files integrate as follows:
- `evals/metrics.py` — standalone metric definitions; imported by all future test files
- `evals/tests/test_manual_cases.py` — hardcoded turns only. No live MCP server, no model_callback, no chatbot.py.

Existing files NOT modified: `conftest.py`, `chatbot.py`, `server.py`, `mcp_client.py`, `providers/`.

### Environment Variables

- `ANTHROPIC_API_KEY` — **required** for `AnthropicModel` judge in all custom metrics
- `OPENAI_API_KEY` — **not required** for E5-3 (no `ConversationSimulator`, no `OpenAIProvider`, no GPT simulator model); pass `model=JUDGE_MODEL` to built-in metrics to avoid needing it there too
- No MCP server env vars — E5-3 tests are fully hardcoded with no live server or tool calls

### Import Reference

```python
# test_manual_cases.py
import json
import pytest
from deepeval import assert_test
from deepeval.test_case import ConversationalTestCase, Turn, MCPToolCall
from mcp.types import CallToolResult, TextContent
from metrics import (
    get_builtin_metrics,
    warm_open_metric,
    validate_before_inform_metric,
    no_editorializing_metric,
    citation_format_metric,
)
```

```python
# metrics.py
from deepeval.metrics import (
    MultiTurnMCPUseMetric,
    MCPTaskCompletionMetric,
    KnowledgeRetentionMetric,
    ConversationCompletenessMetric,
    ConversationalGEval,
)
from deepeval.models import AnthropicModel
```

### MCPToolCall Construction Pattern

`MCPToolCall.result` must be `mcp.types.CallToolResult` — not a raw string or dict. Pattern confirmed from `evals/providers/anthropic_provider.py` lines 99–108.

```python
import json
from mcp.types import CallToolResult, TextContent
from deepeval.test_case import MCPToolCall

def make_tool_result(data: dict) -> CallToolResult:
    """Wrap a dict as a CallToolResult for synthetic MCPToolCall construction."""
    return CallToolResult(
        content=[TextContent(type="text", text=json.dumps(data))],
        isError=False,
    )

# Usage
lookup_call = MCPToolCall(
    name="lookup_legislator",
    args={"street": "6856 W Windy Ridge Dr", "zone": "84096"},
    result=make_tool_result(HERRIMAN_LEGISLATORS),
)
```

The JSON shape must match `packages/types/index.ts` exactly:
- `LookupLegislatorResult`: `{ legislators: [{ id, chamber, district, name, email, phone, session }], session, resolvedAddress }`
- `SearchBillsResult`: `{ bills: [{ id, session, title, summary, status, sponsorId, voteResult?, voteDate? }], legislatorId, session }`

### Synthetic Data Constants

Define these at module level in `test_manual_cases.py`:

```python
# ── Herriman UT 84096 (Runs 1 and 3) ─────────────────────────────────────────
HERRIMAN_LEGISLATORS = {
    "legislators": [
        {"id": "SCallister", "chamber": "house", "district": 22, "name": "Sarah Callister",
         "email": "scallister@le.utah.gov", "phone": "801-538-1000", "session": "2026GS"},
        {"id": "JHayes", "chamber": "senate", "district": 10, "name": "James Hayes",
         "email": "jhayes@le.utah.gov", "phone": "801-538-1035", "session": "2026GS"},
    ],
    "session": "2026GS",
    "resolvedAddress": "6856 W Windy Ridge Dr, Herriman, UT 84096",
}

HERRIMAN_ZERO_BILLS = {
    "bills": [], "legislatorId": "SCallister", "session": "2026GS"
}

HERRIMAN_CHARTER_BILL = {
    "bills": [
        {"id": "HB0152", "session": "2025GS", "title": "Charter School Funding Amendments",
         "summary": "Revises state funding formulas for charter schools to provide more equitable per-pupil allocations.",
         "status": "Passed", "sponsorId": "SCallister", "voteResult": "44-30", "voteDate": "2025-03-04"},
    ],
    "legislatorId": "SCallister",
    "session": "2025GS",
}

# ── Draper (Run 2) ────────────────────────────────────────────────────────────
DRAPER_LEGISLATORS = {
    "legislators": [
        {"id": "TBrennan", "chamber": "house", "district": 27, "name": "Thomas Brennan",
         "email": "tbrennan@le.utah.gov", "phone": "801-538-1000", "session": "2026GS"},
        {"id": "LRandall", "chamber": "senate", "district": 11, "name": "Lisa Randall",
         "email": "lrandall@le.utah.gov", "phone": "801-538-1035", "session": "2026GS"},
    ],
    "session": "2026GS",
    "resolvedAddress": "12997 Summerharvest Dr, Draper, UT 84020",
}

DRAPER_HOUSING_BILLS = {
    "bills": [
        {"id": "HB0078", "session": "2025GS", "title": "Affordable Housing Development Fund",
         "summary": "Establishes a state fund supporting construction of affordable housing units in high-cost areas.",
         "status": "Passed", "sponsorId": "LRandall", "voteResult": "47-28", "voteDate": "2025-03-10"},
        {"id": "SB0042", "session": "2025GS", "title": "Workforce Transition Assistance Act",
         "summary": "Expands job placement and retraining services for displaced workers.",
         "status": "In Committee", "sponsorId": "LRandall"},
    ],
    "legislatorId": "LRandall",
    "session": "2025GS",
}
```

### Turn Sequences

The actual conversation transcripts (`on-record-test/conversation X.txt`) are NOT in this repository — they live in a sibling directory that is not committed. The sequences below are representative synthetic turns constructed from `system-prompt/testing-notes.md` and the behavioral notes in `system-prompt/test-runs.md`. They faithfully represent each run's behavioral characteristics.

**RUN 1 — Deb, Claude Sonnet 4.6, zero-result fallback** (warm_open ✅, validate ✅, no citation):

```python
RUN1_TURNS = [
    Turn(role="assistant",
         content="What's been on your mind lately — what brings you here today?"),
    Turn(role="user",
         content="I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers."),
    Turn(role="assistant",
         content="That's a real impact — losing three teachers isn't an abstract budget cut, it changes your daughter's classroom every day. To find your specific state representatives, I'll need your home address. Could you share your street address and city or ZIP code?"),
    Turn(role="user",
         content="6856 W Windy Ridge Dr, Herriman UT 84096"),
    Turn(role="assistant",
         content="Based on your address in Herriman, your state representatives are:\n- Sarah Callister, House District 22\n- James Hayes, Senate District 10\n\nWhich one would you like to write to?",
         mcp_tools_called=[
             MCPToolCall(
                 name="lookup_legislator",
                 args={"street": "6856 W Windy Ridge Dr", "zone": "84096"},
                 result=make_tool_result(HERRIMAN_LEGISLATORS),
             ),
         ]),
    Turn(role="user",
         content="The house representative please."),
    Turn(role="assistant",
         content="I searched for bills Representative Callister has sponsored related to public education funding, but wasn't able to find any matching bills in the current sessions. Would you like me to try a different search term, or proceed with a general message about your concern?",
         mcp_tools_called=[
             MCPToolCall(
                 name="search_bills",
                 args={"legislatorId": "SCallister", "theme": "public education funding"},
                 result=make_tool_result(HERRIMAN_ZERO_BILLS),
             ),
         ]),
    Turn(role="user",
         content="Let's just write a general message about my concern."),
    Turn(role="assistant",
         content="Of course. Would you like to send this as an email or a text/SMS? And should the tone be conversational or more formal?"),
    Turn(role="user",
         content="Email, conversational please."),
    Turn(role="assistant",
         content="Here's a draft email for you:\n\nDear Representative Callister,\n\nI'm writing as a constituent from Herriman to share my concern about recent cuts to public education funding. My daughter's school recently lost three teachers due to budget constraints, and I believe our students deserve better support.\n\nI ask for your attention and action on this important issue.\n\nSincerely,\n[Your Name]"),
    Turn(role="user",
         content="Can you make it shorter and add that I've lived here for 15 years?"),
    Turn(role="assistant",
         content="Here's a shorter version:\n\nDear Representative Callister,\n\nAs a 15-year Herriman resident and concerned parent, I'm writing about cuts to public education funding. My daughter's school just lost three teachers. I ask for your attention to this issue.\n\nSincerely,\n[Your Name]"),
]
```

**RUN 2 — Marcus, Claude Sonnet 4.6, known-good with citation** (all steps ✅, citation ✅):

```python
RUN2_TURNS = [
    Turn(role="assistant",
         content="What's been on your mind lately — what brings you here today?"),
    Turn(role="user",
         content="Things just feel wrong lately. Like my neighbors are struggling and I don't know why."),
    Turn(role="assistant",
         content="That feeling — when you can see the struggle around you but can't quite name the cause — is worth taking seriously. Tell me more about what you're observing. What does the struggle look like for your neighbors?"),
    Turn(role="user",
         content="Job losses mostly. And they can't keep up with rent. One family had to move out last month."),
    Turn(role="assistant",
         content="Thank you for sharing that — watching neighbors face job losses and housing instability is genuinely difficult. To connect you with the right state representatives, I'll need your home address. Could you share your street address and city or ZIP?"),
    Turn(role="user",
         content="12997 Summerharvest Dr, Draper"),
    Turn(role="assistant",
         content="Based on your address in Draper, your state representatives are:\n- Thomas Brennan, House District 27\n- Lisa Randall, Senate District 11\n\nWhich one would you like to write to?",
         mcp_tools_called=[
             MCPToolCall(
                 name="lookup_legislator",
                 args={"street": "12997 Summerharvest Dr", "zone": "Draper"},
                 result=make_tool_result(DRAPER_LEGISLATORS),
             ),
         ]),
    Turn(role="user",
         content="Let's go with the Senate representative."),
    Turn(role="assistant",
         content="Here are some bills Senator Randall has sponsored related to economic hardship and housing:\n\n1. **HB 0078 — Affordable Housing Development Fund (2025 General Session):** Establishes a state fund supporting construction of affordable housing units. Status: Passed (47-28, 2025-03-10).\n2. **SB 0042 — Workforce Transition Assistance Act (2025 General Session):** Expands job placement services for displaced workers. Status: In Committee.\n\nDo any of these connect to what you're concerned about?",
         mcp_tools_called=[
             MCPToolCall(
                 name="search_bills",
                 args={"legislatorId": "LRandall", "theme": "economic hardship housing"},
                 result=make_tool_result(DRAPER_HOUSING_BILLS),
             ),
         ]),
    Turn(role="user",
         content="The first one, the housing fund."),
    Turn(role="assistant",
         content="Would you like to send your message as an email or a text/SMS? And should the tone be conversational or more formal?"),
    Turn(role="user",
         content="Text message, conversational."),
    Turn(role="assistant",
         content="Here's a draft text message:\n\nHi Senator Randall, I'm a Draper constituent concerned about housing affordability. Neighbors are losing jobs and can't make rent — your HB 0078 (Affordable Housing Development Fund, 2025 General Session, passed 47-28) matters. Please keep prioritizing this. Thanks"),
    Turn(role="user",
         content="Can you make it a bit more personal and mention my neighbor had to move?"),
    Turn(role="assistant",
         content="Here's a more personal version:\n\nHi Senator Randall, I'm a Draper constituent watching neighbors struggle with rent — one family had to move out last month. Your HB 0078 (Affordable Housing Development Fund, 2025 General Session) gives me hope. Please keep this a priority. Thanks"),
]
```

**RUN 3 — Deb, Gemini Flash 2.5, validation skip** (warm_open ✅, validate ❌):

The only difference from Run 1 is Turn index 2 (third turn): the assistant skips empathetic acknowledgment and immediately requests the address.

```python
RUN3_TURNS = [
    Turn(role="assistant",
         content="Welcome. I can help you connect with your Utah state legislators. What concern brought you here today?"),
    Turn(role="user",
         content="I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers."),
    # ← VALIDATION SKIP: no empathetic acknowledgment; immediate pivot to address request
    Turn(role="assistant",
         content="I can help you reach out to your legislators about that. To find your specific representatives, I'll need your home address. What's your street address and city or ZIP code?"),
    Turn(role="user",
         content="6856 W Windy Ridge Dr, Herriman UT 84096"),
    Turn(role="assistant",
         content="Based on your address in Herriman, your state representatives are:\n- Sarah Callister, House District 22\n- James Hayes, Senate District 10\n\nWhich one would you like to write to?",
         mcp_tools_called=[
             MCPToolCall(
                 name="lookup_legislator",
                 args={"street": "6856 W Windy Ridge Dr", "zone": "84096"},
                 result=make_tool_result(HERRIMAN_LEGISLATORS),
             ),
         ]),
    Turn(role="user",
         content="The house representative."),
    Turn(role="assistant",
         content="Here are bills Representative Callister has sponsored related to public education funding:\n\n1. **HB 0152 — Charter School Funding Amendments (2025 General Session):** Revises funding formulas for charter schools to provide more equitable per-pupil allocations. Status: Passed (44-30, 2025-03-04).\n\nDoes this connect to what you're concerned about?",
         mcp_tools_called=[
             MCPToolCall(
                 name="search_bills",
                 args={"legislatorId": "SCallister", "theme": "public education funding"},
                 result=make_tool_result(HERRIMAN_CHARTER_BILL),
             ),
         ]),
    Turn(role="user",
         content="Yes, that works."),
    Turn(role="assistant",
         content="How would you like to send this — email or text/SMS? And conversational or formal tone?"),
    Turn(role="user",
         content="Email, formal."),
    Turn(role="assistant",
         content="Dear Representative Callister,\n\nI am writing as your constituent from Herriman to express my concern regarding public education funding in Utah. I am particularly troubled by the impact on local schools, including the recent loss of three teachers at my daughter's school.\n\nI note your sponsorship of HB 0152 (Charter School Funding Amendments, 2025 General Session, passed 44-30 on March 4, 2025) and urge you to continue addressing public education funding comprehensively.\n\nRespectfully,\n[Your Name]"),
    Turn(role="user",
         content="Can you open with something stronger?"),
    Turn(role="assistant",
         content="Dear Representative Callister,\n\nAs a constituent who has watched budget cuts eliminate teaching positions at my daughter's school, I write to urge your continued attention to public education funding. Your sponsorship of HB 0152 (Charter School Funding Amendments, 2025 General Session, passed 44-30) demonstrates awareness of school funding issues — I ask you to build on that commitment.\n\nRespectfully,\n[Your Name]"),
]
```

### Metric Definitions for metrics.py

```python
JUDGE_MODEL = AnthropicModel(model="claude-sonnet-4-6", temperature=0)


def get_builtin_metrics() -> list:
    """Return a fresh list of built-in MCP metrics. Call once per test to avoid state sharing."""
    # Pass model=JUDGE_MODEL where accepted to avoid requiring OPENAI_API_KEY.
    # If a metric does not accept `model`, omit it — check at runtime if ImportError or TypeError.
    return [
        MultiTurnMCPUseMetric(threshold=0.5),
        MCPTaskCompletionMetric(threshold=0.5),
        KnowledgeRetentionMetric(threshold=0.5),
        ConversationCompletenessMetric(threshold=0.5),
    ]


warm_open_metric = ConversationalGEval(
    name="Warm Open",
    criteria=(
        "Evaluate whether the assistant's first turn invites the constituent to share their "
        "concern using an open-ended question, without immediately requesting their home address "
        "or presenting a topic category menu."
    ),
    evaluation_steps=[
        "Find the first assistant turn in the conversation.",
        "Check whether it contains an open-ended invitation to share what is on the constituent's mind "
        "(e.g., 'What brings you here?', 'What has been on your mind?', 'What concern brought you here today?').",
        "Penalize if the first assistant turn requests a home address as its primary ask.",
        "Penalize if the first assistant turn presents a menu of topic categories "
        "(e.g., 'Choose: education, healthcare, environment').",
        "Ignore all turns after the first — only the opening message is evaluated.",
        "Score 1 if the opening is warm and inviting; score 0 if it is transactional or directive.",
    ],
    model=JUDGE_MODEL,
    threshold=0.5,
)


validate_before_inform_metric = ConversationalGEval(
    name="Validate Before Inform",
    criteria=(
        "Evaluate whether the assistant provides substantive emotional acknowledgment of the "
        "constituent's concern BEFORE soliciting their home address or pivoting to data collection."
    ),
    evaluation_steps=[
        "Find the constituent's first message expressing a specific concern or personal situation.",
        "Find the assistant's response immediately following that message.",
        "Check whether that response contains empathetic language reflecting the specific situation — "
        "not a generic 'I understand' but an acknowledgment of the actual content "
        "(e.g., 'losing three teachers', 'neighbors struggling with rent').",
        "Check that any address request or data pivot comes AFTER this acknowledgment, not as the sole element.",
        "Penalize responses that pivot immediately to 'I will need your home address' with no emotional acknowledgment.",
        "Penalize responses with only perfunctory acknowledgment (single generic phrase) immediately followed by an address request.",
        "Score 1 if acknowledgment is substantive and precedes the address ask; "
        "score 0 if the response goes directly from hearing the concern to requesting an address.",
    ],
    model=JUDGE_MODEL,
    threshold=0.5,
)


no_editorializing_metric = ConversationalGEval(
    name="No Editorializing",
    criteria=(
        "Evaluate whether the assistant avoids characterizing legislator intent, motivation, or "
        "values beyond what is factually supported by bill sponsorship and vote data from MCP tools."
    ),
    evaluation_steps=[
        "Scan each assistant turn for subjective language about legislators "
        "(e.g., 'clearly does not care', 'has shown commitment to', 'opposed to', 'believes', 'supports').",
        "Check that all claims about legislators are grounded in specific observable facts from MCP tools: "
        "bill IDs, titles, session labels, status, vote results, and dates.",
        "Penalize any attribution of intent or motivation beyond what the factual record shows.",
        "Allow factual statements: 'sponsored HB 0078', 'bill passed 47-28', 'listed as primary sponsor', "
        "'bill is currently in committee'.",
        "Penalize speculation about how the legislator will vote, respond, or whether they care about an issue.",
    ],
    model=JUDGE_MODEL,
    threshold=0.5,
)


citation_format_metric = ConversationalGEval(
    name="Citation Format",
    criteria=(
        "Evaluate whether the final draft message contains a properly formatted bill citation using "
        "a human-readable session label, and whether citations are present only when a bill was "
        "confirmed — not fabricated when no bill was selected."
    ),
    evaluation_steps=[
        "Find the final draft message in the conversation "
        "(last or second-to-last assistant turn containing a salutation and closing).",
        "If a bill was confirmed earlier: verify the draft contains exactly one citation referencing "
        "that bill's ID and a human-readable session label (e.g., '2025 General Session', NOT '2025GS').",
        "Verify the bill ID and session in the citation match what was presented in the search results — "
        "no fabricated data.",
        "Penalize citations using raw session codes (e.g., '2025GS') instead of human-readable labels.",
        "Penalize drafts that cite a bill that was never shown in search results.",
        "If no bill was confirmed (zero-result fallback): verify no citation is present. "
        "Absence of citation is correct behavior — do not penalize.",
        "Penalize drafts with more than one citation when only one bill was confirmed.",
    ],
    model=JUDGE_MODEL,
    threshold=0.5,
)
```

### Test Function Structure

```python
def test_run1_deb_zero_result():
    """Run 1: Deb, Claude. Zero-result fallback — no citation; warm open and validation correct."""
    run1 = ConversationalTestCase(turns=RUN1_TURNS)
    assert_test(run1, get_builtin_metrics() + [
        warm_open_metric, validate_before_inform_metric, no_editorializing_metric,
        # citation_format_metric intentionally excluded: zero-result path has no bill to cite
    ])


def test_run2_marcus_known_good():
    """Run 2: Marcus, Claude. Known-good — all steps correct, citation present."""
    run2 = ConversationalTestCase(turns=RUN2_TURNS)
    assert_test(run2, get_builtin_metrics() + [
        warm_open_metric, validate_before_inform_metric, no_editorializing_metric, citation_format_metric,
    ])


@pytest.mark.xfail(
    reason=(
        "Run 3 (Gemini Flash 2.5) skipped empathetic acknowledgment — Step 1 Validate ❌ in test-runs.md. "
        "This test EXPECTS to fail: validate_before_inform_metric should score below 0.5. "
        "XFAIL = metric working correctly. XPASS = metric may need calibration."
    )
)
def test_run3_deb_validate_before_inform_gap():
    """Run 3: Deb, Gemini. Validation skip — expected to score below threshold, proving metric detects gap."""
    run3 = ConversationalTestCase(turns=RUN3_TURNS)
    assert_test(run3, [validate_before_inform_metric])
```

### Running Tests

From inside `evals/`:
```bash
cd evals
deepeval test run tests/test_manual_cases.py -v
```

Do NOT use bare `pytest` — deepeval plugin hooks (scoring display, caching, identifier tagging) only activate through `deepeval test run`. With result caching:
```bash
deepeval test run tests/test_manual_cases.py -v -c
```

`test_manual_cases.py` must NOT contain `LLMTestCase` objects — `ConversationalTestCase` and `LLMTestCase` cannot be mixed in the same `evaluate()` call or test file.

### Note on ConversationalGolden for E5-4

E5-3 uses `ConversationalTestCase` with hardcoded turns. E5-4 introduces `ConversationalGolden` — the correct class name is `ConversationalGolden` from `deepeval.dataset` (NOT `ConversationGolden`; old examples may use the incorrect alias).

### Project Structure Notes

New files only — no modifications to existing files:
```
evals/
├── metrics.py                          ← NEW: all metric definitions
└── tests/
    └── test_manual_cases.py            ← NEW: 3 hardcoded ConversationalTestCase tests
```

Module imports from `tests/` to `evals/` root work via the same path resolution as `import chatbot` in `tests/test_chatbot.py` — the `evals/` root is the Python path root.

### References

- [Source: _bmad-output/implementation-artifacts/tech-spec-eval-harness.md#Story E5-3] — AC and deliverables
- [Source: system-prompt/test-runs.md] — Run 1/2/3 behavioral outcomes; validation skip (Run 3); zero-result note (Runs 1, 5)
- [Source: system-prompt/testing-notes.md] — Persona A/B expected behaviors; Step 1 pass/fail signals; tool parameter expectations
- [Source: packages/types/index.ts] — `LookupLegislatorResult`, `SearchBillsResult`, `Legislator`, `Bill` shapes for synthetic MCPToolCall result data
- [Source: evals/providers/anthropic_provider.py#L99-108] — Confirmed `MCPToolCall(name, args, result=CallToolResult(...))` pattern
- [Source: evals/tests/test_chatbot.py#L1-14] — Import pattern (`from mcp.types import CallToolResult, TextContent`)
- [Source: evals/pyproject.toml] — `deepeval>=3.7.0`, `mcp>=1.0.0` already present; no new dependencies needed for this story

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
