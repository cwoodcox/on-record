# Manual Test Run Log

**Pass criterion: 4 of 5 runs = Pass**
**Overall Pass/Fail definition:** "Pass" means the 4-step flow completed end-to-end (FR27) — warm open → address lookup → bill surfacing → draft generated → revision tested. Individual step check failures (e.g., Step 1 Validate ❌) are behavioral gaps tracked below; they do not fail the run unless the flow itself did not complete.
**Current: 5/5 complete, 5 Pass**

| Run | Persona | Model | Step Outcomes | Overall | Log |
|-----|---------|-------|---------------|---------|-----|
| 1 | A — Deb | Claude Sonnet 4.6 | Step 1 Warm ✅<br>Step 1 Validate ✅<br>Step 2 Tool ✅<br>Step 2 Params ✅<br>Step 3 No Menu ✅<br>Step 3 Confirm ✅<br>Step 4a Prefs ✅<br>Step 4b Draft ✅<br>Step 4b Citation N/A²<br>Revision ✅ | ✅ Pass | [conversation 1](../on-record-test/conversation%201.txt) |
| 2 | B — Marcus | Claude Sonnet 4.6 | Step 1 Warm ✅<br>Step 1 Validate ✅<br>Step 2 Tool ✅<br>Step 2 Params ✅<br>Step 3 No Menu ✅<br>Step 3 Confirm ✅<br>Step 4a Prefs ✅<br>Step 4b Draft ✅<br>Step 4b Citation ✅<br>Revision ✅ | ✅ Pass | [conversation 2](../on-record-test/conversation%202.txt) |
| 3 | A — Deb | Gemini Flash 2.5 | Step 1 Warm ✅<br>Step 1 Validate ❌ (behavioral gap — see note)<br>Step 2 Tool ✅<br>Step 2 Params ✅<br>Step 3 No Menu ✅<br>Step 3 Confirm ✅<br>Step 4a Prefs ✅<br>Step 4b Draft ✅<br>Step 4b Citation ✅<br>Revision ✅ | ✅ Pass¹ | [conversation 3](../on-record-test/conversation%203.txt) |
| 4 | B — Marcus | Gemini Flash 2.5 | Step 1 Warm ✅<br>Step 1 Validate ✅<br>Step 2 Tool ✅<br>Step 2 Params ✅<br>Step 3 No Menu ✅<br>Step 3 Confirm ✅<br>Step 4a Prefs ✅<br>Step 4b Draft ✅<br>Step 4b Citation ✅<br>Revision ✅ | ✅ Pass | [conversation 4](../on-record-test/conversation%204.txt) |
| 5 | A — Deb | Claude Sonnet 4.6 | Step 1 Warm ✅<br>Step 1 Validate ✅<br>Step 2 Tool ✅<br>Step 2 Params ✅<br>Step 3 No Menu ✅<br>Step 3 Confirm ✅<br>Step 4a Prefs ✅<br>Step 4b Draft ✅<br>Step 4b Citation N/A²<br>Revision ✅ | ✅ Pass | [conversation 5](../on-record-test/conversation%205.txt) |

¹ **Run 3 Pass rationale:** Step 1 Validate failed (Gemini skipped empathetic acknowledgment and jumped to address solicitation), which is a noted behavioral gap. However, all 4 steps were executed, a draft was generated, and the revision loop was tested — the full end-to-end flow completed per FR27. Marked Pass per the overall pass definition above. The validate-before-inform instruction in Step 1 of `agent-instructions.md` has been present throughout; this appears to be a model compliance variance, not a missing instruction. Flagged as a behavioral gap to monitor in future runs.

² **N/A rationale (Runs 1 & 5):** No bill was confirmed during Step 3 (zero-result fallback path). Under AC 10, the draft must contain no fabricated citation when no bill was selected — so Citation N/A means the citation requirement was correctly bypassed, not that a required citation was missing. The LLM handled this correctly in both runs.

### Run Notes

**Run 1:** GIS resolved fake address; legislators/topics didn't align naturally because of the test data (no citation possible) but the flow handled mismatches gracefully. LLM incorrectly told the constituent it could not search previous legislative sessions — prompt refined to clarify. Citation ❌ is acceptable per AC 10 (no bill confirmed via zero-result fallback).

**Run 2:** No cell number available for the rep but this wasn't surfaced until the final draft was presented. LLM remembered text preference from an earlier message ("let's text Cal"). Would have liked more detail on the bill but LLM correctly did not reach for non-MCP tools to fill the gap.

**Run 3:** Skipped Step 1 validation and jumped straight to address solicitation. Could not locate HB 241 (Charter School Amendments, 2026GS) — Gemini refused to proceed with a citation it couldn't verify (correct behavior, though frustrating when the constituent was right). Gemini made repeated tool calls attempting to find it; ultimately proceeded with a 2025 bill. HB 241 absence likely due to `lastAction` Zod validation bug silently dropping bills from cache.

**Run 4:** More validation this time. Draft was impersonal — LLM never asked for the constituent's name. Bill summary in cache was thin so the draft felt empty. LLM insisted on an explicit formality preference even when the constituent's tone was obvious ("I just want to have a chat with Cullimore about this") — felt forced.

**Run 5:** Legislators and topics didn't align naturally due to test data (no citation possible). Claude was excellent at redirecting and reassuring the constituent that a specific bill wasn't required to proceed. Citation ❌ is acceptable per AC 10 (no bill confirmed via zero-result fallback).

---

## Overall Notes

### Run 1 Session Limitation Misunderstanding

The LLM incorrectly told the constituent it could not search previous legislative sessions. In reality `searchBillsByTheme` has no session filter — it searches all bills in the cache, which during inter-session periods includes the 2 most recently completed sessions (currently 2025GS + 2026GS). The top-level `session` field in `SearchBillsResult` is just a response label, not a filter.

