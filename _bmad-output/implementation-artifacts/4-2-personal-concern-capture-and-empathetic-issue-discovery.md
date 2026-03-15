# Story 4.2: Personal Concern Capture and Empathetic Issue Discovery

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want the chatbot to acknowledge my concern and help me find the right issue framing even if I don't know which bill I care about,
so that my personal story is the starting point — not a form field.

## Acceptance Criteria

1. **Given** the system prompt is active and a constituent begins the conversation, **when** the chatbot opens, **then** the first message is a warm, open question about the constituent's concern — NOT a request for their address, NOT a list of topic categories (AC 2 from Story 4.1)

2. **Given** the constituent describes their concern (specific or vague), **when** the chatbot responds, **then** it acknowledges the personal emotion or personal impact **before** asking for the address ("validate before inform") — the emotional acknowledgment must precede any pivot to data or address collection (FR12)

3. **Given** the constituent has described their concern, **when** less than one personal-impact detail has been shared, **then** the chatbot asks a focused follow-up (e.g., "Has this affected you or someone close to you directly?") before proceeding to address collection

4. **Given** the constituent does not know a specific bill, **when** the chatbot searches, **then** it infers a freeform theme from the constituent's own words and passes it directly to `search_bills` — it MUST NOT present a list of theme categories for the constituent to choose from; the theme is always inferred, never prompted (FR13)

5. **Given** `search_bills` returns results, **when** the chatbot presents bills, **then** it presents 2–3 issue framings derived from the legislator's actual sponsored bill record with accurate bill details from tool output (bill ID, title, plain-language summary, status) — NOT generic topic labels or invented framing

6. **Given** bills are presented, **when** the constituent has not yet explicitly confirmed or redirected, **then** the chatbot does NOT proceed to Step 4a (delivery preferences) — it waits for an explicit signal (FR14)

7. **Given** the constituent's response to bill presentation is ambiguous (e.g., "OK," "I guess," "sure"), **when** the chatbot interprets this, **then** it seeks a clarifying confirmation before proceeding to draft generation (e.g., "Just to make sure — are you comfortable building your message around [bill name]?")

8. **Given** zero relevant bills are found, **when** the chatbot offers to proceed without specific legislation, **then** it explicitly states no citation will be included and requires constituent affirmation before continuing to draft generation (AC 10 from Story 4.1)

9. **Given** the constituent mentions a specific bill by ID (e.g., "HB 42"), **when** the chatbot constructs the search query, **then** it does NOT pass the bill ID as the `theme` parameter — it infers a descriptive topic theme from context; if the bill's subject is unknown, it asks before searching (AC 5 from Story 4.1)

10. **Given** the full concern capture + issue discovery sub-flow is tested in 5 dedicated sessions, **then** all 5 ACs above (AC 1–9) pass in at least 4 of 5 runs — see Manual Testing Protocol below

## Manual Testing Protocol

**This story verifies behavior that was implemented in Story 4.1 (`system-prompt/agent-instructions.md`). There is no TypeScript code. All verification is manual.**

The Story 4.1 testing protocol validated full end-to-end flow completion (4 of 5 runs). Story 4.2 tests **behavioral quality** of the specific concern capture and issue discovery sub-flow — a run can "pass" the 4.1 criterion while still mishandling emotional acknowledgment or issue framing. This story closes that gap.

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

### Per-Run Behavioral Checklist

For each run, evaluate these behaviors with PASS / FAIL / N/A:

**Step 1 — Warm Open and Concern Capture**
- [X] Chatbot opens with an open question about concern — NOT address, NOT category list (AC 1)
- [X] When concern is described, chatbot acknowledges emotion BEFORE asking for address (AC 2)
- [X] Chatbot captures or asks for at least one personal-impact detail before proceeding (AC 3)
- [X] Chatbot asks for constituent's name if not volunteered (4.1 AC 3)

**Step 3 — Issue Discovery**
- [X] `search_bills` is called with a freeform theme inferred from constituent's words — no category menu presented (AC 4)
- [X] Bills presented are from the actual `search_bills` tool output — accurate bill IDs, titles, summaries (AC 5)
- [X] Chatbot waits for explicit confirmation before proceeding to delivery preferences (AC 6)
- [X] If response is ambiguous ("I guess"), chatbot asks for clarification (AC 7)

**Edge Case Handling** (as applicable per persona)
- [X] Bill ID mentioned by constituent → chatbot infers theme, does NOT pass ID to `search_bills` (AC 9)
- [X] Zero-result path → chatbot offers no-citation fallback and requires affirmation (AC 8)

