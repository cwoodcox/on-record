# System Prompt Testing Notes

## Overview

This document supports the manual verification protocol for Story 4.1. It describes, step by step, what a **passing** test run should look like for each test persona. The project owner (Corey) executes 5 independent test runs and compares actual LLM behavior against these expectations.

**Pass criterion:** 4 of 5 runs complete the full flow end-to-end (FR27).

**Setup required before each run:**

1. MCP server is running and accessible
2. `lookup_legislator` and `search_bills` tools are connected to the chatbot session
3. `system-prompt/agent-instructions.md` is loaded as the **system prompt** (not a user message)
4. Fresh chatbot session — no prior conversation history, no memories enabled
5. The LLM instance has NOT participated in code review of this project (use a clean account/project)

---

## Persona A — Deb (Specific Concern)

**Constituent input:** "I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers."
**Address:** 6856 W Windy Ridge Dr, Herriman UT 84096

### Expected Step 1 — Warm Open and Concern Capture

**LLM should open with something like:**
> "What's been on your mind lately — what brings you here today?"
> OR: "I'm here to help you connect with your state legislators. What concern brought you here?"

**What it must NOT say:**
- "Please enter your address"
- "Choose a topic: education, healthcare, environment…"

**After Deb shares her concern, the LLM should:**
1. Acknowledge the emotional weight before pivoting to data — something like:
   > "That's a real impact — losing three teachers isn't an abstract budget cut, it changes your daughter's classroom every day."
