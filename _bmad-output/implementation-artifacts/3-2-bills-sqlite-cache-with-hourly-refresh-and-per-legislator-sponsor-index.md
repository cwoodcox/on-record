# Story 3.2: Bills SQLite Cache with Hourly Refresh and Per-Legislator Sponsor Index

Status: review

## Story

As a **developer**,
I want bills cached in SQLite with an hourly refresh and a per-legislator sponsor index rebuilt on each refresh,
so that bill searches return in under 1 second and upstream API calls don't scale with user load.

## Acceptance Criteria

1. **Given** the server starts, **when** startup completes, **then** the bills cache is warm (bills written to SQLite `bills` table) before the server begins accepting connections (NFR17 — stale served during outage)
2. **Given** the bills cache is populated, **when** any bill lookup is requested, **then** it is served from SQLite cache and completes in under 1 second (NFR3)
3. **Given** the bills cache is running, **when** the hourly cron fires (`0 * * * *`), **then** `getBillsBySession` is called exactly once and results overwrite the previous cache — within the ≤1×/hour rate limit
4. **Given** a cache refresh completes, **when** bills are written to SQLite, **then** the FTS5 `bill_fts` virtual table is rebuilt (`INSERT INTO bill_fts(bill_fts) VALUES('rebuild')`) so full-text search (Story 3.3) has consistent data
5. **Given** a cache refresh completes, **when** bills are written to SQLite, **then** the `idx_bills_sponsor_id` B-tree index is automatically updated — enabling `getBillsBySponsor(sponsorId)` to return results in under 2 seconds (FR11)
6. **Given** the Utah Legislature API is unavailable, **when** a refresh attempt fails, **then** stale data continues to be served (NFR17) and the error is logged with `source: 'legislature-api'`
7. **Given** concurrent users, **when** multiple tool calls arrive simultaneously, **then** all are served from the SQLite cache — upstream API call volume does not increase with user concurrency (NFR10)
8. **Given** the codebase, **when** a developer searches for `better-sqlite3` imports, **then** they only appear inside `apps/mcp-server/src/cache/` (Boundary 4 enforced)
9. **Given** the codebase, **when** a developer searches for writes to the `bills` or `bill_fts` tables, **then** only `cache/bills.ts` contains them
10. `pnpm --filter mcp-server typecheck` exits 0
11. `pnpm --filter mcp-server test` exits 0 (all existing tests continue passing)
12. `pnpm --filter mcp-server lint` exits 0

## Tasks / Subtasks

- [x] Task 1: Create `apps/mcp-server/src/cache/bills.ts` (AC: 1, 2, 4, 5, 8, 9)
  - [x] Implement `writeBills(db: Database.Database, bills: Bill[]): void`
    - [x] INSERT OR REPLACE all bills into the `bills` table with `cached_at` set to current ISO 8601 datetime
    - [x] Wrap all writes + FTS5 rebuild in a single `db.transaction()()` call for atomicity
    - [x] After bulk write, run `db.exec("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')")` to sync FTS5 content table
    - [x] Map `Bill.sponsorId` to `sponsor_id` column (camelCase → snake_case in cache layer only)
    - [x] Map `Bill.voteResult` / `Bill.voteDate` to `vote_result` / `vote_date` — store as `null` when `undefined` (SQLite NULL)
    - [x] No-op (return early) when `bills` array is empty — but still handle gracefully without FTS5 rebuild
  - [x] Implement `getBillsBySponsor(sponsorId: string): Bill[]` using the db singleton (same pattern as `getLegislatorsByDistrict`)
    - [x] Query: `SELECT * FROM bills WHERE sponsor_id = ?` — uses `idx_bills_sponsor_id` automatically
    - [x] Map `snake_case` columns back to `camelCase` `Bill` fields
    - [x] `vote_result` / `vote_date` as `null` in DB → `undefined` (not `null`) in returned `Bill`
  - [x] Implement `getBillsBySession(session: string): Bill[]` using the db singleton
    - [x] Query: `SELECT * FROM bills WHERE session = ?` — uses `idx_bills_session` automatically
    - [x] Same column→field mapping as `getBillsBySponsor`
  - [x] Implement `getActiveSession(): string` — minimal helper for Story 3.2 warm-up
    - [x] Mirror the logic in `providers/utah-legislature.ts`'s private `getCurrentSession()`: if `now.getMonth() < 3`, return `${year}GS`; else return `${year - 1}GS`
    - [x] Add JSDoc noting this is a stub — Story 3.4 replaces with full inter-session logic
  - [x] No barrel file — no `index.ts` in `cache/`

