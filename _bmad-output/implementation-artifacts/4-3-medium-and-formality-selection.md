# Story 4.3: Medium and Formality Selection

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want to choose email or text and how formal I want to sound before the draft is generated,
so that my message fits the channel I'm using and matches how I actually communicate.

## Acceptance Criteria

1. **Given** the constituent has confirmed the issue framing (Step 3 confirmation gate passed), **when** the chatbot advances to Step 4a, **then** it asks for medium selection: email or text/SMS (FR15) — using the exact prompt language specified in `system-prompt/agent-instructions.md` or language that produces equivalent behavior

2. **Given** the medium question has been asked, **when** the constituent selects a medium, **then** the chatbot asks for formality level with at least two distinct options: conversational or formal (FR16) — with the three conditional inference paths documented in `agent-instructions.md` (casual register → confirm conversational; formal register → confirm formal; ambiguous → ask directly)

3. **Given** the constituent answers medium and formality in a single message (e.g., "email, conversational"), **when** the chatbot processes this, **then** it recognizes both preferences from one response and proceeds without re-asking — it does NOT ask separately for the already-provided preference

4. **Given** the constituent answers only one preference, **when** the chatbot responds, **then** it asks for the remaining preference before proceeding — it does NOT generate a draft with only one of the two required inputs

5. **Given** both medium and formality have been captured, **when** the draft is generated in Step 4b, **then** the generated draft reflects the selected formality register in tone and vocabulary (FR16): conversational = first-person, personal, constituent's own language; formal = structured, respectful, third-person references where appropriate

6. **Given** the email medium is selected, **when** the draft is generated, **then** it is 2–4 paragraphs, 150–400 words, with a greeting and closing signature (FR18)

7. **Given** the text/SMS medium is selected, **when** the draft is generated, **then** it is 1–3 sentences total, each carrier segment under 160 characters, personal and direct — no formal salutation (FR18)

8. **Given** the full Step 4a sub-flow is tested in 5 dedicated sessions, **then** all ACs above (AC 1–7) pass in at least 4 of 5 runs — see Manual Testing Protocol below

## Manual Testing Protocol

**This story verifies behavior that was implemented in Story 4.1 (`system-prompt/agent-instructions.md`). There is no TypeScript code. All verification is manual.**

Story 4.3 tests the **delivery preferences sub-flow (Step 4a)** and validates that captured preferences are honored in the generated draft (Step 4b). This is distinct from Story 4.4, which tests voice-calibration and citation quality in depth. Story 4.3 focuses on: (a) correct sequencing and preference capture, and (b) that the draft's medium/formality visibly matches what was selected.

### Clean Session Requirement

Every test run MUST use a fresh Claude.ai project (or equivalent platform) with:
- No prior conversation history
- No memory of implementation details from this project
- A Claude/Copilot instance that participated in code reviews MUST NOT be used

### Pre-Test Setup Checklist

- [ ] MCP server is running and publicly accessible
- [ ] `lookup_legislator` and `search_bills` tools are connected to the chatbot session
- [ ] `system-prompt/agent-instructions.md` is loaded as the system prompt
- [ ] Fresh chatbot session — no prior context, no memories enabled
- [ ] Complete Steps 1–3 of the flow before beginning Step 4a evaluation

### Per-Run Behavioral Checklist

For each run, evaluate these behaviors with PASS / FAIL / N/A:

**Step 4a — Delivery Preferences**
- [ ] Chatbot asks for medium (email or text/SMS) after issue framing is confirmed — NOT before (AC 1)
- [ ] Chatbot uses the three-path formality logic: infers if register is clear, asks directly if ambiguous (AC 2)
- [ ] When both preferences given in one message, chatbot captures both without re-asking (AC 3)
- [ ] When only one preference given, chatbot asks for the missing preference before generating (AC 4)

**Step 4b — Draft Compliance with Captured Preferences**
- [ ] Conversational tone: draft uses first-person, constituent's language and story, reads like a real person wrote it (AC 5)
- [ ] Formal tone: draft is structured, respectful, uses third-person constituent references where appropriate (AC 5)
- [ ] Email draft: 2–4 paragraphs, 150–400 words, has greeting + closing signature (AC 6)
- [ ] Text/SMS draft: 1–3 sentences, under 160 characters per segment, no formal salutation (AC 7)

### Test Personas

