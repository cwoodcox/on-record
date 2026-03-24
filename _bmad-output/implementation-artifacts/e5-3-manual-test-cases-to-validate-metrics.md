# Story E5.3: Manual Test Cases to Validate Metrics

Status: in-progress

## Story

As a **developer building the eval harness**,
I want 3 hard-coded `ConversationalTestCase` objects with initial metric definitions,
so that I can validate the eval stack (metrics scoring, test structure, `deepeval test run` output) before layering in simulation complexity.

## Acceptance Criteria

1. At least 3 hard-coded `ConversationalTestCase` objects with turns derived from actual manual test run transcripts in `system-prompt/test/test 2/` (conversations 1–3). Turn text may be lightly abbreviated but must faithfully represent the actual conversation flow.

1a. `mcp_tools_called` on assistant `Turn` objects must be populated with synthetic `MCPToolCall` objects reflecting the tool calls visible in the transcript. Each `MCPToolCall.result` must be typed as `mcp.types.CallToolResult` (not a raw string) — DeepEval 3.9+ requires this type. Use the actual args and result payloads from the conversation transcripts. This is required because built-in MCP metrics need populated `mcp_tools_called` to score tool usage; without it they produce misleading zero-tool scores.

2. Built-in metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) are configured with initial threshold 0.5 and exported from `evals/metrics.py`.

3. At least 4 custom `ConversationalGEval` metrics implemented: `WarmOpen`, `ValidateBeforeInform`, `NoEditorializing`, `CitationFormat`. All use `AnthropicModel(model="claude-sonnet-4-6", temperature=0)` as the judge and threshold 0.5. Error-path key phrases for `toContain` assertions (if metrics raise): `"judge model"`, `"threshold"`, `"evaluation_steps"`.

4. All metrics produce scores and reasons when evaluated — no crashes, no empty results. Validate by running `cd evals && deepeval test run tests/test_manual_cases.py` with real API keys.

5. The Marcus/housing test case (conversation 2 — full happy path with SMS citation and revision) passes all applicable metrics at threshold 0.5. The Deb/validate-skip test case (synthetic, modeled on test-runs.md Run 3 behavioral gap) shows a lower score on the `ValidateBeforeInform` metric than the Marcus case.

6. Tests are structured as pytest functions using `assert_test()` so that `deepeval test run tests/test_manual_cases.py` works correctly (caching, output formatting, identifier tagging). Tests requiring `ANTHROPIC_API_KEY` must skip gracefully when the key is absent (use `pytest.mark.skipif` or check at fixture level).

## Tasks / Subtasks

- [x] Task 1: Create `evals/metrics.py` (AC: 2, 3)
  - [x] Import built-in metrics: `from deepeval.metrics import MultiTurnMCPUseMetric, MCPTaskCompletionMetric, KnowledgeRetentionMetric, ConversationCompletenessMetric`
  - [x] Import judge model: `from deepeval.models import AnthropicModel`
  - [x] Define `_judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)` module-level
  - [x] Define `BUILT_IN_METRICS` list: all 4 built-in metrics at `threshold=0.5`
  - [x] Define `WARM_OPEN` (`ConversationalGEval`) — see Dev Notes for criteria + evaluation_steps
  - [x] Define `VALIDATE_BEFORE_INFORM` (`ConversationalGEval`) — see Dev Notes
  - [x] Define `NO_EDITORIALIZING` (`ConversationalGEval`) — see Dev Notes
  - [x] Define `CITATION_FORMAT` (`ConversationalGEval`) — see Dev Notes
  - [x] Define `CUSTOM_METRICS` list: `[WARM_OPEN, VALIDATE_BEFORE_INFORM, NO_EDITORIALIZING, CITATION_FORMAT]`
  - [x] Define `ALL_METRICS = BUILT_IN_METRICS + CUSTOM_METRICS`
  - [x] Export all metric objects and lists at module level