**Prompt fix applied (inline, pre-review):** Added a clarifying note to the `search_bills` result schema in `agent-instructions.md` explaining that the top-level `session` is a label only, that each bill carries its own `session` field, and that the search spans all cached sessions. Small enough to fix immediately; no code change required.

### Run 1 Address Mismatch

The legislators were correct _for the address the tool resolved_ but that address was barely similar to the address the user provided. System prompt needs to know to check that the address resolved is plausibly similar to **the address the user provided** (not the one it may have modified and sent to the tool) and ask the user to confirm if it's uncertain.

**Resolved in post-review pass:** `resolvedAddress` verification instruction added to Step 2 of `agent-instructions.md`.

### lookup_legislators argument description

It looks like the zone being a ZIP code makes the address lookup a lot more strict. This is just a casual observation but if we can prove this out or find supporting documentation it's probably worth supplying to the LLM to increase its trust in the resolved address's accuracy. However, LLMs shouldn't attempt to guess the ZIP code to increase accuracy.

### Always Mention Constituency

We should always be mentioning that the user is a constituent and which city they are in, since districts very often contain more than one city. Eventually we may allow users to target other legislators as non-constituents, and we'll also need to disclose that.

**Resolved in post-review pass:** Local identity instruction added to Step 4b of `agent-instructions.md`.

### Occasional bill loading error (Bug)

Bills with an empty `lastAction` field from the Utah Legislature API fail Zod validation during cache refresh and are silently dropped. This is almost certainly why 2026GS HB241 (Charter School Amendments) was not found in Run 3 — Gemini wasn't wrong, the bill genuinely wasn't cached. Likely affects more bills than just that one.

**Fix:** Make `lastAction` optional or allow empty string in the Zod schema for the bill API response, or coerce empty string to `undefined`/`null` at the provider boundary. Needs a story — touches `providers/utah-legislature.ts` and possibly `packages/types/`.

```
ZodError: [
  {
    "code": "too_small",
    "minimum": 1,
    "type": "string",
    "inclusive": true,
    "exact": false,
    "message": "String must contain at least 1 character(s)",
    "path": [
      "lastAction"
    ]
  }
]
```

---

## Future Work — Optional Legislator Filter in search_bills

**Idea:** Make `legislatorId` optional in the `search_bills` MCP tool, enabling cross-legislator bill search as a fallback.

**Product rationale:** Constituents who already know about a bill (or want to cite another legislator's sponsored legislation for support/opposition context) shouldn't be blocked by the legislator-filter gate. The draft is still addressed to their rep from Step 2; the cross-legislator bill is cited as supporting/opposing evidence.

**Open questions before speccing:**
- Result cap without legislator filter (top 3 instead of 5? session-scoped?)
- `SearchBillsResult.legislatorId` field — drop it or make it optional?
- Agent flow branch — constituent-initiated detour vs. agent proactively offering when results are sparse?
- Drafting still addressed to the constituent's own rep?

**Touches:** `packages/types/` (SearchBillsResult), `cache/bills.ts` (searchBillsByTheme), `tools/search-bills.ts` (Zod schema), `system-prompt/agent-instructions.md` (Step 3 fallback branch)

---

## Future Work — Bill Detail / Expanded Summary

**Observed in Run 2:** The constituent wanted more information about a bill to better understand it before confirming. The LLM relied solely on the `summary` field from the cache rather than attempting to fetch additional detail — which is the correct behavior given the current tool set, but leaves a gap when the cached summary is thin.

**Options to explore:**
- Add a `get_bill_detail` MCP tool that fetches full bill text or expanded summary from the Utah Legislature API on demand
- Enrich the bill cache at write time (pull more fields from the API during refresh so `summary` is more useful)
- Prompt instruction: allow the LLM to offer "I can look into this more" and re-call `search_bills` with a narrower theme if the constituent wants to dig deeper

**Note:** The LLM correctly did not reach for non-MCP tools (web search, etc.) to fill the gap — that boundary held as intended.

---

## Future Work — SMS Citation Format

**Observed in Run 4:** Including a full bill citation inline in an SMS draft felt awkward and stilted. The citation requirement (AC 9) was designed with email in mind.

**Resolved in post-review pass:** Citation format now distinguishes by medium — inline prose for email where natural, condensed trailing reference for SMS when inline doesn't fit. See `agent-instructions.md` Step 4b.

---

## Future Work — Tone Inference from Constituent Language

**Observed in Run 4:** The constituent signaled conversational tone clearly ("I want to have a chat with Cullimore about this"). The agent still asked explicitly for formality preference, which felt forced and slightly absurd in context.

**Resolved in post-review pass:** Tone inference escape hatch added to Step 4a — confirm if unambiguous, explicit ask as fallback.

---

## Future Work — Response Tracking ("Did They Answer You?")

**Idea:** After delivering the draft, the agent instructs the constituent to come back and report whether they received a response from their legislator. Maintains a simple log of outcomes (responded / no response) and optionally a rating or sentiment.

**Product value:**
- Answers the key trust question: "Do legislators actually respond when constituents write?"
- Longitudinal data across users builds a public accountability signal per legislator
- Response outcome data could inform future draft tailoring — e.g. messaging approaches that historically get responses from a given legislator

**What this touches:**
- System prompt: closing instruction after draft delivery ("Come back and let me know if they respond!")
- Potentially a new MCP tool or web endpoint to log outcomes
- UI component to capture the follow-up (response received Y/N, optional rating/note)
- Data model: associate outcome with legislator ID, session, message medium

**Retro flag:** Surface in Epic 4 retrospective and Epic 5+ planning.
