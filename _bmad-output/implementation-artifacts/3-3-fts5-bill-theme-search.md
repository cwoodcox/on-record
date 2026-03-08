# Story 3.3: FTS5 Bill Theme Search

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want to search my legislator's bills by issue theme using natural-language keywords,
so that I can find relevant legislation even if I don't know a specific bill title or number.

## Acceptance Criteria

1. **Given** the `bill_fts` FTS5 virtual table is populated, **when** `searchBillsByTheme(sponsorId, theme)` is called with a theme keyword, **then** it returns bills whose `title` or `summary` match the keyword or a recognized synonym, filtered to bills sponsored by `sponsorId` (FR8)
2. **Given** `searchBillsByTheme` is called with a canonical theme name (`"healthcare"`, `"education"`, etc.), **when** the synonym expansion is applied, **then** all terms in that theme's synonym set participate in the FTS5 MATCH query (e.g., `"healthcare"` → `"health OR insurance OR Medicaid OR prescription"`)
3. **Given** `searchBillsByTheme` is called with any synonym of a known theme (e.g., `"Medicaid"`, `"school"`, `"landlord"`), **when** the lookup resolves, **then** the full synonym set for that category is used — not just the raw input keyword
4. **Given** `searchBillsByTheme` is called for a specific `sponsorId`, **then** results contain only bills where `sponsor_id = sponsorId` — bills from other sponsors are excluded even if they match the FTS5 query
5. **Given** no bills in `bill_fts` match the theme for the given sponsor, **when** `searchBillsByTheme` is called, **then** an empty array is returned (no error thrown)
6. **Given** an empty string is passed as `theme`, **when** `searchBillsByTheme` is called, **then** an empty array is returned immediately without executing a DB query (FTS5 MATCH on empty string throws a SQLite syntax error — guard prevents it)
7. **Given** the bills cache is populated, **when** `searchBillsByTheme` is called, **then** it completes in under 1 second (NFR3 — served from SQLite FTS5 index)
8. **Given** the codebase, **when** a developer searches for `better-sqlite3` imports, **then** they only appear inside `apps/mcp-server/src/cache/` (Boundary 4 enforced)
9. `pnpm --filter mcp-server typecheck` exits 0
10. `pnpm --filter mcp-server test` exits 0 (all 146 existing tests continue passing)
11. `pnpm --filter mcp-server lint` exits 0
12. Supported theme synonyms cover at minimum:
    - `healthcare`: health, insurance, Medicaid, prescription
    - `education`: school, teacher, student
    - `housing`: rent, landlord, affordable
    - `redistricting`: gerrymandering, Prop 4, district
    - `environment`: climate, pollution, water
    - `taxes`: revenue, budget, fiscal

## Tasks / Subtasks

- [x] Task 1: Add `searchBillsByTheme` to `apps/mcp-server/src/cache/bills.ts` (AC: 1, 2, 3, 4, 5, 6, 8)
  - [x] Add `THEME_QUERIES` constant (internal to module — do NOT export)
    - [x] Map: lowercase theme/synonym key → FTS5 OR query string value
    - [x] Include both canonical name AND every listed synonym as separate keys pointing to the same OR string
    - [x] All 6 required categories with every synonym from AC12
    - [x] Example: both `'healthcare'` and `'health'` and `'insurance'` and `'medicaid'` and `'prescription'` all map to `'health OR insurance OR Medicaid OR prescription'`
  - [x] Implement `searchBillsByTheme(sponsorId: string, theme: string): Bill[]`
    - [x] Normalize input: `const normalized = theme.trim().toLowerCase()`
    - [x] Guard: `if (normalized === '') return []`
    - [x] Resolve FTS5 query string: `const ftsQuery = THEME_QUERIES[normalized] ?? theme.trim()` (fallback to raw trimmed theme for unrecognized keywords)
    - [x] Run JOIN query using db singleton:
      ```typescript
      const rows = db
        .prepare<[string, string], BillRow>(
          `SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.vote_result, b.vote_date
           FROM bill_fts
           JOIN bills b ON b.rowid = bill_fts.rowid
           WHERE bill_fts MATCH ?
             AND b.sponsor_id = ?
           ORDER BY bill_fts.rank`,
        )
        .all(ftsQuery, sponsorId)
      ```
    - [x] Return `rows.map(rowToBill)` — reuse existing `rowToBill` and `BillRow` from the same file
    - [x] Uses db singleton directly (same access pattern as `getBillsBySponsor` and `getBillsBySession`)
  - [x] Export `searchBillsByTheme` from `bills.ts`
  - [x] Do NOT create or modify `cache/index.ts` (no barrel file — Boundary rule)