### Test Personas

Use at least 3 of the following 4 personas across 5 runs to cover all AC edge cases:

---

**Persona A — Deb (specific concern, emotional):**
> "I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers."

Address: `742 Evergreen Terrace, Salt Lake City`

*Tests:* AC 1, 2, 3, 4, 5, 6, 7
*Expected behavior:* Chatbot names the emotional weight ("losing three teachers — that's not just a budget line, that's your daughter's school"), captures personal impact, infers theme `"public education funding"` without asking, presents 2–3 education-related sponsored bills with accurate tool data, waits for explicit confirmation.

---

**Persona B — Marcus (vague concern):**
> "Things just feel wrong lately. Like my neighbors are struggling and I don't know why."

Address: `8 Spruce Street, Provo`

*Tests:* AC 1, 2, 3, 4, 5, 6
*Expected behavior:* Chatbot reflects the vague feeling back without minimizing ("That feeling that something's off — it's worth paying attention to"), asks a focused follow-up to surface personal impact, infers a broad theme (e.g., `"economic hardship"` or `"cost of living"`) from the conversation, presents bills without asking which category to search.

---

**Persona C — Alex (mentions bill by ID):**
> "I'm furious about HB 42 — that bill is going to hurt my neighborhood."

Address: `1500 North University Ave, Provo`

*Tests:* AC 9 (bill ID not passed as theme), AC 4, 5, 6
*Expected behavior:* Chatbot does NOT call `search_bills({ theme: "HB 42" })`. If the bill's subject matter is unknown from context, chatbot asks "What is HB 42 about?" and infers theme from the response. If "HB 42" relates to something in context, infers descriptive theme immediately.

---

**Persona D — Fatima (exhausted ambiguity + redirect):**
> First message: "I want to say something about housing. I'm not sure what."
> After bills are presented: "I guess… the first one?"

Address: `500 E 500 S, Salt Lake City`

*Tests:* AC 7 (ambiguous confirmation), AC 3, AC 4
*Expected behavior:* Chatbot asks for follow-up impact detail before proceeding to address. After bills are presented, when Fatima says "I guess… the first one?", chatbot seeks clarification (e.g., "Just to confirm — are you comfortable building your message around [bill name]?") before proceeding to delivery preferences.

### Pass Criterion

At least 4 of 5 runs earn PASS on all applicable behavioral checklist items for that run. Document run results and any behavioral anomalies.

### Failure Response

If testing reveals a behavioral gap (e.g., chatbot consistently skips emotional acknowledgment, or presents category menus), update `system-prompt/agent-instructions.md` to address it. Re-run the failing scenario once after the update to confirm resolution. Document what changed and why in the test log.

## Tasks / Subtasks

- [x] Task 1: Write expected test run outline in `system-prompt/testing-notes-4-2.md` (AC: 1–9 — reference for owner-executed runs)
  - [x] For each persona (A–D), write a step-by-step description of what a **passing** run looks like: what the chatbot should say, what tool calls should be made, and what signals confirm each AC is met
  - [x] Include explicit "PASS signal" and "FAIL signal" for each behavioral checkpoint so Corey can make a clear call during execution
  - [x] The outline must be specific enough to compare actual LLM output against expected output — not a general checklist, but a scripted walkthrough
  - [x] **NOTE: The dev agent does NOT run the sessions.** After Task 1 is complete, set story status to `review`. Corey executes the 5 manual runs using this outline and the protocol above.

- [X] Task 2: Run 5 manual test sessions (AC: 10 — owner-executed after Task 1)
  - [X] Run 1: Persona A (Deb — specific concern, emotional)
  - [X] Run 2: Persona B (Marcus — vague concern)
  - [X] Run 3: Persona C (Alex — mentions bill by ID)
  - [X] Run 4: Persona D (Fatima — ambiguous confirmation)
  - [X] Run 5: Persona A or B (repeat for coverage; vary address or concern detail)
  - [X] Record per-run behavioral checklist results as PASS / FAIL / N/A

- [X] Task 3: Document test results in `system-prompt/test-runs-4-2.md` (AC: 10 — owner-executed)
  - [X] Create file with per-run behavioral checklist filled in
  - [X] Note any behavioral anomalies (chatbot deviations from expected behavior)
  - [X] Mark overall PASS or FAIL per run with brief rationale

