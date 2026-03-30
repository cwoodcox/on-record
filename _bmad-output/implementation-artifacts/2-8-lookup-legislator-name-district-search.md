# Story 2-8: `lookup_legislator` — Name / District Search Modes

Status: ready-for-dev

## Story

As a **chatbot agent**,
I want to call `lookup_legislator` by legislator name or by chamber + district number,
so that I can retrieve legislator contact info after receiving district identifiers from `resolve_address`, or when the constituent already knows their rep by name — without needing an address at all.

## Acceptance Criteria

1. The `lookup_legislator` tool input schema changes from `{ street: string, zone: string }` to `{ name?: string, chamber?: 'house' | 'senate', district?: number }`. All parameters are optional individually; at least one complete mode must be provided.
2. When `chamber` and `district` are both provided, the tool reads from `getLegislatorsByDistrict(chamber, district)` (existing cache function) and returns a `LookupLegislatorResult` JSON response.
3. When `name` is provided (with or without `chamber`+`district`), the tool reads from `getLegislatorsByName(name)` (new cache function — partial case-insensitive match) and includes those results.
4. When both modes are provided (all three params: `name`, `chamber`, `district`), both queries run; results are merged, deduplicated by `id`, and returned together.
5. When no valid mode is provided (no `name` AND not both `chamber`+`district`), the tool returns structured AppError JSON with `source: 'mcp-tool'` and `nature` containing `'at least one search mode'`.
6. When `chamber` is provided without `district` (or `district` without `chamber`), the tool returns structured AppError JSON with `source: 'mcp-tool'` and `nature` containing `'chamber and district'`.
7. When all valid modes return empty cache results, the tool returns structured AppError JSON with `source: 'cache'` and `nature` containing `'No legislators found'`.
8. `LookupLegislatorResult` in `packages/types/index.ts` has `resolvedAddress` made optional (`resolvedAddress?: string`). The new `lookup_legislator` response does NOT include `resolvedAddress` — that field is now returned by `resolve_address` independently.
9. `getLegislatorsByName(name: string): Legislator[]` is added to `apps/mcp-server/src/cache/legislators.ts`; SQL: `WHERE name LIKE ?` with `%${name}%` pattern (SQLite LIKE is case-insensitive for ASCII).
10. All error responses are structured JSON — `content: [{ type: 'text', text: JSON.stringify(appError) }]` — never a prose string.
11. `pnpm --filter mcp-server typecheck` exits 0 and `pnpm --filter mcp-server test` exits 0.

## Tasks / Subtasks

- [ ] Task 1: Update `packages/types/index.ts` — make `resolvedAddress` optional (AC: 8)
  - [ ] Change `resolvedAddress: string` → `resolvedAddress?: string` in `LookupLegislatorResult`
  - [ ] No other changes to `packages/types/index.ts` — do not rename or modify other types
  - [ ] Note: `SearchBillsResult` shape changes are in story 3-7, not here

- [ ] Task 2: Add `getLegislatorsByName` to `apps/mcp-server/src/cache/legislators.ts` (AC: 9)
  - [ ] Add below `getLegislatorsByDistrict`:
    ```typescript
    export function getLegislatorsByName(name: string): Legislator[] {
      const rows = db
        .prepare<[string], LegislatorRow>(
          `SELECT id, chamber, district, name, email, phone, phone_label, session
           FROM legislators
           WHERE name LIKE ?`,
        )
        .all(`%${name}%`)
      return rows.map(/* same mapping logic as getLegislatorsByDistrict */)
    }
    ```
  - [ ] Reuse the `LegislatorRow → Legislator` mapping (phone_label null → phoneTypeUnknown, present → phoneLabel)
  - [ ] Named export only — no default export

- [ ] Task 3: Add `getLegislatorsByName` tests to `apps/mcp-server/src/cache/legislators.test.ts` (AC: 9, 11)
  - [ ] Test: partial name match returns matching legislators (e.g. "Smith" matches "Jane Smith" and "Bob Smithson")
  - [ ] Test: name match is case-insensitive — "smith" matches "Jane Smith"
  - [ ] Test: name with no match returns empty array (no error)
  - [ ] Test: phone_label null → `phoneTypeUnknown: true`; phone_label present → `phoneLabel`