- [x] Task 2: Create `apps/mcp-server/src/cache/bills.test.ts` (AC: 2, 4, 5, 10, 11)
  - [x] Use in-memory SQLite + `vi.mock('./db.js', () => ({ db: testDb }))` for singleton injection (same pattern as `legislators.test.ts`)
  - [x] `writeBills` tests:
    - [x] Inserts bills into the `bills` table
    - [x] Upserts by primary key — no duplicate rows on second call with same ids
    - [x] Replaces existing row on upsert — updated `title` is reflected
    - [x] Sets `cached_at` to a non-empty ISO 8601 string
    - [x] Stores `NULL` for `vote_result`/`vote_date` when `Bill` fields are `undefined`
    - [x] Stores values for `vote_result`/`vote_date` when present
    - [x] Inserts multiple bills in one call
    - [x] Is a no-op when passed empty array (does not throw)
    - [x] Rebuilds FTS5 — after `writeBills`, `SELECT count(*) FROM bill_fts` (or FTS5 match query) returns consistent results
  - [x] `getBillsBySponsor` tests:
    - [x] Returns empty array when no bills cached (cache miss)
    - [x] Returns bills matching `sponsorId`
    - [x] Does not return bills with a different `sponsorId`
    - [x] Maps `snake_case` DB columns to `camelCase` `Bill` fields (round-trip test)
    - [x] `vote_result = NULL` in DB → `voteResult` is `undefined` (not `null`) in returned `Bill`
    - [x] `vote_result = 'Passed'` in DB → `voteResult: 'Passed'` in returned `Bill`
  - [x] `getBillsBySession` tests:
    - [x] Returns empty array when no bills cached
    - [x] Returns all bills for the session
    - [x] Does not return bills from a different session
  - [x] All test describe blocks named descriptively (`'bills cache'`, `'writeBills'`, `'getBillsBySponsor'`, `'getBillsBySession'`)

- [x] Task 3: Extend `apps/mcp-server/src/cache/refresh.ts` (AC: 1, 3, 6)
  - [x] Import `writeBills, getActiveSession` from `./bills.js`
  - [x] Add `warmUpBillsCache(db: Database.Database, provider: LegislatureDataProvider): Promise<void>`
    - [x] Call `getActiveSession()` to determine the session string
    - [x] Call `provider.getBillsBySession(session)` to get the full hydrated `Bill[]`
    - [x] Call `writeBills(db, bills)` to persist
    - [x] Propagates errors from the provider — caller (`index.ts`) handles gracefully with `.catch()`
  - [x] Add `scheduleBillsRefresh(db: Database.Database, provider: LegislatureDataProvider): void`
    - [x] Cron expression: `'0 * * * *'` (top of every hour)
    - [x] Cron callback: synchronous, wraps async `warmUpBillsCache` with `.then()/.catch()` pattern (same as `scheduleLegislatorsRefresh`)
    - [x] On success: `logger.info({ source: 'cache' }, 'Bills cache refreshed')`
    - [x] On failure: `logger.error({ source: 'legislature-api', err }, 'Bills cache refresh failed')`
  - [x] Export both new functions alongside existing `warmUpLegislatorsCache` / `scheduleLegislatorsRefresh`