- [ ] Task 4: Update `system-prompt/agent-instructions.md` if gaps found (AC: 1–9)
  - [x] For each FAIL, identify the relevant section of agent-instructions.md
  - [x] Revise instruction text to close the gap
  - [x] Re-run the failing scenario once after update; document result in test log
  - [ ] **NOTE:** If no failures found across 4+ of 5 runs, no changes to agent-instructions.md are required — document "no changes needed" in test log

### Review Follow-ups (AI)

- [ ] [AI-Review][High] AC 7 Gap: Explicitly instruct the agent to seek clarifying confirmation for ambiguous responses (e.g., "I guess," "OK," "sure") before proceeding past the bill confirmation gate. [system-prompt/agent-instructions.md:164]
- [ ] [AI-Review][Medium] Name Solicitation UX: Refine name solicitation instruction to encourage more natural integration into acknowledgment or address request. [system-prompt/agent-instructions.md:70]
- [ ] [AI-Review][Medium] Unexplained File Deletion: Document the reason for deleting `_bmad-output/implementation-artifacts/tech-spec-wip.md`.
- [ ] [AI-Review][Low] Instructional Detail (AC 2): Add an explicit "anti-pattern" example for the "awkward" name solicitation or the "ambiguous response" to strengthen the agent's behavior. [system-prompt/agent-instructions.md:65]


## Dev Notes

### What This Story Is

Story 4.2 verifies and, if necessary, refines the concern capture and empathetic issue discovery behavior that was implemented in Story 4.1. The primary artifact is `system-prompt/agent-instructions.md` (already exists). The deliverable is:

1. `system-prompt/testing-notes-4-2.md` — step-by-step expected run outline for each persona (new file, created by dev agent before handing off to owner)
2. `system-prompt/test-runs-4-2.md` — manual test results filled in by Corey during execution (new file)
3. Potentially revised `system-prompt/agent-instructions.md` — only if testing exposes gaps

**No TypeScript code is written. No npm packages. No CI changes. No Vitest tests.** This is a behavioral verification story for a non-deterministic LLM product artifact.

### Scope of Concern for This Story

Story 4.2 focuses exclusively on **Steps 1 and 3** of the 4-step flow:

```
Step 1: Warm Open + Concern Capture
  → Open question (warm, not address)
  → Emotional acknowledgment BEFORE address pivot
  → Personal-impact detail captured
  → Name asked if not volunteered

Step 3: Bill Surfacing + Confirmation Gate
  → Theme inferred freeform from constituent's words (never a category menu)
  → Bill ID mentioned → theme inferred from context, not passed as ID
  → 2-3 relevant bills from actual tool output
  → Explicit confirmation before proceeding to Step 4a
  → Ambiguous response → clarification sought
  → Zero results → no-citation fallback + constituent affirms
```

Steps 2 and 4 are tested end-to-end in Story 4.1. Story 4.3 will test medium/formality selection (Step 4a) in depth; Story 4.4 will test draft generation (Step 4b) in depth.

### What Already Exists (from Story 4.1)

`system-prompt/agent-instructions.md` encodes all the behaviors this story tests. Key sections:

**Step 1 instructions** (`agent-instructions.md` lines 49–75):
- Warm open question language provided
- Explicit "validate before inform" rule with examples
- "Capture at least one personal-impact detail" gate with follow-up question text
- Name ask instruction with natural usage guidance

**Step 3 instructions** (`agent-instructions.md` lines 120–178):
- Freeform theme inference rule with examples
- Bill-ID-to-theme conversion instruction (do NOT pass bill ID as theme)
- Confirmation gate enforcement: "do not proceed to Step 4 until the constituent has explicitly confirmed or redirected"
- Zero-result fallback sequence (2 attempts → no-citation offer)

### Critical Behavioral Rules to Watch in Testing

**1. Validate Before Inform (AC 2)**

The retrospective identified this as the emotional core of the product. A clean LLM session may try to be "efficient" and jump to address collection. Look for whether the chatbot names the emotional reality BEFORE asking for anything:
- Good: "That sounds incredibly hard — losing three teachers from your daughter's school. Before we find your representative, I want to make sure I understand what you're facing."
- Bad: "I'm sorry to hear that. To get started, what's your address?"

A technically "passing" response might acknowledge with one word ("I'm sorry") and immediately ask for address. That is a FAIL for this story — the acknowledgment must be substantive.

**2. Freeform Theme Inference (AC 4)**

The Epic 3 retrospective documented that enumerating themes causes the LLM to present a category menu:
> "Tool description enumerated themes → LLM presented category menu, blocking fallback path."

