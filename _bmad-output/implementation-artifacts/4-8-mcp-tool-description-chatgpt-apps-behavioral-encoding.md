# Story 4.8: MCP Tool Description Behavioral Encoding for ChatGPT Apps

Status: ready-for-dev

## Story

As a **product owner**,
I want the MCP tool descriptions to encode behavioral preconditions, ordering dependencies, and data boundary rules,
so that the conversation follows the right flow and respects data constraints in the ChatGPT Apps context where no system prompt is available.

## Acceptance Criteria

1. **`resolve_address` description updated**: The tool description includes (a) a behavioral precondition — call only after acknowledging the constituent's concern and asking for their address naturally within the conversation flow, never as a conversation opener — and (b) a post-call instruction to present both legislators by name and ask which one the constituent wants to write to before proceeding.

2. **`lookup_legislator` description updated**: The tool description includes (a) an ordering instruction — call after the constituent has shared their concern — and (b) a post-call instruction to ask which legislator the constituent wants to write to before searching for bills.

3. **`search_bills` description updated**: The tool description explicitly states that results are bills a legislator introduced or co-sponsored only, this is NOT voting record data and does not show how a legislator voted on bills they did not sponsor. The description also includes: a pre-call ordering instruction (call once a specific legislator has been selected), guidance on loading the full bill list via sponsorId when no specific bill was mentioned, a post-call instruction (present 2–3 relevant bills and wait for explicit confirmation before drafting), and a zero-result instruction (offer to write grounded in constituent's concern — do not fabricate citations).

4. All existing Vitest tests pass without modification — description strings do not appear in any test assertions.

5. `pnpm --filter mcp-server typecheck` passes with zero errors.

6. The updated descriptions do NOT enumerate valid values or lists of categories — they describe intent in natural language, consistent with project conventions.

## Tasks / Subtasks

- [ ] Task 1: Update `resolve_address` tool description (AC: 1, 6)
  - [ ] In `apps/mcp-server/src/tools/resolve-address.ts`, replace the second argument to `server.tool()` (the description string) with the exact string specified in Dev Notes below
  - [ ] Leave all Zod parameter `.describe()` strings unchanged
  - [ ] Leave handler logic, annotations, and all other code unchanged

- [ ] Task 2: Update `lookup_legislator` tool description (AC: 2, 6)
  - [ ] In `apps/mcp-server/src/tools/legislator-lookup.ts`, replace the description string (second argument to `server.tool()`) with the exact string specified in Dev Notes below
  - [ ] Leave all Zod parameter `.describe()` strings unchanged
  - [ ] Leave handler logic, annotations, and all other code unchanged

- [ ] Task 3: Update `search_bills` tool description (AC: 3, 6)
  - [ ] In `apps/mcp-server/src/tools/search-bills.ts`, replace the description string (second argument to `server.tool()`) with the exact string specified in Dev Notes below
  - [ ] Leave all Zod parameter `.describe()` strings unchanged
  - [ ] Leave handler logic, annotations, and all other code unchanged

- [ ] Task 4: Verify no regressions (AC: 4, 5)
  - [ ] `pnpm --filter mcp-server typecheck` — zero errors
  - [ ] `pnpm --filter mcp-server test` — all tests pass

## Dev Notes

### What This Story Is

This story implements the "E5-x / Tier 1 No-Widget Improvement" identified in the 2026-04-18 ChatGPT Apps technical research (`_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md`).

**The core problem:** On-record's `agent-instructions.md` is 290 lines of behavioral guidance — empathy-first ordering, five invariants before drafting, data boundary enforcement, no editorializing. In the ChatGPT Apps context, **none of that can be supplied as a system prompt**. The model arrives with default ChatGPT behavior and only the tool definitions as context.

**Tool descriptions are the highest-influence lever** for shaping model behavior in the absence of a system prompt. Models read these as operational instructions. This story encodes the most critical principles through that lever.

### CRITICAL: Description-Only Change

**No TypeScript logic changes.** All three tool handler implementations remain completely unchanged. Only the `description` string (second argument to `server.tool()`) changes in each file. Zod schemas, `.describe()` strings on individual parameters, annotations (`readOnlyHint` etc.), and all handler code are untouched.

### Exact Description Strings to Use

These are spec-ready strings derived from the research document's "Proposed Tool Description Rewrites" and "Principle-by-Principle Encoding Analysis" sections. Use them verbatim.

**`resolve_address`** — current description is on line 22–23 of `resolve-address.ts`. Replace with:

```
'Resolves a Utah street address to House and Senate legislative district numbers via GIS lookup. Returns structured JSON with houseDistrict, senateDistrict, and the geocoder\'s canonical form of the input address. Call this only after acknowledging the constituent\'s concern and asking for their address naturally within that conversation — never as a conversation opener. After returning results, present both legislators by name and ask which one the constituent wants to write to before proceeding.'
```

**`lookup_legislator`** — current description is on lines 24–25 of `legislator-lookup.ts`. Replace with:

```
'Retrieves legislator contact info by legislator ID (use sponsorId from bill search results), by partial name (when constituent knows their rep by name), or by legislative chamber and district number (use houseDistrict/senateDistrict from resolve_address). Returns structured JSON with legislator name, chamber, district, email, and phone. Call this after the constituent has shared their concern. After returning results, ask which legislator the constituent wants to write to before searching for bills.'
```

**`search_bills`** — current description is on lines 21–22 of `search-bills.ts`. Replace with:

```
'Searches the Utah Legislature bill cache. Returns bills a legislator introduced or co-sponsored only — this is NOT voting record data and does not reveal how a legislator voted on bills they did not sponsor. All parameters are optional and compose as filters; omitting all returns all cached bills paginated. Call this once a specific legislator has been selected. When a legislator is known and no specific bill was mentioned, call with sponsorId alone to load their full bill list for semantic reasoning. After returning results, present 2–3 relevant bills and wait for explicit confirmation of a specific bill — or explicit choice to proceed without one — before drafting. Do not draft until the constituent confirms. If no bills are found, offer to write a message grounded in the constituent\'s concern without a bill citation — do not fabricate citations.'
```

### Why Each Change Matters

| Change | Principle encoded | Research confidence |
|--------|------------------|-------------------|
| `resolve_address` precondition: "never as a conversation opener" | Empathy first — prevents opening with "what's your address?" before engaging the constituent's concern | Medium |
| `resolve_address` post-call: "present both legislators and ask which one" | Ordering invariant — prevents jumping to bill search before legislator selection | Medium |
| `lookup_legislator` post-call: "ask which legislator before searching bills" | Ordering invariant — prevents bill search before selection confirmation | Medium |
| `search_bills` data boundary: "NOT voting record data" | Data boundary — prevents implying voting record access (models reliably respect explicit capability statements) | High |
| `search_bills` ordering: "once a specific legislator has been selected" | Invariant enforcement — call sequencing | High |
| `search_bills` confirmation gate: "wait for explicit confirmation before drafting" | Invariant 3 (bill confirmed before draft) | High |
| `search_bills` zero-result: "do not fabricate citations" | Substantiation required — no hallucinated bill citations | High |

[Source: `_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md` — "Summary: What's Achievable" table and "Principle-by-Principle Encoding Analysis"]

### What Is NOT Recoverable Via Tool Descriptions

Per the research, these system-prompt principles cannot be encoded in tool descriptions and remain lost in the ChatGPT Apps context (not in scope for this story):

- Opening tone ("warm, open question") — model-level behavior
- Nuanced empathy scripting — no hook
- Name elicitation timing — conversational choreography
- Revision loop rules — model handles these well by default

These are noted here so the dev agent does not attempt to add them.

### Anti-Pattern: Do Not Enumerate Values

The existing `query` parameter `.describe()` on `search_bills` already correctly says: "Freeform search term derived from the constituent's stated concern — passed directly to FTS5. Do not present this as a menu; infer from conversation context."

Do NOT add any enumerated lists to the tool-level description strings. The approved strings above follow this rule. The Epic 3 retrospective documented this as a lesson: enumerating valid values causes LLMs to treat them as the only valid values.

[Source: `CLAUDE.md` — "LLM tool descriptions"]
[Source: `_bmad-output/implementation-artifacts/sprint-status.yaml` — Epic 3 retrospective notes]

### Project Structure Notes

Files changed in this story (description strings only):
- `apps/mcp-server/src/tools/resolve-address.ts` — description string at line 22–23
- `apps/mcp-server/src/tools/legislator-lookup.ts` — description string at lines 24–25
- `apps/mcp-server/src/tools/search-bills.ts` — description string at lines 21–22

Files NOT touched:
- Any `.test.ts` files (no test changes — description strings are not tested)
- Any `cache/` files
- Any `lib/` files
- `packages/types/`
- Any Zod parameter `.describe()` strings
- Tool annotations (`readOnlyHint`, `destructiveHint`, `openWorldHint`)

### Key Architectural Rules

- `console.log` FORBIDDEN in `apps/mcp-server/` — not relevant to this change
- No `any`, no `@ts-ignore` — string literals are fine
- No barrel files — not affected

### References

- Research source (primary): [`_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md`] — "Proposed Tool Description Rewrites", "Principle-by-Principle Encoding Analysis", "Summary: What's Achievable"
- Current `resolve_address` description: [`apps/mcp-server/src/tools/resolve-address.ts` line 22–23]
- Current `lookup_legislator` description: [`apps/mcp-server/src/tools/legislator-lookup.ts` line 23–25]
- Current `search_bills` description: [`apps/mcp-server/src/tools/search-bills.ts` line 21–22]
- Epic 3 retrospective (tool description anti-pattern): [`_bmad-output/implementation-artifacts/sprint-status.yaml` — Epic 3 retrospective notes]
- CLAUDE.md tool description convention: [`CLAUDE.md` — "LLM tool descriptions"]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