- [ ] Task 4: Rewrite `apps/mcp-server/src/tools/legislator-lookup.ts` (AC: 1–7, 10)
  - [ ] **Remove entirely:**
    - `PO_BOX_PATTERN` constant (no address input in this story)
    - Import of `resolveAddressToDistricts` from `'../lib/gis.js'`
    - Street/zone input schema
  - [ ] **New imports:**
    - `getLegislatorsByDistrict` from `'../cache/legislators.js'` (keep existing)
    - `getLegislatorsByName` from `'../cache/legislators.js'` (new)
    - `logger` from `'../lib/logger.js'`
    - `createAppError, isAppError` from `'@on-record/types'`
    - `LookupLegislatorResult, Legislator` types from `'@on-record/types'`
  - [ ] **New input schema (zod):**
    ```typescript
    {
      name: z.string().min(1).optional()
        .describe('Partial legislator name (case-insensitive match). Provide when the constituent knows their rep by name, or when a legislator name is known from a bill search result.'),
      chamber: z.enum(['house', 'senate']).optional()
        .describe('Legislative chamber — must be provided together with district.'),
      district: z.number().int().positive().optional()
        .describe('District number — must be provided together with chamber.'),
    }
    ```
  - [ ] **Handler logic:**
    1. Validate: if `chamber` provided without `district`, or `district` provided without `chamber` → return AppError `source: 'mcp-tool'`, `nature` containing `'chamber and district'`
    2. Validate: if no `name` AND not both `chamber`+`district` → return AppError `source: 'mcp-tool'`, `nature` containing `'at least one search mode'`
    3. Collect results:
       ```typescript
       const legislators: Legislator[] = []
       const seen = new Set<string>()
       function addLegislators(list: Legislator[]) {
         for (const leg of list) {
           if (!seen.has(leg.id)) { seen.add(leg.id); legislators.push(leg) }
         }
       }
       if (chamber !== undefined && district !== undefined) {
         addLegislators(getLegislatorsByDistrict(chamber, district))
       }
       if (name !== undefined) {
         addLegislators(getLegislatorsByName(name))
       }
       ```
    4. If `legislators.length === 0` → return AppError `source: 'cache'`, `nature` containing `'No legislators found'`
    5. Build result: `{ legislators, session: legislators[0]!.session }` (no `resolvedAddress`)
    6. `logger.info({ source: 'mcp-tool', legislatorCount: legislators.length }, 'lookup_legislator succeeded')`
    7. Return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
  - [ ] Tool description MUST NOT enumerate valid chamber values or list search mode names — describe intent (e.g. "look up by name or district"), not implementation (CLAUDE.md anti-pattern)
  - [ ] Named export `registerLookupLegislatorTool(server: McpServer): void` — unchanged signature
  - [ ] No default export; no barrel file

- [ ] Task 5: Rewrite `apps/mcp-server/src/tools/legislator-lookup.test.ts` (AC: 1–7, 10, 11)
  - [ ] Mock `../cache/legislators.js` to export both `getLegislatorsByDistrict: vi.fn()` and `getLegislatorsByName: vi.fn()`
  - [ ] Mock `../lib/logger.js` (Proxy — vi.spyOn fails; use vi.mock)
  - [ ] **DO NOT** mock `lib/gis.js` — the new tool doesn't import it; mocking it would be noise
  - [ ] **DO NOT** mock `env.js` — the new tool doesn't call `getEnv()` (no GIS calls)
  - [ ] Update `ToolHandler` type:
    ```typescript
    type ToolHandler = (args: { name?: string; chamber?: 'house' | 'senate'; district?: number }) =>
      Promise<{ content: Array<{ type: string; text: string }> }>
    ```
  - [ ] **Test 1 — district mode (mode B):** `{ chamber: 'house', district: 29 }` → `getLegislatorsByDistrict` called with `('house', 29)` → result has `legislators` array, `session`; verify `toHaveBeenCalledWith('house', 29)`
  - [ ] **Test 2 — name mode (mode A):** `{ name: 'Smith' }` → `getLegislatorsByName` called with `'Smith'` → result has `legislators`, `session`; verify `toHaveBeenCalledWith('Smith')`
  - [ ] **Test 3 — both modes (merge/dedup):** `{ name: 'Lee', chamber: 'senate', district: 4 }` → both query fns called; return overlapping legislator sets; assert final `legislators` deduplicated (id appears once)
  - [ ] **Test 4 — no valid mode:** `{}` → AppError with `source: 'mcp-tool'`; `nature` contains `'at least one search mode'`
  - [ ] **Test 5 — partial pair (chamber only):** `{ chamber: 'house' }` → AppError with `source: 'mcp-tool'`; `nature` contains `'chamber and district'`
  - [ ] **Test 6 — partial pair (district only):** `{ district: 14 }` → AppError with `source: 'mcp-tool'`; `nature` contains `'chamber and district'`
  - [ ] **Test 7 — cache miss:** `{ chamber: 'house', district: 99 }` → `getLegislatorsByDistrict` returns `[]` → AppError with `source: 'cache'`; `nature` contains `'No legislators found'`
  - [ ] **Test 8 — structured JSON always:** assert `content[0].type === 'text'` and `JSON.parse(content[0].text)` does not throw for both success and all error paths
  - [ ] **Test 9 — toHaveBeenCalledWith verification:** ALL `mockReturnValue` stubs must have a corresponding `toHaveBeenCalledWith` assertion (CLAUDE.md requirement)
  - [ ] No `vi.useFakeTimers()` needed — no retry/async timing in this tool
  - [ ] Co-locate at `apps/mcp-server/src/tools/legislator-lookup.test.ts`