- [x] Task 4: Extend `apps/mcp-server/src/cache/refresh.test.ts` (AC: 3, 6, 11)
  - [x] Import `warmUpBillsCache, scheduleBillsRefresh` from `./refresh.js`
  - [x] Fixtures: add `makeBill()` helper function for test data
  - [x] `warmUpBillsCache` tests:
    - [x] Calls `provider.getBillsBySession` with the result of `getActiveSession()`
    - [x] Calls `provider.getBillsBySession` exactly once per call
    - [x] Writes returned bills into the cache (query `testDb` directly to verify)
    - [x] Resolves when provider succeeds
    - [x] Rejects (propagates) when provider rejects — error message preserved
  - [x] `scheduleBillsRefresh` tests:
    - [x] Does not throw when called
    - [x] Does not invoke provider at registration time (lazy — only fires on cron)
    - [x] Logs error with `{ source: 'legislature-api' }` when refresh fails (simulate via `.catch()` callback)
    - [x] Logs info with `{ source: 'cache' }` when refresh succeeds
  - [x] Use `vi.useFakeTimers()` in `scheduleBillsRefresh` describe block with `beforeEach/afterEach` (same as existing pattern)

- [x] Task 5: Wire bills cache in `apps/mcp-server/src/index.ts` (AC: 1, 3)
  - [x] Import `warmUpBillsCache, scheduleBillsRefresh` from `./cache/refresh.js`
  - [x] In `startServer()`, after `warmUpLegislatorsCache` + its log, add:
    ```typescript
    await warmUpBillsCache(db, provider)
    logger.info({ source: 'cache' }, 'Bills cache warm-up complete')
    ```
  - [x] In the `serve()` callback, after `scheduleLegislatorsRefresh`, add:
    ```typescript
    scheduleBillsRefresh(db, provider)
    ```
  - [x] Add a comment: `// STEP 2.8: Bills cache warm-up (Story 3.2)` above the warm-up call
  - [x] No other changes to index.ts — keep it as an orchestration-only module

- [x] Task 6: Final verification (AC: 10, 11, 12)
  - [x] `pnpm --filter mcp-server typecheck` exits 0
  - [x] `pnpm --filter mcp-server test` exits 0 (including all 115+ pre-existing tests)
  - [x] `pnpm --filter mcp-server lint` exits 0
  - [x] Confirm no `better-sqlite3` imports outside `apps/mcp-server/src/cache/`
  - [x] Confirm no `console.log` introduced anywhere in `apps/mcp-server/`
  - [x] Confirm `cache/bills.ts` is the only file with SQL writes to `bills` or `bill_fts` tables

### Review Follow-ups (AI)

- [x] [AI-Review][High] Refresh logic does not overwrite prior cache contents; stale rows remain when upstream returns fewer bills. [`apps/mcp-server/src/cache/bills.ts:105-134`, `apps/mcp-server/src/cache/refresh.ts:76-83`]
- [x] [AI-Review][High] Startup exits if bills warm-up fails, preventing stale-cache serving during outage. [`apps/mcp-server/src/index.ts:180`, `apps/mcp-server/src/index.ts:196-199`]
- [x] [AI-Review][Medium] AC9/task claim says only `cache/bills.ts` writes to `bills`/`bill_fts`, but test file also writes those tables. [`apps/mcp-server/src/cache/bills.test.ts:42`, `apps/mcp-server/src/cache/bills.test.ts:44`]
- [x] [AI-Review][Medium] `scheduleBillsRefresh` "logs error" and "logs info" tests never call `scheduleBillsRefresh` — they manually simulate the `.then()/.catch()` path; the actual scheduler wiring is untested. [`apps/mcp-server/src/cache/refresh.test.ts:342-379`]
- [x] [AI-Review][Medium] `apps/mcp-server/data/on-record.db` is not gitignored — root `.gitignore` entry `data/on-record.db` anchors to repo root, not `apps/mcp-server/data/`; confirmed via `git check-ignore`. Fix: add `**/data/*.db` to `.gitignore`. [`.gitignore`]
- [x] [AI-Review][Low] `getActiveSession()` has zero direct unit tests; the `month >= 3` branch is never exercised. [`apps/mcp-server/src/cache/bills.ts:55-59`]
- [x] [AI-Review][Low] Empty `afterEach` in `bills.test.ts` is dead code — remove it. [`apps/mcp-server/src/cache/bills.test.ts:47-51`]
- [x] [AI-Review][Low] `getBillsBySession` lacks null→undefined mapping test for `vote_result`/`vote_date`; only `getBillsBySponsor` has this coverage despite both using `rowToBill`. [`apps/mcp-server/src/cache/bills.test.ts:226-254`]
- [x] [AI-Review][Low] `SELECT *` returns `cached_at` column but `BillRow` interface omits it — type is technically inaccurate. Prefer explicit column list over `SELECT *`. [`apps/mcp-server/src/cache/bills.ts:71`, `apps/mcp-server/src/cache/bills.ts:86`]