Use at least 3 of the following personas across 5 runs to cover all AC edge cases:

---

**Persona A — Deb (email, conversational — single-message preference):**
> Concern: education funding; Address: `742 Evergreen Terrace, Salt Lake City`

When asked about medium and formality, Deb responds: "Email, and keep it personal — I just want to sound like myself."

*Tests:* AC 1, 2, 3, 5, 6
*Expected behavior:* Chatbot captures both preferences from one message. Draft is 2–4 paragraphs, 150–400 words, first-person and personal in voice. Chatbot does NOT re-ask for preferences already given.

---

**Persona B — Marcus (text/SMS, formal — two separate answers):**
> Concern: housing/cost of living; Address: `8 Spruce Street, Provo`

When asked about medium, Marcus says "Text." When asked about formality, he says "Let's keep it professional."

*Tests:* AC 1, 2, 4, 5, 7
*Expected behavior:* Chatbot asks for medium, then asks for formality separately after Marcus answers medium only. Draft is 1–3 sentences, each segment under 160 characters, no formal salutation, structured and respectful in tone.

---

**Persona C — Alex (inferred conversational register):**
> Concern: neighborhood impact from HB 42; Address: `1500 North University Ave, Provo`

Alex's language throughout the flow has been casual ("I'm really ticked off," "I wanna say something"). When Step 4a begins, chatbot should confirm conversational rather than asking the full formality question.

*Tests:* AC 2 (inference path), AC 3 or 4, AC 5
*Expected behavior:* Chatbot says "It sounds like you'd want to keep this conversational — does that sound right?" (or equivalent inference), rather than presenting both options. Chatbot still asks for medium.

---

**Persona D — Fatima (formal register inferred, email):**
> Concern: housing; Address: `500 E 500 S, Salt Lake City`

Fatima's language has been formal throughout ("I would like to formally request," "I believe it's important"). Chatbot should infer formal register and confirm rather than presenting both options.

*Tests:* AC 2 (formal inference path), AC 5, AC 6
*Expected behavior:* Chatbot says "It sounds like you'd prefer a more formal tone — does that work?" (or equivalent). Draft is formal in register, email length and format.

---

**Persona E — Dual preference, ambiguous register (run 5 variation):**
> Any concern + address

Constituent gives both preferences in one message with an ambiguous register, e.g. "text message, and I don't care about the tone, whatever you think is best."

*Tests:* AC 3 (dual capture), AC 2 (ambiguous → ask directly path), AC 7
*Expected behavior:* Chatbot captures medium from the one-message response. Since "whatever you think is best" is ambiguous, chatbot asks directly for conversational vs formal. Draft is text/SMS length once both are captured.

### Pass Criterion

At least 4 of 5 runs earn PASS on all applicable behavioral checklist items for that run. Document run results and any behavioral anomalies.

### Failure Response

If testing reveals a behavioral gap (e.g., chatbot skips the formality question, generates a draft without both preferences, or misapplies the formality register), update `system-prompt/agent-instructions.md` to address it. Re-run the failing scenario once after the update to confirm resolution. Document what changed and why in the test log.

## Tasks / Subtasks

- [ ] Task 1: Write expected test run outline in `system-prompt/testing-notes-4-3.md` (AC: 1–7 — reference for owner-executed runs)
  - [ ] For each persona (A–E), write a step-by-step description of what a **passing** run looks like: what the chatbot should say at each Step 4a decision point, what tone/length signals confirm each AC in the generated draft
  - [ ] Include explicit "PASS signal" and "FAIL signal" for each behavioral checkpoint (especially: inference vs. ask-directly split, dual-preference capture, draft register compliance, length bounds)
  - [ ] Include AC quick-reference table (AC number → checkpoint → persona coverage)
  - [ ] The outline must be specific enough to compare actual LLM output against expected output — not a general checklist, but a scripted walkthrough
  - [ ] **NOTE: The dev agent does NOT run the sessions.** After Task 1 is complete, set story status to `review`. Corey executes the 5 manual runs using this outline and the protocol above.

- [ ] Task 2: Run 5 manual test sessions (AC: 8 — owner-executed after Task 1)
  - [ ] Run 1: Persona A (Deb — email, conversational, single-message)
  - [ ] Run 2: Persona B (Marcus — text/SMS, formal, two-step)
  - [ ] Run 3: Persona C (Alex — inferred conversational)
  - [ ] Run 4: Persona D (Fatima — inferred formal)
  - [ ] Run 5: Persona E (dual preference, ambiguous register) or repeat Persona A/B with variation
  - [ ] Record per-run behavioral checklist results as PASS / FAIL / N/A