- [x] Task 2: Add `searchBillsByTheme` tests to `apps/mcp-server/src/cache/bills.test.ts` (AC: 1, 2, 3, 4, 5, 6, 12)
  - [x] Add import type declaration: `import type { searchBillsByTheme as SearchFn } from './bills.js'`
  - [x] Add module-level variable: `let searchBillsByTheme: typeof SearchFn`
  - [x] Assign in `beforeAll`: `searchBillsByTheme = mod.searchBillsByTheme`
  - [x] Add `describe('searchBillsByTheme', ...)` block (inside the outer `describe('bills cache', ...)` or as a sibling — follow existing describe structure):
    - [x] `'returns empty array when cache is empty'` — call with any theme/sponsorId, expect `[]`
    - [x] `'returns matching bills for the correct sponsor'` — write a bill with summary containing `'insurance'`; call with `theme: 'healthcare'`; assert result contains that bill
    - [x] `'does not return bills for a different sponsor'` — write bill for sponsor A; call with sponsorId of sponsor B; expect `[]`
    - [x] `'canonical theme expands to synonyms — healthcare matches insurance in summary'` — write bill with summary `'This bill covers insurance premiums'` for sponsor; call `searchBillsByTheme(sponsorId, 'healthcare')`; assert bill returned
    - [x] `'synonym input expands to full category — insurance matches health in title'` — write bill with title `'Public health fund'`; call with `theme: 'insurance'`; assert bill returned
    - [x] `'synonym input is case-insensitive — Medicaid matches prescription in summary'` — write bill with summary containing `'prescription drug coverage'`; call with `theme: 'Medicaid'` (mixed case); assert bill returned
    - [x] `'education synonyms — education matches school in title'` — write bill with title `'School funding reform'`; call with `theme: 'education'`; assert returned
    - [x] `'unrecognized theme uses raw term — transportation matches transportation in summary'` — write bill with summary containing `'public transportation'`; call with `theme: 'transportation'`; assert returned
    - [x] `'empty string theme returns empty array without throwing'` — expect `searchBillsByTheme('any-id', '').length` to equal 0
    - [x] `'returns only bills matching theme, not all sponsor bills'` — write 2 bills for same sponsor: one about healthcare, one about transportation; call with `theme: 'healthcare'`; assert only the healthcare bill returned

- [x] Task 3: Final verification (AC: 9, 10, 11)
  - [x] `pnpm --filter mcp-server typecheck` exits 0
  - [x] `pnpm --filter mcp-server test` exits 0 (146+ pre-existing tests still passing, new tests added)
  - [x] `pnpm --filter mcp-server lint` exits 0
  - [x] Confirm no `better-sqlite3` imports outside `apps/mcp-server/src/cache/`
  - [x] Confirm no `console.log` introduced anywhere in `apps/mcp-server/`

## Dev Notes

### Scope — What Story 3.3 IS and IS NOT

**In scope:**
- `apps/mcp-server/src/cache/bills.ts` — extend: add `THEME_QUERIES` constant and `searchBillsByTheme` export
- `apps/mcp-server/src/cache/bills.test.ts` — extend: add `searchBillsByTheme` describe block