## Dev Notes

### Scope — What Story 3.2 IS and IS NOT

**In scope:**
- `apps/mcp-server/src/cache/bills.ts` — create (write + read functions + `getActiveSession` stub)
- `apps/mcp-server/src/cache/bills.test.ts` — create (comprehensive unit tests)
- `apps/mcp-server/src/cache/refresh.ts` — extend (`warmUpBillsCache` + `scheduleBillsRefresh`)
- `apps/mcp-server/src/cache/refresh.test.ts` — extend (bills warm-up/scheduler tests)
- `apps/mcp-server/src/index.ts` — extend (wire warm-up + scheduler, STEP 2.8)

**NOT in scope:**
- `cache/bills.ts` FTS5 keyword search function (`searchBillsByTheme`) — Story 3.3
- Full inter-session logic replacing `getActiveSession()` — Story 3.4 (Story 3.4 also fixes the latent bug in `getBillDetail` using `getCurrentSession()` internally)
- `tools/bill-search.ts` MCP tool — Story 3.5
- `components/BillCard.tsx` — Story 3.6
- No changes to `providers/utah-legislature.ts` — `getBillsBySession` is already implemented (Story 3.1)
- No changes to `packages/types/index.ts` — `Bill` type is already correct
- No changes to `cache/schema.ts` — `bills` table, `bill_fts`, indexes are already defined

### Architecture Pattern: `writeBills` follows `writeLegislators` exactly

`writeLegislators` is the proven pattern for this codebase. Mirror it for `writeBills`:

```typescript
// legislators.ts pattern — bills.ts follows the same shape
export function writeLegislators(db: Database.Database, legislators: Legislator[]): void {
  if (legislators.length === 0) return

  const stmt = db.prepare<[...]>(`INSERT OR REPLACE INTO legislators (...) VALUES (?, ...)`)
  const cachedAt = new Date().toISOString()
  db.transaction(() => {
    for (const leg of legislators) { stmt.run(...) }
  })()
}

// bills.ts — same pattern + FTS5 rebuild
export function writeBills(db: Database.Database, bills: Bill[]): void {
  if (bills.length === 0) return

  const stmt = db.prepare<[...]>(`INSERT OR REPLACE INTO bills (...) VALUES (?, ...)`)
  const cachedAt = new Date().toISOString()
  db.transaction(() => {
    for (const bill of bills) { stmt.run(...) }
    db.exec("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')")
  })()
}
```

**Key difference:** `writeBills` must call the FTS5 rebuild INSIDE the transaction, after all rows are inserted. This is safe with better-sqlite3 since `db.exec()` runs synchronously.

### FTS5 Content Table: Why `rebuild` Is Required

The `bill_fts` table is a **content FTS5 table** (`content='bills'`), not a standalone FTS5 table. Content tables don't duplicate data — they read `title` and `summary` from the `bills` table. However, after bulk INSERT OR REPLACE operations, FTS5's internal inverted index becomes stale. Running:

```sql
INSERT INTO bill_fts(bill_fts) VALUES('rebuild')
```

forces FTS5 to re-scan the `bills` table and rebuild the inverted index. Without this, `MATCH` queries (Story 3.3) would return incorrect/empty results after a bulk load.

This is documented in `cache/schema.ts` lines 47–49. The `writeBills` function is the only place that triggers the rebuild.

### Per-Legislator Sponsor Index: How It Works

The architecture says "per-legislator sponsor index rebuilt on each refresh." This is implemented via SQLite's automatic B-tree index maintenance:

1. `idx_bills_sponsor_id` is defined in `schema.ts` as `CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id ON bills (sponsor_id)`
2. Every INSERT OR REPLACE automatically updates this B-tree index
3. `getBillsBySponsor(sponsorId)` queries `WHERE sponsor_id = ?` — SQLite uses `idx_bills_sponsor_id` automatically

No separate rebuild step is needed for the B-tree index — it's always consistent with the `bills` table. The "rebuild" in the acceptance criteria refers to the logical rebuild of the sponsor index data (new bills replacing old ones), not a DDL operation.

### `getActiveSession()` Stub — Scope and Known Limitation

Story 3.2 needs a session string to call `provider.getBillsBySession(session)`. A minimal helper is added to `cache/bills.ts`:

```typescript
/**
 * Returns the current legislative session identifier (e.g. '2026GS').
 * Utah General Sessions run January–March. Outside session, returns the most recent.
 *
 * STUB: Story 3.4 (inter-session bill handling) replaces this with full logic that:
 * - detects when the legislature is not in session
 * - serves up to 5 bills from the last 2 completed sessions
 * - stores session metadata in SQLite
 */
export function getActiveSession(): string {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() < 3 ? `${year}GS` : `${year - 1}GS`
}
```

This mirrors the private `getCurrentSession()` in `providers/utah-legislature.ts`. Story 3.4 will replace both. The function is exported from `cache/bills.ts` (not `cache/refresh.ts`) so Story 3.4 can find and replace it in one place.

**Known limitation inherited from Story 3.1:** `getBillDetail()` in the provider constructs its URL using `getCurrentSession()` rather than accepting the `session` parameter. This is a latent bug for inter-session scenarios (e.g., fetching 2025GS bills during the 2026 session). Story 3.4 must address this before fetching detail for past sessions.

### Column Mapping: snake_case ↔ camelCase

All `snake_case` → `camelCase` mapping is confined to `cache/bills.ts`. Never leak DB column names to tool output.

| DB column | Bill field |
|---|---|
| `id` | `id` |
| `session` | `session` |
| `title` | `title` |
| `summary` | `summary` |
| `status` | `status` |
| `sponsor_id` | `sponsorId` |
| `vote_result` | `voteResult` |
| `vote_date` | `voteDate` |

`vote_result` and `vote_date` are nullable in the DB. When reading from DB:
```typescript
// CORRECT — null → undefined (not null) for TypeScript Bill interface
voteResult: row.vote_result ?? undefined,
voteDate: row.vote_date ?? undefined,
```

When writing to DB with `exactOptionalPropertyTypes: true`:
```typescript
// CORRECT — undefined → null for SQLite (cannot pass undefined to better-sqlite3 bind param)
bill.voteResult ?? null,
bill.voteDate ?? null,
```

### `getBillsBySponsor` and `getBillsBySession` Use the DB Singleton

These functions will be called from `tools/bill-search.ts` (Story 3.5), which is in `tools/` — outside `cache/`. Per Boundary 4, `tools/` cannot import `better-sqlite3` directly. The solution (same as `getLegislatorsByDistrict` in `legislators.ts`) is to use the db singleton from `./db.js` directly inside these functions:

```typescript
import { db } from './db.js'  // singleton — used for functions called from tools/

export function getBillsBySponsor(sponsorId: string): Bill[] {
  const rows = db
    .prepare<[string], BillRow>('SELECT * FROM bills WHERE sponsor_id = ?')
    .all(sponsorId)
  return rows.map(rowToBill)
}
```

`writeBills` receives `db` as a parameter (dependency injection — called from `cache/refresh.ts` which receives db from `index.ts`). This is the same DI pattern as `writeLegislators`.

### Test Pattern for Singleton Injection (from `legislators.test.ts`)

