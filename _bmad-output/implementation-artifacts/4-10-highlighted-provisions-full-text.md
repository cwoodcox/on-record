# Story 4.10: Store `highlightedProvisions` as `full_text` in Bills Cache

Status: done

## Story

As a **constituent using the ChatGPT App**,
I want bill search results to include richer legislative text beyond the one-paragraph summary,
so that the model has more context for drafting a substantive, well-grounded constituent letter.

## Acceptance Criteria

1. **`Bill` interface updated**: `packages/types/index.ts` has `fullText?: string` added to the `Bill` interface (after `billUrl?`). It is removed from `BillDetail` (since `BillDetail extends Bill`, it inherits the field).

2. **`full_text` column added to `bills` table**: `migrations/001-initial-schema.sql` and `src/cache/schema.ts` `SCHEMA_SQL` both declare `full_text TEXT` as an optional column in the `bills` table.

3. **`full_text` added to `bill_fts` virtual table**: `bill_fts` FTS5 virtual table includes `full_text` as a third indexed column (after `title` and `summary`).

4. **Production D1 migration file created**: `migrations/002-add-full-text-to-bills.sql` adds the `full_text` column to the existing `bills` table, drops and recreates `bill_fts` with `full_text`, and rebuilds the FTS5 index.

5. **HTML stripping applied at write time**: A `stripHtml(s: string): string` helper in `bills.ts` strips HTML tags (regex-based) before storing `full_text`. The helper is applied in `writeBills()` when `bill.fullText` is defined.

6. **`rowToBill` maps `full_text` to `fullText`**: `rowToBill()` maps a non-null `full_text` DB column to `bill.fullText`. A null value maps to `undefined` (not `null`), matching `exactOptionalPropertyTypes: true`.

7. **`writeBills` stores `fullText`**: The INSERT in `writeBills()` includes `full_text` and binds `bill.fullText !== undefined ? stripHtml(bill.fullText) : null`.

8. **All SELECT queries updated**: All SQL SELECT statements in `bills.ts` (in `getBillsBySponsor`, `getBillsBySession`, `searchBillsByTheme`, `searchBills` both paths) include `full_text` in the column list.

9. **`getBillsBySession` passes `fullText` through**: In `utah-legislature.ts`, `getBillsBySession()` spreads `fullText` from `BillDetail` into the `Bill` object when `detail.fullText !== undefined`, using `...(detail.fullText !== undefined && { fullText: detail.fullText })`.

10. **`bills.test.ts` verifies `fullText` round-trip**: Tests confirm:
    - Writing a bill with `fullText: 'Amends Section 53G-7-218...'` and reading back returns `fullText === 'Amends Section 53G-7-218...'`
    - Writing a bill without `fullText` returns `fullText === undefined` (not null)
    - Writing a bill with HTML in `fullText` (e.g., `'<b>Amends</b> Section 53G-7-218'`) strips tags and stores `'Amends Section 53G-7-218'`
    - FTS5 query matching on `full_text` content works (query for text only in `fullText`, not in `title`/`summary`)

11. **`utah-legislature.test.ts` verifies `fullText` propagation**: Tests confirm:
    - `getBillsBySession()` includes `fullText` on the returned `Bill` when the API provides `highlightedProvisions`
    - `getBillsBySession()` omits `fullText` (property absent, not undefined assignment) when the API does not provide `highlightedProvisions`

12. **Key phrase for error-path tests**: N/A — no new error paths introduced.

13. `pnpm --filter mcp-server typecheck` passes with zero errors.

14. `pnpm --filter mcp-server test` passes — all existing tests continue to pass without modification.

## Tasks / Subtasks

- [x] Task 1: Update `Bill` interface and `BillDetail` in types (AC: 1, 13)
  - [x] In `packages/types/index.ts`, add `fullText?: string` to `Bill` interface after `billUrl?: string`
  - [x] Remove `fullText?: string` from `BillDetail` (it inherits from `Bill` via `extends`)
  - [x] Leave all other fields and interfaces unchanged

- [x] Task 2: Update schema files with `full_text` column and FTS5 (AC: 2, 3, 4)
  - [x] In `apps/mcp-server/migrations/001-initial-schema.sql`, add `full_text TEXT` after `vote_date TEXT` in the `bills` table; add `full_text` to `bill_fts` FTS5 definition after `summary`
  - [x] In `apps/mcp-server/src/cache/schema.ts` (`SCHEMA_SQL`), make identical changes
  - [x] Create `apps/mcp-server/migrations/002-add-full-text-to-bills.sql` with: `ALTER TABLE bills ADD COLUMN full_text TEXT;`, DROP + CREATE `bill_fts` with `full_text`, REBUILD

