"""Hard-coded ConversationalTestCase objects from manual test transcripts.

Run with:
    cd evals && deepeval test run tests/test_manual_cases.py

NOT with bare pytest (skips DeepEval caching and output formatting).

All tests require ANTHROPIC_API_KEY — the module skips gracefully when absent.
"""

import json
import os

import mcp.types
import pytest
from deepeval import assert_test
from deepeval.test_case import ConversationalTestCase, MCPToolCall, Turn
from deepeval.test_case.mcp import MCPServer

# Skip entire module when API key is absent — must come before metrics import
# because AnthropicModel (used in metrics.py) requires ANTHROPIC_API_KEY at init time.
if not os.environ.get("ANTHROPIC_API_KEY"):
    pytest.skip("ANTHROPIC_API_KEY required", allow_module_level=True)

from metrics import ALL_METRICS, BUILT_IN_METRICS, CITATION_FORMAT, VALIDATE_BEFORE_INFORM, WARM_OPEN  # noqa: E402

pytestmark = pytest.mark.skipif(
    not os.environ.get("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY required",
)


# ---------------------------------------------------------------------------
# Helpers — build typed MCPToolCall results
# ---------------------------------------------------------------------------


def _make_lookup_result(payload: dict) -> mcp.types.CallToolResult:
    return mcp.types.CallToolResult(
        content=[mcp.types.TextContent(type="text", text=json.dumps(payload))],
        isError=False,
    )


def _make_search_result(payload: dict) -> mcp.types.CallToolResult:
    return mcp.types.CallToolResult(
        content=[mcp.types.TextContent(type="text", text=json.dumps(payload))],
        isError=False,
    )


# ---------------------------------------------------------------------------
# MCP server definition — required by MultiTurnMCPUseMetric / MCPTaskCompletionMetric
# ---------------------------------------------------------------------------

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
                "bill ID, title, summary, status, vote result, vote date, and session."
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


# ---------------------------------------------------------------------------
# Test Case 1: Deb/Education — partial happy path (conversation 1.txt)
# ---------------------------------------------------------------------------

TEST_CASE_DEB_EDUCATION = ConversationalTestCase(
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
            content=(
                "That sounds really hard — losing three teachers in one school is a significant disruption, "
                "especially for your daughter. I'd love to help you reach out to your Utah state legislators "
                "about this. Can I get your name and home address so I can look up who represents you?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="I'm corey. you need my address?"),
        Turn(
            role="assistant",
            content="Yes — just your street address and city or ZIP so I can look up your specific representatives.",
            mcp_tools_called=None,
        ),
        Turn(role="user", content="My address is 6856 Windy Ridge in Herriman."),
        Turn(
            role="assistant",
            content=(
                "Your Utah House representative is Candice B. Pierucci (District 49) and your Utah Senate "
                "representative is Emily Buss (District 11). Let me search for bills related to education "
                "that Candice has sponsored."
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "6856 Windy Ridge", "zone": "Herriman"},
                    result=_make_lookup_result({
                        "legislators": [
                            {
                                "id": "PIERUC",
                                "chamber": "house",
                                "district": 49,
                                "name": "Candice B. Pierucci",
                                "email": "cpierucci@le.utah.gov",
                                "phone": "385-414-1488",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                            {
                                "id": "BUSSEM",
                                "chamber": "senate",
                                "district": 11,
                                "name": "Emily Buss",
                                "email": "ebuss@le.utah.gov",
                                "phone": "801-598-4734",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                        ],
                        "session": "2026GS",
                        "resolvedAddress": "6856 WINDY RIDGE DR, SALT LAKE CITY",
                    }),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "public education funding", "legislatorId": "PIERUC"},
                    result=_make_search_result({
                        "bills": [],
                        "legislatorId": "PIERUC",
                        "session": "2026GS",
                    }),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "education funding", "legislatorId": "PIERUC"},
                    result=_make_search_result({
                        "bills": [],
                        "legislatorId": "PIERUC",
                        "session": "2026GS",
                    }),
                ),
            ],
        ),
        Turn(
            role="user",
            content=(
                "that's weird that it says salt lake city, but i recognize candice's name "
                "from a neighbor's campaign sign so it makes sense"
            ),
        ),
        Turn(
            role="assistant",
            content=(
                "Yes, that happens — the GIS lookup uses the official address but the district boundaries "
                "are what matter. I found a couple of bills Candice has sponsored related to education: "
                "HB0568 (Half-day Kindergarten Amendments) from 2025 and HB0280 (School District "
                "Administrator Authority) from 2025. Do either of these resonate with your concern?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "education", "legislatorId": "PIERUC"},
                    result=_make_search_result({
                        "bills": [
                            {
                                "id": "HB0568",
                                "session": "2025GS",
                                "title": "Half-day Kindergarten Amendments",
                                "summary": "This bill requires local education agencies (LEAs) to provide a half-day kindergarten class in each school.",
                                "status": "House/ filed",
                                "sponsorId": "PIERUC",
                            },
                            {
                                "id": "HB0280",
                                "session": "2025GS",
                                "title": "School District Administrator Authority",
                                "summary": "This bill amends the definition of an employee.",
                                "status": "House/ filed",
                                "sponsorId": "PIERUC",
                            },
                        ],
                        "legislatorId": "PIERUC",
                        "session": "2026GS",
                    }),
                ),
            ],
        ),
        Turn(
            role="user",
            content=(
                "yeah, i remember the half-day kindergarten, i really liked that! maybe if i tell her "
                "that and then tell her i'm disappointed in the recent funding cuts she'll remember me"
            ),
        ),
        Turn(
            role="assistant",
            content=(
                "That's a great approach — connecting a bill she championed (HB0568 from the 2025 session) "
                "to your current concern about funding cuts makes the message personal and grounded. "
                "Would you like to send this as an email or a text message? And what tone would you prefer — "
                "formal, conversational, or something in between?"
            ),
            mcp_tools_called=None,
        ),
    ],
    mcp_servers=[_ON_RECORD_MCP_SERVER],
)