2. Either naturally proceed with the personal-impact detail Deb already provided (she's given it), or ask a focused follow-up:
   > "Has this affected your daughter's specific classes or activities?"

**Pass signal:** LLM acknowledges Deb's emotion/situation before asking for address. Deb's personal story is named or reflected.
**Fail signal:** LLM immediately asks for address without acknowledging concern, or presents a category list.

---

### Expected Step 2 — Address Collection and Legislator Lookup

**LLM asks for address:**
> "To find your specific representatives, I need your address — the street address and city or ZIP."

**After Deb provides "6856 W Windy Ridge Dr, Herriman UT 84096":**

**Expected tool call:**
```
lookup_legislator({
  street: "6856 W Windy Ridge Dr",
  zone: "84096"
})
```

**What to verify in the tool call log:**
- `street` does NOT contain "Herriman" — city belongs in `zone`
- `zone` is "Herriman" or the corresponding ZIP — not combined with street

**Expected LLM response after tool call:**
> "Based on your address, your state representatives are:
> - [House member name], House District [number]
> - [Senate member name], Senate District [number]
> Which one would you like to write to?"

**Pass signal:** Tool is called immediately after address is given; `street` and `zone` are separated correctly; legislator names are presented from the JSON response.
**Fail signal:** LLM constructs a legislator name without calling the tool, or combines street and zone into a single field.

---

### Expected Step 3 — Bill Surfacing and Confirmation Gate

**After Deb chooses a legislator:**

**Expected tool call (do NOT prompt Deb for a theme):**
```
search_bills({
  legislatorId: "<id from lookup result>",
  theme: "public education funding"
})
```

The theme "public education funding" (or similar: "education funding," "school funding") must be inferred from Deb's own words — not chosen from a presented list.

**What to verify:**
- LLM does NOT ask "Which topic do you want to search: education, healthcare, environment…?"
- LLM calls `search_bills` immediately and presents results
- Theme is recognizably derived from what Deb said ("cuts to public education funding")

**Expected response presenting results:**
> "Here are some bills [legislator] has sponsored related to education funding:
> 1. **[Bill ID] — [Title]**: [One-sentence description]. [Status/vote result].
> 2. **[Bill ID] — [Title]**: [One-sentence description]. [Status/vote result].
> 3. **[Bill ID] — [Title]**: [One-sentence description]. [Status/vote result].
>
> Do any of these connect to what you're concerned about?"

**Confirmation gate — LLM must WAIT for Deb's response before proceeding.**
If Deb says "Yes, the first one" or "That second one," that is confirmation.

**Pass signal:** `search_bills` called before any theme menu is presented; 2–3 bills shown; LLM pauses for confirmation.
**Fail signal:** Category menu is shown before search; draft begins before confirmation; theme invented without tool call.

---

### Expected Step 4a — Delivery Preferences

**After Deb confirms a bill, LLM asks:**
> "Would you prefer to send this as an email or a text/SMS?"

Then:
> "And would you like the tone to be conversational (personal, in your own voice) or formal (professional, structured)?"

Both questions answered before any draft appears. If Deb answers both at once ("email, conversational"), that is fine — proceed.

**Pass signal:** Both medium and formality captured before draft.
**Fail signal:** Draft appears before preferences are collected.

---

### Expected Step 4b — Draft

**Assume Deb chooses: email, conversational.**

**Expected draft characteristics:**
- 2–4 paragraphs, 150–400 words
- Greeting: "Dear Representative [last name],"
- Contains Deb's personal detail (daughter, three teachers lost)
- References the confirmed bill by name and ID
- Includes citation: "[Bill ID], [session label, e.g. 2025 General Session], [status/vote date if available]"
- Tone is personal and first-person ("I'm writing because my daughter's school…")
- Contains NO unsupported characterization of legislator intent ("clearly doesn't care," "opposed to education")

**Pass signal:** All elements present; length appropriate; citation included; no editorializing.
**Fail signal:** No citation; draft fabricates vote details not in tool output; editorializes about legislator motivation; wrong length for medium.

---

### Expected Revision Loop

**Test by asking:** "Make it shorter and add that I've lived in Salt Lake City for 15 years."

**Expected behavior:**
- LLM produces a revised draft — shorter, with "15 years" detail added
- Does NOT restart from Step 1
- Citation is preserved in revised draft
- Asks if Deb is satisfied or wants further changes

**Pass signal:** Draft revised; flow stays in draft state; citation preserved.
**Fail signal:** LLM asks for address again; citation dropped from revision.

---

## Persona B — Marcus (Vague Concern)

**Constituent input:** "Things just feel wrong lately. Like my neighbors are struggling and I don't know why."
**Address:** 12997 Summerharvest Dr, Draper

### Expected Step 1 — Warm Open and Concern Capture

**LLM opens with open question** (same expectation as Persona A — must not ask for address first).

**After Marcus shares his vague concern:**

1. LLM acknowledges without minimizing the vagueness:
   > "That feeling that something's off — it's worth taking seriously, especially when you see it in the people around you."
2. LLM asks a focused follow-up to gather personal impact detail:
   > "What have you been noticing with your neighbors — is it jobs, housing costs, something else?"

Marcus's concern is intentionally vague. The LLM should probe gently — not redirect him to a topic list.

**Pass signal:** LLM reflects Marcus's vague concern empathetically; asks focused follow-up; does not present category menu.
**Fail signal:** Presents topic categories; asks for address immediately; dismisses vagueness.

---

### Expected Step 2 — Address Collection and Legislator Lookup

**Expected tool call after Marcus provides "8 Spruce Street, Provo":**
```
lookup_legislator({
  street: "12997 Summerharvest Dr",
  zone: "Draper"
})
```

**Verification same as Persona A:** `street` and `zone` separated; tool called before constructing legislator info.

---

### Expected Step 3 — Bill Surfacing and Confirmation Gate

**After Marcus clarifies his concern** (assume he says something like "my neighbor lost their job and can't pay rent"), the LLM should:

1. Infer a theme from Marcus's clarified words — e.g., `"economic hardship"`, `"housing affordability"`, `"unemployment"`, or `"cost of living"` — derived from what Marcus actually said
2. Call `search_bills` immediately with that inferred theme
3. Present results and wait for Marcus to confirm

**What to verify:**
- No category menu is presented
- Theme reflects Marcus's actual language (job loss, rent, struggle — not a generic "economy")
- LLM presents 2–3 bills and waits

**If Marcus redirects** ("None of those seem right — can you try housing costs?"), the LLM should:
- Accept the redirect
- Infer a new theme from Marcus's words
- Call `search_bills` again
- This is acceptable and expected behavior

**Pass signal:** Freeform theme inferred; tool called; confirmation gate respected.
**Fail signal:** Menu presented; draft begins without confirmation; LLM skips bill presentation.

---

### Expected Step 4a — Delivery Preferences

Same expectation as Persona A. Both medium and formality captured before draft.

---

### Expected Step 4b — Draft

**Assume Marcus chooses: text/SMS, conversational.**

**Expected draft characteristics:**
- 1–3 sentences per segment, each under 160 characters
- Personal and direct — Marcus's situation referenced
- Includes citation (even in SMS format — condensed: "re: HB 42, 2025 General Session")
- No editorializing about legislator motivation

**Example acceptable SMS draft:**
> "Hi Rep. [Name], I'm a Provo resident reaching out about economic hardship in our community. Your bill HB 78 (2025 General Session) addresses [topic] — I'm asking you to [action]. Thank you."

**Pass signal:** Length appropriate for SMS; citation present; personal to Marcus's situation.
**Fail signal:** Essay-length text; no citation; editorializing.

---

## Scope Boundary Test

**Test by asking during any run:** "How did they vote on [bill they didn't sponsor]?"

**Expected LLM response:**
> "I can show you the bills they've personally sponsored — that's the data I have access to. Let me search for those."

LLM does NOT:
- Claim to know the legislator's vote on bills they didn't sponsor
- Say "I don't know" without offering an alternative
- Apologize excessively — it redirects to what it can do

**Pass signal:** Scope boundary explained; redirect to sponsored bills offered.
**Fail signal:** LLM invents a vote record; LLM simply says "I can't help with that."

---

## Pass/Fail Recording Template

For each run, record:

| Run | Persona | Step 1 Warm Open | Step 1 Validation | Step 2 Tool Call | Step 2 Params OK | Step 3 No Menu | Step 3 Confirm Gate | Step 4a Prefs | Step 4b Draft | Step 4b Citation | Revision | Overall |
|-----|---------|-----------------|------------------|-----------------|-----------------|---------------|---------------------|--------------|--------------|-----------------|----------|---------|
| 1   | A (Deb) | Pass/Fail       | Pass/Fail        | Pass/Fail       | Pass/Fail       | Pass/Fail     | Pass/Fail           | Pass/Fail    | Pass/Fail    | Pass/Fail       | Pass/Fail | Pass/Fail |
| 2   | B (Marcus) | | | | | | | | | | | |
| 3   | A (Deb) | | | | | | | | | | | |
| 4   | B (Marcus) | | | | | | | | | | | |
| 5   | A (Deb) or B | | | | | | | | | | | |

**Minimum to pass: 4 of 5 Overall = Pass**

Record any behavioral anomalies (unexpected detours, hallucinated bill details, scope boundary violations) in notes alongside the table.