Watch for this pattern even when the system prompt says NOT to do it. A subtle failure mode: the chatbot says "What topic would you like me to search — education, housing, healthcare, or something else?" This is a FAIL even if it includes "or something else."

[Source: `_bmad-output/implementation-artifacts/sprint-status.yaml` — Epic 3 retrospective notes]
[Source: `apps/mcp-server/src/tools/search-bills.ts` — tool description already instructs freeform inference]

**3. Bill ID Handling (AC 9)**

`bill_fts` in SQLite indexes `title` and `summary`, NOT `id`. Passing `"HB 42"` as the theme to `search_bills` will return zero results (FTS5 search is against text fields). The chatbot must NOT use bill IDs as search themes.

[Source: `apps/mcp-server/src/cache/` — FTS5 index configuration]
[Source: Story 4.1 review finding: "FTS Search Failure for Bill IDs"]

**4. Ambiguous Confirmation (AC 7)**

"OK," "I guess," "sounds fine," "sure" — these are not explicit confirmations. Watch whether the chatbot proceeds past bill selection on these signals. An explicit confirmation sounds like: "Yes, let's use that one," "HB 42 — that's exactly what I'm talking about," or "Let's go with the first."

### Test File Naming Convention

The test log file is `system-prompt/test-runs-4-2.md`. Do NOT append to `system-prompt/test-runs.md` (that belongs to Story 4.1). Each story gets its own test runs file to preserve attribution and prevent cross-contamination of review notes.

### Dependency: Story 4.1

Story 4.2 depends on `system-prompt/agent-instructions.md` being fully implemented and reviewed. Story 4.1 is currently in `review` status. Do not run Story 4.2 test sessions until Story 4.1 moves to `done` (i.e., Corey completes the 4.1 manual test runs and accepts the story).

This story should be ready to execute as soon as 4.1 is marked done.

### Project Structure Notes

Files involved in this story:
- `system-prompt/agent-instructions.md` — possibly modified if gaps found (monorepo root)
- `system-prompt/test-runs-4-2.md` — new, created during testing

Both files live at the **monorepo root** level, not inside `apps/`. They are not compiled, bundled, or imported by any TypeScript code.

[Source: `_bmad-output/planning-artifacts/architecture.md` — "Complete Project Directory Structure"]

### References

- Story 4.2 requirements: [`_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2]
- FR12 (personal concern capture): [`_bmad-output/planning-artifacts/prd.md` — Guided Issue Discovery]
- FR13 (issue framing from legislator record): [`_bmad-output/planning-artifacts/prd.md`]
- FR14 (confirmation gate): [`_bmad-output/planning-artifacts/prd.md`]
- Validate-before-inform UX principle: [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Journey Patterns"]
- Flow 2 (J1 — Deb primary path): [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Flow 2"]
- Flow 3 (J2 — Marcus open-ended path): [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Flow 3"]
- System prompt (already implemented): [`system-prompt/agent-instructions.md`]
- Story 4.1 spec (full context + prior test results): [`_bmad-output/implementation-artifacts/4-1-system-prompt-and-4-step-agent-instructions.md`]
- Epic 3 retrospective (theme enumeration failure mode): [`_bmad-output/implementation-artifacts/sprint-status.yaml` — Epic 3 retrospective notes]
- FTS5 content table / bill search: [`apps/mcp-server/src/cache/`] and [`apps/mcp-server/src/tools/search-bills.ts`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_(none — no TypeScript code; no runtime errors)_

### Completion Notes List

- Task 1 complete: Created `system-prompt/testing-notes-4-2.md` — scripted walkthrough for all 4 personas (A–D), with explicit PASS/FAIL signals for every AC checkpoint (AC 1–9 plus 4.1 AC 3). Includes Run 5 variation suggestions, AC quick-reference table, and failure response protocol.
- Story is now ready for Corey to execute the 5 manual test runs using the outline. Tasks 2–4 are owner-executed and are left unchecked per the story spec.
- No TypeScript code, no npm packages, no CI changes, no Vitest tests written — this is a behavioral documentation story.

### File List

- `system-prompt/testing-notes-4-2.md` (new — expected run outline for concern capture + issue discovery sub-flow; monorepo root)
- `system-prompt/test-runs-4-2.md` (new — manual test run log; created by Corey during execution)
- `system-prompt/agent-instructions.md` (possibly modified — only if testing reveals behavioral gaps; not modified by dev agent)