- [x] Task 3: Update `bills.ts` — BillRow, rowToBill, writeBills, SELECT queries (AC: 5, 6, 7, 8)
  - [x] Add `full_text: string | null` to `BillRow` interface
  - [x] Add `stripHtml(s: string): string` helper function (module-private, not exported)
  - [x] In `rowToBill()`, add: `if (row.full_text !== null) bill.fullText = row.full_text`
  - [x] In `getBillsBySponsor()` SELECT, add `full_text` to the column list
  - [x] In `getBillsBySession()` SELECT, add `full_text` to the column list
  - [x] In `searchBillsByTheme()` SELECT, add `full_text` to the column list
  - [x] In `searchBills()` FTS5 path SELECT (pageSql), add `b.full_text` to the column list
  - [x] In `searchBills()` direct path SELECT (pageSql), add `full_text` to the column list
  - [x] In `writeBills()` INSERT, add `full_text` to column list and bind `bill.fullText !== undefined ? stripHtml(bill.fullText) : null`

- [x] Task 4: Update `utah-legislature.ts` — pass `fullText` through `getBillsBySession` (AC: 9)
  - [x] In `getBillsBySession()`, inside the `Promise.allSettled` loop where each `Bill` is constructed, add: `...(detail.fullText !== undefined && { fullText: detail.fullText })`

- [x] Task 5: Add tests — `bills.test.ts` (AC: 10, 14)
  - [x] Add `describe('fullText storage and retrieval', ...)` block with:
    - Test: write bill with `fullText`, read back via `getBillsBySponsor`, assert `fullText` matches stored value
    - Test: write bill without `fullText`, read back, assert `fullText === undefined`
    - Test: write bill with HTML in `fullText` (e.g., `'<b>Amends</b> Section 53G'`), read back, assert stripped (`'Amends Section 53G'`)
    - Test: FTS5 `searchBills({ query: 'uniqueprovision' })` returns the bill when `uniqueprovision` is only in `fullText` (not in title or summary)

- [x] Task 6: Add tests — `utah-legislature.test.ts` (AC: 11, 14)
  - [x] Add tests within existing `describe('getBillsBySession', ...)` block:
    - Test: `getBillsBySession` includes `fullText` on the Bill when API provides `highlightedProvisions`
    - Test: `getBillsBySession` omits `fullText` (property absent) when API lacks `highlightedProvisions`

- [x] Task 7: Typecheck and test run (AC: 13, 14)
  - [x] `pnpm --filter mcp-server typecheck` — pre-existing errors only (Cloudflare Workers + DOM type conflicts, unrelated to this story)
  - [x] `pnpm --filter mcp-server test` — all 210 tests pass (201 pre-existing + 6 new + 3 already in suite)

### Review Findings

PR 31 review (2026-04-26). Three reviewers: Blind Hunter (adversarial, no context), Edge Case Hunter (boundary analysis with project read), Acceptance Auditor (spec/AC + conventions).

**Initial review** flagged 12 patches, 1 multi-part decision-needed (apparent scope creep: pino logger refactor, AbortController removal, log-level changes), 6 deferred, 5 dismissed as noise.

**After rebase on main** (PR 31 branch was forked before PR 30 landed and was therefore stale on `apps/mcp-server/src/lib/logger.ts`, `apps/mcp-server/src/cache/refresh.ts`, and `apps/mcp-server/src/providers/{types,utah-legislature}.ts`): the apparent scope creep collapsed entirely. The PR now modifies exactly the 10 files declared in the File List. The decision-needed and 5 contingent patches are dropped.

**Net findings:** 6 patches (all fixed), 5 deferred (pre-existing).

**Patches (all applied):**

