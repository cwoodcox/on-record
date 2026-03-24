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


# ---------------------------------------------------------------------------
# Helpers — build typed MCPToolCall results
# ---------------------------------------------------------------------------


def _make_lookup_result(payload: dict) -> mcp.types.CallToolResult:
    text = json.dumps(payload)
    return mcp.types.CallToolResult(
        content=[mcp.types.TextContent(type="text", text=text)],
        # structuredContent is required by DeepEval's built-in MCP metrics
        # (MultiTurnMCPUseMetric, MCPTaskCompletionMetric) — their _get_tasks()
        # method accesses tool.result.structuredContent['result'] to render tool
        # output in the LLM prompt. Without it, the access raises TypeError on
        # None and the metric silently scores 0.0.
        structuredContent={"result": text},
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


# ---------------------------------------------------------------------------
# Test Case 1: Deb/Plumb — zero-result email, full happy path (test 1/conversation 1.txt)
# Concern: education funding cuts, art teacher lost. No bills found for Sen. Plumb.
# Proceeds to email without citation. Two revisions, approved.
# ---------------------------------------------------------------------------

TEST_CASE_DEB_PLUMB = ConversationalTestCase(
    turns=[
        Turn(role="user", content="Hi!"),
        Turn(
            role="assistant",
            content="What's been on your mind lately — what brings you here today?",
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers.",
        ),
        Turn(
            role="assistant",
            content=(
                "That's heartbreaking — losing three teachers isn't just a budget number, it's real people "
                "who know your daughter, who she's built relationships with. That kind of disruption ripples "
                "through a school in ways that are hard to fully capture on a spreadsheet.\n\n"
                "Has this affected your daughter directly — like losing a favorite teacher, bigger class "
                "sizes, or programs being cut?"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="Her art teacher was her favorite, and he's gone now. I hope her class size won't get any bigger, it's already bigger than the rest!",
        ),
        Turn(
            role="assistant",
            content=(
                "Losing her favorite teacher — that's such a specific, personal loss. Art can be such a "
                "meaningful outlet for kids, and when the teacher who made that space special is gone, it's "
                "not easy to just \"move on.\" And the worry about class sizes on top of that, especially "
                "when her class is already larger than others — that's a real concern about whether she's "
                "getting the attention she deserves.\n\n"
                "To look up your specific state legislators, could you share your address? Just your street "
                "address and city or ZIP is fine."
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="742 evergreen terrace, salt lake"),
        Turn(
            role="assistant",
            content=(
                "Got it! Based on your address, your state representatives are:\n\n"
                "- Grant Amjad Miller, House of Representatives, District 24\n"
                "- Jen Plumb, State Senate, District 9\n\n"
                "Which one would you like to write to?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "742 Evergreen Terrace", "zone": "Salt Lake"},
                    result=_make_lookup_result({
                        "legislators": [
                            {
                                "id": "MILLGR",
                                "chamber": "house",
                                "district": 24,
                                "name": "Grant Amjad Miller",
                                "email": "gmiller@le.utah.gov",
                                "phone": "801-597-1247",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                            {
                                "id": "PLUMBJ",
                                "chamber": "senate",
                                "district": 9,
                                "name": "Jen Plumb",
                                "email": "jplumb@le.utah.gov",
                                "phone": "801-870-0228",
                                "session": "2026GS",
                                "phoneLabel": "cell",
                            },
                        ],
                        "session": "2026GS",
                        "resolvedAddress": "742 EVERGREEN TER, SALT LAKE CITY",
                    }),
                ),
            ],
        ),
        Turn(role="user", content="I've heard of Jen, can I send her an email?"),
        Turn(
            role="assistant",
            content=(
                "It looks like Sen. Plumb hasn't sponsored any bills specifically tagged to public education "
                "funding in the current session. That doesn't mean she hasn't been active on the issue, but "
                "it's the limit of what I can surface here.\n\n"
                "Would you like me to try searching from a different angle? For example, I could look for "
                "bills related to teacher staffing or workforce, arts education, or school budgets or "
                "appropriations. Just say the word and I'll try another search."
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="search_bills",
                    args={"legislatorId": "PLUMBJ", "theme": "public education funding"},
                    result=_make_lookup_result({"bills": [], "legislatorId": "PLUMBJ", "session": "2026GS"}),
                ),
            ],
        ),
        Turn(role="user", content="could you check for older bills?"),
        Turn(
            role="assistant",
            content=(
                "Unfortunately the tool I have access to only searches within the current session "
                "(2026 General Session) — I don't have a way to pull bills from previous sessions. "
                "That's a real limitation here, and I'm sorry I can't dig deeper into her history that way.\n\n"
                "What I can do is try a few different search angles within the current session to see if "
                "anything surfaces. Want me to try searching for something like \"arts education\" or "
                "\"teacher staffing\" — both of which tie closely to what you're experiencing with your "
                "daughter's school?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="yeah see if you can find something"),
        Turn(
            role="assistant",
            content=(
                "Unfortunately, both searches came up empty too. It's possible Sen. Plumb simply hasn't "
                "sponsored bills in these areas during the current session, or the bills are categorized "
                "differently than the terms I'm searching.\n\n"
                "Here's the thing though — that doesn't mean your message isn't worth sending. In fact, "
                "constituent emails that raise a concern the legislator hasn't visibly acted on can be "
                "especially impactful. It puts the issue on her radar directly from a real constituent "
                "with a real story.\n\n"
                "We can still write a compelling email that shares your daughter's experience, raises the "
                "broader issue of education funding cuts in your district, and asks Sen. Plumb what she's "
                "doing or plans to do about it. Would you like to go ahead?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="search_bills",
                    args={"legislatorId": "PLUMBJ", "theme": "arts education"},
                    result=_make_lookup_result({"bills": [], "legislatorId": "PLUMBJ", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"legislatorId": "PLUMBJ", "theme": "teacher staffing"},
                    result=_make_lookup_result({"bills": [], "legislatorId": "PLUMBJ", "session": "2026GS"}),
                ),
            ],
        ),
        Turn(role="user", content="that sounds like a really good plan"),
        Turn(
            role="assistant",
            content=(
                "Wonderful! Just two quick questions before I write the draft:\n\n"
                "1. Tone — Would you like it to be conversational (personal, in your own voice) or formal "
                "(professional and structured)?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="personal"),
        Turn(
            role="assistant",
            content="Got it — personal and conversational it is. And just to confirm, you'd like this sent as an email, right?",
            mcp_tools_called=None,
        ),
        Turn(role="user", content="yeah, email is fine but I don't want it to be too long!"),
        Turn(
            role="assistant",
            content=(
                "Perfect — I'll keep it tight and personal. Here's your draft:\n\n"
                "---\n"
                "To: jplumb@le.utah.gov\n"
                "Subject: A Concerned Parent in District 9 — Our Schools Need Help\n\n"
                "Dear Senator Plumb,\n\n"
                "My name is [Your Name], and I live in Salt Lake City in your district. I'm reaching out "
                "because I'm worried about what's happening in our local schools — and I think you should "
                "hear it from a parent directly.\n\n"
                "This year, my daughter's school lost three teachers. One of them was her art teacher — her "
                "absolute favorite. Art was the part of the school day she loved most, and now it's gone. "
                "On top of that, her class is already larger than others at the school, and I'm scared it's "
                "only going to get bigger.\n\n"
                "I know budget decisions are complicated, but I'd really love to know what you're doing — "
                "or planning to do — to address education funding in our district. Our kids deserve smaller "
                "classes, great teachers, and programs that make school worth showing up for.\n\n"
                "Thank you so much for your time. I'd be grateful to hear back.\n\n"
                "Warm regards,\n"
                "[Your Name]\n"
                "742 Evergreen Terrace, Salt Lake City\n"
                "---\n\n"
                "Would you like any changes — different wording, shorter, more detail on something specific?"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="my name is Deb, and can you make it shorter and add that I've lived in Salt Lake City for 15 years?",
        ),
        Turn(
            role="assistant",
            content=(
                "Here's the revised draft:\n\n"
                "---\n"
                "To: jplumb@le.utah.gov\n"
                "Subject: A Concerned Parent in District 9 — Our Schools Need Help\n\n"
                "Dear Senator Plumb,\n\n"
                "My name is Deb, and I've lived in Salt Lake City for 15 years. I'm reaching out because "
                "I'm worried about what's happening in our local schools.\n\n"
                "This year, my daughter's school lost three teachers — including her art teacher, her "
                "absolute favorite. Her class is already larger than others, and I'm scared it's going to "
                "get even bigger. These cuts have a real impact on real kids.\n\n"
                "I'd love to know what you're doing to support education funding in our district. Our "
                "children deserve better.\n\n"
                "Warm regards,\n"
                "Deb\n"
                "742 Evergreen Terrace, Salt Lake City\n"
                "---\n\n"
                "Short, personal, and straight from the heart. Would you like any other changes, or is "
                "this ready to send?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="That's perfect!"),
        Turn(
            role="assistant",
            content=(
                "So glad it feels right! Here's everything you need to send it on your way:\n\n"
                "- To: jplumb@le.utah.gov\n"
                "- Subject: A Concerned Parent in District 9 — Our Schools Need Help\n"
                "- Phone: 801-870-0228 (cell) — if you'd ever prefer to call instead\n\n"
                "Your story is exactly the kind of thing legislators need to hear. A 15-year resident, a "
                "real kid, a real loss — that matters. Good luck, Deb, and I hope Sen. Plumb responds!"
            ),
            mcp_tools_called=None,
        ),
    ],
    mcp_servers=[_ON_RECORD_MCP_SERVER],
)

# ---------------------------------------------------------------------------
# Test Case 2: Marcus/Roberts — bill-found text, full happy path (test 1/conversation 2.txt)
# Concern: cost of living / neighbors struggling. HB 586 found via transportation search.
# Two revisions (add name, offer to help), approved.
# ---------------------------------------------------------------------------

TEST_CASE_MARCUS_ROBERTS = ConversationalTestCase(
    turns=[
        Turn(role="user", content="hi!"),
        Turn(
            role="assistant",
            content="Hi there! Welcome.\n\nWhat's been on your mind lately — what brings you here today?",
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="Things just feel wrong lately. Like my neighbors are struggling and I don't know why.",
        ),
        Turn(
            role="assistant",
            content=(
                "That feeling that something's off — and watching the people around you struggle — that's "
                "really hard to sit with, especially when you can't quite put your finger on what's driving it.\n\n"
                "Can you tell me a bit more about what you're seeing? Is it more about money being tight, "
                "jobs, housing costs, something else? And has any of this touched you or your family directly?"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="like i know that i'm making more money than i ever have, but i feel like the budget is tighter than it's ever been. but i'm not living extravagantly or anything!",
        ),
        Turn(
            role="assistant",
            content=(
                "That is such a disorienting feeling — working harder, earning more, and somehow still "
                "feeling like you're falling behind. You're not imagining it, and you're definitely not "
                "alone in that experience. The gap between what your paycheck says and what life actually "
                "costs has been a real and growing tension for a lot of people.\n\n"
                "So it sounds like the core of it is cost of living — things like groceries, housing, "
                "utilities, maybe healthcare — just quietly getting more expensive faster than your income "
                "can keep up?\n\n"
                "Has anything specific really stood out to you — like a bill that shocked you, or something "
                "you used to be able to afford that now feels out of reach?"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="i had heard there was a good bill trying to build more transit and housing to reduce cost of living, but that it was stuck",
        ),
        Turn(
            role="assistant",
            content=(
                "That's really frustrating — especially when you can see a potential solution out there and "
                "it feels like it's being blocked. Transit and housing access are exactly the kinds of things "
                "that can make a real difference in what everyday life actually costs people.\n\n"
                "To find out who your specific state representatives are and what they've been doing on "
                "issues like this, I'll need your address — just your street address and city or ZIP is fine."
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="yeah it's 12997 summerharvest in draper"),
        Turn(
            role="assistant",
            content=(
                "Got it! Based on your address, your Utah state representatives are:\n\n"
                "- Calvin Roberts, House of Representatives, District 46\n"
                "- Kirk A. Cullimore, Senate, District 19\n\n"
                "Which one would you like to write to?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="lookup_legislator",
                    args={"street": "12997 Summerharvest", "zone": "Draper"},
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
            ],
        ),
        Turn(role="user", content="i've heard of cal, let's text him"),
        Turn(
            role="assistant",
            content=(
                "There we go! Rep. Roberts has sponsored some transportation-related bills:\n\n"
                "1. HB 586 — Transportation Funding Amendments — Addresses how transportation is funded in "
                "Utah. Currently filed in the House (still in progress for the 2026 General Session).\n"
                "2. HB 471 — Transportation Procurement Amendments — Dealt with how the Department of "
                "Transportation handles procurement. Signed by the Governor in the 2025 General Session.\n\n"
                "Neither of these is specifically about transit + housing to reduce costs — the bill you "
                "heard about may not be something Rep. Roberts has sponsored directly. Would you like to "
                "write to him anyway about your cost-of-living concerns and the kind of bill you'd like to "
                "see him support, or try a different search angle?"
            ),
            mcp_tools_called=[
                MCPToolCall(
                    name="search_bills",
                    args={"legislatorId": "ROBERC", "theme": "transit housing cost of living"},
                    result=_make_lookup_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"legislatorId": "ROBERC", "theme": "housing affordability"},
                    result=_make_lookup_result({"bills": [], "legislatorId": "ROBERC", "session": "2026GS"}),
                ),
                MCPToolCall(
                    name="search_bills",
                    args={"legislatorId": "ROBERC", "theme": "transportation"},
                    result=_make_lookup_result({
                        "bills": [
                            {
                                "id": "HB0586",
                                "session": "2026GS",
                                "title": "Transportation Funding Amendments",
                                "summary": "This bill addresses how transportation is funded in Utah.",
                                "status": "House/ filed",
                                "sponsorId": "ROBERC",
                            },
                            {
                                "id": "HB0471",
                                "session": "2025GS",
                                "title": "Transportation Procurement Amendments",
                                "summary": "This bill modifies how the Department of Transportation handles procurement.",
                                "status": "Governor/ signed",
                                "sponsorId": "ROBERC",
                            },
                        ],
                        "legislatorId": "ROBERC",
                        "session": "2026GS",
                    }),
                ),
            ],
        ),
        Turn(role="user", content="what does hb 586 do?"),
        Turn(
            role="assistant",
            content=(
                "Based on what the tool returned, HB 586 — Transportation Funding Amendments addresses how "
                "transportation is funded in Utah. That's honestly about all the detail I have on it — the "
                "summary is pretty sparse.\n\n"
                "What I can say is that it's currently filed in the House for the 2026 General Session, "
                "meaning it's still active and in play. That actually makes it a great moment to reach out "
                "— Rep. Roberts is the sponsor, so a message from a constituent right now could genuinely "
                "matter.\n\n"
                "Would you like to write to him about your cost-of-living concerns and reference this bill?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="let's talk about that"),
        Turn(
            role="assistant",
            content=(
                "Great — let's do it! You mentioned you want to send a text — would you like the tone to be "
                "conversational (personal, in your own voice) or formal (professional, structured)?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="conversational, it's a text. i've heard they reply"),
        Turn(
            role="assistant",
            content=(
                "Here's a draft text for Rep. Roberts:\n\n"
                "---\n"
                "Rep. Roberts — I'm a constituent in Draper and I'm feeling the squeeze. Making more than "
                "ever but my budget is tighter than it's ever been. I know my neighbors are too. I'm "
                "watching HB 586 and hoping it can help. Will you fight to make sure it moves forward? "
                "— [Your Name]\n\n"
                "(HB 586, 2026 General Session, currently filed in House)\n"
                "---\n\n"
                "Short, personal, and direct — and it names the bill so he knows you've done your homework. "
                "Want me to tweak anything?"
            ),
            mcp_tools_called=None,
        ),
        Turn(
            role="user",
            content="my name is marcus and maybe i could offer my help to move it forward?",
        ),
        Turn(
            role="assistant",
            content=(
                "Nice, Marcus — offering to help is a great touch. Here's the revised draft:\n\n"
                "---\n"
                "Rep. Roberts — I'm Marcus, a constituent in Draper. I'm making more than ever but my "
                "budget is tighter than it's ever been, and I see my neighbors struggling too. I'm watching "
                "HB 586 and believe it could help. How can I support you in moving it forward?\n\n"
                "(HB 586, 2026 General Session, currently filed in House)\n"
                "---\n\n"
                "Ends with a question, which makes it easy for him to respond. Want any other changes, or "
                "is this ready to send?"
            ),
            mcp_tools_called=None,
        ),
        Turn(role="user", content="i like it!"),
        Turn(
            role="assistant",
            content=(
                "Awesome, Marcus! Here's everything you need to send it:\n\n"
                "To: Rep. Calvin Roberts\n"
                "Email: croberts@le.utah.gov\n"
                "(No cell number on file for Rep. Roberts, but this message works great as an email too.)\n\n"
                "---\n"
                "Rep. Roberts — I'm Marcus, a constituent in Draper. I'm making more than ever but my "
                "budget is tighter than it's ever been, and I see my neighbors struggling too. I'm watching "
                "HB 586 and believe it could help. How can I support you in moving it forward?\n\n"
                "(HB 586, 2026 General Session, currently filed in House)\n"
                "---\n\n"
                "Good luck — and it's genuinely great that you're reaching out. Constituent voices matter, "
                "especially on a bill that's still in play. I hope he writes back!"
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
    ],
    mcp_servers=[_ON_RECORD_MCP_SERVER],
)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_deb_plumb_zero_result_email():
    """Deb/Plumb — zero-result fallback path, email without citation, full flow.
    Source: test 1/conversation 1.txt.
    CitationFormat should score N/A (correctly absent per rubric).
    """
    assert_test(TEST_CASE_DEB_PLUMB, metrics=BUILT_IN_METRICS + [WARM_OPEN, CITATION_FORMAT])


def test_marcus_roberts_bill_found_text():
    """Marcus/Roberts — bill found, text with citation, full flow including revision.
    Source: test 1/conversation 2.txt. Known-good case: should pass all metrics at 0.5.
    """
    assert_test(TEST_CASE_MARCUS_ROBERTS, metrics=ALL_METRICS)


def test_deb_validate_skip():
    """Deb/Validate-Skip synthetic gap case — ValidateBeforeInform only.

    This case intentionally skips empathetic validation; expected to score lower
    than Marcus on ValidateBeforeInform (AC5 gap detection).
    """
    assert_test(TEST_CASE_DEB_VALIDATE_SKIP, metrics=[VALIDATE_BEFORE_INFORM])
    deb_skip_score = VALIDATE_BEFORE_INFORM.score

    # Verify behavioral gap: deb-skip must score strictly below Marcus on this metric
    VALIDATE_BEFORE_INFORM.measure(TEST_CASE_MARCUS_ROBERTS)
    marcus_score = VALIDATE_BEFORE_INFORM.score

    assert deb_skip_score < marcus_score, (
        f"Gap detection failed: validate-skip scored {deb_skip_score:.2f}, "
        f"Marcus scored {marcus_score:.2f} — expected skip < marcus on ValidateBeforeInform"
    )