# ---------------------------------------------------------------------------
# Test Case 2: Marcus/Housing — full happy path (conversation 2.txt)
# ---------------------------------------------------------------------------

TEST_CASE_MARCUS_HOUSING = ConversationalTestCase(
    turns=[
        Turn(role="user", content="hi!"),
        Turn(
            role="assistant",
            content="Hi there! What's been on your mind lately — what brings you here today?",
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="Things just feel wrong lately. Like my neighbors are struggling and I don't know why.",
        ),
        Turn(
            role="assistant",
            content=(
                "That sense of helplessness when the people around you are hurting is really difficult. "
                "Has any of this touched you or your household directly? And what's your name?"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content=(
                "I'm marcus. Yeah — my neighbor lost her job at the distribution center. She's got kids. "
                "I just feel like no one's doing anything."
            ),
        ),
        Turn(
            role="assistant",
            content=(
                "Marcus, that's genuinely hard to witness — a single parent losing steady work with kids "
                "depending on her. It makes complete sense that you want to do something. "
                "To find your specific Utah legislators, could you share your home address?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="12997 Summerharvest Dr, Draper is my address"),
        Turn(
            role="assistant",
            content=(
                "Your Utah House representative is Calvin Roberts (District 46) and your Utah Senate "
                "representative is Kirk A. Cullimore (District 19). Let me search for bills related to "
                "economic hardship and employment that Calvin has sponsored."
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "12997 Summerharvest Dr", "zone": "Draper"},
                    result=_make_lookup_result({
                        "legislators": [
                            {
                                "id": "ROBERC",
                                "chamber": "house",
                                "district": 46,
                                "name": "Calvin Roberts",
                                "email": "croberts@le.utah.gov",
                                "phone": "",
                                "session": "2026GS",
                                "phoneTypeUnknown": True,
                            },
                            {
                                "id": "CULLIKA",
                                "chamber": "senate",
                                "district": 19,
                                "name": "Kirk A. Cullimore",
                                "email": "kcullimore@le.utah.gov",
                                "phone": "385-867-9474",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                        ],
                        "session": "2026GS",
                        "resolvedAddress": "12997 SUMMERHARVEST DR, SALT LAKE CITY",
                    }),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "economic hardship", "legislatorId": "ROBERC"},
                    result=_make_search_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "employment", "legislatorId": "ROBERC"},
                    result=_make_search_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "cost of living", "legislatorId": "ROBERC"},
                    result=_make_search_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
                ),
            ],
        ),
        Turn(role="user", content="what about for senator cullimore?"),
        Turn(
            role="assistant",
            content=(
                "Let me search Senator Cullimore's sponsored bills for related themes."
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "economic hardship", "legislatorId": "CULLIKA"},
                    result=_make_search_result({"bills": [], "legislatorId": "CULLIKA", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "cost of living", "legislatorId": "CULLIKA"},
                    result=_make_search_result({"bills": [], "legislatorId": "CULLIKA", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "housing", "legislatorId": "CULLIKA"},
                    result=_make_search_result({"bills": [], "legislatorId": "CULLIKA", "session": "2026GS"}),
                ),
            ],
        ),
        Turn(role="user", content="can we search for something to do with housing from cal?"),
        Turn(
            role="assistant",
            content=(
                "I found two housing-related bills Calvin Roberts has sponsored: "
                "HB0492 (Transportation, Infrastructure, and Housing Amendments) and "
                "HB0068 (Housing and Community Development Amendments) — HB 68 from this session "
                "creates a new Division of Housing and Community Development. Do either of these "
                "sound relevant to what you're concerned about?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="search_bills",
                    args={"theme": "housing", "legislatorId": "ROBERC"},
                    result=_make_search_result({
                        "bills": [
                            {
                                "id": "HB0492",
                                "session": "2026GS",
                                "title": "Transportation, Infrastructure, and Housing Amendments",
                                "summary": "This bill modifies transportation, infrastructure, and housing provisions.",
                                "status": "House/ enrolled bill to Printing",
                                "sponsorId": "ROBERC",
                            },
                            {
                                "id": "HB0068",
                                "session": "2026GS",
                                "title": "Housing and Community Development Amendments",
                                "summary": "This bill creates the Division of Housing and Community Development within the Governor's Office of Economic Opportunity.",
                                "status": "House/ to Governor",
                                "sponsorId": "ROBERC",
                            },
                        ],
                        "legislatorId": "ROBERC",
                        "session": "2026GS",
                    }),
                ),
            ],
        ),
        Turn(role="user", content="yeah i remember hearing about 68"),
        Turn(
            role="assistant",
            content=(
                "HB 68 from this session — Housing and Community Development Amendments — is a good anchor. "
                "Would you like to send Calvin an email or a text message? And what tone feels right — "
                "formal, conversational, or something in between?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="yeah let's text him about it,"),
        Turn(
            role="assistant",
            content=(
                "Marcus from Draper here. Seeing my neighbor struggle after losing her job has been really "
                "hard. I'm following HB 68 from this session and hope we can keep supporting families like "
                "hers. — Marcus"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="i'd like to ask him how the changes will support her, and i don't need to sign my name",
        ),
        Turn(
            role="assistant",
            content=(
                "A Draper constituent here. My neighbor lost her job and has kids — it's been hard to watch. "
                "How will HB 68 from this session support families like hers?"
            ),
            mcp_tools_called=None,
        ),
    ],
    mcp_servers=[_ON_RECORD_MCP_SERVER],
)

# ---------------------------------------------------------------------------
# Test Case 3: Deb/Validate-Skip — synthetic known-gap case (modeled on Run 3)
# ---------------------------------------------------------------------------

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
            # BEHAVIORAL GAP: skips validation, jumps straight to address request
            content=(
                "I understand. To find your specific state representatives, I'll need your home address. "
                "Just the street address and city or ZIP is fine. What's your address?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="My address is 6856 Windy Ridge in Herriman."),
        Turn(
            role="assistant",
            content=(
                "Great. Your representatives are Candice B. Pierucci (House District 49) and Emily Buss "
                "(Senate District 11). Which one would you like to write to?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "6856 Windy Ridge", "zone": "Herriman"},
                    result=_make_lookup_result({
                        "legislators": [
                            {
                                "id": "PIERUC",
                                "chamber": "house",
                                "district": 49,
                                "name": "Candice B. Pierucci",
                                "email": "cpierucci@le.utah.gov",
                                "phone": "385-414-1488",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                            {
                                "id": "BUSSEM",
                                "chamber": "senate",
                                "district": 11,
                                "name": "Emily Buss",
                                "email": "ebuss@le.utah.gov",
                                "phone": "801-598-4734",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                        ],
                        "session": "2026GS",
                        "resolvedAddress": "6856 WINDY RIDGE DR, SALT LAKE CITY",
                    }),
                ),
            ],
        ),
    ]
)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_deb_education():
    """Deb/Education partial happy path — built-in metrics + WarmOpen + CitationFormat."""
    assert_test(TEST_CASE_DEB_EDUCATION, metrics=BUILT_IN_METRICS + [WARM_OPEN, CITATION_FORMAT])


def test_marcus_housing_happy_path():
    """Marcus/Housing full happy path — all metrics. Known-good case: should pass threshold 0.5."""
    assert_test(TEST_CASE_MARCUS_HOUSING, metrics=ALL_METRICS)


def test_deb_validate_skip():
    """Deb/Validate-Skip synthetic gap case — ValidateBeforeInform only.

    This case intentionally skips empathetic validation; expected to score lower
    than test_marcus_housing_happy_path on ValidateBeforeInform (AC5).
    """
    assert_test(TEST_CASE_DEB_VALIDATE_SKIP, metrics=[VALIDATE_BEFORE_INFORM])