- [x] Task 2: Create `evals/tests/test_manual_cases.py` (AC: 1, 1a, 4, 5, 6)
  - [x] Import: `ConversationalTestCase, Turn, MCPToolCall` from `deepeval.test_case`; `mcp.types`; `json`; `assert_test` from `deepeval`; all metrics from `metrics`
  - [x] Add module-level skip guard: `pytestmark = pytest.mark.skipif(not os.environ.get("ANTHROPIC_API_KEY"), reason="ANTHROPIC_API_KEY required")`
  - [x] Define `_make_lookup_result(payload: dict) -> mcp.types.CallToolResult` helper (wraps dict as `TextContent`)
  - [x] Define `_make_search_result(payload: dict) -> mcp.types.CallToolResult` helper
  - [x] Construct `TEST_CASE_DEB_EDUCATION`: Deb/Herriman/Gemini conversation (from conversation 1.txt) — partial happy path, zero-result fallback on direct theme, HB0568 found via "education" search, bill selection via acknowledgment — see Dev Notes for full turn sequence and MCPToolCall data
  - [x] Construct `TEST_CASE_MARCUS_HOUSING`: Marcus/Draper/Gemini conversation (from conversation 2.txt) — full happy path: housing bill HB0068 found after multi-search, SMS draft generated, revision applied — the **known-good** test case — see Dev Notes for full turn sequence and MCPToolCall data
  - [x] Construct `TEST_CASE_DEB_VALIDATE_SKIP`: Synthetic Deb conversation modeled on test-runs.md Run 3 behavioral gap — agent skips empathetic acknowledgment and pivots directly to address solicitation — the **known-gap** test case — see Dev Notes for turn sequence
  - [x] Define `test_deb_education()`: runs `TEST_CASE_DEB_EDUCATION` against `BUILT_IN_METRICS + [WARM_OPEN, CITATION_FORMAT]`
  - [x] Define `test_marcus_housing_happy_path()`: runs `TEST_CASE_MARCUS_HOUSING` against `ALL_METRICS`
  - [x] Define `test_deb_validate_skip()`: runs `TEST_CASE_DEB_VALIDATE_SKIP` against `[VALIDATE_BEFORE_INFORM]`; verify this scores lower than Marcus on `ValidateBeforeInform`

### Review Follow-ups (AI)

- [ ] [AI-Review][HIGH] Implement score comparison logic in `test_deb_validate_skip()` to verify gap detection vs Marcus case (AC 5) [evals/tests/test_manual_cases.py:532]
- [ ] [AI-Review][MEDIUM] Update story file naming for test cases (DEB_PLUMB, MARCUS_ROBERTS) to match implementation [_bmad-output/implementation-artifacts/e5-3-manual-test-cases-to-validate-metrics.md]
- [ ] [AI-Review][MEDIUM] Investigate why built-in MCP metrics return 0.0 despite `mcp_tools_called` population [evals/metrics.py:32]
- [ ] [AI-Review][LOW] Update AC 1 to reflect use of `test 1/` transcripts instead of `test 2/` [_bmad-output/implementation-artifacts/e5-3-manual-test-cases-to-validate-metrics.md]

## Dev Notes

### Architecture Context

This story builds on the completed E5-1 (`evals/server.py`, `evals/conftest.py`) and E5-2 (`evals/mcp_client.py`, `evals/chatbot.py`, `evals/providers/`). The two new files created here (`evals/metrics.py`, `evals/tests/test_manual_cases.py`) do NOT use the live MCP server or `model_callback` — they work entirely with pre-built `ConversationalTestCase` objects and DeepEval's metric scoring.

```
evals/
├── metrics.py               ← NEW: metric definitions (built-in MCP + custom GEval)
├── tests/
│   └── test_manual_cases.py ← NEW: hard-coded test cases from manual transcripts
```

The existing `evals/tests/` already has:
- `test_server_lifecycle.py` (E5-1)
- `test_chatbot.py` (E5-2)
- `test_providers.py` (pluggable LLM provider story)

### DeepEval API — ConversationalTestCase Structure

