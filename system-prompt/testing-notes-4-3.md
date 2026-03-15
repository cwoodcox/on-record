# Testing Notes 4.3 — Medium and Formality Selection

**Story:** 4.3 — Medium and Formality Selection
**Scope:** Step 4a (Delivery Preferences) and Step 4b draft compliance with captured medium/formality
**Executor:** Corey (manual runs; dev agent does not execute sessions)
**Pass criterion:** At least 4 of 5 runs earn PASS on all applicable checklist items

---

## How to Use This Document

This document provides a step-by-step scripted walkthrough for each persona. For every behavioral checkpoint you will find:

- **What to do:** the message to send to the chatbot
- **Expected chatbot response:** what a passing response looks like
- **PASS signal:** the concrete thing to look for that confirms the AC is satisfied
- **FAIL signal:** what a failing response looks like — any of these means the run fails that checkpoint

Each run starts from the beginning of the flow (Step 1). Steps 1–3 are completion prerequisites only — evaluate them for correctness but the focus of scoring is Step 4a and Step 4b behavior.

Run each persona in a **fresh session** with no prior context. Load `system-prompt/agent-instructions.md` as the system prompt. Confirm `lookup_legislator` and `search_bills` are connected before starting.

---

## Pre-Run Checklist (do before every run)

- [ ] MCP server is running and publicly accessible
- [ ] `lookup_legislator` and `search_bills` tools are connected
- [ ] `system-prompt/agent-instructions.md` is loaded as the system prompt
- [ ] Fresh chatbot session — no prior conversation history, no memories enabled
- [ ] The chatbot instance has NOT participated in code reviews for this project
- [ ] Complete Steps 1–3 of the flow before beginning Step 4a evaluation

---

## Persona A — Deb (email, conversational, single-message preference)

**ACs exercised:** AC 1, 2, 3, 5, 6
**Address:** `742 Evergreen Terrace, Salt Lake City`
**Concern:** Education funding

### Steps A-1 through A-4: Complete Steps 1–3 (prerequisite)

Run through Steps 1–3 normally:
- Step 1: Share concern: "I'm really worried about cuts to school funding — my daughter's school is losing programs."
- Give a name ("I'm Deb") and personal-impact detail if prompted.
- Step 2: Provide address `742 Evergreen Terrace, Salt Lake City`. Allow `lookup_legislator` to run. Choose one legislator.
- Step 3: Allow `search_bills` to run. Present and confirm a bill. Give explicit confirmation when asked.

These steps are prerequisites. Do not score Step 4a behavior until Step 3 confirmation gate has been explicitly passed.

---

### Step A-5: Observe medium question timing (AC 1)

After you explicitly confirm a bill in Step 3, wait and observe whether the chatbot advances to Step 4a.

**Expected:** The chatbot now asks about medium — it should NOT have asked this before Step 3 confirmation.

**PASS signal for AC 1:** The medium question ("email or text/SMS?") appears AFTER bill confirmation. The chatbot has not mentioned medium or formality at any prior point in the conversation.

**FAIL signal for AC 1:**
- Chatbot asked "email or text?" before Step 3 was complete — FAIL
- Chatbot asks about medium immediately after the address lookup, before bill confirmation — FAIL

---

### Step A-6: Send both preferences in a single message (AC 3)

Respond to the medium question with:
> "Email, and keep it personal — I just want to sound like myself."

This message answers both medium (email) and formality (conversational/personal) in one response.

**Expected:** The chatbot captures BOTH preferences from this single message and proceeds — it does NOT ask about formality again since the constituent already expressed a preference ("keep it personal").

**PASS signal for AC 3 (dual-capture):**
- Chatbot acknowledges both email and a conversational/personal tone in one step
- Chatbot does NOT follow up with "And would you like it to be conversational or formal?" after this message
- Chatbot proceeds directly toward generating the draft

**FAIL signal for AC 3:**
- Chatbot responds "Great, email it is!" and THEN asks "Would you like the tone to be conversational or formal?" — this is a FAIL. Both were given in one message.
- Chatbot ignores the formality signal and only captures medium — FAIL

---

### Step A-7: Evaluate the generated draft (AC 5, AC 6)

Allow the chatbot to generate the draft.

**PASS signal for AC 5 (conversational tone):**
- Draft is written in first person throughout: "I'm writing because…", "My daughter…", "I feel…"
- Uses language and details sourced from what Deb shared — the draft sounds like a real person wrote it, not a form letter
- No stiff or bureaucratic phrasing; no third-person references to Deb (e.g., "As a constituent of the district…" is borderline — if it appears alongside first-person language, that is acceptable)
- Contractions are acceptable and expected in a conversational draft

