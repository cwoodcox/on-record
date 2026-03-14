# Testing Notes 4.2 — Concern Capture and Empathetic Issue Discovery

**Story:** 4.2 — Personal Concern Capture and Empathetic Issue Discovery
**Scope:** Steps 1 and 3 of the 4-step flow only (Steps 2 and 4 are covered by Story 4.1)
**Executor:** Corey (manual runs; dev agent does not execute sessions)
**Pass criterion:** At least 4 of 5 runs earn PASS on all applicable checklist items

---

## How to Use This Document

This document provides a step-by-step scripted walkthrough for each persona. For every behavioral checkpoint you will find:

- **What to do:** the message to send to the chatbot
- **Expected chatbot response:** what a passing response looks like
- **PASS signal:** the concrete thing to look for that confirms the AC is satisfied
- **FAIL signal:** what a failing response looks like — any of these means the run fails that checkpoint

Run each persona in a **fresh session** with no prior context. Load `system-prompt/agent-instructions.md` as the system prompt. Confirm `lookup_legislator` and `search_bills` are connected before starting.

---

## Pre-Run Checklist (do before every run)

- [ ] MCP server is running and publicly accessible
- [ ] `lookup_legislator` and `search_bills` tools are connected
- [ ] `system-prompt/agent-instructions.md` is loaded as the system prompt
- [ ] Fresh chatbot session — no prior conversation history, no memories enabled
- [ ] The chatbot instance has NOT participated in code reviews for this project

---

## Persona A — Deb (specific concern, emotional)

**ACs exercised:** AC 1, 2, 3, 4, 5, 6, 7
**Address:** `742 Evergreen Terrace, Salt Lake City`

### Step A-1: Observe the chatbot opening (AC 1)

Do nothing. Wait for the chatbot to send its first message.

**Expected:** An open, warm question about what the constituent wants to address — phrased around their concern, not logistics.

**PASS signal:** The opening message contains an open question about the constituent's concern or what brought them here. Examples of passing openings:
- "What's been on your mind lately — what brings you here today?"
- "What issue has been weighing on you?"
- Any warm invitation to share a concern without requiring an address or choosing a category

**FAIL signal:** Any of the following in the opening message:
- "Please enter your address" or "What's your address?" — this is a FAIL on AC 1
- A list of topics: "Choose a topic: education, healthcare, environment…" — FAIL on AC 1
- "How can I help?" followed immediately by a form or structured prompt — borderline; count as FAIL if address or categories appear before concern is collected

---

### Step A-2: Share a specific, emotional concern (AC 2, 3)

Send:
> "I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers."

**Expected:** The chatbot names the emotional weight and personal impact BEFORE asking for the address or moving to any data-gathering. It should acknowledge what this means personally — not just with a word like "I'm sorry" but with a substantive reflection.

**PASS signal for AC 2 (validate before inform):** The response:
1. Names the emotional reality specifically — not just "that's hard" but something that reflects the actual situation (e.g., "Losing three teachers from your daughter's school — that's not just a budget line, that's her daily classroom experience," or similar)
2. Does NOT ask for the address in this same message, OR if it does ask for the address, the emotional acknowledgment precedes it with enough substance that it reads as genuine validation

**FAIL signal for AC 2:**
- "I'm sorry to hear that. To find your representatives, I'll need your address." — This is a FAIL. A single-sentence "I'm sorry" followed immediately by address collection does not satisfy AC 2. The acknowledgment must be substantive.
- "Got it. What's your address?" — FAIL.
- No emotional acknowledgment at all — FAIL.

**PASS signal for AC 3 (personal-impact detail):** Deb's message already contains a personal-impact detail ("my daughter's school just lost three teachers"). The chatbot should acknowledge it explicitly. If the chatbot proceeds without capturing a personal-impact detail (i.e., there is none in the message and it never asked), that is a fail — but in this persona there is one present.

**FAIL signal for AC 3:** Chatbot skips past personal impact without noting it or asking for it.

---

### Step A-3: Ask for the constituent's name (4.1 AC 3)