- [x] [Review][Patch] **CRITICAL — `warmUpBillsCache` does not propagate `fullText` to `writeBills`** [`apps/mcp-server/src/cache/refresh.ts:200-205`] — The provider `getBillsBySession` was updated per AC 9, but it is **not the production refresh path**. `warmUpBillsCache` (the cron-triggered refresh) calls `getBillDetail` per bill and maps `BillDetail` → `Bill` field-by-field, omitting `fullText`. Fixed: added `...(detail.fullText !== undefined && { fullText: detail.fullText }),` after the `voteDate` spread. New regression test in `refresh.test.ts` (`propagates fullText from BillDetail into cached bills row`).
- [x] [Review][Patch] **Empty-string `fullText` violates absence semantics** [`apps/mcp-server/src/cache/bills.ts`] — Fixed: introduced `normalizeFullText(value)` that returns `null` for `undefined`, empty string, whitespace-only, or pure-tag inputs. Used in the `writeBills` bind. New tests cover empty string and pure-tag/whitespace inputs.
- [x] [Review][Patch] **`stripHtml` regex destroys non-tag `<`/`>` text and ignores HTML entities** [`apps/mcp-server/src/cache/bills.ts`] — Fixed: tightened tag regex to `/<\/?[a-zA-Z][^>]*>/g` so inequalities like `'A < B and C > D'` survive. Added entity-decoding pass for `&nbsp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&apos;`, `&amp;` (decoded last to avoid double-decode). New tests cover both behaviors.
- [x] [Review][Patch] **FTS5-only-on-fullText test does not actually prove `full_text` was the matching column** [`apps/mcp-server/src/cache/bills.test.ts`] — Fixed: existing test now writes a control bill (HB0002) with the same title/summary but no `fullText`, and asserts the search returns only HB0001.
- [x] [Review][Patch] **`writeBills` FTS5 rebuild has no failure handling** [`apps/mcp-server/src/cache/bills.ts`] — Fixed: wrapped the rebuild call in try/catch; on failure, logs an `error`-level entry noting the index is stale until the next refresh. Bill rows themselves are committed (still useful for non-FTS reads).
- [x] [Review][Patch] **Migration 002 rebuild can hit D1 per-statement timeout silently** [`apps/mcp-server/migrations/002-add-full-text-to-bills.sql`] — Fixed: added a "POST-DEPLOY VERIFICATION" header note instructing operators to compare `SELECT COUNT(*) FROM bill_fts` vs `SELECT COUNT(*) FROM bills` and re-run rebuild or trigger a refresh if counts differ.

**Deferred (pre-existing or out-of-scope):**

- [x] [Review][Defer] HTML stripping at write time is destructive — originals unrecoverable [`apps/mcp-server/src/cache/bills.ts`] — design choice in story spec; deferred, accepted as-is for MVP.
- [x] [Review][Defer] `BillDetail` and `Bill` are now structurally indistinguishable when `subjects` is absent [`packages/types/index.ts`] — pre-existing optional discriminator pattern; deferred.
- [x] [Review][Defer] `wallTimeSeconds` configured to 1 or 2 silently no-ops the entire refresh [`apps/mcp-server/src/cache/refresh.ts`] — pre-existing `(wallTimeSeconds - 2) * 1000` arithmetic; deferred.
- [x] [Review][Defer] Migration 002 doesn't drop FTS5 triggers if any are added later [`apps/mcp-server/migrations/002-add-full-text-to-bills.sql`] — current schema has no triggers; brittleness is forward-looking; deferred.
- [x] [Review][Defer] `searchBills` FTS5 path lacks try/catch around `prepare().first()`/`.all()` — invalid FTS5 syntax in a user query becomes a hard 'temporarily unavailable' instead of empty results [`apps/mcp-server/src/cache/bills.ts` FTS5 path] — pre-existing; `searchBillsByTheme` has the guard; this path does not. Mirror that guard. Deferred, pre-existing.

**Rebase note (2026-04-26):** PR 31 branch `claude/e5z-chatgpt-research-emMvr` was rebased onto current `main` (force-update from `4219b13` to a fresh commit on top of `86b0839`). Resulting diff is exactly the 10 declared File List paths.

**Test results after patches:** `pnpm --filter mcp-server test` → 215 passed (210 pre-existing + 5 new). `pnpm --filter mcp-server typecheck` → clean. `pnpm --filter mcp-server lint` → clean.

## Dev Notes

### What This Story Is

This is the "E5-z / Tier 1 No-Widget Improvement" from the 2026-04-18 ChatGPT Apps technical research (`_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md`, section "Track 2: Store and Surface `highlightedProvisions` as `fullText`").

