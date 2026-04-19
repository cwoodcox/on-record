# Story 4.9: Add Computed `billUrl` Field to Bill Type and search_bills Responses

Status: ready-for-dev

## Story

As a **constituent using the ChatGPT App**,
I want each bill in search results to include a direct link to the bill's page on the Utah Legislature website,
so that I can verify the legislation cited in my letter and the model can include a clickable reference.

## Acceptance Criteria

1. **`Bill` interface updated**: `packages/types/index.ts` has `billUrl?: string` added to the `Bill` interface, after the existing `voteDate?` field.

2. **`rowToBill` computes `billUrl`**: `apps/mcp-server/src/cache/bills.ts` `rowToBill()` sets `bill.billUrl` using the formula `https://le.utah.gov/~${row.session.slice(0, 4)}/bills/static/${row.id}.html`. The field is always set (no conditional) since every bill row has `id` and `session`.

3. **`billUrl` appears in `search_bills` responses**: Because `billUrl` flows through the `Bill` type from `rowToBill`, the `search_bills` tool's JSON response automatically includes it. No change to `search-bills.ts` is required.

4. **`bills.test.ts` verifies `billUrl` correctness**: A new test in `apps/mcp-server/src/cache/bills.test.ts` verifies that a bill written and read back has `billUrl === 'https://le.utah.gov/~2026/bills/static/HB0001.html'` for `id: 'HB0001'` and `session: '2026GS'`, and that a special-session bill (e.g. `id: 'SB0013'`, `session: '2025S1'`) produces `billUrl === 'https://le.utah.gov/~2025/bills/static/SB0013.html'`.

5. `pnpm --filter mcp-server typecheck` passes with zero errors.

6. `pnpm --filter mcp-server test` passes — all existing tests continue to pass without modification.

## Tasks / Subtasks

- [ ] Task 1: Add `billUrl` to `Bill` interface (AC: 1, 5)
  - [ ] In `packages/types/index.ts`, add `billUrl?: string` as a new optional field in the `Bill` interface, after `voteDate?: string`
  - [ ] Leave all other fields and interfaces unchanged

- [ ] Task 2: Compute `billUrl` in `rowToBill` (AC: 2, 3)
  - [ ] In `apps/mcp-server/src/cache/bills.ts`, in `rowToBill()`, add: `bill.billUrl = \`https://le.utah.gov/~${row.session.slice(0, 4)}/bills/static/${row.id}.html\``
  - [ ] Add the assignment unconditionally (id and session are never null)
  - [ ] Do NOT add a new column to `BillRow`, do NOT change any SQL queries, do NOT touch `writeBills`

- [ ] Task 3: Add `billUrl` correctness tests (AC: 4, 6)
  - [ ] In `apps/mcp-server/src/cache/bills.test.ts`, within the existing `describe('bills cache', ...)` block, add a new `describe('billUrl computation', ...)` block with:
    - A test for a standard General Session bill: write `{ id: 'HB0001', session: '2026GS', ... }`, read back via `getBillsBySponsor` or `searchBills`, assert `billUrl === 'https://le.utah.gov/~2026/bills/static/HB0001.html'`
    - A test for a special session bill: write `{ id: 'SB0013', session: '2025S1', ... }`, read back, assert `billUrl === 'https://le.utah.gov/~2025/bills/static/SB0013.html'`

- [ ] Task 4: Verify no regressions (AC: 5, 6)
  - [ ] `pnpm --filter mcp-server typecheck` — zero errors
  - [ ] `pnpm --filter mcp-server test` — all tests pass

## Dev Notes

### What This Story Is

This is the "E5-y / Tier 1 No-Widget Improvement" from the 2026-04-18 ChatGPT Apps technical research (`_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md`, section "Implementation Research: Bill Text Access", Track 1).

The previous story (4.8) encoded behavioral preconditions into tool descriptions. This story adds a computed `billUrl` that lets the model cite a verifiable source in draft letters ("You can read the full text at…") and gives the future Bill Confirmation widget a deep-link URL per bill card.

### CRITICAL: No Schema Migration

`billUrl` is **not stored in the database**. It is computed at query time from the `id` and `session` columns that are already in every row. Do not:
- Add a `bill_url` column to the `bills` table
- Change any SQL `SELECT` statements
- Touch `writeBills()`
- Touch any schema or migration files

The formula is pure string computation from data already in `BillRow`.

### Bill URL Formula

```typescript
// From research document, "Bill URL Formula — Ready to Implement"
bill.billUrl = `https://le.utah.gov/~${row.session.slice(0, 4)}/bills/static/${row.id}.html`
```

**Why `session.slice(0, 4)` works:**
- General session: `"2026GS"` → `"2026"` → `https://le.utah.gov/~2026/bills/static/...`
- Special session: `"2025S1"` → `"2025"` → `https://le.utah.gov/~2025/bills/static/...`