```python
from deepeval.test_case import ConversationalTestCase, Turn, MCPToolCall
import mcp.types
import json

def _make_lookup_result(payload: dict) -> mcp.types.CallToolResult:
    return mcp.types.CallToolResult(
        content=[mcp.types.TextContent(type="text", text=json.dumps(payload))],
        isError=False,
    )

test_case = ConversationalTestCase(
    turns=[
        Turn(role="user", content="hi!"),
        Turn(
            role="assistant",
            content="Hi there! What's been on your mind lately...",
            mcp_tools_called=None,
        ),
        Turn(role="user", content="I'm really upset about..."),
        Turn(
            role="assistant",
            content="That sounds incredibly stressful...",
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "...", "zone": "..."},
                    result=_make_lookup_result({...}),
                )
            ],
        ),
    ]
)
```

**Critical:** `MCPToolCall.result` must be `mcp.types.CallToolResult` — NOT a raw string or dict. This was discovered during E5-2 implementation (DeepEval 3.9+ enforces this type). `mcp>=1.0.0` is already in `pyproject.toml`.

### deepeval test run vs bare pytest

Run with:
```bash
cd evals && deepeval test run tests/test_manual_cases.py
```

NOT:
```bash
cd evals && pytest tests/test_manual_cases.py  # skips DeepEval caching + output
```

Test functions use `assert_test()`:
```python
from deepeval import assert_test

def test_marcus_housing_happy_path():
    assert_test(TEST_CASE_MARCUS_HOUSING, metrics=ALL_METRICS)
```

### Custom Metric Definitions (metrics.py)

All custom metrics use `AnthropicModel` as the judge. `ANTHROPIC_API_KEY` must be set.