After the concern is acknowledged, the chatbot should ask for a name if Deb has not provided one.

**Expected:** At some point before asking for the address, or while acknowledging the concern, the chatbot asks for a first name naturally.

**PASS signal:** Chatbot asks for a name (e.g., "And what's your name? First name is fine.") at a natural point in the exchange.

**FAIL signal:** Chatbot never asks for a name at any point during the first two steps. (Note: name may be asked alongside address request — that is acceptable as long as concern acknowledgment came first.)

---

### Step A-4: Provide address and complete Step 2

Provide:
> "My name is Deb. My address is 742 Evergreen Terrace, Salt Lake City."

Allow the chatbot to call `lookup_legislator` and present legislators. **Step 2 behavior is not the focus of Story 4.2** — proceed through it normally. Choose one legislator when prompted (say "the House representative" or pick by name).

---

### Step A-5: Observe theme inference and search_bills call (AC 4)

After the legislator is chosen, the chatbot should call `search_bills` automatically — no category menu, no "what topic should I search?" prompt.

**Expected:** The chatbot silently infers a theme from Deb's words and calls `search_bills` immediately, or narrates that it is searching with a freeform theme derived from what Deb said.

**PASS signal for AC 4:**
- The chatbot calls `search_bills` with a theme that reads as freeform text derived from the conversation — something like `"public education funding"`, `"education funding cuts"`, `"school funding"` (visible in tool call inspector or from the chatbot's narration)
- The chatbot does NOT present a menu: "What topic should I search — education, healthcare, or something else?"
- The chatbot does NOT ask Deb to choose a category

**FAIL signal for AC 4:**
- Any prompt like "Which topic area are you most concerned about?" — FAIL
- A list like "I can search: education, school funding, teacher salaries — which would you like?" — FAIL even if it includes the correct answer
- Passing `"public education"` as a tag or enum value rather than a freeform phrase is a borderline pass — only fail this if the system clearly presented categories

---

### Step A-6: Evaluate bill presentation (AC 5)

Review the bills the chatbot presents.

**Expected:** 2–3 bills from the actual `search_bills` tool output, each with bill ID, title, plain-language summary, and status.

**PASS signal for AC 5:**
- Each presented bill has a real bill ID (e.g., HB 42, SB 17 — not a generic label like "education bill")
- Each bill's title and summary matches what the tool returned — no invented details
- The chatbot does not present generic topic labels (e.g., "The Education Bill") as bill names
- 2–3 bills are presented (not 0, not a wall of 10+)

**FAIL signal for AC 5:**
- A bill presented with no ID — FAIL
- A summary that seems invented or contradicts tool output — FAIL
- Bills presented as generic labels without specific IDs — FAIL

---

### Step A-7: Observe confirmation gate (AC 6, 7)

After bills are presented, do NOT immediately confirm. Wait and observe whether the chatbot proceeds automatically, or whether it waits.

**Expected:** The chatbot presents bills and waits. It asks whether any of these connect to Deb's concern or if she'd like a different search.

**PASS signal for AC 6:** The chatbot does NOT proceed to delivery preferences (Step 4a — asking for email vs. text) without getting a response from Deb. It waits at the bill selection stage.

**FAIL signal for AC 6:** Chatbot immediately pivots to "Would you like to send this as an email or text?" before Deb responds — FAIL.

Now send an ambiguous response:
> "I guess… the second one?"

**Expected:** The chatbot recognizes "I guess" as ambiguous and seeks clarification before proceeding.

**PASS signal for AC 7:** Chatbot asks something like: "Just to make sure — are you comfortable building your message around [bill name]?" or "It sounds like you're leaning toward [bill] — does that feel right?" The chatbot does NOT advance to Step 4a.

**FAIL signal for AC 7:** Chatbot accepts "I guess" as explicit confirmation and proceeds directly to Step 4a (delivery preference question) — FAIL.

---

### Step A-8: Confirm explicitly

Send:
> "Yes, let's go with that one."

**Expected:** Chatbot proceeds to Step 4a (delivery preferences). This step is not the focus of 4.2 — run can end here or continue.

---

## Persona B — Marcus (vague concern)

**ACs exercised:** AC 1, 2, 3, 4, 5, 6
**Address:** `8 Spruce Street, Provo`

### Step B-1: Observe the chatbot opening (AC 1)

Same as Persona A Step A-1 — wait for chatbot to open.

**PASS/FAIL signal:** Same as A-1. Opening must be an open concern question.

---

### Step B-2: Share a vague, ambient concern (AC 2, 3)

Send:
> "Things just feel wrong lately. Like my neighbors are struggling and I don't know why."

**Expected:** The chatbot does not minimize the vagueness. It reflects the feeling back without dismissing it, and asks for a follow-up to surface a personal-impact detail (because none was provided in this message).

**PASS signal for AC 2:**
- Chatbot reflects the vague feeling without minimizing: something like "That feeling that something's off — it's worth paying attention to" or "That sense that the community around you is under strain — that's real, even when it's hard to name."
- Chatbot does NOT respond with "I'm sorry, can you be more specific?" without first validating the feeling

**FAIL signal for AC 2:**
- "That's vague. Can you tell me a specific topic?" — FAIL
- Jumping directly to "To get started, what's your address?" — FAIL
- "I understand. What topic do you want to write about?" — borderline FAIL (skips emotional validation)

**PASS signal for AC 3:**
- Marcus's message does NOT contain a clear personal-impact detail ("my neighbors" is vague)
- Chatbot must ask a focused follow-up before proceeding: e.g., "Has this affected you or someone close to you directly?"
- Chatbot does NOT proceed to address collection before capturing at least one personal-impact detail

**FAIL signal for AC 3:**
- Chatbot asks for the address immediately after Marcus's message, without asking about personal impact — FAIL

---

### Step B-3: Provide personal impact detail

In response to the follow-up (or add this if the chatbot asks):
> "Yeah — my neighbor lost her job at the distribution center. She's got kids. I just feel like no one's doing anything."

**Expected:** Chatbot acknowledges this detail specifically, then asks for name and address.

**PASS signal:** Chatbot acknowledges the neighbor's situation before pivoting to address collection.

---

### Step B-4: Provide name and address

> "I'm Marcus. My address is 8 Spruce Street, Provo."

Allow Step 2 to proceed normally. Choose a legislator.

---

### Step B-5: Observe theme inference and search_bills call (AC 4)

**Expected:** Chatbot infers a broad freeform theme from Marcus's words — something like `"economic hardship"`, `"job loss"`, `"cost of living"`, or `"unemployment"`. It calls `search_bills` without asking Marcus to pick a category.

**PASS signal for AC 4:** Same criteria as A-5. No category menu. Theme is freeform text inferred from conversation.

**FAIL signal for AC 4:** "What topic should I search — jobs, housing, economy, or something else?" — FAIL.

---

### Step B-6: Evaluate bill presentation (AC 5)

Same criteria as A-6. Bills must have real IDs and data from tool output.

---

### Step B-7: Observe confirmation gate (AC 6)

After bills are presented, wait. Do not respond immediately.

**PASS signal for AC 6:** Chatbot waits for Marcus to respond before proceeding to delivery preferences.

Send:
> "That looks relevant."

**Expected:** "That looks relevant" is somewhat explicit but not strongly ambiguous. The chatbot may accept it as confirmation. This is acceptable — AC 7's ambiguity test is reserved for Persona D (see below). If the chatbot proceeds to Step 4a here, that is PASS on AC 6.

---

## Persona C — Alex (mentions bill by ID)

**ACs exercised:** AC 9, AC 4, AC 5, AC 6
**Address:** `1500 North University Ave, Provo`

### Step C-1: Observe the chatbot opening (AC 1)

Same as Persona A Step A-1.

**PASS/FAIL signal:** Same as A-1.

---

### Step C-2: Share concern with bill ID (AC 9)

Send:
> "I'm furious about HB 42 — that bill is going to hurt my neighborhood."

**Expected:** The chatbot acknowledges the anger and asks about the bill's subject matter (since "HB 42" alone doesn't reveal the topic), OR it attempts to infer a descriptive theme if additional context makes the subject clear.