- [ ] Task 6: Final verification (AC: 11)
  - [ ] `pnpm --filter mcp-server typecheck` — zero errors
  - [ ] `pnpm --filter mcp-server test` — all tests pass (including updated `legislator-lookup.test.ts` and `legislators.test.ts`)
  - [ ] `pnpm --filter mcp-server lint` — zero ESLint violations, no `console.log`
  - [ ] Confirm `resolveAddressToDistricts` is NOT imported anywhere in `tools/legislator-lookup.ts`
  - [ ] Confirm `PO_BOX_PATTERN` is NOT in `tools/legislator-lookup.ts`
  - [ ] Confirm no `tools/index.ts` barrel file created
  - [ ] Confirm `apps/mcp-server/src/index.ts` is UNCHANGED — `registerLookupLegislatorTool(server)` is already registered

## Dev Notes

### Prerequisite Stories — MUST be done before this story

**Story 2-7-resolve-address-mcp-tool (ready-for-dev) and 3-7-search-bills-interface-redesign (ready-for-dev) must be completed before this story is implemented.** Per the sprint-change-proposal implementation order: `search_bills redesign → resolve_address → lookup_legislator name/district`. Reason: `resolve_address` picks up the GIS responsibility that `lookup_legislator` is dropping here. If this story runs before `resolve_address` is done, the system temporarily loses all address-to-district capability.

### Scope — What This Story IS and IS NOT

**This story changes/creates:**
- `packages/types/index.ts` — `resolvedAddress?: string` (make optional)
- `apps/mcp-server/src/tools/legislator-lookup.ts` — full rewrite (new schema, new handler)
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — full rewrite (all old tests invalid)
- `apps/mcp-server/src/cache/legislators.ts` — add `getLegislatorsByName`
- `apps/mcp-server/src/cache/legislators.test.ts` — add `getLegislatorsByName` tests

**NOT in this story:**
- `apps/mcp-server/src/index.ts` — `registerLookupLegislatorTool(server)` call is already there; no change needed
- `apps/mcp-server/src/lib/gis.ts` — `resolveAddressToDistricts` is used by `resolve_address` tool; do NOT remove or modify it
- `apps/mcp-server/src/tools/resolve-address.ts` — created by the previous story; do NOT touch it
- `SearchBillsResult` or `Bill` type changes — in story 3-7
- `system-prompt/agent-instructions.md` — will be rewritten in Epic 4; the old `resolvedAddress` reference there is acceptable until then
- Web app changes — `LookupLegislatorResult` is not referenced in `apps/web/`; making `resolvedAddress` optional has no web impact

### Why `resolvedAddress` Becomes Optional

`LookupLegislatorResult.resolvedAddress` was populated by the old `lookup_legislator` (address mode) to let the LLM confirm the geocoded form of the address. In the new flow:
- `resolve_address` returns `{ houseDistrict, senateDistrict, resolvedAddress }` — the canonical address comes from there
- `lookup_legislator` (name/district mode) has no address to resolve