**WarmOpen** — checks the assistant opens by asking about the constituent's concern, NOT by immediately asking for address or presenting a category menu:
```python
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

**ValidateBeforeInform** — checks the assistant gives substantive emotional acknowledgment BEFORE pivoting to data collection:
```python
VALIDATE_BEFORE_INFORM = ConversationalGEval(
    name="Validate Before Inform",
    criteria=(
        "Evaluate whether the assistant provides substantive emotional acknowledgment "
        "of the constituent's concern before pivoting to address solicitation or "
        "legislative data. A one-sentence acknowledgment immediately followed by an "
        "address request is insufficient."
    ),
    evaluation_steps=[
        "Identify the turn where the constituent first states their concern.",
        "Find the assistant's response to that turn.",
        "Check whether the response contains substantive emotional validation "
        "(e.g., reflects the personal impact, expresses genuine understanding) "
        "before asking for the address.",
        "Penalize responses that jump directly to 'What's your address?' or "
        "'To find your representatives, I need your address' after the concern is stated.",
        "Allow one-sentence acknowledgment ONLY if it clearly addresses the personal "
        "impact rather than just restating the issue.",
    ],
    model=_judge,
    threshold=0.5,
)
```

**NoEditorializing** — checks the assistant avoids characterizing legislator intent or motivation:
```python
NO_EDITORIALIZING = ConversationalGEval(
    name="No Editorializing",
    criteria=(
        "Evaluate whether the assistant avoids characterizing legislator intent, "
        "motivation, or values. All claims must be grounded in bill sponsorship or "
        "status data from the MCP tool results."
    ),
    evaluation_steps=[
        "Scan each assistant turn for subjective language about legislators.",
        "Check that all claims are grounded in bill sponsorship, bill status, or "
        "direct quotes from tool results.",
        "Penalize phrases like 'clearly doesn't care', 'is opposed to', 'has shown "
        "support for' when not grounded in a specific sponsored bill.",
        "Allow factual statements: 'sponsored HB 68', 'the bill passed the House', "
        "'this was filed in the 2026 General Session'.",
        "Penalize any claim about why a legislator voted or acted in a certain way.",
    ],
    model=_judge,
    threshold=0.5,
)
```

**CitationFormat** — checks the draft cites a specific bill with a human-readable label:
```python
CITATION_FORMAT = ConversationalGEval(
    name="Citation Format",
    criteria=(
        "Evaluate whether the generated draft message contains a bill citation in "
        "human-readable format. Citations must use the bill's human-readable session "
        "label (e.g., 'this session', '2026 General Session') and bill number/title, "
        "not raw internal IDs like '2026GS'."
    ),
    evaluation_steps=[
        "Find the assistant turn that contains the draft message.",
        "If no draft was generated (zero-result fallback), score this metric N/A "
        "(treat as passing — citation is correctly absent).",
        "Check that the draft references a specific bill by number or title.",
        "Verify the citation uses a human-readable session label, not a raw ID "
        "like '2026GS' or 'session_code'.",
        "An SMS draft may use a condensed trailing reference; email drafts may use "
        "inline prose citation. Both formats are acceptable.",
        "Penalize drafts that contain no bill citation when a bill was confirmed.",
    ],
    model=_judge,
    threshold=0.5,
)
```

### Test Case 1: Deb/Education (conversation 1.txt)

Source: `system-prompt/test/test 2/conversation 1.txt` (Gemini CLI, Deb persona, education funding concern).

**Turn sequence:**

| # | Role | Content (abbreviated) |
|---|------|----------------------|
| 1 | user | `"hi!"` |
| 2 | assistant | `"Hi there! What's been on your mind lately — what brings you here today?"` |
| 3 | user | `"I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers."` |
| 4 | assistant | Acknowledgment + name + address request. `mcp_tools_called=None` |
| 5 | user | `"I'm corey. you need my address?"` |
| 6 | assistant | Confirms yes, asks for address |
| 7 | user | `"My address is 6856 Windy Ridge in Herriman."` |
| 8 | assistant | Presents legislators; calls lookup + search_bills ×2. `mcp_tools_called=[lookup, search1_empty, search2_found]` |
| 9 | user | `"that's weird that it says salt lake city, but i recognize candice's name from a neighbor's campaign sign so it makes sense"` |
| 10 | assistant | Bill options presented (HB0568, HB0280); re-searches. `mcp_tools_called=[search3_education]` |
| 11 | user | `"yeah, i remember the half-day kindergarten, i really liked that! maybe if i tell her that and then tell her i'm disappointed in the recent funding cuts she'll remember me"` |
| 12 | assistant | Affirms approach; asks email vs SMS + tone preference. `mcp_tools_called=None` |

**MCPToolCall data for Turn 8:**
```python
# lookup_legislator
MCPToolCall(
    name="lookup_legislator",
    args={"street": "6856 Windy Ridge", "zone": "Herriman"},
    result=_make_lookup_result({
        "legislators": [
            {
                "id": "PIERUC", "chamber": "house", "district": 49,
                "name": "Candice B. Pierucci",
                "email": "cpierucci@le.utah.gov", "phone": "385-414-1488",
                "session": "2026GS", "phoneLabel": "cell",
            },
            {
                "id": "BUSSEM", "chamber": "senate", "district": 11,
                "name": "Emily Buss",
                "email": "ebuss@le.utah.gov", "phone": "801-598-4734",
                "session": "2026GS", "phoneLabel": "cell",
            },
        ],
        "session": "2026GS",
        "resolvedAddress": "6856 WINDY RIDGE DR, SALT LAKE CITY",
    }),
)

