# Story 4.1: System Prompt and 4-Step Agent Instructions

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want a system prompt that guides my chatbot through the full constituent flow automatically,
so that I can get from concern to draft without manually directing the conversation at each step.

## Acceptance Criteria

1. **Given** `system-prompt/agent-instructions.md` is loaded into a connected chatbot (Claude.ai or ChatGPT), **when** a conversation begins, **then** the chatbot executes the 4-step flow: (1) warm open question + personal concern capture, (2) address entry + `lookup_legislator` invocation, (3) bill surfacing via `search_bills` + constituent confirmation, (4) draft generation — completing end-to-end without manual steering beyond the constituent's natural responses (FR27)

2. **Given** the system prompt is active, **when** the constituent begins the conversation, **then** the chatbot opens with a warm, open question (e.g., "What brings you here today?") — NOT an address prompt, NOT a list of topic categories

3. **Given** the constituent describes their concern in their own words (specific or vague), **then** the chatbot acknowledges the personal emotion before pivoting to legislative data ("validate before inform") and captures at least one personal-impact detail before bill selection proceeds (FR12)

4. **Given** the constituent has shared their concern, **when** the chatbot asks for the address, **then** it passes `street` and `zone` separately to `lookup_legislator` (matching the tool's parameter schema: `{ street, zone }`)

5. **Given** the constituent does not know a specific bill, **then** the chatbot presents 2–3 issue framings derived from the legislator's actual record (via `search_bills`) for the constituent to confirm or redirect — it MUST NOT present a static list of theme categories; it MUST infer the theme freeform from the constituent's own words and pass it directly to `search_bills` (FR13)

6. **Given** the search results are available, **when** the constituent selects or confirms a bill, **then** the chatbot waits for at least one explicit confirmation or correction before proceeding to draft generation (FR14)

7. **Given** the constituent has confirmed the issue context, **when** the delivery preferences step is reached, **then** the chatbot asks for medium (email or text/SMS) and formality (conversational or formal) and captures both before any draft is produced (FR15, FR16)

8. **Given** a draft is generated, **then** it reflects the selected medium and formality; email drafts are 2–4 paragraphs (150–400 words); text/SMS drafts are 1–3 sentences (under 160 characters per segment) (FR18)

9. **Given** a draft is generated, **then** it includes at least one source citation (bill number, session, vote date) and contains no unsupported claims about the legislator's intent, motivation, or character (FR17, FR19)

10. **Given** the system prompt instructs the LLM on scope, **then** it accurately represents that the MCP tools surface **sponsored bills only — not voting record on bills the legislator did not sponsor**; when a constituent asks about voting record, the chatbot redirects to sponsored legislation

11. **Given** a constituent requests a revision (e.g., "make it shorter," "add that I've lived here 22 years"), **then** the chatbot generates a revised draft incorporating the feedback and returns to the draft state — not the beginning of the flow; citation and sourcing constraints are preserved (FR20, FR21)

12. **Given** the system prompt is tested manually in a clean LLM session (new project with no prior conversation history), **then** the 4-step flow completes end-to-end in at least 4 of 5 independent test runs (FR27) — see Manual Testing Protocol below

## Manual Testing Protocol

**This story delivers a Markdown document, not TypeScript code. Automated Vitest tests are NOT required or appropriate for non-deterministic LLM behavior. All verification is manual.**

### Clean Session Requirement

Every test run MUST use a fresh Claude.ai project (or equivalent platform) with:
- No prior conversation history
- No memory of implementation details from this project
- A Claude/Copilot instance that participated in code reviews MUST NOT be used — it "knows" implementation details (e.g., "the bill cache") that a real user's LLM would not

### Pre-Test Setup Checklist

- [ ] MCP server is running and publicly accessible
- [ ] `lookup_legislator` and `search_bills` tools are connected to the chatbot session
- [ ] `system-prompt/agent-instructions.md` is loaded as the system prompt (not a user message)
- [ ] Fresh chatbot session — no prior context, no memories enabled

### Step-by-Step Verification Checklist (per run)

For each run, start a fresh session and verify:

- [ ] **Step 1 — Warm Open:** Chatbot opens with an open question about the constituent's concern (not "enter your address")
- [ ] **Step 1 — Validation:** When the constituent shares a concern, the chatbot acknowledges the emotion or personal impact before asking for the address
- [ ] **Step 2 — Address Collection:** Chatbot asks for address and invokes `lookup_legislator` with separate `street` and `zone` parameters (confirm via tool call log)
- [ ] **Step 3 — Bill Surfacing:** Chatbot calls `search_bills` using a theme inferred from the constituent's words — no category menu is presented; the theme is freeform
- [ ] **Step 3 — Confirmation Gate:** Chatbot presents 2–3 relevant bills and waits for constituent confirmation before proceeding
- [ ] **Step 4 — Delivery Prefs:** Chatbot asks for medium (email/text) and formality (conversational/formal) before generating the draft
- [ ] **Step 4 — Draft:** Draft matches the chosen medium length constraints and formality register
- [ ] **Step 4 — Citation:** Draft contains at least one source citation (bill number + session)
- [ ] **Step 4 — No Editorializing:** Draft makes no unsupported claims about legislator intent or motivation
- [ ] **Revision:** Requesting a change (e.g., "make it shorter") produces a revised draft without restarting the flow

### Pass Criterion

4 of 5 independent runs complete the full flow end-to-end (FR27). Document which runs passed/failed and any behavioral anomalies.

### Test Personas

Use at least two different constituent personas across the 5 runs:
- **Persona A (Deb — specific concern):** "I'm really upset about the cuts to public education funding — my daughter's school just lost three teachers." Address: `742 Evergreen Terrace, Salt Lake City`
- **Persona B (Marcus — vague concern):** "Things just feel wrong lately. Like my neighbors are struggling and I don't know why." Address: `8 Spruce Street, Provo`

## Tasks / Subtasks

- [ ] Task 1: Create directory and file `system-prompt/agent-instructions.md` (AC: 1–11)
  - [ ] Write the system prompt preamble: role, mission, scope boundary (sponsored bills only — not voting record), and no-editorializing rule
  - [ ] Write Step 1 instructions: warm open question, empathetic concern capture, validate-before-inform pattern
  - [ ] Write Step 2 instructions: address collection → `lookup_legislator` invocation with `{ street, zone }` params
  - [ ] Write Step 3 instructions: freeform theme inference → `search_bills` invocation → present 2–3 bills → confirm before proceeding
  - [ ] Write Step 4a instructions: ask medium (email/text) and formality (conversational/formal), both required before draft generation
  - [ ] Write Step 4b instructions: draft generation constraints (length, voice, citation format, no editorializing)
  - [ ] Write revision loop instructions: incorporate feedback without restarting the flow; preserve citations
  - [ ] Write scope-boundary note: redirect "voting record" questions to sponsored legislation

- [ ] Task 2: Verify file structure and placement (AC: 1)
  - [ ] Confirm `system-prompt/agent-instructions.md` exists at the monorepo root level (not inside `apps/`)
  - [ ] Confirm the file is plain Markdown — no TypeScript, no JSON

- [ ] Task 3: Manual testing (AC: 12 — Manual Testing Protocol)
  - [ ] Run 5 independent sessions per the protocol above
  - [ ] Verify at least 4 of 5 runs complete the full flow
  - [ ] Document results (pass/fail per run, any behavioral anomalies observed)

## Dev Notes

### What This Story Is

Story 4.1 delivers `system-prompt/agent-instructions.md` — a plain Markdown file that instructs the LLM how to execute the 4-step constituent flow. This is a **product artifact**, not application code. There is no TypeScript, no npm package to install, no Vitest test to write.

The file lives at:
```
on-record/
└── system-prompt/
    └── agent-instructions.md    ← Product artifact (FR27)
```

Architecture mapping (from architecture.md, "Requirements to Structure Mapping"):
- Guided Issue Discovery (FR12–16): `system-prompt/agent-instructions.md`
- Message Composition (FR17–21): `system-prompt/agent-instructions.md`

[Source: `_bmad-output/planning-artifacts/architecture.md` — "Project Structure & Boundaries"]

### MCP Tool Interface: What the System Prompt Must Know

Both tools return **structured JSON** (not prose). The system prompt must instruct the LLM to read JSON fields directly — field names from `packages/types/` are the contract:

**`lookup_legislator` input:**
```
{ street: string, zone: string }
// street = street number + name only (e.g. "742 Evergreen Terrace")
// zone = city name OR 5-digit ZIP (e.g. "Salt Lake City" or "84111")
```

**`lookup_legislator` output (`LookupLegislatorResult`):**
```json
{
  "legislators": [
    {
      "id": "RRabbitt",
      "name": "...",
      "chamber": "house" | "senate",
      "district": 7,
      "email": "...",
      "phone": "...",
      "phoneLabel": "cell" | "district office" | "chamber switchboard" | "type unknown"
    }
  ],
  "session": "2025GS",
  "resolvedAddress": "..."
}
```

**`search_bills` input:**
```
{ legislatorId: string, theme: string }
// theme = freeform term inferred from constituent's words
// MUST NOT be a category menu choice — infer it from the conversation
```

**`search_bills` output (`SearchBillsResult`):**
```json
{
  "bills": [
    {
      "id": "HB0042",
      "title": "...",
      "summary": "...",
      "status": "...",
      "sponsorId": "RRabbitt",
      "voteResult": "passed" | "failed" | null,
      "voteDate": "2025-03-04" | null,
      "session": "2025GS"
    }
  ],
  "legislatorId": "RRabbitt",
  "session": "2025GS"
}
```

Field names MUST match exactly — the system prompt field references must not drift from these contracts.

[Source: `_bmad-output/planning-artifacts/architecture.md` — "Format Patterns > MCP Tool Response Type Contracts"]
[Source: `apps/mcp-server/src/tools/search-bills.ts`]
[Source: `apps/mcp-server/src/tools/legislator-lookup.ts`]

### Critical Behavioral Rules for the System Prompt

**1. Theme Inference — Freeform, Never a Menu**

The `search_bills` tool accepts a freeform `theme` string. The tool description already instructs the LLM:
> "Infer this from the conversation — do not present a list of options for the user to choose from."

The system prompt MUST reinforce this. The retrospective identified this as a real failure mode: when the tool description enumerated themes, the LLM presented a category menu that blocked the fallback path and broke the UX. The system prompt must instruct: infer the theme from the constituent's own words, call `search_bills` immediately, then present the results.

**2. Sponsored Bills Only — Not Voting Record**

The Utah Legislature API surfaces **bills the legislator sponsored or co-sponsored**. It does NOT provide the legislator's voting record on bills they did not sponsor. The system prompt must:
- State this scope boundary explicitly
- Instruct the LLM to redirect "how did they vote?" questions to: "I can show you bills they sponsored — let me search for those"
- Never imply or claim the tool can surface how a legislator voted on others' bills

**3. Validate Before Inform**

The system prompt must enforce the UX principle: acknowledge the constituent's emotion and personal story before pivoting to legislative data. This is not optional UX polish — it is the emotional core of the product. The constituent's voice and concern must be captured first.

**4. No Editorializing**

The draft must not characterize the legislator's intent, motivation, or judgment. "Rep. Smith voted for HB 42" is acceptable. "Rep. Smith clearly doesn't care about education" is not. This constraint applies to both draft generation and any commentary the LLM offers during the flow.

**5. Confirm Before Generate**

Draft generation must not begin until the constituent has provided at least one explicit confirmation or correction on the bill context (FR14). The system prompt must enforce this gate.

### 4-Step Flow Structure

The system prompt must sequence these steps:

```
Step 1: Warm Open + Concern Capture
  → Open question (what brings you here?)
  → Empathetic acknowledgment of personal story
  → Capture at least one personal-impact detail

Step 2: Address → Legislator Lookup
  → Ask for address
  → Call lookup_legislator({ street, zone })
  → Present legislator(s) from JSON result

Step 3: Bill Surfacing + Confirmation
  → Infer theme from constituent's words
  → Call search_bills({ legislatorId, theme })
  → Present 2–3 bills from JSON result
  → Wait for explicit confirmation or redirect

Step 4a: Delivery Preferences
  → Ask medium: email or text/SMS
  → Ask formality: conversational or formal
  → Capture both before generating

Step 4b: Draft Generation
  → Use constituent's own words and personal story
  → Match medium length constraints (email: 150–400w; text: <160 char/segment)
  → Reflect formality register in tone and vocabulary
  → Include citation: bill number + session + vote date (if available)
  → Zero unsupported claims about legislator intent/motivation

Revision Loop (when requested):
  → Incorporate feedback
  → Return to draft state (not step 1)
  → Preserve citations
```

[Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.1 AC]
[Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — "Flow 2: J1 — Deb — Primary Constituent Path"]

### Session Identifier Format

The `session` field in tool outputs uses the format `"2025GS"` (General Session) or `"2025S1"` (Special Session 1). The draft citation should present this in readable form: `"2025GS"` → "2025 General Session". This formatting convention is already established in `CitationTag.tsx` (from Story 3.6) and should be mirrored in the system prompt's citation instructions.

### Error Cases the System Prompt Should Handle

Both tools return `AppError` JSON on failure:
```json
{ "source": "...", "nature": "...", "action": "..." }
```

The system prompt should instruct the LLM to:
- Surface the `nature` field to the constituent in plain language
- Suggest the `action` field as the next step
- Not pretend the tool call succeeded when it failed

### What the System Prompt Must NOT Do

- Present a list of theme categories for the constituent to choose from
- Imply it can retrieve voting record on bills the legislator did not sponsor
- Editorialize on the legislator's record, character, or motives
- Generate a draft before receiving medium + formality preferences
- Generate a draft before the constituent confirms the bill context
- Restart the flow from Step 1 during the revision loop

### Project Structure Notes

- `system-prompt/agent-instructions.md` lives at the **monorepo root** — not inside `apps/web/` or `apps/mcp-server/`
- This is a product artifact, not application code; it is not compiled, bundled, or tested by CI
- No package.json changes required; no imports; no TypeScript
- The directory `system-prompt/` does not yet exist — create it
- Architecture lists this file at `system-prompt/agent-instructions.md` (see "Complete Project Directory Structure")

[Source: `_bmad-output/planning-artifacts/architecture.md` — "Complete Project Directory Structure"]

### References

- Epic 4 story definitions: [`_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1]
- FR12–FR21, FR27: [`_bmad-output/planning-artifacts/prd.md` — Guided Issue Discovery + Message Composition sections]
- Architecture file location mapping: [`_bmad-output/planning-artifacts/architecture.md` — "Requirements to Structure Mapping"]
- Architecture complete directory structure: [`_bmad-output/planning-artifacts/architecture.md` — "Complete Project Directory Structure"]
- MCP tool response type contracts: [`_bmad-output/planning-artifacts/architecture.md` — "Format Patterns"]
- UX constituent flow diagrams: [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Flow 2: J1" and "Flow 3: J2"]
- UX principles (validate-before-inform, confirm-before-generate): [`_bmad-output/planning-artifacts/ux-design-specification.md` — "Interaction Design Principles"]
- search_bills tool (freeform theme, tool description): [`apps/mcp-server/src/tools/search-bills.ts`]
- lookup_legislator tool (street/zone params): [`apps/mcp-server/src/tools/legislator-lookup.ts`]
- CitationTag session label formatting (2026GS → "2026 General Session"): [`apps/web/src/components/CitationTag.tsx`]
- Epic 3 retrospective — theme enumeration failure: [`_bmad-output/implementation-artifacts/sprint-status.yaml` — Epic 3 retrospective notes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `system-prompt/agent-instructions.md` (new — product artifact, monorepo root)