The previous stories (4.8 = E5-x, 4.9 = E5-y) encoded behavioral preconditions into tool descriptions and added `billUrl`. This story wires through the `highlightedProvisions` field that is already fetched on every cache refresh but currently discarded. Storing it gives the model richer per-bill context and improves FTS5 keyword search quality.

### E5-z-spike Findings

Spike was done by examining the existing `utah-legislature.test.ts` mock at line 49:
```typescript
highlightedProvisions: 'This bill amends weighted pupil unit provisions...',
```

The existing test mock (and the `getBillDetail` test at line 516 that verifies `fullText: 'This bill amends weighted pupil unit provisions...'`) confirms the format is plain text. However, the official API docs do not specify format, so HTML stripping is applied as a defensive measure — it is a no-op for plain text.

### CRITICAL: Schema Migration Strategy

**Two schema files must be kept in sync:**
- `migrations/001-initial-schema.sql` — for fresh installs (new environments)
- `src/cache/schema.ts` (`SCHEMA_SQL`) — for tests and local Node.js dev

**The production migration file:**
- `migrations/002-add-full-text-to-bills.sql` — for existing D1 databases

The FTS5 virtual table CANNOT be altered. To add `full_text` to FTS5:
1. `DROP TABLE IF EXISTS bill_fts`
2. `CREATE VIRTUAL TABLE bill_fts USING fts5(title, summary, full_text, content='bills', content_rowid='rowid')`
3. `INSERT INTO bill_fts(bill_fts) VALUES('rebuild')`

This is safe because FTS5 with `content='bills'` stores no data itself — it's an index over `bills`. Dropping and rebuilding does not lose data.

### HTML Stripping Helper

```typescript
// Module-private — applied in writeBills() before storing full_text
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
```

Apply only when `bill.fullText !== undefined`:
```typescript
bill.fullText !== undefined ? stripHtml(bill.fullText) : null
```

### `BillRow` Update

Add `full_text: string | null` after `vote_date`:
```typescript
interface BillRow {
  id: string
  session: string
  title: string
  summary: string
  status: string
  sponsor_id: string
  floor_sponsor_id: string | null
  vote_result: string | null
  vote_date: string | null
  full_text: string | null  // NEW
}
```

### `rowToBill` Update

After the existing `vote_date` null-check block:
```typescript
if (row.full_text !== null) {
  bill.fullText = row.full_text
}
```

### SELECT Query Updates

All four read paths in `bills.ts` need `full_text` added:

`getBillsBySponsor`: Change `SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date FROM bills WHERE sponsor_id = ?`
→ add `full_text` after `vote_date`

`getBillsBySession`: Same pattern.

`searchBillsByTheme`: Same pattern (FTS5 JOIN path).

`searchBills` FTS5 path (pageSql): Change `SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.floor_sponsor_id, b.vote_result, b.vote_date`
→ add `b.full_text` after `b.vote_date`

`searchBills` direct path (pageSql): Change `SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date`
→ add `full_text` after `vote_date`

### `writeBills` UPDATE

INSERT column list: add `full_text` after `vote_date`
INSERT values: add `?` for `full_text` after `vote_date` bind
Bind: add `bill.fullText !== undefined ? stripHtml(bill.fullText) : null` after the `voteDate` bind

