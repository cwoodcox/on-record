# Story 2-8: `lookup_legislator` — ID / Name / District Search Modes

Status: done

## Story

As a **chatbot agent**,
I want to call `lookup_legislator` by legislator ID, partial name, or chamber + district number,
so that I can retrieve legislator contact info after a bill search (using the bill's `sponsorId`), after `resolve_address` returns district identifiers, or when the constituent knows their rep by name.

## Acceptance Criteria

1. The `lookup_legislator` tool input schema changes from `{ street: string, zone: string }` to `{ id?: string, name?: string, chamber?: 'house' | 'senate', district?: number }`. All parameters are optional individually; at least one complete mode must be provided.
2. When `id` is provided, the tool reads from `getLegislatorById(id)` (new cache function — exact primary key match) and includes the result if found (mode C — ID lookup).
3. When `chamber` and `district` are both provided, the tool reads from `getLegislatorsByDistrict(chamber, district)` (existing cache function) and includes those results (mode B — district lookup).
4. When `name` is provided, the tool reads from `getLegislatorsByName(name)` (new cache function — partial case-insensitive match) and includes those results (mode A — name search).
5. Any combination of modes is valid; all provided modes run and results are merged, deduplicated by `id`.
6. When `chamber` is provided without `district` (or `district` without `chamber`), the tool returns structured AppError JSON with `source: 'mcp-tool'` and `nature` containing `'chamber and district'`.
7. When no valid mode is provided (no `id`, no `name`, and not both `chamber`+`district`), the tool returns structured AppError JSON with `source: 'mcp-tool'` and `nature` containing `'at least one search mode'`.
8. When all valid modes return empty cache results, the tool returns structured AppError JSON with `source: 'cache'` and `nature` containing `'No legislators found'`.
9. `LookupLegislatorResult` in `packages/types/index.ts` has `resolvedAddress` made optional (`resolvedAddress?: string`). The new `lookup_legislator` response does NOT include `resolvedAddress` — that field is now returned by `resolve_address` independently.
10. `getLegislatorById(id: string): Legislator | null` is added to `apps/mcp-server/src/cache/legislators.ts`; SQL: `WHERE id = ?` exact match on the primary key.
11. `getLegislatorsByName(name: string): Legislator[]` is added to `apps/mcp-server/src/cache/legislators.ts`; SQL: `WHERE name LIKE ?` with `%${name}%` pattern (SQLite LIKE is case-insensitive for ASCII).
12. All error responses are structured JSON — `content: [{ type: 'text', text: JSON.stringify(appError) }]` — never a prose string.
13. `pnpm --filter mcp-server typecheck` exits 0 and `pnpm --filter mcp-server test` exits 0.

## Tasks / Subtasks

- [x] Task 1: Update `packages/types/index.ts` — make `resolvedAddress` optional (AC: 9)
  - [x] Change `resolvedAddress: string` → `resolvedAddress?: string` in `LookupLegislatorResult`
  - [x] No other changes to `packages/types/index.ts` — do not rename or modify other types
  - [x] Note: `SearchBillsResult` shape changes are in story 3-7, not here

- [x] Task 2: Add `getLegislatorById` and `getLegislatorsByName` to `apps/mcp-server/src/cache/legislators.ts` (AC: 10, 11)
  - [x] Add `getLegislatorById`:
    ```typescript
    export function getLegislatorById(id: string): Legislator | null {
      const row = db
        .prepare<[string], LegislatorRow>(
          `SELECT id, chamber, district, name, email, phone, phone_label, session
           FROM legislators
           WHERE id = ?`,
        )
        .get(id)
      return row ? mapRow(row) : null
    }
    ```
  - [x] Add `getLegislatorsByName`:
    ```typescript
    export function getLegislatorsByName(name: string): Legislator[] {
      const rows = db
        .prepare<[string], LegislatorRow>(
          `SELECT id, chamber, district, name, email, phone, phone_label, session
           FROM legislators
           WHERE name LIKE ?`,
        )
        .all(`%${name}%`)
      return rows.map(mapRow)
    }
    ```
  - [x] Extract the `LegislatorRow → Legislator` mapping into a local `mapRow` helper (used by all three query functions including existing `getLegislatorsByDistrict`)
  - [x] Named exports only — no default export

- [x] Task 3: Add cache function tests to `apps/mcp-server/src/cache/legislators.test.ts` (AC: 10, 11, 13)
  - [x] `getLegislatorById`:
    - [x] Test: exact match on known ID returns the legislator
    - [x] Test: unknown ID returns `null`
  - [x] `getLegislatorsByName`:
    - [x] Test: partial name match returns matching legislators (e.g. "Smith" matches "Jane Smith" and "Bob Smithson")
    - [x] Test: name match is case-insensitive — "smith" matches "Jane Smith"
    - [x] Test: name with no match returns empty array (no error)
  - [x] Both functions: phone_label null → `phoneTypeUnknown: true`; phone_label present → `phoneLabel`

- [x] Task 4: Rewrite `apps/mcp-server/src/tools/legislator-lookup.ts` (AC: 1–8, 12)
  - [x] **Remove entirely:**
    - `PO_BOX_PATTERN` constant (no address input in this story)
    - Import of `resolveAddressToDistricts` from `'../lib/gis.js'`
    - Street/zone input schema
  - [x] **New imports:**
    - `getLegislatorById`, `getLegislatorsByDistrict`, `getLegislatorsByName` from `'../cache/legislators.js'`
    - `logger` from `'../lib/logger.js'`
    - `createAppError` from `'@on-record/types'`
    - `LookupLegislatorResult, Legislator` types from `'@on-record/types'`
  - [x] **New input schema (zod):**
    ```typescript
    {
      id: z.string().min(1).optional()
        .describe('Exact legislator ID (matches sponsorId on bill search results). Use when resolving a bill sponsor to their contact details.'),
      name: z.string().min(1).optional()
        .describe('Partial legislator name (case-insensitive match). Use when the constituent knows their rep by name.'),
      chamber: z.enum(['house', 'senate']).optional()
        .describe('Legislative chamber for district lookup — must be provided together with district.'),
      district: z.number().int().positive().optional()
        .describe('District number — must be provided together with chamber.'),
    }
    ```
  - [x] **Handler logic (validation first, then collect):**
    1. If `chamber` provided without `district`, or `district` provided without `chamber` → return AppError `source: 'mcp-tool'`, `nature` containing `'chamber and district'`
    2. If no `id` AND no `name` AND not both `chamber`+`district` → return AppError `source: 'mcp-tool'`, `nature` containing `'at least one search mode'`
    3. Collect results (inside try/catch per CLAUDE.md):
       ```typescript
       const legislators: Legislator[] = []
       const seen = new Set<string>()
       function addLegislators(list: Legislator[]) {
         for (const leg of list) {
           if (!seen.has(leg.id)) { seen.add(leg.id); legislators.push(leg) }
         }
       }
       if (id !== undefined) {
         const leg = getLegislatorById(id)
         if (leg) addLegislators([leg])
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
  - [x] Keep ALL throwing code inside the try/catch — per CLAUDE.md error handling rule
  - [x] Tool description MUST NOT enumerate valid chamber values — describe intent, not implementation (CLAUDE.md anti-pattern)
  - [x] Named export `registerLookupLegislatorTool(server: McpServer): void` — unchanged signature
  - [x] No default export; no barrel file

- [x] Task 5: Rewrite `apps/mcp-server/src/tools/legislator-lookup.test.ts` (AC: 1–8, 12, 13)
  - [x] Mock `../cache/legislators.js` to export `getLegislatorById: vi.fn()`, `getLegislatorsByDistrict: vi.fn()`, `getLegislatorsByName: vi.fn()`
  - [x] Mock `../lib/logger.js` (Proxy — vi.spyOn fails; use vi.mock)
  - [x] **DO NOT** mock `lib/gis.js` — the new tool doesn't import it
  - [x] **DO NOT** mock `env.js` — the new tool doesn't call `getEnv()`
  - [x] Update `ToolHandler` type:
    ```typescript
    type ToolHandler = (args: {
      id?: string
      name?: string
      chamber?: 'house' | 'senate'
      district?: number
    }) => Promise<{ content: Array<{ type: string; text: string }> }>
    ```
  - [x] **Test 1 — ID mode (mode C):** `{ id: 'DAILEJ' }` → `getLegislatorById` called with `'DAILEJ'` → result has `legislators` (length 1), `session`; verify `toHaveBeenCalledWith('DAILEJ')`
  - [x] **Test 2 — district mode (mode B):** `{ chamber: 'house', district: 29 }` → `getLegislatorsByDistrict` called with `('house', 29)` → result has `legislators`, `session`; verify `toHaveBeenCalledWith('house', 29)`
  - [x] **Test 3 — name mode (mode A):** `{ name: 'Smith' }` → `getLegislatorsByName` called with `'Smith'` → result has `legislators`, `session`; verify `toHaveBeenCalledWith('Smith')`
  - [x] **Test 4 — multi-mode merge/dedup:** `{ id: 'SMITHJ', name: 'Smith' }` → both query fns called; ID result and name results overlap on `'SMITHJ'`; assert `legislators` contains `'SMITHJ'` exactly once
  - [x] **Test 5 — no valid mode:** `{}` → AppError with `source: 'mcp-tool'`; `nature` contains `'at least one search mode'`
  - [x] **Test 6 — partial pair (chamber only):** `{ chamber: 'house' }` → AppError with `source: 'mcp-tool'`; `nature` contains `'chamber and district'`
  - [x] **Test 7 — partial pair (district only):** `{ district: 14 }` → AppError with `source: 'mcp-tool'`; `nature` contains `'chamber and district'`
  - [x] **Test 8 — cache miss:** `{ id: 'NOBODY' }` → `getLegislatorById` returns `null` → AppError with `source: 'cache'`; `nature` contains `'No legislators found'`
  - [x] **Test 9 — structured JSON always:** assert `content[0].type === 'text'` and `JSON.parse(content[0].text)` does not throw for success and all error paths
  - [x] **Test 10 — toHaveBeenCalledWith verification:** ALL `mockReturnValue` / `mockResolvedValue` stubs must have a corresponding `toHaveBeenCalledWith` assertion (CLAUDE.md requirement)
  - [x] No `vi.useFakeTimers()` needed — no retry/async timing in this tool
  - [x] Co-locate at `apps/mcp-server/src/tools/legislator-lookup.test.ts`

- [x] Task 6: Final verification (AC: 13)
  - [x] `pnpm --filter mcp-server typecheck` — zero errors
  - [x] `pnpm --filter mcp-server test` — all tests pass
  - [x] `pnpm --filter mcp-server lint` — zero ESLint violations, no `console.log`
  - [x] Confirm `resolveAddressToDistricts` is NOT imported anywhere in `tools/legislator-lookup.ts`
  - [x] Confirm `PO_BOX_PATTERN` is NOT in `tools/legislator-lookup.ts`
  - [x] Confirm no `tools/index.ts` barrel file created
  - [x] Confirm `apps/mcp-server/src/index.ts` is UNCHANGED

## Dev Notes

### Prerequisite Stories — MUST be done before this story

**Story 2-7-resolve-address-mcp-tool (ready-for-dev) and 3-7-search-bills-interface-redesign (ready-for-dev) must be completed before this story is implemented.** Per the sprint-change-proposal implementation order: `search_bills redesign → resolve_address → lookup_legislator`. Reason: `resolve_address` picks up the GIS responsibility that `lookup_legislator` is dropping here. If this story runs before `resolve_address` is done, the system temporarily loses all address-to-district capability.

### The ID Mode — Why It Matters

`Bill.sponsorId` and `Legislator.id` use the same key format (e.g. `"DAILEJ"` — abbreviated name + initials). These come from the same Utah Legislature API and match exactly. The `id` column is the primary key of the SQLite `legislators` table, so `getLegislatorById` is an O(1) lookup.

This is the primary path for **bill → legislator** resolution: `search_bills` returns a `sponsorId`; the agent passes that directly to `lookup_legislator` as `{ id: sponsorId }`.

### Scope — What This Story IS and IS NOT

**This story changes/creates:**
- `packages/types/index.ts` — `resolvedAddress?: string` (make optional)
- `apps/mcp-server/src/tools/legislator-lookup.ts` — full rewrite (new schema, new handler)
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — full rewrite (all old tests invalid)
- `apps/mcp-server/src/cache/legislators.ts` — add `getLegislatorById` and `getLegislatorsByName`; extract `mapRow` helper
- `apps/mcp-server/src/cache/legislators.test.ts` — add tests for both new functions

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
- `lookup_legislator` (ID/name/district mode) has no address to resolve

Making `resolvedAddress?: string` (optional) is the minimal breaking change. The new `lookup_legislator` omits it entirely. Do NOT populate it with an empty string — leave it absent from the response entirely.

### Why All Old Tests Are Replaced

The existing `legislator-lookup.test.ts` tests are all written against the `{ street, zone }` input schema and mock `fetch` for UGRC GIS calls. After this story, the tool does no GIS calls and takes `{ id?, name?, chamber?, district? }` input. There is no value in patching the old tests — replace them entirely.

The old test file structure (mock McpServer helper, `createMockServer()` function, typed `ToolHandler`) is a good pattern to reuse — just update the types and remove the GIS-related mocks.

### Validation Order Matters

Check `chamber`/`district` pairing BEFORE checking for "at least one mode." This gives a more helpful error when the caller provides `{ chamber: 'house' }` — they get "chamber and district required" rather than "at least one search mode."

### `mapRow` Helper Extraction

The `LegislatorRow → Legislator` mapping logic is currently inlined in `getLegislatorsByDistrict`. Extract it to a private `mapRow(row: LegislatorRow): Legislator` function so all three query functions share it. This is the only refactor permitted in `legislators.ts` — do not change the function signatures or exports of existing functions.

### `getLegislatorsByName` — SQLite LIKE Semantics

- `WHERE name LIKE '%Smith%'` is case-insensitive for ASCII in SQLite (default behavior, no pragma needed)
- The `%` wildcards allow partial match at any position: "Lee" matches "Patricia Lee", "Lee Smith", "Stonelee"
- SQLite LIKE does NOT use indexes effectively with a leading `%` — for the legislator table (≤ 104 rows), this is acceptable; no index needed
- The `name` column stores the legislator's full display name (e.g. "Jennifer Dailey-Provost")

### Tool Description Anti-Pattern (CLAUDE.md)

Do NOT enumerate valid chamber values (`'house' | 'senate'`) in the tool description text. Describe intent instead of implementation. Example of what NOT to do:
> "chamber: must be one of 'house' or 'senate'"

### Merge / Dedup Strategy

All provided modes run; results are merged in order: ID → district → name. Dedup by `id` — first occurrence wins (ID mode results have highest priority). This is safe because the same legislator can appear across multiple mode results.

### Test Key Phrases for `toContain` Assertions (CLAUDE.md requirement)

| Scenario | Field | Key phrase |
|---|---|---|
| No valid mode provided | `nature` | `'at least one search mode'` |
| `chamber` without `district` (or vice versa) | `nature` | `'chamber and district'` |
| No legislators found in cache | `nature` | `'No legislators found'` |

### Architecture Reference

- `cache/legislators.ts` — `getLegislatorsByDistrict(chamber, district)` already exists [Source: apps/mcp-server/src/cache/legislators.ts]
- `packages/types/index.ts` — `LookupLegislatorResult`, `Legislator` [Source: packages/types/index.ts]
- `Bill.sponsorId` matches `Legislator.id` — same format, same API origin [Source: apps/mcp-server/src/cache/bills.ts:37]
- Sprint change proposal — section 4.4 [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-27.md#4.4]
- Previous story (resolve_address) [Source: _bmad-output/implementation-artifacts/2-7-resolve-address-mcp-tool.md]
- No barrel files in `tools/` [Source: CLAUDE.md]
- `console.log` FORBIDDEN in `apps/mcp-server/` [Source: CLAUDE.md]
- `toHaveBeenCalledWith` required on all `mockReturnValue` stubs [Source: CLAUDE.md]
- Keep ALL throwing code inside try/catch [Source: CLAUDE.md]

### Project Structure Notes

- New cache functions go in `apps/mcp-server/src/cache/legislators.ts` (only place with SQLite imports — Boundary 4)
- `packages/types/index.ts` is the ONLY place shared types may live
- `apps/mcp-server/src/index.ts` is unchanged — tool registration already exists

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Extracted `mapRow` helper from inline mapping in `getLegislatorsByDistrict`; all three cache functions share it.
- `getLegislatorById` uses O(1) primary key lookup; `getLegislatorsByName` uses SQLite LIKE with leading/trailing `%` (acceptable for ≤104 rows per spec).
- Full rewrite of `legislator-lookup.ts`: removed GIS/address concerns (now in `resolve_address` tool), new schema `{ id?, name?, chamber?, district? }`, validation-first handler order (chamber/district pair check before "at least one mode" check).
- Full rewrite of `legislator-lookup.test.ts`: 10 tests replacing old GIS-based tests. No `vi.useFakeTimers()` needed (no async retry logic). All `mockReturnValue` stubs have `toHaveBeenCalledWith` assertions.
- `resolvedAddress` made optional in `LookupLegislatorResult`; new tool omits it entirely. `resolve_address` tool is unchanged.
- All 209 tests pass, typecheck clean, lint clean.

### File List

- `packages/types/index.ts` — modified (make `resolvedAddress` optional in `LookupLegislatorResult`)
- `apps/mcp-server/src/tools/legislator-lookup.ts` — full rewrite (new schema, new handler)
- `apps/mcp-server/src/tools/legislator-lookup.test.ts` — full rewrite (new tests)
- `apps/mcp-server/src/cache/legislators.ts` — modified (add `getLegislatorById`, `getLegislatorsByName`, extract `mapRow`)
- `apps/mcp-server/src/cache/legislators.test.ts` — modified (add tests for both new functions)

## Change Log

- 2026-03-30: Full implementation — made `resolvedAddress` optional in types, added `getLegislatorById`/`getLegislatorsByName` cache functions with `mapRow` extraction, rewrote `lookup_legislator` tool with new ID/name/district schema, rewrote tool tests (10 tests). 209 tests passing, typecheck + lint clean.