**FAIL signal for AC 5:**
- Draft is formal and structured with third-person references to the constituent ("As a constituent, one believes…") — if this is the dominant register and not just a single phrase, FAIL
- Draft sounds identical in register to what a formal selection would produce — FAIL (indistinguishable register means the formality logic did not function)

**PASS signal for AC 6 (email length and format):**
- Draft has **2–4 paragraphs** — count them
- Draft is **150–400 words** — estimate or count
- Draft has a **greeting line** (e.g., "Dear Representative [Last Name],")
- Draft has a **closing signature** (e.g., "Sincerely, Deb" or similar)

**FAIL signal for AC 6:**
- Draft has only 1 paragraph or is a single-sentence block — FAIL
- Draft is over 400 words — FAIL
- No greeting line (e.g., starts directly with body text) — FAIL
- No closing signature — FAIL

---

## Persona B — Marcus (text/SMS, formal, two-step preference capture)

**ACs exercised:** AC 1, 2, 4, 5, 7
**Address:** `8 Spruce Street, Provo`
**Concern:** Housing / cost of living

### Steps B-1 through B-4: Complete Steps 1–3 (prerequisite)

- Step 1: "Things are hard. My rent has gone up three times in the last two years and I don't know how people are managing." Give name "Marcus" if asked.
- Step 2: Provide `8 Spruce Street, Provo`. Choose a legislator.
- Step 3: Confirm a bill.

---

### Step B-5: Observe medium question timing (AC 1)

Same timing check as A-5. Medium question must appear AFTER Step 3 confirmation.

**PASS/FAIL signal:** Same as A-5.

---

### Step B-6: Answer medium only (AC 4 setup — single preference given)

When the chatbot asks about medium, answer ONLY medium:
> "Text."

Do NOT say anything about formality.

**Expected:** Chatbot has captured medium (text/SMS) but does NOT yet have a formality preference. It must now ask for formality before generating a draft.

**PASS signal for AC 4 (ask for missing preference):**
- Chatbot asks for the formality preference: e.g., "And would you like it to be conversational or formal?" or infers from Marcus's language and confirms
- Chatbot does NOT generate a draft with only medium captured
- Chatbot does NOT skip the formality question

**FAIL signal for AC 4:**
- Chatbot immediately starts generating a draft after Marcus says "Text." — FAIL
- Chatbot asks about formality but then doesn't wait for the answer before proceeding — FAIL
- Chatbot never asks about formality at all and generates a draft — FAIL (blocking)

---

### Step B-7: Answer formality preference

Respond to the formality question with:
> "Let's keep it professional."

**Expected:** Chatbot now has both preferences (text/SMS + formal) and proceeds to generate a draft.

---

### Step B-8: Evaluate the generated draft (AC 2, AC 5, AC 7)

Allow the chatbot to generate the draft.

**PASS signal for AC 2 (formality three-path logic — verified via two-step path):**
- The chatbot correctly asked for formality separately after Marcus gave only medium (step B-6 above)
- The chatbot did not skip the formality question

**PASS signal for AC 5 (formal tone):**
- Draft uses a structured register: formal sentence construction, no contractions (or minimal), no slang
- Draft uses third-person references to Marcus where appropriate: "As a constituent from Provo…" or "I am writing to formally express…"
- Draft sounds composed and professional — reads like a letter, not a casual message
- No first-person casual language like "I just wanna say" or "Things are really rough"

**FAIL signal for AC 5:**
- Draft is casual and personal despite Marcus requesting formal — FAIL (e.g., "Hey, I wanted to let you know things are tough out here")
- Draft is indistinguishable in register from a conversational draft — FAIL

**PASS signal for AC 7 (text/SMS length and format):**
- Draft is **1–3 sentences total** — count them
- Each segment is **under 160 characters** — check each sentence individually
- Draft has **no formal salutation** (no "Dear Representative…" opener)
- Draft is personal and direct — gets to the point immediately

**FAIL signal for AC 7:**
- Draft has 4 or more sentences — FAIL
- Any sentence or segment exceeds 160 characters — FAIL
- Draft opens with "Dear Representative…" or similar formal salutation — FAIL (text/SMS does not use salutations)
- Draft is multiple paragraphs — FAIL

---

## Persona C — Alex (inferred conversational register)

**ACs exercised:** AC 2 (inference path), AC 3 or 4, AC 5
**Address:** `1500 North University Ave, Provo`
**Concern:** Neighborhood impact from zoning/development (or similar)

### Steps C-1 through C-4: Complete Steps 1–3 with casual language throughout

Maintain a consistently casual register throughout Steps 1–3. Use language like:
- "I'm really ticked off about what's happening in my neighborhood."
- "I wanna say something about this — like seriously, it's not okay."
- "Yeah that one, let's go with that."

