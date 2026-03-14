---
title: 'System Prompt Token Footprint Optimization'
slug: 'system-prompt-token-optimization'
created: '2026-03-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Markdown']
files_to_modify:
  - 'system-prompt/agent-instructions.md'
code_patterns:
  - 'No behavioral/semantic changes — structural refactor only'
  - 'Cross-reference format: "On error → see Error Handling Reference"'
  - 'Do/Don''t bullet format replaces Good/Bad dialogue blocks'
test_patterns: []
---

# Tech-Spec: System Prompt Token Footprint Optimization

**Created:** 2026-03-14

## Overview

### Problem Statement

`system-prompt/agent-instructions.md` contains redundant and verbose content that is paid as a token cost on every conversation. Error handling instructions appear in Steps 2, 3, and again in the Error Handling Reference section. The no-editorializing rule is stated as a standalone section and restated in Step 4b's Prohibited list. Session label formatting is explained in both Step 3 and Step 4b. Dialogue examples use 8–10 lines of scripted exchange where 2–3 Do/Don't bullet points would convey the same constraint. Repetitive "do not proceed until..." gate rules appear identically in Steps 1, 3, and 4a with no shared anchor.

### Solution

Refactor `agent-instructions.md` in place — consolidate cross-cutting rules to single canonical locations with brief cross-references at the point of use, convert verbose dialogue examples to Do/Don't bullet format, add a Global Flow Control preamble to cover repeated gate rules once, and evaluate removing the Quick Reference Tool Schemas section (the MCP protocol provides tool schemas to the LLM automatically via `list_tools`).

No behavioral or semantic changes. Every instruction that exists today must still exist after the refactor — just without duplication.

### Scope

**In Scope:**
- Consolidate `AppError` handling to the single "Error Handling Reference" section; replace in-step handling prose with a one-line cross-reference (e.g., "On error → see Error Handling Reference")
- Merge the standalone "No-Editorializing Rule" section into either a Core Principles header or Step 4b's Prohibited list; remove the duplicate
- Move all session label formatting rules (e.g., `2025GS` → "2025 General Session") to Step 4b only; replace the Step 3 explanation with a brief cross-reference
- Convert "Good opening / Bad opening" and similar multi-line dialogue examples to concise Do/Don't bullet points throughout
- Add a "Global Flow Control" section or preamble covering the shared "do not proceed until…" confirmation gates used in Steps 1, 3, and 4a; replace per-step repetition with a cross-reference
- Evaluate the "Quick Reference: Tool Schemas" section — if the MCP `list_tools` response already provides full schemas to the LLM, remove this section; if it contains mapping/parsing instructions not in the Zod schema, retain only those

**Out of Scope:**
- Any change to the semantic meaning or behavioral rules of any instruction
- `system-prompt/testing-notes.md`, `system-prompt/test-runs.md`, `system-prompt/testing-notes-4-2.md`
- `CLAUDE.md` or any other project file
- Any "Critical Cleanup" items from `system-prompt/token-optimization-ideas.md`
- Story 4.2–4.5 dev stories — this spec is implemented only after all prompt-refining dev stories are done

## Context for Development

### Codebase Patterns

- `agent-instructions.md` is 290 lines; estimated post-refactor: ~235–245 lines (~16–19% reduction)
- No behavioral/semantic changes — every instruction that exists today must survive; only structure and redundancy change
- Cross-reference style: short inline callout, e.g. `"On error → see Error Handling Reference"` (1 line replaces 2-line per-step block)
- Do/Don't bullet format replaces multi-line Good/Bad dialogue examples throughout

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `system-prompt/agent-instructions.md` | Only file being modified; 290 lines |
| `system-prompt/token-optimization-ideas.md` | Source of optimization ideas (Gemini review) |

### Technical Decisions

- **No-editorializing:** Remove standalone "No-Editorializing Rule" section (lines 27–39); consolidate into a "Core Principles" block alongside the Scope Boundary; add a one-line cross-reference in Step 4b Prohibited list
- **Error handling:** Replace in-step "If the tool returns an error" paragraphs in Steps 2 and 3 with single-line cross-references to the Error Handling Reference section; that section stays intact
- **Session labels:** Already partially cross-referenced in Step 3; minimal further work needed
- **Dialogue → bullets:** Convert Step 1 Good/Bad opening block (lines 52–58) and Step 4a formality detection block (lines 186–195) to Do/Don't bullets
- **Global Flow Control:** Add a brief rule block at the top of the 4-Step Flow section covering the shared "do not proceed until…" gate; replace per-step repetition with a one-sentence callout
- **Quick Reference Tool Schemas (lines 278–290):** Remove entirely — MCP `list_tools` provides schemas to the LLM automatically; the `street`/`zone` parsing guidance already lives inline in Step 2 (lines 84–85); no information is lost

## Implementation Plan

### Tasks

Tasks are ordered by section position in `agent-instructions.md` (top to bottom), which is also dependency order — each task is independent but reading top-to-bottom prevents merge conflicts when editing a single file.

- [ ] Task 1: Add Global Flow Control block to 4-Step Flow preamble
  - File: `system-prompt/agent-instructions.md`
  - Action: After the "Execute these steps in order…" paragraph (line 45), insert a new "**Global Flow Control**" block:
    > Each step has a confirmation gate. Do not advance to the next step until the gate condition is met. Gate conditions are noted inline per step — this rule is not repeated in each step.
  - Notes: This anchors the shared gate language; per-step gates then reference it rather than re-stating the full rule