```typescript
// Create in-memory test DB before mock registration
const testDb = new Database(':memory:')
initializeSchema(testDb)

// Inject testDb as the `db` singleton before module under test is evaluated.
vi.mock('./db.js', () => ({ db: testDb }))

// Import after mock is registered
import type { getBillsBySponsor as GetFn, writeBills as WriteFn } from './bills.js'
let getBillsBySponsor: typeof GetFn
let writeBills: typeof WriteFn

beforeAll(async () => {
  const mod = await import('./bills.js')
  getBillsBySponsor = mod.getBillsBySponsor
  writeBills = mod.writeBills
})

describe('bills cache', () => {
  beforeEach(() => {
    testDb.prepare('DELETE FROM bills').run()
    // Also clear FTS5 after each test
    testDb.prepare("INSERT INTO bill_fts(bill_fts) VALUES('delete-all')").run()
  })
  // ...
})
```

**Important:** Between tests, also reset FTS5. The simplest way is to run the `delete-all` FTS5 command:
```sql
INSERT INTO bill_fts(bill_fts) VALUES('delete-all')
```
Then after writing fresh bills in tests that need FTS5, `writeBills` triggers the rebuild.

### Cron Callback Pattern (from `scheduleLegislatorsRefresh`)

```typescript
export function scheduleBillsRefresh(
  db: Database.Database,
  provider: LegislatureDataProvider,
): void {
  schedule('0 * * * *', () => {
    warmUpBillsCache(db, provider)
      .then(() => {
        logger.info({ source: 'cache' }, 'Bills cache refreshed')
      })
      .catch((err: unknown) => {
        logger.error({ source: 'legislature-api', err }, 'Bills cache refresh failed')
      })
  })
}
```

The cron callback must NOT be `async` — `node-cron` v4 does not handle async callbacks. Async work is wrapped with `.catch()` to prevent unhandled rejections. This pattern is already established in `scheduleLegislatorsRefresh` — follow it exactly.

### `index.ts` Wiring (STEP 2.8)

The bills warm-up runs AFTER the legislators warm-up, in `startServer()`:

```typescript
// STEP 2.6: Legislators cache warm-up (Story 2.3)
const provider = new UtahLegislatureProvider()
await warmUpLegislatorsCache(db, provider)
logger.info({ source: 'cache', districtCount: 104 }, 'Legislators cache warm-up complete')

// STEP 2.8: Bills cache warm-up (Story 3.2)
await warmUpBillsCache(db, provider)
logger.info({ source: 'cache' }, 'Bills cache warm-up complete')
```

And in the `serve()` callback:

```typescript
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ source: 'app', port: info.port }, 'On Record MCP server started')
  scheduleLegislatorsRefresh(db, provider)
  scheduleBillsRefresh(db, provider)   // Story 3.2
})
```

**Performance note:** `warmUpBillsCache` calls `provider.getBillsBySession(session)` which in turn makes ~500-1000 concurrent `getBillDetail` HTTP requests (as documented in Story 3.1). This is acceptable for startup warm-up. The total startup time may be several seconds. This was established in Story 3.1 as the accepted behavior for cache population.

### `BillRow` Interface (internal to `bills.ts`)

```typescript
interface BillRow {
  id: string
  session: string
  title: string
  summary: string
  status: string
  sponsor_id: string
  vote_result: string | null
  vote_date: string | null
}
```

This internal row shape maps directly to the SQLite columns. Never expose it outside `bills.ts`.

### ESLint / TypeScript Enforcement Reminders

- `console.log` is FORBIDDEN in `apps/mcp-server/` — use `logger.info`, `logger.error` only
- `strict: true` + `exactOptionalPropertyTypes: true` — conditional spread for optional fields
- `better-sqlite3` imports only in `cache/` — ESLint enforces this via `no-restricted-imports`
- No `any`, no `@ts-ignore`
- Import paths use `.js` extensions (NodeNext resolution): `import { writeBills } from './bills.js'`
- No barrel file — no `index.ts` in `cache/` (do not create one)

### Previous Story Intelligence (Story 3.1)