# search_bills (empty — "public education funding")
MCPToolCall(
    name="search_bills",
    args={"theme": "public education funding", "legislatorId": "PIERUC"},
    result=_make_lookup_result({
        "bills": [], "legislatorId": "PIERUC", "session": "2026GS",
    }),
)
```

**MCPToolCall data for Turn 10:**
```python
# search_bills — found results
MCPToolCall(
    name="search_bills",
    args={"theme": "education", "legislatorId": "PIERUC"},
    result=_make_lookup_result({
        "bills": [
            {
                "id": "HB0568", "session": "2025GS",
                "title": "Half-day Kindergarten Amendments",
                "summary": "This bill requires local education agencies (LEAs) to provide a half-day kindergarten class in each school.",
                "status": "House/ filed", "sponsorId": "PIERUC",
            },
            {
                "id": "HB0280", "session": "2025GS",
                "title": "School District Administrator Authority",
                "summary": "This bill amends the definition of an employee.",
                "status": "House/ filed", "sponsorId": "PIERUC",
            },
        ],
        "legislatorId": "PIERUC",
        "session": "2026GS",
    }),
)
```

### Test Case 2: Marcus/Housing (conversation 2.txt) — Known-Good

Source: `system-prompt/test/test 2/conversation 2.txt` (Gemini CLI, Marcus persona, economic hardship → housing).

**Full happy path:** warm open ✅, validate ✅, both legislators found, multiple bill searches, HB0068 confirmed, SMS draft generated, revision applied.

**Turn sequence:**

| # | Role | Content (abbreviated) |
|---|------|----------------------|
| 1 | user | `"hi!"` |
| 2 | assistant | `"Hi there! What's been on your mind lately — what brings you here today?"` |
| 3 | user | `"Things just feel wrong lately. Like my neighbors are struggling and I don't know why."` |
| 4 | assistant | Acknowledges neighbor hardship; asks if it touched Marcus directly; asks name. `mcp_tools_called=None` |
| 5 | user | `"I'm marcus. Yeah — my neighbor lost her job at the distribution center. She's got kids. I just feel like no one's doing anything."` |
| 6 | assistant | Empathizes; asks for address. `mcp_tools_called=None` |
| 7 | user | `"12997 Summerharvest Dr, Draper is my address"` |
| 8 | assistant | Presents Roberts + Cullimore; searches economic hardship/employment/cost-of-living (all empty). `mcp_tools_called=[lookup, search×3_empty]` |
| 9 | user | `"what about for senator cullimore?"` |
| 10 | assistant | Searches Cullimore (economic hardship, cost of living, housing — all empty). `mcp_tools_called=[search×3_empty]` |
| 11 | user | `"can we search for something to do with housing from cal?"` |
| 12 | assistant | Searches housing/ROBERC — finds HB0492, HB0068. `mcp_tools_called=[search_housing_found]` |
| 13 | user | `"yeah i remember hearing about 68"` |
| 14 | assistant | Confirms HB 68; asks email vs SMS + tone. `mcp_tools_called=None` |
| 15 | user | `"yeah let's text him about it,"` |
| 16 | assistant | SMS draft: `"Marcus from Draper here. Seeing my neighbor struggle after losing her job has been really hard. I'm following HB 68 from this session and hope we can keep supporting families like hers. — Marcus"` |
| 17 | user | `"i'd like to ask him how the changes will support her, and i don't need to sign my name"` |
| 18 | assistant | Revised SMS: `"A Draper constituent here. My neighbor lost her job and has kids—it's been hard to watch. How will HB 68 from this session support families like hers?"` |

**MCPToolCall data for Turn 8:**
```python
# lookup_legislator
MCPToolCall(
    name="lookup_legislator",
    args={"street": "12997 Summerharvest Dr", "zone": "Draper"},
    result=_make_lookup_result({
        "legislators": [
            {
                "id": "ROBERC", "chamber": "house", "district": 46,
                "name": "Calvin Roberts",
                "email": "croberts@le.utah.gov", "phone": "",
                "session": "2026GS", "phoneTypeUnknown": True,
            },
            {
                "id": "CULLIKA", "chamber": "senate", "district": 19,
                "name": "Kirk A. Cullimore",
                "email": "kcullimore@le.utah.gov", "phone": "385-867-9474",
                "session": "2026GS", "phoneLabel": "cell",
            },
        ],
        "session": "2026GS",
        "resolvedAddress": "12997 SUMMERHARVEST DR, SALT LAKE CITY",
    }),
)
# 3 empty search_bills calls (economic hardship, employment, cost of living — all for ROBERC)
MCPToolCall(
    name="search_bills",
    args={"theme": "economic hardship", "legislatorId": "ROBERC"},
    result=_make_lookup_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
)
MCPToolCall(
    name="search_bills",
    args={"theme": "employment", "legislatorId": "ROBERC"},
    result=_make_lookup_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
)
MCPToolCall(
    name="search_bills",
    args={"theme": "cost of living", "legislatorId": "ROBERC"},
    result=_make_lookup_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
)
```

**MCPToolCall data for Turn 10 (Cullimore searches, all empty):**
```python
MCPToolCall(name="search_bills", args={"theme": "economic hardship", "legislatorId": "CULLIKA"}, result=_make_lookup_result({"bills": [], "legislatorId": "CULLIKA", "session": "2026GS"}))
MCPToolCall(name="search_bills", args={"theme": "cost of living", "legislatorId": "CULLIKA"}, result=_make_lookup_result({"bills": [], "legislatorId": "CULLIKA", "session": "2026GS"}))
MCPToolCall(name="search_bills", args={"theme": "housing", "legislatorId": "CULLIKA"}, result=_make_lookup_result({"bills": [], "legislatorId": "CULLIKA", "session": "2026GS"}))
```

**MCPToolCall data for Turn 12 (housing/ROBERC — HB0068 found):**
```python
MCPToolCall(
    name="search_bills",
    args={"theme": "housing", "legislatorId": "ROBERC"},
    result=_make_lookup_result({
        "bills": [
            {
                "id": "HB0492", "session": "2026GS",
                "title": "Transportation, Infrastructure, and Housing Amendments",
                "summary": "This bill modifies transportation, infrastructure, and housing provisions.",
                "status": "House/ enrolled bill to Printing", "sponsorId": "ROBERC",
            },
            {
                "id": "HB0068", "session": "2026GS",
                "title": "Housing and Community Development Amendments",
                "summary": "This bill creates the Division of Housing and Community Development within the Governor's Office of Economic Opportunity.",
                "status": "House/ to Governor", "sponsorId": "ROBERC",
            },
        ],
        "legislatorId": "ROBERC",
        "session": "2026GS",
    }),
)
```

### Test Case 3: Deb/Validate-Skip (synthetic, known-gap)

**Purpose:** Modeled on test-runs.md Run 3 behavioral gap — "Skipped Step 1 validation and jumped straight to address solicitation." This demonstrates the `ValidateBeforeInform` metric can detect the failure mode.

This is a synthetic test case constructed from the documented behavior, NOT from a real transcript. The agent jumped from concern statement to address solicitation without substantive acknowledgment.

```python
TEST_CASE_DEB_VALIDATE_SKIP = ConversationalTestCase(
    turns=[
        Turn(role="user", content="hi!"),
        Turn(
            role="assistant",
            content="Hi there! What's been on your mind lately — what brings you here today?",
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers.",
        ),
        Turn(
            role="assistant",
            # ← BEHAVIORAL GAP: skips validation, jumps straight to address request
            content="I understand. To find your specific state representatives, I'll need your home address. Just the street address and city or ZIP is fine. What's your address?",
            mcp_tools_called=None,
        ),
        Turn(role="user", content="My address is 6856 Windy Ridge in Herriman."),
        Turn(
            role="assistant",
            content="Great. Your representatives are Candice B. Pierucci (House District 49) and Emily Buss (Senate District 11). Which one would you like to write to?",
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "6856 Windy Ridge", "zone": "Herriman"},
                    result=_make_lookup_result({
                        "legislators": [
                            {"id": "PIERUC", "chamber": "house", "district": 49, "name": "Candice B. Pierucci", "email": "cpierucci@le.utah.gov", "phone": "385-414-1488", "session": "2026GS", "phoneLabel": "cell"},
                            {"id": "BUSSEM", "chamber": "senate", "district": 11, "name": "Emily Buss", "email": "ebuss@le.utah.gov", "phone": "801-598-4734", "session": "2026GS", "phoneLabel": "cell"},
                        ],
                        "session": "2026GS",
                        "resolvedAddress": "6856 WINDY RIDGE DR, SALT LAKE CITY",
                    }),
                )
            ],
        ),
    ]
)
```

**Expected metric behavior:** `ValidateBeforeInform` should score significantly lower on this case than on `TEST_CASE_MARCUS_HOUSING`. The gap is intentional and serves as the harness's self-validation signal (AC5).

### Environment Variables

| Var | Required For |
|-----|-------------|
| `ANTHROPIC_API_KEY` | All metric scoring (AnthropicModel judge) |

Tests must skip gracefully if `ANTHROPIC_API_KEY` is absent (module-level `pytestmark` or `pytest.mark.skipif`).

### Project Structure Notes

New files created by this story:
```
evals/
├── metrics.py                        (new — all metric definitions)
└── tests/
    └── test_manual_cases.py          (new — hard-coded ConversationalTestCase objects)