**PASS signal for AC 9 — the critical checkpoint of this persona:**

The chatbot MUST NOT call `search_bills({ theme: "HB 42" })`.

Two passing paths:
1. **Ask for context:** Chatbot says something like "What's HB 42 about? I'll search for related legislation." Then, after Alex responds, infers a descriptive theme from the explanation.
2. **Infer from context (only if subject is inferable):** If the prior conversation contains context about the bill's subject, chatbot infers a descriptive theme directly. (In this persona the subject is not yet clear from context alone, so Path 1 is expected.)

To confirm which path was taken: observe the tool call made to `search_bills`. The `theme` parameter must be a descriptive phrase — NOT "HB 42" or any bill ID.

**FAIL signal for AC 9:**
- `search_bills` is called with `theme: "HB 42"` — FAIL
- `search_bills` is called with `theme: "HB42"` or `theme: "bill HB 42"` — FAIL
- Any call where the theme is an identifier rather than a descriptive subject — FAIL

---

### Step C-3: Clarify the bill's subject (if asked)

If chatbot asked what HB 42 is about, send:
> "It's the new zoning bill — they're letting developers build anything anywhere and it's going to destroy the character of my neighborhood."

**Expected:** Chatbot now infers a descriptive theme such as `"zoning"`, `"land use"`, `"housing development"`, or `"neighborhood zoning regulations"` and calls `search_bills` with that theme.