```typescript
`INSERT OR REPLACE INTO bills
  (id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date, full_text, cached_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
```

### `getBillsBySession` Update (utah-legislature.ts)

Current code (lines 181-192):
```typescript
bills.push({
  id: detail.id,
  session: detail.session,
  title: detail.title,
  summary: detail.summary,
  status: detail.status,
  sponsorId: detail.sponsorId,
  ...(detail.floorSponsorId !== undefined && { floorSponsorId: detail.floorSponsorId }),
  ...(detail.voteResult !== undefined && { voteResult: detail.voteResult }),
  ...(detail.voteDate !== undefined && { voteDate: detail.voteDate }),
})
```

Add one line after `voteDate`:
```typescript
...(detail.fullText !== undefined && { fullText: detail.fullText }),
```

### Why `search-bills.ts` Needs No Change

The tool returns `JSON.stringify(result)` where `result.bills` is `Bill[]`. Once `rowToBill` includes `fullText`, it flows through automatically. No change to `search-bills.ts`.

### FTS5 Search Impact

Adding `full_text` to `bill_fts` means `searchBills({ query: 'property tax' })` now matches against the `highlightedProvisions` text in addition to `title` and `summary`. This improves keyword search quality — a bill that mentions "property tax" in its specific statutory change description (but not in the one-paragraph summary) will now surface.

### Testing Approach

**`bills.test.ts` — add within the existing `describe('bills cache', ...)` block:**

```typescript
describe('fullText storage and retrieval', () => {
  it('stores and returns fullText when bill has fullText', async () => {
    await writeBills(env.DB, [makeBill({ fullText: 'Amends Section 53G-7-218 to require...' })])
    const result = await getBillsBySponsor(env.DB, 'leg-001')
    expect(result[0]?.fullText).toBe('Amends Section 53G-7-218 to require...')
  })

  it('returns fullText as undefined when bill has no fullText', async () => {
    await writeBills(env.DB, [makeBill()])
    const result = await getBillsBySponsor(env.DB, 'leg-001')
    expect(result[0]?.fullText).toBeUndefined()
  })

  it('strips HTML tags from fullText before storing', async () => {
    await writeBills(env.DB, [makeBill({ fullText: '<b>Amends</b> Section 53G-7-218' })])
    const result = await getBillsBySponsor(env.DB, 'leg-001')
    expect(result[0]?.fullText).toBe('Amends Section 53G-7-218')
  })

  it('FTS5 query matches content only in fullText — bill surfaces in search results', async () => {
    await writeBills(env.DB, [makeBill({
      title: 'School Funding Act',
      summary: 'General school funding amendments',
      fullText: 'uniqueprovisionterm that appears nowhere else',
    })])
    const result = await searchBills(env.DB, { query: 'uniqueprovisionterm' })
    expect(result.total).toBe(1)
    expect(result.bills[0]?.id).toBe('HB0001')
  })
})
```

**`utah-legislature.test.ts` — add within the existing `describe('getBillsBySession', ...)` block:**

```typescript
it('includes fullText on returned Bill when API provides highlightedProvisions', async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0001', trackingID: 'TUBFCRPIYI' }]) })
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetailResponse) })

  const promise = provider.getBillsBySession('2026GS')
  await vi.runAllTimersAsync()
  const result = await promise

  expect(result).toHaveLength(1)
  expect(result[0]?.fullText).toBe('This bill amends weighted pupil unit provisions...')
})