- [ ] Task 2: Consolidate No-Editorializing Rule into Core Principles
  - File: `system-prompt/agent-instructions.md`
  - Action: Replace the standalone "No-Editorializing Rule" section (lines 27–39) with a "**Core Principles**" section containing two named rules: (1) the Scope Boundary (currently its own section at lines 15–24) and (2) the no-editorializing rule condensed to ~4 bullet points. Remove the now-consolidated standalone Scope Boundary section. Update the Step 4b Prohibited list to read "See Core Principles — No-Editorializing Rule" instead of repeating the full constraint list.
  - Notes: Net effect: two sections → one; Step 4b Prohibited list shrinks by ~3 lines

- [ ] Task 3: Replace Step 1 Good/Bad dialogue block with Do/Don't bullets
  - File: `system-prompt/agent-instructions.md`
  - Action: Replace lines 52–58 (the "Good opening:" and "Bad opening:" multi-line dialogue block) with:
    ```
    - **Do:** Open with a warm, open question about their concern ("What's been on your mind lately?")
    - **Don't:** Ask for their address first, or present a list of topics/categories
    ```
  - Notes: Saves ~5 lines; same constraint, 80% fewer tokens

- [ ] Task 4: Replace Step 4a formality detection block with Do/Don't bullets
  - File: `system-prompt/agent-instructions.md`
  - Action: Compress the nested "If clearly casual… / If clearly formal… / If ambiguous…" block (lines 188–195) into:
    ```
    - If the constituent's register is unambiguously clear throughout, confirm rather than re-asking ("It sounds like you'd want conversational — does that work?")
    - If ambiguous, ask directly: "Conversational (personal, your own voice) or formal (professional, structured)?"
    ```
  - Notes: The three-branch nested block becomes two bullets; behavior is identical

- [ ] Task 5: Replace Step 2 and Step 3 in-step error paragraphs with cross-references
  - File: `system-prompt/agent-instructions.md`
  - Action:
    - Step 2 (line 116): Replace "**If the tool returns an error** (`{ source, nature, action }`): Tell the constituent what happened in plain language using the `nature` field, and suggest the `action` field as the next step. Do not pretend the lookup succeeded." with: "**On error:** surface `nature` in plain language, suggest `action` as next step — see Error Handling Reference."
    - Step 3 (lines 177–178): Replace "**If the tool returns an error**: Surface the `nature` and `action` fields in plain language. Do not generate a draft based on tool output you do not have." with: "**On error:** see Error Handling Reference. Do not draft without tool output."
  - Notes: The full Error Handling Reference (lines 262–274) stays intact; these become one-liners

- [ ] Task 6: Remove Quick Reference Tool Schemas section
  - File: `system-prompt/agent-instructions.md`
  - Action: Delete the entire "## Quick Reference: Tool Schemas" section (lines 277–290, including the section heading and all content)
  - Notes: MCP `list_tools` provides these schemas to the LLM automatically at conversation start. The `street`/`zone` parsing guidance already lives in Step 2 (lines 83–86). No information is lost.

### Acceptance Criteria

- [ ] AC 1: Given the refactored `agent-instructions.md`, when compared to the pre-refactor version via `git diff`, then every behavioral instruction present before the refactor is still present (no instruction is removed or semantically altered) — confirmed by reading the diff carefully

- [ ] AC 2: Given the refactored file, when the line count is checked, then it is at least 40 lines shorter than the pre-refactor version (290 lines → ≤250 lines)

- [ ] AC 3: Given the "No-Editorializing Rule" standalone section, when the refactored file is read, then that section no longer exists as a standalone block — its content is present once, in the Core Principles section

- [ ] AC 4: Given the Step 2 and Step 3 in-step error handling paragraphs, when the refactored file is read, then each is a single-line cross-reference and the full logic lives only in the Error Handling Reference section

- [ ] AC 5: Given the Quick Reference Tool Schemas section, when the refactored file is read, then the section is absent — and the `street`/`zone` parsing notes remain present in Step 2

- [ ] AC 6: Given the refactored file is loaded as a system prompt in a clean LLM session, when the constituent runs through the 4-step flow, then the chatbot behavior is indistinguishable from the pre-refactor version (manual spot-check — one run of Persona A from testing-notes-4-2.md)

## Additional Context

### Dependencies

- **Must run after:** Stories 4.2, 4.3, 4.4, 4.5 are all `done` — those stories may each update `agent-instructions.md` with behavioral refinements; the token optimization refactor must incorporate the final version of the file, not an intermediate one
- **No code dependencies** — this is a Markdown document refactor only

### Testing Strategy

- Manual diff review: read `git diff system-prompt/agent-instructions.md` after implementation and confirm no behavioral instruction was dropped or altered (AC 1)
- Line count check: `wc -l system-prompt/agent-instructions.md` before and after (AC 2)
- Manual spot-check: one clean LLM session with the refactored prompt using Persona A from `system-prompt/testing-notes-4-2.md` (AC 6)
- No Vitest tests — this is a Markdown product artifact

### Notes

- **Pre-mortem risk:** The most likely mistake is accidentally removing a behavioral nuance while condensing dialogue examples to bullets. Mitigation: do the diff review (AC 1) before the spot-check session.
- **Session label note (Step 3):** Already has a cross-reference to Step 4b. Needs only minor cleanup — not a full optimization target.
- **Future consideration:** If the system prompt grows significantly in future epics, consider splitting into a "rules" document and a "step scripts" document. Out of scope now.