**NOT in scope:**
- `tools/bill-search.ts` MCP tool — Story 3.5 (consumes `searchBillsByTheme` but is not implemented here)
- `components/BillCard.tsx` / `CitationTag.tsx` — Story 3.6
- Inter-session logic replacing `getActiveSession()` — Story 3.4
- Any changes to `cache/schema.ts` — `bill_fts` is already defined with `content='bills'` and `content_rowid='rowid'`
- Any changes to `packages/types/` — `Bill` and `SearchBillsResult` are already correct
- No changes to `cache/refresh.ts` — FTS5 rebuild on refresh is already implemented in Story 3.2
- No changes to `index.ts`

### bill_fts Schema (Already in Place — Story 3.2 Done)

`cache/schema.ts` (lines 50–58) defines:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS bill_fts
USING fts5(
  title,
  summary,
  content='bills',
  content_rowid='rowid'
)
```

Key facts:
- **Content FTS5 table** — `content='bills'` means FTS5 reads `title`/`summary` from the `bills` table; data is NOT duplicated
- **`content_rowid='rowid'`** — `bill_fts.rowid` maps to `bills.rowid` for the JOIN
- **FTS5 inverted index** — already rebuilt by `writeBills` on every refresh (`INSERT INTO bill_fts(bill_fts) VALUES('rebuild')`)
- **Searchable fields**: `title` and `summary` only — `status`, `sponsor_id`, `session` are NOT indexed in FTS5 (must filter on `bills` table)

### The JOIN Query — Why This Pattern

Because `bill_fts` indexes only `title` and `summary`, sponsor filtering must happen on the `bills` table. The correct query:

```sql
SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.vote_result, b.vote_date
FROM bill_fts
JOIN bills b ON b.rowid = bill_fts.rowid
WHERE bill_fts MATCH ?
  AND b.sponsor_id = ?
ORDER BY bill_fts.rank
```

**Why `ORDER BY bill_fts.rank`**: FTS5 exposes a hidden `rank` column (BM25 score, negative — more negative = better match). Ordering ascending (the default) puts the most relevant results first. Story 3.5 (MCP tool) will return these results to the LLM, so relevance ordering matters.

**Why NOT `SELECT b.rowid IN (SELECT rowid FROM bill_fts WHERE MATCH ?)`**: The subquery approach doesn't expose ranking, making result ordering non-deterministic. The JOIN approach is the canonical FTS5 content table pattern.

### THEME_QUERIES Constant — Design

```typescript
// Internal constant — not exported. Maps normalized (lowercase) theme keywords
// and their synonyms to FTS5 OR query strings.
// Both canonical theme names AND individual synonyms are keys, so input like
// 'Medicaid' (after normalization to 'medicaid') resolves to the healthcare query.
const THEME_QUERIES: Record<string, string> = {
  // Healthcare
  healthcare:   'health OR insurance OR Medicaid OR prescription',
  health:       'health OR insurance OR Medicaid OR prescription',
  insurance:    'health OR insurance OR Medicaid OR prescription',
  medicaid:     'health OR insurance OR Medicaid OR prescription',
  prescription: 'health OR insurance OR Medicaid OR prescription',
  // Education
  education:    'school OR teacher OR student OR education',
  school:       'school OR teacher OR student OR education',
  teacher:      'school OR teacher OR student OR education',
  student:      'school OR teacher OR student OR education',
  // Housing
  housing:      'rent OR landlord OR affordable OR housing',
  rent:         'rent OR landlord OR affordable OR housing',
  landlord:     'rent OR landlord OR affordable OR housing',
  affordable:   'rent OR landlord OR affordable OR housing',
  // Redistricting
  redistricting:  'redistricting OR gerrymandering OR district',
  gerrymandering: 'redistricting OR gerrymandering OR district',
  'prop 4':       'redistricting OR gerrymandering OR district',
  // Environment
  environment: 'climate OR pollution OR water OR environment',
  climate:     'climate OR pollution OR water OR environment',
  pollution:   'climate OR pollution OR water OR environment',
  water:       'climate OR pollution OR water OR environment',
  // Taxes
  taxes:   'revenue OR budget OR fiscal OR tax',
  tax:     'revenue OR budget OR fiscal OR tax',
  revenue: 'revenue OR budget OR fiscal OR tax',
  budget:  'revenue OR budget OR fiscal OR tax',
  fiscal:  'revenue OR budget OR fiscal OR tax',
}
```

**FTS5 OR operator note**: FTS5 uses uppercase `OR`. The `AND`, `OR`, `NOT` operators must be uppercase in FTS5 queries. This is correct in the values above.

### Full `searchBillsByTheme` Implementation

```typescript
/**
 * Full-text searches the bills cache by issue theme keyword.
 * Expands known theme names and synonyms to FTS5 OR queries for broader matching.
 * Results are filtered to bills sponsored by the given legislator.
 * Returns bills ordered by FTS5 relevance (BM25 rank).
 *
 * @param sponsorId - Legislator ID (e.g. 'RRabbitt')
 * @param theme     - Issue theme keyword (e.g. 'healthcare', 'education', 'water')
 */