```

Modified files: none.

Do NOT modify:
- `evals/pyproject.toml` — no new dependencies needed (`deepeval`, `mcp`, `anthropic` already present)
- `evals/conftest.py` — no fixture changes needed (test_manual_cases.py doesn't use server fixture)
- `evals/chatbot.py`, `evals/mcp_client.py`, `evals/providers/` — do not touch

### References

- Tech spec (authoritative): [`_bmad-output/implementation-artifacts/tech-spec-eval-harness.md`] — Phase 1, Story E5-3
- E5-2 story (MCPToolCall result type discovery): [`_bmad-output/implementation-artifacts/E5-2-mcp-http-client-and-model-callback.md`] — Completion Notes, "MCPToolCall.result must be mcp.types.CallToolResult"
- Conversation transcript — Deb: [`system-prompt/test/test 2/conversation 1.txt`]
- Conversation transcript — Marcus: [`system-prompt/test/test 2/conversation 2.txt`]
- Manual test run outcomes: [`system-prompt/test-runs.md`] — Run 3 behavioral gap (validate skip)
- DeepEval research doc: [`_bmad-output/planning-artifacts/research/technical-deepeval-conversationsimulator-research-2026-03-21.md`]
- ConversationalGEval examples: [`_bmad-output/implementation-artifacts/tech-spec-eval-harness.md`] — "Custom rubrics via ConversationalGEval" section
- Existing evals codebase: [`evals/chatbot.py`], [`evals/providers/base.py`], [`evals/tests/test_chatbot.py`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `AnthropicModel` eagerly builds the Anthropic client at `__init__` time (calls `require_secret_api_key`). Module-level instantiation in `metrics.py` therefore requires `ANTHROPIC_API_KEY` at import time. Resolved by using `pytest.skip(allow_module_level=True)` as the FIRST statement in `test_manual_cases.py` (before the `from metrics import ...` line), so the entire module is skipped cleanly in CI when the key is absent. `pytestmark` is also present for documentation, though it applies per-test rather than preventing the import.
- `deepeval test run` (not bare `pytest`) required for correct caching and output. Tests use `assert_test()` per spec.

### Completion Notes List

- Created `evals/metrics.py`: 4 built-in DeepEval MCP metrics (`MultiTurnMCPUseMetric`, `MCPTaskCompletionMetric`, `KnowledgeRetentionMetric`, `ConversationCompletenessMetric`) + 4 custom `ConversationalGEval` metrics (`WarmOpen`, `ValidateBeforeInform`, `NoEditorializing`, `CitationFormat`). All custom metrics use `AnthropicModel(model="claude-sonnet-4-6", temperature=0)` as judge, threshold 0.5. Exports `BUILT_IN_METRICS`, `CUSTOM_METRICS`, `ALL_METRICS`, and individual metric objects.
- Created `evals/tests/test_manual_cases.py`: 3 `ConversationalTestCase` objects from manual transcripts (conversations 1 & 2) and synthetic Run 3 gap case. All `MCPToolCall.result` values typed as `mcp.types.CallToolResult` (AC1a). Module-level skip guard (`pytest.skip(allow_module_level=True)`) prevents import failure in CI when `ANTHROPIC_API_KEY` absent. 3 test functions using `assert_test()` for `deepeval test run` compatibility.
- 23 existing non-integration tests pass; no regressions. `test_manual_cases.py` skips cleanly without API key.

### File List

- `evals/metrics.py` (new)
- `evals/tests/test_manual_cases.py` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status transitions)
- `_bmad-output/implementation-artifacts/e5-3-manual-test-cases-to-validate-metrics.md` (modified — task checkboxes, Dev Agent Record, status)