Key learnings from Story 3.1 implementation:
- The `getBillsBySession` implementation uses `Promise.all` for concurrent `getBillDetail` calls — warm-up will be slow for large sessions (~500-1000 HTTP calls). This is expected and documented.
- `exactOptionalPropertyTypes: true` is enforced — use `??` nullish coalescing and conditional spread; never assign `undefined` directly to optional properties
- Test rejection patterns: attach `.rejects` assertion BEFORE `vi.runAllTimersAsync()` to avoid `PromiseRejectionHandledWarning`
- All error-path tests must assert specific `nature` and `action` string values — NOT `typeof result.nature === 'string'`
- The `voteResult` and `voteDate` fields are not confirmed to be provided by the Utah Legislature API — they may always be `undefined`
- `getBillDetail` has a latent inter-session bug (uses `getCurrentSession()` internally) — deferred to Story 3.4

### Project Structure Notes

- `apps/mcp-server/src/cache/bills.ts` — new file; co-located with `bills.test.ts`
- No barrel file in `cache/` — import directly: `import { writeBills } from './cache/bills.js'`
- Test co-location rule: `bills.test.ts` lives next to `bills.ts` in `cache/`
- `better-sqlite3` is only in `cache/` — enforced by ESLint

### References

- [Source: apps/mcp-server/src/cache/schema.ts] — `bills` table DDL, `bill_fts` FTS5 with `content='bills'`, `idx_bills_sponsor_id`, `idx_bills_session`
- [Source: apps/mcp-server/src/cache/legislators.ts] — `writeLegislators` and `getLegislatorsByDistrict` patterns to mirror
- [Source: apps/mcp-server/src/cache/legislators.test.ts] — test patterns: `vi.mock('./db.js')`, in-memory SQLite, `beforeAll` dynamic import, `beforeEach` table clear
- [Source: apps/mcp-server/src/cache/refresh.ts] — `warmUpLegislatorsCache` and `scheduleLegislatorsRefresh` patterns to follow for bills equivalents
- [Source: apps/mcp-server/src/cache/refresh.test.ts] — `makeProvider()` fixture, cron test patterns, `vi.useFakeTimers()` usage
- [Source: apps/mcp-server/src/cache/db.ts] — singleton `db` export
- [Source: apps/mcp-server/src/providers/utah-legislature.ts] — `getCurrentSession()` logic to mirror in `getActiveSession()`; `getBillsBySession` implementation
- [Source: apps/mcp-server/src/index.ts] — `startServer()` startup sequence, `serve()` callback, STEP numbering convention
- [Source: packages/types/index.ts] — `Bill`, `BillDetail` type shapes; `sponsorId` is `camelCase` in interface
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — bills table schema, refresh strategy, per-legislator sponsor index definition, FTS5 content table
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — mock at `LegislatureDataProvider` boundary; never import SQLite in tests directly
- [Source: _bmad-output/implementation-artifacts/3-1-utah-legislature-api-integration-bills-by-session.md] — Story 3.1 completion notes, known limitation about `getCurrentSession()`, test patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed `exactOptionalPropertyTypes` errors in `bills.test.ts`: cannot pass `voteResult: undefined` or `voteDate: undefined` as explicit `Partial<Bill>` overrides — omit the properties instead, since `makeBill()` leaves them absent by default.

### Completion Notes List