- [ ] Task 3: Document test results in `system-prompt/test-runs-4-3.md` (AC: 8 — owner-executed)
  - [ ] Create file with per-run behavioral checklist filled in
  - [ ] Note any behavioral anomalies (chatbot deviations from expected behavior)
  - [ ] Mark overall PASS or FAIL per run with brief rationale

- [ ] Task 4: Update `system-prompt/agent-instructions.md` if gaps found (AC: 1–7)
  - [ ] For each FAIL, identify the relevant section of `agent-instructions.md` (Step 4a section, lines ~189–206)
  - [ ] Revise instruction text to close the gap — preserve all other story-tested behaviors (Steps 1–3 must not regress)
  - [ ] Re-run the failing scenario once after update; document result in test log

## Dev Notes

### What This Story Is

Story 4.3 verifies and, if necessary, refines the medium and formality selection behavior (Step 4a) implemented in Story 4.1 (`system-prompt/agent-instructions.md`). Like Story 4.2, **there is no TypeScript code**. The deliverables are:

1. `system-prompt/testing-notes-4-3.md` — scripted expected run outline for all 5 personas (new file, created by dev agent before handing off to owner)
2. `system-prompt/test-runs-4-3.md` — manual test results filled in by Corey (new file)
3. Possibly revised `system-prompt/agent-instructions.md` — only if testing exposes gaps

**No TypeScript code. No npm packages. No CI changes. No Vitest tests.**

### Scope of This Story

Story 4.3 focuses exclusively on **Step 4a (Delivery Preferences)** and the minimum verification that Step 4b honors the selections:

```
Step 4a: Delivery Preferences
  → Medium question asked after Step 3 confirmation (not before)
  → Formality: three conditional paths —
      casual register throughout → confirm conversational
      formal register throughout → confirm formal
      ambiguous → ask directly ("conversational or formal?")
  → Both preferences captured before draft generated
  → Single-message dual capture recognized
  → Single preference → ask for the other before proceeding

Step 4b: Honor Captured Preferences (scope boundary)
  → Draft register visibly matches formality selection
  → Email: 2–4 paragraphs, 150–400 words, greeting + signature
  → Text/SMS: 1–3 sentences, <160 chars/segment, no salutation
```

Story 4.4 will test voice calibration and citation quality in depth. Story 4.3 does NOT need to verify citation format, personal-story integration, or legislative data accuracy — those are Story 4.4's scope.

### What Already Exists (from Story 4.1)

`system-prompt/agent-instructions.md` — Step 4a section (lines ~189–206) encodes all the behaviors this story tests. Key instructions:

**Medium ask:**
> "Would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct."

**Formality — three conditional paths:**
- Casual register → confirm: "It sounds like you'd want to keep this conversational — does that sound right?"
- Formal register → confirm: "It sounds like you'd prefer a more formal tone — does that work?"
- Ambiguous → ask directly: "And would you like the tone to be **conversational** (personal, in your own voice) or **formal** (professional, structured)?"

**Dual capture rule:**
> "If the constituent answers both in one message ('email, conversational'), note both and proceed. If they answer only one, ask for the other."

**Gate:**
> "Do not generate a draft until both preferences are captured."

[Source: `system-prompt/agent-instructions.md` — Step 4a, lines ~189–206]

### Critical Behavioral Rules to Watch in Testing

**1. Sequencing: Step 4a Must Come After Step 3 Confirmation**

The chatbot must NOT ask about medium or formality until the constituent has confirmed an issue framing (Step 3 gate). If medium/formality questions appear before bill confirmation, that is a sequencing failure. In clean sessions, this is a known LLM drift risk — monitor the transition point carefully.

**2. Register Inference vs. Direct Ask (AC 2)**

