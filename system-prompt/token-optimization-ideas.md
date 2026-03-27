# Token Footprint Optimization & Review Cleanup

This document contains optimization ideas and unresolved findings from the Story 4.1 code review. These should be incorporated into a new "Token Footprint Optimization" story to refine `system-prompt/agent-instructions.md`.

## 🛠️ Critical Cleanup (Non-Optimization)

- [ ] **Populate `CLAUDE.md`**: The file exists but is empty (0 bytes). It should contain project-level instructions for the Claude Code agent (architectural rules, testing patterns, etc.).
- [ ] **Fix SMS Length Inconsistency**:
    - `agent-instructions.md`: "1–3 sentences total" (Correct per AC 8)
    - `testing-notes.md` (Persona B): "1–3 sentences per segment" (Incorrect)
- [ ] **Document `testing-notes-4-2.md`**: This file is currently undocumented in the Story 4.1 or 4.2 file lists/change logs.

## 🚀 Token Footprint Optimization Ideas

### 1. Consolidate Repetitive Logic
- **Error Handling**: Consolidate the `AppError` ({source, nature, action}) logic into the single "Error Handling Reference" at the end. Use short cross-references in Step 2 and Step 3 (e.g., "On error, follow Error Handling Reference").
- **No-Editorializing**: Merge the standalone "No-Editorializing Rule" section into a single "Core Principles" section or the Step 4b "Prohibited" list to avoid repeating constraints.
- **Session Labels**: Move all "human-readable session label" logic (2025GS -> "2025 General Session") to Step 4b. Use a brief mention in Step 3 pointing to the formatting rules in 4b.

### 2. Streamline Content
- **Convert Dialogue to Bullets**: Replace multi-line "Good/Bad" dialogue examples with concise "Do/Don't" bullet points.
    - *Example:* Instead of ~10 lines of "Good opening" dialogue, use: "- DO: Open with a warm, open concern question. - DON'T: Ask for address or present categories first."
- **Remove Redundant Schemas**: Since the MCP server provides tool schemas via `list_tools`, the "Quick Reference: Tool Schemas" at the end of the instructions can be removed unless they contain specific mapping instructions not in the Zod schema.
- **Global Behavioral Rules**: Move repetitive "Wait for response" or "Do not proceed until..." instructions into a single "Global Flow Control" section at the top of the 4-Step Flow.

### 3. Refine Review Marking
- **Test Run Status**: Standardize `test-runs.md` status marking. If a model compliance gap exists (like Run 3's Step 1 Validate failure), ensure the "Overall" status clearly reflects that it's a "Pass with Behavioral Gap" to avoid confusion during manual verification.

---
*Generated during Story 4.1 Code Review — 2026-03-14*