- Created `cache/bills.ts` mirroring the `legislators.ts` pattern: `writeBills` (DI), `getBillsBySponsor`/`getBillsBySession` (singleton), `getActiveSession` stub.
- `writeBills` wraps INSERT OR REPLACE + FTS5 rebuild in a single `db.transaction()()` for atomicity.
- `null → undefined` mapping for `vote_result`/`vote_date` uses conditional assignment (not `??`) to satisfy `exactOptionalPropertyTypes`.
- Created `cache/bills.test.ts` with 18 tests covering all specified scenarios (writeBills, getBillsBySponsor, getBillsBySession).
- Extended `refresh.ts` with `warmUpBillsCache` and `scheduleBillsRefresh` following the legislators pattern exactly (sync cron callback, `.then()/.catch()` pattern).
- Extended `refresh.test.ts` with 9 new tests (5 for warmUpBillsCache, 4 for scheduleBillsRefresh).
- Wired STEP 2.8 into `index.ts`: warm-up before `serve()`, scheduler inside `serve()` callback.
- Final: 142 tests passing (18 new), typecheck 0, lint 0. No better-sqlite3 outside cache/, no console.log introduced.
- ✅ Resolved review finding [High]: Added `DELETE FROM bills WHERE session = ?` inside `writeBills` transaction before INSERT loop — stale rows are now cleared when upstream returns fewer bills (AC3 overwrite semantics). Added regression test.
- ✅ Resolved review finding [High]: Wrapped `warmUpBillsCache` in try/catch in `index.ts` startServer() — failure logs `source: 'legislature-api'` error but server continues to start (NFR17 stale-cache serving preserved).
- ✅ Resolved review finding [Medium] (AC9): AC9 intent is production code boundary enforcement — `cache/bills.ts` is the only production file writing to `bills`/`bill_fts`. Test file writes are legitimate test setup (in-memory testDb, not production db). No code change required; acknowledged.
- ✅ Resolved review finding [Medium]: Replaced `scheduleBillsRefresh` "logs error" and "logs info" tests — now mock `node-cron`'s `schedule` with `vi.mock`, capture the registered callback, invoke it directly to exercise the actual scheduler wiring.
- ✅ Resolved review finding [Medium]: Replaced `data/on-record.db` in `.gitignore` with `**/data/*.db` pattern — confirmed via `git check-ignore` that `apps/mcp-server/data/on-record.db` is now matched.
- ✅ Resolved review finding [Low]: Added `describe('getActiveSession', ...)` in `bills.test.ts` with tests for both branches (month < 3 → currentYearGS, month >= 3 → priorYearGS) using `vi.setSystemTime`.
- ✅ Resolved review finding [Low]: Removed empty `afterEach` dead code from `bills.test.ts`.
- ✅ Resolved review finding [Low]: Added `getBillsBySession` null→undefined mapping test for `vote_result`/`vote_date`.
- ✅ Resolved review finding [Low]: Replaced `SELECT *` with explicit column lists in `getBillsBySponsor` and `getBillsBySession` — `BillRow` interface now accurately describes the projected columns.
- Review continuation final: 146 tests passing (4 new), typecheck 0, lint 0.

### File List

- apps/mcp-server/src/cache/bills.ts (new)
- apps/mcp-server/src/cache/bills.test.ts (new)
- apps/mcp-server/src/cache/refresh.ts (modified)
- apps/mcp-server/src/cache/refresh.test.ts (modified)
- apps/mcp-server/src/index.ts (modified)
- .gitignore (modified)
- _bmad-output/implementation-artifacts/3-2-bills-sqlite-cache-with-hourly-refresh-and-per-legislator-sponsor-index.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

### Senior Developer Review (AI)

- Outcome: Changes Requested
- Summary: 2 High and 1 Medium issue found; action items added under "Review Follow-ups (AI)".
- Git vs Story File List: No discrepancies for story scope.
- Acceptance Criteria impact:
  - AC3 not fully met (`overwrite previous cache` behavior missing).
  - NFR17 behavior at startup not fully met for bills warm-up failure path.
  - AC9 verification claim is inaccurate due writes in test code.

## Change Log

- 2026-03-04: Implemented Story 3.2 — created `cache/bills.ts` (writeBills, getBillsBySponsor, getBillsBySession, getActiveSession), comprehensive test suite, extended refresh.ts/refresh.test.ts with bills warm-up and hourly scheduler, wired STEP 2.8 in index.ts. 142 tests passing.
- 2026-03-05: Senior developer adversarial review completed; added 3 AI review follow-up items and moved status back to in-progress.
- 2026-03-04: Addressed code review findings — 9 items resolved (2 High, 3 Medium, 4 Low). Key fixes: writeBills now deletes prior session rows before insert (AC3 overwrite semantics); bills warm-up wrapped in try/catch so server starts on failure (NFR17); node-cron mocked in scheduler tests to exercise actual wiring; .gitignore updated with **/data/*.db; getActiveSession unit tested (both branches); SELECT * replaced with explicit column lists; stale empty afterEach removed; getBillsBySession null→undefined mapping test added. 146 tests passing.