This sets up the register inference test in Step 4a.

Give name "Alex" if asked. Provide address `1500 North University Ave, Provo`. Choose a legislator. Confirm a bill with casual phrasing ("yeah that one").

---

### Step C-5: Observe medium question (AC 1)

Medium question must appear after Step 3 bill confirmation, not before.

**PASS/FAIL signal:** Same as A-5.

---

### Step C-6: Evaluate formality inference (AC 2 — inference path)

After the chatbot asks about medium (or alongside medium if it handles both), watch how it handles formality.

**Expected:** Because Alex's language throughout the conversation has been clearly casual ("ticked off," "wanna," "seriously"), the chatbot should INFER a conversational preference and CONFIRM rather than presenting the full "conversational or formal?" question.

**PASS signal for AC 2 (casual register → confirm conversational):**
- Chatbot confirms conversational: "It sounds like you'd want to keep this conversational — does that sound right?" (or equivalent)
- Chatbot does NOT ask the full "conversational or formal?" question as if formality were undecided
- The confirmation is phrased as a check, not a full selection prompt

**FAIL signals for AC 2:**
- Chatbot asks "Would you like it to be conversational or formal?" as if the register were ambiguous — this is a minor FAIL (over-asking, not wrong). Note it but do not count it as a blocking failure.
- Chatbot infers formal despite Alex's clearly casual language — this is a more serious FAIL; document and count as FAIL on AC 2.
- Chatbot skips formality entirely and generates a draft without any formality signal — FAIL (blocking).

---

### Step C-7: Confirm the inference

Respond:
> "Yeah, conversational is right."

Also provide medium if not yet captured: "And email works."

---

### Step C-8: Evaluate the generated draft (AC 5)

**PASS signal for AC 5 (conversational, inferred):** Same as Persona A step A-7 AC 5 criteria.

**FAIL signal for AC 5:** Same as A-7.

---

## Persona D — Fatima (formal register inferred, email)

**ACs exercised:** AC 2 (formal inference path), AC 5, AC 6
**Address:** `500 E 500 S, Salt Lake City`
**Concern:** Housing

### Steps D-1 through D-4: Complete Steps 1–3 with formal language throughout

Maintain a consistently formal register throughout Steps 1–3. Use language like:
- "I would like to formally raise my concern about housing affordability in Salt Lake City."
- "I believe it is important that our elected representatives understand the impact of current policies."
- "I am writing to request that action be taken."

Give name "Fatima" if asked. Provide address `500 E 500 S, Salt Lake City`. Choose a legislator. Confirm a bill with formal phrasing ("Yes, I'd like to proceed with that bill").

---

### Step D-5: Observe medium question (AC 1)

Medium question must appear after Step 3 bill confirmation, not before.

**PASS/FAIL signal:** Same as A-5.

---

### Step D-6: Evaluate formality inference (AC 2 — formal inference path)

**Expected:** Because Fatima's language throughout has been clearly formal ("I would like to formally," "I believe it is important"), the chatbot should INFER a formal preference and CONFIRM.

**PASS signal for AC 2 (formal register → confirm formal):**
- Chatbot confirms formal: "It sounds like you'd prefer a more formal tone — does that work?" (or equivalent)
- Chatbot does NOT ask the full "conversational or formal?" question as if the register were undecided

**FAIL signals for AC 2:**
- Chatbot asks "Would you like it to be conversational or formal?" — minor FAIL (over-asking)
- Chatbot infers conversational despite Fatima's clearly formal language — more serious FAIL
- Chatbot skips formality entirely — blocking FAIL

---

### Step D-7: Confirm the inference and provide medium

Respond:
> "Yes, formal is right. And please make it an email."

---

### Step D-8: Evaluate the generated draft (AC 5, AC 6)

**PASS signal for AC 5 (formal tone):** Same as Persona B step B-8 AC 5 criteria.

**PASS signal for AC 6 (email format):** Same as Persona A step A-7 AC 6 criteria.

**FAIL signals for AC 5 and AC 6:** Same as their respective criteria above.

---

## Persona E — Dual preference, ambiguous register (run 5)

**ACs exercised:** AC 2 (ambiguous → ask directly), AC 3 (dual capture), AC 7
**Address:** Any valid Utah address
**Concern:** Any concern that reaches Step 4a

### Steps E-1 through E-4: Complete Steps 1–3 with ambiguous language

Use a register that is neither clearly casual nor clearly formal — neutral, matter-of-fact. For example:
- "I want to write about water quality. It's been an issue in my area."
- "I've noticed problems with the local water supply."
- Confirm a bill: "That one looks right."