Making `resolvedAddress?: string` (optional) is the minimal breaking change. The new `lookup_legislator` omits it entirely; `resolve_address` returns it explicitly. `system-prompt/agent-instructions.md` references `resolvedAddress` in the tool output sample — that reference becomes stale until the system prompt is rewritten in Epic 4, which is acceptable.

Do NOT change `resolvedAddress` to required or populate it with an empty string — leave it absent from the response entirely.

### Why All Old Tests Are Replaced

The existing `legislator-lookup.test.ts` tests are all written against the `{ street, zone }` input schema and mock `fetch` for UGRC GIS calls. After this story, the tool does no GIS calls and takes `{ name?, chamber?, district? }` input. There is no value in patching the old tests — replace them entirely with tests for the new modes.

The old test file structure (mock McpServer helper, `createMockServer()` function, typed `ToolHandler`) is a good pattern to reuse — just update the types and remove the GIS-related mocks.

### `getLegislatorsByName` — SQLite LIKE Semantics

- `WHERE name LIKE '%Smith%'` is case-insensitive for ASCII in SQLite (default behavior, no pragma needed)
- The `%` wildcards allow partial match at any position: "Lee" matches "Patricia Lee", "Lee Smith", "Stonelee"
- SQLite LIKE does NOT use indexes effectively with a leading `%` — for the legislator table (≤ 104 rows), this is fine; no index optimization needed
- The `name` column stores the legislator's full display name (e.g. "Jennifer Dailey-Provost")

### Tool Description Anti-Pattern (CLAUDE.md)

Do NOT enumerate valid chamber values (`'house' | 'senate'`) in the tool description. The parameter descriptions already define the type via Zod. The tool description text should say what the tool does, not list enum values. Example of what NOT to do:
> "chamber: one of 'house' or 'senate'"

This causes LLMs to treat them as the only valid inputs and blocks fuzzy input handling. Describe intent instead:
> "Legislative chamber for district lookup — use with district."

### Merge / Dedup Strategy

When both modes are provided:
1. Run district mode first (exact match — higher precision)
2. Run name mode second
3. Dedup by `id` — first occurrence wins (district mode results take priority in the merged list)

This is safe because the same legislator can theoretically appear in both results (e.g. user provides `name: "Lee"` and `chamber: 'senate', district: 4` — Sen. Lee appears in both). Dedup prevents duplicate entries in the response.

### Test Key Phrases for `toContain` Assertions (CLAUDE.md requirement)

Error-path test assertions MUST use `toContain('key phrase')` on the `nature` or `action` field:

| Scenario | Field | Key phrase |
|---|---|---|
| No valid mode provided | `nature` | `'at least one search mode'` |
| `chamber` without `district` (or vice versa) | `nature` | `'chamber and district'` |
| No legislators found in cache | `nature` | `'No legislators found'` |

### Architecture Reference

- `cache/legislators.ts` — `getLegislatorsByDistrict(chamber, district)` already exists [Source: apps/mcp-server/src/cache/legislators.ts]
- `packages/types/index.ts` — `LookupLegislatorResult`, `Legislator` [Source: packages/types/index.ts]
- Sprint change proposal — section 4.4 defines the new tool schema [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md#4.4]
- Previous story (resolve_address) — for context on why GIS is removed [Source: _bmad-output/implementation-artifacts/2-7-resolve-address-mcp-tool.md]
- No barrel files in `tools/` — import directly from the file [Source: CLAUDE.md]
- `console.log` FORBIDDEN in `apps/mcp-server/` — only `console.error` (but use pino logger instead) [Source: CLAUDE.md]
- `toHaveBeenCalledWith` required on all `mockReturnValue` stubs [Source: CLAUDE.md]

### Project Structure Notes

- New cache function goes in `apps/mcp-server/src/cache/legislators.ts` (only place with SQLite imports — Boundary 4)
- `packages/types/index.ts` is the ONLY place shared types may live
- `apps/mcp-server/src/index.ts` is unchanged — tool registration already exists

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `packages/types/index.ts` — modified (make `resolvedAddress` optional in `LookupLegislatorResult`)
- `apps/mcp-server/src/tools/legislator-lookup.ts` — full rewrite (new schema, new handler)
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — full rewrite (new tests)
- `apps/mcp-server/src/cache/legislators.ts` — modified (add `getLegislatorsByName`)
- `apps/mcp-server/src/cache/legislators.test.ts` — modified (add `getLegislatorsByName` tests)