it('omits fullText (property absent) when API lacks highlightedProvisions', async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ number: 'HB0002', trackingID: 'BKSTYLLAEC' }]) })
    .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockBillDetail2Response) })

  const promise = provider.getBillsBySession('2026GS')
  await vi.runAllTimersAsync()
  const result = await promise

  expect(result).toHaveLength(1)
  expect('fullText' in (result[0] ?? {})).toBe(false)
})
```

### Key Architectural Rules

- `console.log` FORBIDDEN in `apps/mcp-server/` — not relevant to this change
- `better-sqlite3` imports confined to `apps/mcp-server/src/cache/` — not applicable (using D1)
- All shared types in `packages/types/` only — `Bill` interface lives there correctly
- `exactOptionalPropertyTypes: true` — null in DB must become `undefined` (not null) in returned `Bill`

### References

- Research source: [`_bmad-output/planning-artifacts/research/technical-chatgpt-apps-on-record-research-2026-04-18.md`] — Track 2: Store and Surface `highlightedProvisions`, E5-z story entry in Implementation Sequencing table
- Previous story (4.9): [`_bmad-output/implementation-artifacts/4-9-bill-url-computed-field.md`]
- `Bill` interface: [`packages/types/index.ts` lines 20–32]
- `BillDetail` interface: [`packages/types/index.ts` lines 34–39]
- `BillRow` and `rowToBill`: [`apps/mcp-server/src/cache/bills.ts` lines 9–42]
- `writeBills`: [`apps/mcp-server/src/cache/bills.ts` lines 285–318]
- `getBillsBySession` (provider): [`apps/mcp-server/src/providers/utah-legislature.ts` lines 159–202]
- Current schema: [`apps/mcp-server/migrations/001-initial-schema.sql`]
- `SCHEMA_SQL`: [`apps/mcp-server/src/cache/schema.ts`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(none yet)

### Completion Notes List

- `fullText` flows automatically into `search_bills` tool responses via `rowToBill()` — no changes needed to `search-bills.ts` or its tests.
- HTML stripping is applied in `writeBills()` before storing to D1; uses regex-based `stripHtml()` helper (no external library needed in Workers).
- E5-z-spike findings: `highlightedProvisions` is plain text per existing test mock at `utah-legislature.test.ts:49` and the `getBillDetail` test at line 516. HTML stripping is applied defensively since API docs don't specify format.
- FTS5 table DROP/CREATE/REBUILD pattern works: the content table approach means no bill data is stored in `bill_fts` itself — the rebuild reads from `bills`.
- `migration/002-add-full-text-to-bills.sql` created for production D1 deployment; `001-initial-schema.sql` and `schema.ts` updated for fresh installs and tests.
- All 210 tests pass. 6 new tests added: 4 in `bills.test.ts` (fullText round-trip, null handling, HTML stripping, FTS5 search) and 2 in `utah-legislature.test.ts` (fullText propagation present/absent).
- Post-review patches (2026-04-26): added `normalizeFullText` helper to collapse empty/whitespace/pure-tag inputs to NULL; tightened `stripHtml` regex (`/<\/?[a-zA-Z][^>]*>/g`) so plain-text inequalities survive; added entity-decoding pass; wrapped `bill_fts` rebuild in try/catch so a stale-index failure doesn't reject the whole `writeBills` call. Critical fix: `warmUpBillsCache` (the cron path in `refresh.ts`) now propagates `fullText` from `BillDetail` to the written `Bill` — previous behavior wrote NULL on every refresh, breaking the story's deliverable in production despite all ACs literally passing. Migration 002 header now documents post-deploy verification (count parity check) for D1 timeouts.

## File List

- `packages/types/index.ts` — added `fullText?: string` to `Bill` interface; removed from `BillDetail` (inherited)
- `apps/mcp-server/migrations/001-initial-schema.sql` — added `full_text TEXT` to `bills` table; added `full_text` to `bill_fts` FTS5 definition
- `apps/mcp-server/migrations/002-add-full-text-to-bills.sql` — **new file**: production D1 migration (ALTER TABLE + DROP/CREATE FTS5 + REBUILD); post-review: header documents post-deploy count-parity verification
- `apps/mcp-server/src/cache/schema.ts` — updated `SCHEMA_SQL` identically to `001-initial-schema.sql`
- `apps/mcp-server/src/cache/bills.ts` — added `full_text` to `BillRow`; added `stripHtml()` helper; updated `rowToBill()`, `getBillsBySponsor()`, `getBillsBySession()`, `searchBillsByTheme()`, `searchBills()` (both paths), `writeBills()`. Post-review: tightened `stripHtml` regex + added entity-decoding pass; introduced `normalizeFullText` helper (used in `writeBills` bind); imported `logger` and wrapped `bill_fts` rebuild in try/catch
- `apps/mcp-server/src/providers/utah-legislature.ts` — added `fullText` propagation in `getBillsBySession()`
- `apps/mcp-server/src/cache/refresh.ts` — **post-review (CRITICAL fix):** added `fullText` spread in the `BillDetail` → `Bill` mapping inside `warmUpBillsCache`, so the cron refresh actually persists the new field
- `apps/mcp-server/src/cache/bills.test.ts` — added `describe('fullText storage and retrieval', ...)` with 4 tests; post-review: FTS5 test gained a control bill; added tests for non-tag angle-bracket preservation, entity decoding, empty-string input, and pure-tag/whitespace input
- `apps/mcp-server/src/cache/refresh.test.ts` — **post-review:** new test asserts `warmUpBillsCache` writes `full_text` to the `bills` row when `BillDetail.fullText` is provided
- `apps/mcp-server/src/providers/utah-legislature.test.ts` — added 2 fullText propagation tests to `getBillsBySession` block
- `_bmad-output/implementation-artifacts/4-10-highlighted-provisions-full-text.md` (this file — story tracking)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status)

## Change Log

- 2026-04-26: Story created from E5-z entry in ChatGPT Apps research (technical-chatgpt-apps-on-record-research-2026-04-18.md). E5-z-spike incorporated inline: format is plain text per existing test mock at utah-legislature.test.ts:49; HTML stripping applied defensively.
- 2026-04-26: Implementation complete. All 210 tests pass. Story status set to review.
- 2026-04-26: Branch rebased on main (PR 30 had landed with logger / AbortController refactors that were stale on this branch). Apparent scope creep in initial review collapsed.
- 2026-04-26: Code review complete. 6 patches applied (CRITICAL `warmUpBillsCache` fullText propagation + 5 others), 5 deferred items recorded. 215 tests pass. Story status set to done.
