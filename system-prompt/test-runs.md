# Manual Test Run Log

| Run | Persona | Model | Step 1 Warm Open | Step 1 Validation | Step 2 Tool Call | Step 2 Params OK | Step 3 No Menu | Step 3 Confirm Gate | Step 4a Prefs | Step 4b Draft | Step 4b Citation | Revision | Overall | Conversation Log Path | Notes |
|--|--|--|-----|---------|-----------------|------------------|-----------------|-----------------|---------------|---------------------|--------------|--------------|-----------------|----------|---------|
| 1   | A (Deb) | Claude Sonnet 4.6 | Pass| Pass| Pass| Pass| Pass| Pass| Pass| Pass| Fail | Pass| Pass| ../on-record-test/conversation 1.txt |GIS resolved fake address; legislators/topics didn't align naturally because of the test data (so no citation) but flow handled mismatches gracefully. LLM assumed previous sessions were not searchable, prompt refined to clarify. |
| 2   | B (Marcus) | Claude Sonnet 4.6 | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | ../on-record-test/conversation 2.txt | no cell number available for rep but didn't call that out until final draft was presented. remembered my text preference from selecting rep ("let's text cal"). would have liked a facility for getting more information on the bill to summarize it but LLM didn't try to use other tools available to it (which is probably good)|
| 3   | A (Deb) | Gemini Flash 2.5+3 | Pass | Fail | Pass | Pass | pass | pass | pass | pass | pass | pass | pass | ../on-record-test/conversation 3.txt | didn't do much validating and jumped straight to address solicitation. tool could not locate a bill i had in mind (2026GS HB241 - Charter School Amendments) but Gemini refused to move forward with a citation it could not locate (good, but frustrating when the user is right). Gemini spammed the tools a lot attempting to find it, which was good, and had other helpful suggestions, but none were other tools 🥹 tooling did return a 2025 bill and it moved forward with that anyway |
| 4   | B (Marcus) | Gemini Flash 2.5+3 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | ../on-record-test/conversation 4.txt | more validating this time which was better. it didn't include [name] in the draft which i just realized is what's always prompted me to give it my name, so we should probably have it do that. it really didn't know much about the bill so the text felt kind of empty, and it really wanted to include full citation in the text which felt awkward. I suggested i wanted to "have a chat" with cullimore about that bill and it still *insisted* that i explicitly tell it the tone that i wanted. it kinda knew it was a silly question but it seemed forced. |
| 5   | A (Deb) or B | Claude Sonnet 4.6 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fail | Pass | Pass | ../on-record-test/conversation 5.txt | again legislators and topics didn't align naturally because of test data so citation was impossible. Claude was _excellent_ at redirecting and reassuring that a bill wasn't completely necessary, we should try to reinforce that it isn't and make the citation less crucial but still maintain the emphasis on accuracy of a citation if one is made.

**Pass criterion: 4 of 5 runs = Pass**
**Current: 4/5 complete, 4 Pass**

## Overall Notes

### Run 1 Session Limitation Misunderstanding

The LLM incorrectly told the constituent it could not search previous legislative sessions. In reality `searchBillsByTheme` has no session filter — it searches all bills in the cache, which during inter-session periods includes the 2 most recently completed sessions (currently 2025GS + 2026GS). The top-level `session` field in `SearchBillsResult` is just a response label, not a filter.

**Prompt fix applied (inline, pre-review):** Added a clarifying note to the `search_bills` result schema in `agent-instructions.md` explaining that the top-level `session` is a label only, that each bill carries its own `session` field, and that the search spans all cached sessions. Small enough to fix immediately; no code change required.

### Run 1 Address Mismatch

The legislators were correct _for the address the tool resolved_ but that address was barely similar to the address the user provided. System prompt needs to know to check that the address resolved is plausibly similar to **the address the user provided** (not the one it may have modified and sent to the tool) and ask the user to confirm if it's uncertain.

**Deferred to post-testing prompt review:** The `resolvedAddress` field is already returned in `lookup_legislator` output — the LLM has what it needs to do this check without a code change. This is a prompt instruction addition, not a code fix, but substantial enough to handle as a dedicated dev-story prompt revision rather than an inline tweak.

### lookup_legislators argument description

It looks like the zone being a ZIP code makes the address lookup a lot more strict. This is just a casual observation but if we can prove this out or find supporting documentation it's probably worth supplying to the LLM to increase its trust in the resolved address's accuracy.However, LLMs shouldn't attempt to guess the ZIP code to increase accuracy.

### Always Mention Constituency

I'm not sure that we are, but we should always be mentioning that the user is a constituent, and which city they are in since districts very often contain more than one city. Eventually we may allow users to target other legislators as non-constituents, and we'll also need to disclose that.

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

## Future Work — Constituent Name Capture

**Observed in Run 4:** The LLM never asked for the constituent's name, and the draft was impersonal as a result. In practice, users have been prompted to give their name because the draft felt incomplete — but that's accidental UX, not intentional design.

**Options to explore:**
- Add a name capture step early in the flow (Step 1 or after concern capture) so it's available for the draft
- Prompt instruction: ask for name before generating the draft if it hasn't surfaced naturally in conversation

---

## Future Work — SMS Citation Format

**Observed in Run 4:** Including a full bill citation inline in an SMS draft felt awkward and stilted. The citation requirement (AC 9) was designed with email in mind.

**Options to explore:**
- For SMS medium: use a condensed citation format (e.g., "re: HB 42, 2026GS" appended at the end rather than mid-sentence)
- Prompt instruction: distinguish citation style by medium — inline prose for email, trailing reference for SMS

---

## Future Work — Tone Inference from Constituent Language

**Observed in Run 4:** The constituent signaled conversational tone clearly ("I want to have a chat with Cullimore about this"). The agent still asked explicitly for formality preference, which felt forced and slightly absurd in context. The mandatory Step 4a question is good as a default but should have an inference escape hatch.

**Options to explore:**
- Prompt instruction: if the constituent's language unambiguously signals a tone (casual phrasing → conversational; formal register → formal), confirm rather than re-ask ("sounds like you want to keep it conversational — does that sound right?")
- Keep the explicit ask as fallback when tone is ambiguous