The three-path logic is the highest-complexity behavioral requirement in this story. Watch for:
- **Over-asking:** Chatbot asks "conversational or formal?" even when the constituent has been clearly casual throughout. This is a minor FAIL (redundant, not wrong), but worth noting.
- **Under-inferring:** Chatbot infers the wrong register (labels a casual constituent's language as formal). This is a more serious FAIL — document it and update the instruction.
- **Skipping formality entirely:** Chatbot captures medium but generates the draft without ever addressing formality. This is a blocking FAIL.

**3. Dual-Preference Capture (AC 3)**

A subtle failure mode: the chatbot says "Great, email it is!" and then asks again about formality even though the constituent said "email, conversational" in one message. This is a FAIL for AC 3 — both preferences were in a single message and should be captured together.

**4. Draft Register Compliance (AC 5)**

The formality distinction should be visible in the output. Signals for a passing conversational draft: first-person throughout, uses words/phrases from the constituent's own messages, doesn't sound like a form letter. Signals for a passing formal draft: structured paragraphs, third-person constituent references ("As a constituent of [district]..."), no slang or contractions. If the draft is identical in register regardless of selection, that is a FAIL.

**5. Length Bounds (AC 6, AC 7)**

For email: count paragraphs and total word count. For text/SMS: count total sentences and count characters in each segment. These are deterministic checks — either the draft is within bounds or it isn't. Length failures should trigger an update to the Step 4b length constraint instructions, not Step 4a.

### Lesson Applied from Story 4.2 (Epic 3 Retro)

Story 4.2 identified that **clean session requirement** is essential for valid behavioral testing. Any LLM instance that participated in code review of `agent-instructions.md` has seen the implementation and will over-comply without truly testing the behavior. Use a fresh Claude.ai project with no history.

[Source: `_bmad-output/implementation-artifacts/4-2-personal-concern-capture-and-empathetic-issue-discovery.md` — "Clean Session Requirement"]

### Test File Naming Convention

- `system-prompt/testing-notes-4-3.md` — expected run outline (new, created by dev agent)
- `system-prompt/test-runs-4-3.md` — manual test log (new, filled in by Corey)

Do NOT append to `system-prompt/testing-notes-4-2.md` or `system-prompt/test-runs-4-2.md` — each story gets its own file to preserve attribution and prevent cross-contamination of review notes. This pattern was established in Story 4.2.

[Source: `_bmad-output/implementation-artifacts/4-2-personal-concern-capture-and-empathetic-issue-discovery.md` — "Test File Naming Convention"]

### Dependency: Stories 4.1 and 4.2

Story 4.3 depends on `system-prompt/agent-instructions.md` being the version reviewed and accepted in Story 4.2 (including the 4.2 review follow-up fixes applied 2026-03-15). Story 4.2 is currently `done`. All AC 7 (ambiguous confirmation gate), name-solicitation UX, and validate-before-inform anti-pattern improvements have been applied.

The Step 4a section of `agent-instructions.md` was not modified by the 4.2 review. Story 4.3 tests it for the first time in a focused behavioral story.

### Project Structure Notes

Files involved in this story:
- `system-prompt/testing-notes-4-3.md` — new, created at monorepo root during Task 1
- `system-prompt/test-runs-4-3.md` — new, created at monorepo root during testing
- `system-prompt/agent-instructions.md` — possibly modified if gaps found (monorepo root)

All files live at the **monorepo root** level, not inside `apps/`. They are not compiled, bundled, or imported by any TypeScript code.

[Source: `_bmad-output/planning-artifacts/architecture.md` — "Complete Project Directory Structure"]

### References

- Story 4.3 requirements: [`_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.3]
- FR15 (medium selection): [`_bmad-output/planning-artifacts/prd.md`]
- FR16 (formality selection, draft register): [`_bmad-output/planning-artifacts/prd.md`]
- FR18 (medium-calibrated length): [`_bmad-output/planning-artifacts/prd.md`]
- Step 4a implementation: [`system-prompt/agent-instructions.md` — "Step 4a — Delivery Preferences", lines ~189–206]
- Step 4b length/format constraints: [`system-prompt/agent-instructions.md` — "Step 4b — Draft Generation", lines ~210–255]
- UX flow (medium + formality → draft): [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Flow 2 (Deb)", "Flow 3 (Marcus)"]
- Story 4.2 spec (testing protocol template, file naming, clean session rule): [`_bmad-output/implementation-artifacts/4-2-personal-concern-capture-and-empathetic-issue-discovery.md`]
- Story 4.1 spec (full system prompt context): [`_bmad-output/implementation-artifacts/4-1-system-prompt-and-4-step-agent-instructions.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