These statements are neither "I wanna say something" (casual) nor "I would like to formally request" (formal). The register is ambiguous.

Give a name and address when asked. Choose a legislator. Confirm a bill.

---

### Step E-5: Observe medium question (AC 1)

Medium question must appear after Step 3 bill confirmation, not before.

**PASS/FAIL signal:** Same as A-5.

---

### Step E-6: Send both preferences in one message with ambiguous formality (AC 3, AC 2)

When asked about medium, send:
> "Text message, and I don't care about the tone, whatever you think is best."

This message gives medium (text) but the formality signal is ambiguous ("whatever you think is best").

**Expected:** The chatbot captures medium (text) from this one-message response — it does NOT re-ask for medium. But "whatever you think is best" for formality is ambiguous — the chatbot should ask directly rather than guessing.

**PASS signal for AC 3 (partial dual-capture — medium captured):**
- Chatbot does NOT re-ask "email or text?" — medium was already captured from this message
- Chatbot acknowledges the text preference

**PASS signal for AC 2 (ambiguous → ask directly):**
- Chatbot asks directly: "Would you like the tone to be **conversational** (personal, in your own voice) or **formal** (professional, structured)?" (or equivalent)
- Chatbot does NOT pick one for the constituent and proceed without asking
- Chatbot does NOT skip formality and generate a draft

**FAIL signals:**
- Chatbot asks "email or text?" again after constituent already said "text message" — FAIL on AC 3
- Chatbot picks a formality without asking (even if it picks correctly) — FAIL on AC 2
- Chatbot generates a draft before formality is resolved — FAIL (blocking)

---

### Step E-7: Provide explicit formality choice

Respond:
> "Conversational."

---

### Step E-8: Evaluate the generated draft (AC 7)

**PASS signal for AC 7 (text/SMS format):**
- Draft is 1–3 sentences total
- Each segment is under 160 characters
- No formal salutation
- Personal and direct in tone

**FAIL signal for AC 7:** Same as Persona B step B-8 AC 7 criteria.

---

## AC Quick-Reference Table

| AC | What it tests | Personas that test it | PASS signal | FAIL signal |
|----|--------------|----------------------|-------------|-------------|
| AC 1 | Medium question appears after Step 3 confirmation — NOT before | A, B, C, D, E | Medium question follows bill confirmation | Medium question appears before Step 3 gate |
| AC 2 | Three-path formality logic (infer casual / infer formal / ask directly) | C (casual infer), D (formal infer), E (ambiguous → ask) | Chatbot infers when register is clear; asks when ambiguous | Over-asks when clear; infers when ambiguous; or skips formality |
| AC 3 | Single-message dual capture | A (email + conversational), E (text + ambiguous) | Both preferences captured from one message; second preference not re-asked | Re-asks for a preference already given in the same message |
| AC 4 | Single preference given → ask for the other | B (text only, then formal) | Chatbot asks for missing preference before generating | Draft generated with only one preference captured |
| AC 5 | Draft register matches formality selection | A (conversational), B (formal), C (conversational), D (formal) | Draft tone visibly matches selection | Register indistinguishable regardless of selection |
| AC 6 | Email draft: 2–4 paragraphs, 150–400 words, greeting + signature | A, D | Correct format and length | Wrong length, missing greeting, or missing signature |
| AC 7 | Text/SMS: 1–3 sentences, <160 chars/segment, no salutation | B, E | Correct length and no salutation | Too long, over 160 chars per segment, or has salutation |
| AC 8 | Overall: 4 of 5 runs pass | All | 4+ runs earn PASS | Fewer than 4 runs earn PASS |

---

## Failure Response Protocol

If a run FAILs on a behavioral checkpoint:

1. Identify which AC failed and which line(s) of `system-prompt/agent-instructions.md` govern that behavior
2. Revise the instruction text to close the gap — be specific, not general (e.g., add a concrete bad-example to the anti-pattern list rather than rephrasing the rule)
3. The Step 4a section governing this behavior is at lines ~189–206 of `agent-instructions.md`
4. Re-run the failing scenario once after the update in a fresh session
5. Document what changed and whether the re-run passed in `system-prompt/test-runs-4-3.md`

If no failures occur across 4+ of 5 runs: document "no changes needed" in the test log. No edits to `agent-instructions.md` are required.

---

## Recording Results

Use `system-prompt/test-runs-4-3.md` to record each run. For each run log:
- Persona used and any variation details
- Per-checkpoint PASS / FAIL / N/A result with the specific AC number
- Verbatim chatbot quote for any FAIL (to support instruction revision)
- Overall run result: PASS / FAIL
- If a fix was made: what changed in `agent-instructions.md` and re-run result