export function searchBillsByTheme(sponsorId: string, theme: string): Bill[] {
  const normalized = theme.trim().toLowerCase()
  if (normalized === '') return []

  const ftsQuery = THEME_QUERIES[normalized] ?? theme.trim()

  const rows = db
    .prepare<[string, string], BillRow>(
      `SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.vote_result, b.vote_date
       FROM bill_fts
       JOIN bills b ON b.rowid = bill_fts.rowid
       WHERE bill_fts MATCH ?
         AND b.sponsor_id = ?
       ORDER BY bill_fts.rank`,
    )
    .all(ftsQuery, sponsorId)

  return rows.map(rowToBill)
}
```

Place this after `getBillsBySession` and before `writeBills` in the file. Export it.

### Test Infrastructure — Reuse Existing Patterns

The test file already has everything needed:
- `testDb` in-memory SQLite with `initializeSchema` applied
- `vi.mock('./db.js', () => ({ db: testDb }))` singleton injection
- `beforeAll` dynamic import pattern
- `makeBill()` fixture helper
- `beforeEach` that clears `bills` and resets `bill_fts` via `'delete-all'`

**Critical**: After `writeBills(testDb, bills)` in tests, the FTS5 index IS rebuilt (it's inside the transaction in `writeBills`). Tests that call `searchBillsByTheme` must call `writeBills` first to populate both `bills` and `bill_fts`.

**FTS5 reset in beforeEach**: The existing `beforeEach` already runs:
```typescript
testDb.prepare('DELETE FROM bills').run()
testDb.prepare("INSERT INTO bill_fts(bill_fts) VALUES('delete-all')").run()
```
This clears both tables between tests. No additional cleanup needed.

**Test data for FTS5 tests**: Use `makeBill` overrides with specific `title`/`summary` content:
```typescript
const bill = makeBill({
  id: 'HB0042',
  title: 'Public Health Fund Act',
  summary: 'Establishes insurance coverage requirements for prescription drugs',
  sponsorId: 'leg-001',
})
writeBills(testDb, [bill])
// Now searchBillsByTheme('leg-001', 'healthcare') should return [bill]
```

**Note on FTS5 MATCH case sensitivity**: FTS5 MATCH is case-insensitive by default (uses the `unicode61` tokenizer). `'Insurance'`, `'insurance'`, and `'INSURANCE'` all match the same tokens. The THEME_QUERIES values use mixed case (e.g., `'Medicaid'`) which is fine — FTS5 lowercases everything during tokenization.

### Adding Import Type Declaration in Test File

The test file uses a specific pattern for importing types from the module under test:
```typescript
import type {
  getBillsBySponsor as GetBySponsorFn,
  getBillsBySession as GetBySessionFn,
  writeBills as WriteFn,
  getActiveSession as GetActiveSessionFn,
} from './bills.js'
```

Add `searchBillsByTheme as SearchFn` to this import block:
```typescript
import type {
  getBillsBySponsor as GetBySponsorFn,
  getBillsBySession as GetBySessionFn,
  writeBills as WriteFn,
  getActiveSession as GetActiveSessionFn,
  searchBillsByTheme as SearchFn,
} from './bills.js'
let searchBillsByTheme: typeof SearchFn
```

And in `beforeAll`:
```typescript
searchBillsByTheme = mod.searchBillsByTheme
```

### ESLint / TypeScript Enforcement Reminders

- `console.log` is FORBIDDEN in `apps/mcp-server/` — use `logger.info` / `logger.error` only (this story adds no logging — just cache functions — so no logger calls needed)
- `strict: true` + `exactOptionalPropertyTypes: true` — use `??` and conditional assignment for optional fields (already handled by `rowToBill`)
- `better-sqlite3` imports only in `cache/` — ESLint enforces via `no-restricted-imports`
- No `any`, no `@ts-ignore`
- Import paths use `.js` extensions (NodeNext resolution): `import { searchBillsByTheme } from './cache/bills.js'`
- No barrel file — no `index.ts` in `cache/`

### Previous Story Intelligence (Story 3.2)

Key patterns established in Story 3.2 that carry forward:

1. **DB singleton access pattern** — `searchBillsByTheme` accesses `db` from `./db.js` directly (same as `getBillsBySponsor`/`getBillsBySession`). This allows tools/ to call it without violating Boundary 4.

2. **`rowToBill` reuse** — `BillRow` interface and `rowToBill` mapper are already defined in `bills.ts`. No need to redefine them for the new function.

3. **FTS5 rebuild already handled** — `writeBills` rebuilds FTS5 inside its transaction. Story 3.3 only reads from FTS5; it does NOT write to it.

4. **`exactOptionalPropertyTypes: true`** — `voteResult`/`voteDate` use conditional assignment in `rowToBill`, not `??`. Do not change this pattern.

5. **Test rejection patterns** — attach `.rejects` BEFORE `vi.runAllTimersAsync()` (not relevant here since `searchBillsByTheme` is synchronous, but good to remember for future).

6. **Error-path tests** — assert specific `nature`/`action` string values (not applicable here since `searchBillsByTheme` returns `Bill[]`, not `AppError`).

7. **FTS5 `delete-all` command** — the `beforeEach` in `bills.test.ts` already resets FTS5 via `INSERT INTO bill_fts(bill_fts) VALUES('delete-all')`. This is required to keep FTS5 consistent with the cleared `bills` table.

### Story 3.5 Dependency Note

Story 3.5 (`search_bills` MCP tool) will import `searchBillsByTheme` from `./cache/bills.js`. This is the **only** consumer of `searchBillsByTheme` in the production path. Story 3.3's entire scope is to make `searchBillsByTheme` available and tested so Story 3.5 has a clean, tested foundation.

### Project Structure Notes

- `apps/mcp-server/src/cache/bills.ts` — extended (add `THEME_QUERIES` + `searchBillsByTheme`)
- `apps/mcp-server/src/cache/bills.test.ts` — extended (add `searchBillsByTheme` describe block)
- No new files created; no other files modified

### References

- [Source: apps/mcp-server/src/cache/schema.ts#line 50–58] — `bill_fts` FTS5 virtual table DDL: `content='bills'`, `content_rowid='rowid'`
- [Source: apps/mcp-server/src/cache/bills.ts] — `BillRow` interface, `rowToBill` mapper, `getBillsBySponsor`/`getBillsBySession` patterns to mirror for singleton access
- [Source: apps/mcp-server/src/cache/bills.test.ts] — `makeBill()` fixture, `vi.mock('./db.js')` singleton injection, `beforeAll` dynamic import, `beforeEach` FTS5 reset
- [Source: apps/mcp-server/src/tools/legislator-lookup.ts] — MCP tool pattern; Story 3.5 will follow this exact structure for `search_bills`
- [Source: packages/types/index.ts#line 80–84] — `SearchBillsResult` type (bills: Bill[], legislatorId: string, session: string) — Story 3.5 returns this shape
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — AC: synonym categories (healthcare, education, housing, redistricting, environment, taxes) and keyword lists
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — FTS5 virtual table description, FR8 theme search requirement, Boundary 4 (no better-sqlite3 outside cache/)
- [Source: _bmad-output/implementation-artifacts/3-2-bills-sqlite-cache-with-hourly-refresh-and-per-legislator-sponsor-index.md] — Story 3.2 completion notes: 146 tests passing, FTS5 rebuild pattern, BillRow shape, rowToBill mapping

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `THEME_QUERIES` constant (internal, not exported) mapping 30+ normalized theme/synonym keys across 6 categories to FTS5 OR query strings.
- Implemented and exported `searchBillsByTheme(sponsorId, theme)` using the JOIN pattern (`FROM bill_fts JOIN bills b ON b.rowid = bill_fts.rowid WHERE bill_fts MATCH ? AND b.sponsor_id = ? ORDER BY bill_fts.rank`) to preserve BM25 relevance ranking.
- Added empty-string guard (returns `[]` immediately without hitting SQLite).
- Fallback for unrecognized themes: raw trimmed input passed directly to FTS5 MATCH.
- 10 new tests added to `bills.test.ts`; total test count: 156 (was 146). All pass.
- `pnpm --filter mcp-server typecheck`, `test`, and `lint` all exit 0.
- No new files created; no `cache/index.ts` barrel file touched; Boundary 4 enforced.

### File List

- apps/mcp-server/src/cache/bills.ts
- apps/mcp-server/src/cache/bills.test.ts

## Senior Developer Review (AI)

**Reviewer:** Corey (via claude-opus-4-6)
**Date:** 2026-03-08
**Outcome:** Approved with fixes applied

### Findings (all resolved)

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| H1 | HIGH | Healthcare FTS query omitted canonical token `healthcare` — inconsistent with all other categories; bills containing "healthcare" (single token) wouldn't match | Added `healthcare` to FTS query string for all healthcare entries |
| H2 | HIGH | Unrecognized theme input passed raw to FTS5 MATCH — malformed syntax (`*`, `OR`, unmatched quotes) would throw uncaught SQLite error | Wrapped `.all()` in try/catch; returns `[]` on FTS5 parse errors |
| M1 | MEDIUM | Tests only covered 2 of 6 theme categories (healthcare, education) — typos in other 4 categories undetectable | Added parameterized `it.each` tests for housing, redistricting, environment, taxes |
| M2 | MEDIUM | Taxes FTS query used `tax` but not `taxes` — plural form in bill text wouldn't match (FTS5 unicode61 doesn't stem) | Added `taxes` to FTS query string for all taxes entries |
| L1 | LOW | No test for whitespace-only theme input | Added explicit whitespace-only test |

### Verification

- `pnpm --filter mcp-server typecheck` → 0
- `pnpm --filter mcp-server lint` → 0
- `pnpm --filter mcp-server test` → 162 passing (was 156; +6 new)
- Boundary 4: `better-sqlite3` imports confined to `cache/` only
- No `console.log` introduced

## Change Log

- 2026-03-08: Implemented `searchBillsByTheme` with `THEME_QUERIES` synonym expansion and FTS5 JOIN query; added 10 tests (156 total passing). Story complete.
- 2026-03-08: Code review (claude-opus-4-6): Fixed healthcare/taxes FTS query gaps, added try/catch for malformed FTS5 input, added 6 tests (162 total). Status → done.