**PASS signal:** Tool call to `search_bills` uses a descriptive theme derived from Alex's explanation. Not "HB 42."

---

### Step C-4: Provide name and address (or continue from prior exchange)

> "I'm Alex. 1500 North University Ave, Provo."

Complete Step 2 normally. Choose a legislator.

---

### Step C-5: Evaluate bill presentation and confirmation gate (AC 5, 6)

Same criteria as A-6 and A-7. After bills are shown, wait for chatbot to pause.

**PASS signal for AC 6:** Chatbot does not proceed to delivery preferences without Alex confirming a bill.

Confirm explicitly: "The first one — that's what I'm talking about."

---

## Persona D — Fatima (ambiguous confirmation + redirect)

**ACs exercised:** AC 7 (primary), AC 3, AC 4
**Address:** `500 E 500 S, Salt Lake City`

### Step D-1: Observe the chatbot opening (AC 1)

Same as Persona A Step A-1.

**PASS/FAIL signal:** Same as A-1.

---

### Step D-2: Share a vague concern about housing (AC 3)

Send:
> "I want to say something about housing. I'm not sure what."

**Expected:** Chatbot acknowledges the concern. Because Fatima has not provided a personal-impact detail, chatbot must ask for one before proceeding.

**PASS signal for AC 3:** Chatbot asks a focused follow-up — e.g., "Has housing affected you or someone close to you?" or "Is this about finding affordable housing, or something else about where you live?" — before asking for the address.

**FAIL signal for AC 3:** Chatbot asks for address without first capturing any personal-impact detail.

---

### Step D-3: Provide personal impact

> "I've been looking for a place to rent for six months. Prices are just insane."

**Expected:** Chatbot acknowledges this and proceeds to name and address.

---

### Step D-4: Provide name and address

> "Fatima. 500 E 500 S, Salt Lake City."

Complete Step 2 normally. Choose a legislator.

---

### Step D-5: Observe theme inference (AC 4)

**Expected:** Chatbot infers theme from Fatima's words — something like `"affordable housing"`, `"rental housing"`, `"housing costs"`. No category menu.

**PASS/FAIL signal for AC 4:** Same as A-5.

---

### Step D-6: Observe confirmation gate (AC 6)

After bills are presented, send an ambiguous response — this is the primary test of this persona:

> "I guess… the first one?"

**Expected:** Chatbot recognizes this is not an explicit confirmation and seeks clarification before proceeding.

**PASS signal for AC 7:** Chatbot responds with something like:
- "Just to confirm — are you comfortable building your message around [bill name]?"
- "It sounds like you might be leaning toward [bill] — does that feel right, or would you like to look at other options?"
- Any response that acknowledges the tentative phrasing and asks for a clearer signal