**Why no zero-padding logic:** The `id` field in the DB is already zero-padded (e.g., `"HB0042"`, `"SB0013"`) — sourced directly from the Utah Legislature API's `billNumber` field. No computation needed.

**Why these are HTML pages, not PDFs:** The HTML page URL is deterministic and canonical. PDF URLs include substitute version suffixes (`S01`, `S02`, etc.) that are not stored in the cache. The HTML pages are JS-rendered shells but serve as valid reference links for humans. Per research: "The URL is deterministic and canonical — it's what someone pastes into a browser to read the bill."

### Where `billUrl` Is Computed

`rowToBill()` is the **single point** where DB rows become `Bill` objects. All four read paths go through it:
- `getBillsBySponsor()`
- `getBillsBySession()`
- `searchBillsByTheme()`
- `searchBills()`

Add the assignment once in `rowToBill()` — it propagates everywhere automatically.

### Why `search-bills.ts` Needs No Change

The tool returns `JSON.stringify(result)` where `result` comes from `searchBills(db, params)` which returns `SearchBillsResult` containing `Bill[]`. Once `rowToBill` includes `billUrl`, it flows through automatically. No change to `search-bills.ts`.

### Why `search-bills.test.ts` Needs No Change

The tool test mocks `searchBills` at the `cache/bills.js` boundary. The mock returns whatever the test fixture provides. Existing fixtures have `billUrl` as `undefined` (it's optional in `Bill`). Tests check the JSON-stringified response for structure and error handling — they do not assert on the absence of `billUrl`, so they continue to pass.

### Bill Type Update — Where to Add

In `packages/types/index.ts`, the `Bill` interface currently ends with:

```typescript
export interface Bill {
  id: string
  session: string
  title: string
  summary: string
  status: string
  sponsorId: string
  floorSponsorId?: string
  voteResult?: string
  voteDate?: string  // ← add billUrl after this line
}
```

Add: `billUrl?: string` with a brief inline comment: `// computed from id + session; not stored in DB`

The `BillDetail` interface extends `Bill` — it will inherit `billUrl` automatically, which is fine (getBillDetail is not used for search results but the field won't cause issues).

### `BillRow` — Do NOT Modify

The `BillRow` internal interface in `bills.ts` represents the raw D1 row shape and must NOT gain a `bill_url` field. The computation happens in `rowToBill()` after the row is read, using the already-present `row.session` and `row.id` fields.

### Testing Approach

Use the existing D1 integration test pattern in `bills.test.ts`:
- `writeBills(env.DB, [makeBill({ id: 'HB0001', session: '2026GS', ... })])`
- Read back via `getBillsBySponsor(env.DB, 'leg-001')` (or `searchBills`)
- Assert `result[0].billUrl === 'https://le.utah.gov/~2026/bills/static/HB0001.html'`

The test doesn't use `toContain` here (no error message key phrase) — use exact `===` equality since the formula is deterministic and we want to catch any regression in the URL structure.

### Key Architectural Rules

- `console.log` FORBIDDEN in `apps/mcp-server/` — not relevant to this change
- No `any`, no `@ts-ignore` — template literals are fine
- `better-sqlite3` imports confined to `apps/mcp-server/src/cache/` — not applicable (using D1)
- All shared types in `packages/types/` only — `Bill` interface lives there correctly

### Test Count Reference

After 4.8, the test suite has 199 tests across 13 files. The new `billUrl` tests in `bills.test.ts` will add 2 tests (one per formula variant). Expect the post-story count to be ~201 tests.

### References

- Research source (primary): [`_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md`] — "Track 1: Compute billUrl at Query Time", "Bill URL Formula — Ready to Implement"
- Previous story (4.8): [`_bmad-output/implementation-artifacts/4-8-mcp-tool-description-chatgpt-apps-behavioral-encoding.md`]
- `Bill` interface: [`packages/types/index.ts` lines 21–31]
- `rowToBill`: [`apps/mcp-server/src/cache/bills.ts` lines 21–41]
- `BillRow`: [`apps/mcp-server/src/cache/bills.ts` lines 9–19]
- Existing `bills.test.ts` pattern: [`apps/mcp-server/src/cache/bills.test.ts` lines 33–80+]

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

_to be filled_

### Completion Notes List

_to be filled_

### File List

- `packages/types/index.ts` (modified — add `billUrl?: string` to `Bill`)
- `apps/mcp-server/src/cache/bills.ts` (modified — compute `billUrl` in `rowToBill()`)
- `apps/mcp-server/src/cache/bills.test.ts` (modified — add 2 `billUrl` tests)
- `_bmad-output/implementation-artifacts/4-9-bill-url-computed-field.md` (this file — story tracking)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status)