Chatbot does NOT proceed to Step 4a in this response.

**FAIL signal for AC 7:**
- Chatbot immediately proceeds to "Would you like to send this as an email or text?" — FAIL
- Chatbot says "Great! Let me get your delivery preferences." — FAIL
- Any advancement past bill selection without seeking clarification — FAIL

---

### Step D-7: Confirm explicitly

Send:
> "Yes, let's go with that one — the housing affordability bill."

**Expected:** Chatbot confirms and proceeds to Step 4a. Story 4.2 scope ends here.

---

## Run 5 — Persona A or B Repeat (Coverage Run)

Run 5 should use Persona A or B with a variation to cover any edge not hit in Runs 1–2:

**Suggested variation A:** Use Persona A but change the concern slightly:
> "My son's school just found out they're losing their art and music programs because of budget cuts. I want to say something."

Address: `1847 Oak Street, Murray` (different address for legislator variation)

**Suggested variation B:** Use Persona B but have Marcus immediately offer a personal-impact detail without waiting for a follow-up (to confirm chatbot handles well when impact is volunteered, not prompted):
> "Things are rough. I work two jobs and still can't cover rent — I just want someone to hear this."

Address: `321 Main Street, Ogden`

All AC checkpoints from the selected persona apply. Note which variation was used in the test log.

---

## Quick Reference: PASS / FAIL by AC

| AC | What it tests | PASS signal | FAIL signal |
|----|---------------|-------------|-------------|
| AC 1 | Warm open — not address, not categories | Open question about concern | Opens with address request or topic list |
| AC 2 | Emotional acknowledgment BEFORE address | Substantive reflection before any data request | "I'm sorry. What's your address?" |
| AC 3 | Personal-impact detail before proceeding | Impact captured or asked for before address | Address asked before any impact captured |
| 4.1 AC 3 | Name asked | Name asked at natural point | Name never asked |
| AC 4 | Freeform theme — no category menu | `search_bills` called with descriptive phrase | Category menu presented to constituent |
| AC 5 | Bills from actual tool output | Real bill IDs + titles + summaries | Generic labels or invented details |
| AC 6 | Confirmation gate — no auto-advance | Chatbot waits at bill stage | Chatbot jumps to delivery preferences |
| AC 7 | Ambiguous response → clarification | Chatbot asks for explicit confirmation | Chatbot accepts "I guess" and advances |
| AC 8 | Zero-result fallback + affirmation | Chatbot states no citation + requires affirm | Chatbot proceeds silently without affirming |
| AC 9 | Bill ID not passed as theme | Theme is descriptive, not "HB 42" | `search_bills` called with bill ID as theme |

Note: AC 8 (zero-result path) is not triggered by any standard persona above. If runs 1–4 happen to return zero results for a given legislator-theme combination, apply AC 8 evaluation. Otherwise, confirm AC 8 with a deliberate sixth run using an obscure theme (e.g., `"deep-sea aquaculture regulations"`) to force the zero-result path.

---

## Failure Response Protocol

If a run FAILs on a behavioral checkpoint:

1. Identify which AC failed and which line(s) of `system-prompt/agent-instructions.md` govern that behavior
2. Revise the instruction text to close the gap — be specific, not general (e.g., add a concrete bad-example to the anti-pattern list rather than rephrasing the rule)
3. Re-run the failing scenario once after the update in a fresh session
4. Document what changed and whether the re-run passed in `system-prompt/test-runs-4-2.md`

If no failures occur across 4+ of 5 runs: document "no changes needed" in the test log. No edits to `agent-instructions.md` are required.

---

## Recording Results

Use `system-prompt/test-runs-4-2.md` to record each run. For each run log:
- Persona used and any variation details
- Per-checkpoint PASS / FAIL / N/A result
- Verbatim chatbot quote for any FAIL (to support instruction revision)
- Overall run result: PASS / FAIL
- If a fix was made: what changed in `agent-instructions.md` and re-run result
