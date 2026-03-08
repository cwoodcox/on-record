# Story 3.4: Inter-Session Bill Handling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **constituent**,
I want to find relevant bills from past sessions when the legislature is not currently in session,
so that I can compose a meaningful message year-round — not just during the January–March session window.

## Acceptance Criteria

1. **Given** the Utah Legislature is not in active session, **when** `warmUpBillsCache` runs, **then** it fetches bills for the 2 most recently completed sessions (FR9), not just the current year's session
2. **Given** the Utah Legislature IS in active session, **when** `warmUpBillsCache` runs, **then** it fetches bills for only the active session (existing behavior preserved)
3. **Given** the `sessions` table is seeded, **when** `isInSession()` is called, **then** it returns `true` if today's date falls within any session's `start_date`–`end_date` range — without hardcoded Jan–Mar comparison
4. **Given** the `sessions` table is seeded, **when** `getActiveSession()` is called during an active session, **then** it returns the active session ID (e.g. `'2026GS'`)
5. **Given** the `sessions` table is seeded, **when** `getActiveSession()` is called during an inter-session period, **then** it returns the most recently completed session ID (e.g. `'2025GS'` when in summer 2025)
6. **Given** the `sessions` table is seeded, **when** `getSessionsForRefresh()` is called during active session, **then** it returns `['<active_session_id>']`
7. **Given** the `sessions` table is seeded, **when** `getSessionsForRefresh()` is called during inter-session, **then** it returns the 2 most recently completed session IDs in descending order (e.g. `['2025GS', '2024GS']`)
8. **Given** the `sessions` table has no data, **when** any session query function is called, **then** it falls back to calendar-based computation (Jan–Mar = current year, otherwise prior year)
9. **Given** `seedSessions(db)` is called on a db that already has session rows, **then** it is idempotent — no error, no duplicate rows (`INSERT OR IGNORE`)
10. **Given** the server starts, **when** `initializeSchema(db)` runs, **then** the `sessions` table is created if it does not exist; and `seedSessions(db)` runs immediately after to populate it
11. `pnpm --filter mcp-server typecheck` exits 0
12. `pnpm --filter mcp-server test` exits 0 (all 162 pre-existing tests still pass; new sessions.test.ts tests added)
13. `pnpm --filter mcp-server lint` exits 0
14. **Given** the codebase, **when** a developer searches for `better-sqlite3` imports, **then** they only appear inside `apps/mcp-server/src/cache/` (Boundary 4 enforced)
15. No `console.log` introduced anywhere in `apps/mcp-server/`

## Tasks / Subtasks

- [ ] Task 1: Add `sessions` table to `apps/mcp-server/src/cache/schema.ts` (AC: 3, 4, 5, 9, 10)
  - [ ] Add `CREATE TABLE IF NOT EXISTS sessions` DDL inside the existing `initializeSchema` transaction (after bills table, before events table)
  - [ ] Columns: `id TEXT PRIMARY KEY`, `year INTEGER NOT NULL`, `type TEXT NOT NULL`, `start_date TEXT NOT NULL`, `end_date TEXT NOT NULL`
  - [ ] Add index `idx_sessions_start_end` on `(start_date, end_date)` — supports efficient date-range queries
  - [ ] Comment: "Stores known Utah legislative session metadata. Seeded at startup by cache/sessions.ts."

- [ ] Task 2: Create `apps/mcp-server/src/cache/sessions.ts` (AC: 3–10, 14)
  - [ ] Define `UTAH_GENERAL_SESSIONS` constant (internal, not exported) — array of `{ id, year, type, start_date, end_date }` for 2023GS through 2028GS (see Dev Notes for dates and how to verify)
  - [ ] Implement `export function seedSessions(db: Database.Database): void`
    - [ ] `INSERT OR IGNORE INTO sessions (id, year, type, start_date, end_date) VALUES (?, ?, ?, ?, ?)`
    - [ ] Wrap in `db.transaction()` for atomicity
    - [ ] Receives `db` as param (dependency injection — same pattern as `writeBills`)
  - [ ] Implement `export function isInSession(db: Database.Database, now?: Date): boolean`
    - [ ] `const today = (now ?? new Date()).toISOString().slice(0, 10)` — JS Date controls "now" for testability
    - [ ] Query: `SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`
    - [ ] Returns `row !== undefined`
    - [ ] Falls back to calendar if sessions table empty: `(now ?? new Date()).getMonth() < 3`
  - [ ] Implement `export function getActiveSession(db: Database.Database, now?: Date): string`
    - [ ] First: check for active session (same WHERE as isInSession)
    - [ ] If active: return `row.id`
    - [ ] If not active: `SELECT id FROM sessions WHERE end_date < ? ORDER BY end_date DESC LIMIT 1` using today string
    - [ ] Fallback if no rows: calendar-based computation (January–March = `${year}GS`, else `${year-1}GS`)
  - [ ] Implement `export function getSessionsForRefresh(db: Database.Database, now?: Date): string[]`
    - [ ] If `isInSession(db, now)`: return `[getActiveSession(db, now)]`
    - [ ] Else: `SELECT id FROM sessions WHERE end_date < ? ORDER BY end_date DESC LIMIT 2` — return `rows.map(r => r.id)`
    - [ ] Fallback if no rows: return `[getActiveSession(db, now)]` (calendar fallback)
  - [ ] Use `db` parameter throughout — do NOT import the singleton (these functions receive db via injection from refresh.ts and index.ts)

- [ ] Task 3: Create `apps/mcp-server/src/cache/sessions.test.ts` (AC: 3–10, 12)
  - [ ] Create in-memory testDb with `initializeSchema` + `seedSessions` in `beforeAll`
  - [ ] `vi.mock('./db.js', ...)` is NOT needed — all functions receive db as parameter (no singleton)
  - [ ] Use `vi.useFakeTimers()` + `vi.setSystemTime(new Date(...))` is also NOT needed — pass explicit `now` param
  - [ ] Test `seedSessions`:
    - [ ] `'seeds known session records — sessions table has rows after seed'` — call seedSessions, count rows > 0
    - [ ] `'is idempotent — calling twice does not duplicate rows'` — call seedSessions twice, row count unchanged
    - [ ] `'seeds at least 2026GS and 2025GS'` — check both IDs exist
  - [ ] Test `isInSession`:
    - [ ] `'returns true when now falls within a session start/end range'` — pass `now = new Date('2026-02-15')` (mid-February)
    - [ ] `'returns false when now is before session start'` — pass `now = new Date('2026-01-01')` (before 2026GS start)
    - [ ] `'returns false when now is after session end'` — pass `now = new Date('2026-04-01')` (after 2026GS end)
    - [ ] `'falls back to calendar when sessions table empty'` — use fresh in-memory db without seed; mid-February → true
  - [ ] Test `getActiveSession`:
    - [ ] `'returns active session id when in session'` — now = 2026-02-15 → '2026GS'
    - [ ] `'returns most recent completed session when inter-session'` — now = 2026-06-15 → '2026GS' (2026GS ended in March, so it's completed by June)
    - [ ] `'falls back to calendar when sessions table empty'` — fresh db, now = 2025-02-15 → '2025GS' (in session)
    - [ ] `'falls back to calendar when sessions table empty — inter-session'` — fresh db, now = 2025-07-15 → '2025GS' (month >= 3, so prior year - wait, July 2025 → prior year = 2024 is WRONG: month >= 3 means use `year - 1` = 2024. But actually, in 2025 July, we want 2025GS since it ended in March 2025. The calendar fallback is `year - 1` = 2024GS. The DB-backed version would return 2025GS since it's the most recent completed session. This distinction is the WHOLE POINT of the story — the calendar fallback is a stub.)
  - [ ] Test `getSessionsForRefresh`:
    - [ ] `'returns array with only active session when in session'` — now = 2026-02-15 → `['2026GS']`
    - [ ] `'returns 2 most recent completed sessions when inter-session'` — now = 2026-06-15 → `['2026GS', '2025GS']` (most recent first)
    - [ ] `'falls back to single session when table empty'` — fresh db, any date

- [ ] Task 4: Update `apps/mcp-server/src/cache/bills.ts` (AC: 14)
  - [ ] Remove the `getActiveSession()` stub entirely (lines 46–58 in current file)
  - [ ] Remove the JSDoc comment block for the stub
  - [ ] No import of sessions.ts — `bills.ts` does not need to know about sessions
  - [ ] All other functions (`getBillsBySponsor`, `getBillsBySession`, `searchBillsByTheme`, `writeBills`, `BillRow` interface, `rowToBill`) remain unchanged

- [ ] Task 5: Update `apps/mcp-server/src/cache/bills.test.ts` (AC: 12)
  - [ ] Remove `getActiveSession as GetActiveSessionFn` from the `import type` block
  - [ ] Remove `let getActiveSession: typeof GetActiveSessionFn` variable declaration
  - [ ] Remove `getActiveSession = mod.getActiveSession` line in `beforeAll`
  - [ ] Remove the entire `describe('getActiveSession', ...)` block (2 tests)
  - [ ] Update file header comment: remove "getActiveSession" from the test list
  - [ ] Total tests expected: 162 − 2 = 160 (pre-existing tests after removal; sessions.test.ts adds new ones)

- [ ] Task 6: Update `apps/mcp-server/src/cache/refresh.ts` (AC: 1, 2)
  - [ ] Replace `import { writeBills, getActiveSession } from './bills.js'` with:
    - `import { writeBills } from './bills.js'`
    - `import { getSessionsForRefresh } from './sessions.js'`
  - [ ] Update `warmUpBillsCache(db, provider)`:
    - [ ] Call `const sessions = getSessionsForRefresh(db)` (pass injected db)
    - [ ] `const allBills = await Promise.all(sessions.map(s => provider.getBillsBySession(s)))`
    - [ ] `writeBills(db, allBills.flat())`
    - [ ] Log: `logger.info({ source: 'cache', sessions }, 'Bills cache refreshed')` — include sessions in the log for observability
  - [ ] `scheduleBillsRefresh` function is unchanged in structure (it still calls `warmUpBillsCache`)

- [ ] Task 7: Update `apps/mcp-server/src/cache/refresh.test.ts` (AC: 1, 2, 12)
  - [ ] In the `warmUpBillsCache` describe block's `beforeEach`, add `seedSessions(testDb)` call after `initializeSchema(testDb)`
  - [ ] Add `import { seedSessions } from './sessions.js'` at top
  - [ ] Update test `'calls provider.getBillsBySession with the result of getActiveSession()'`:
    - [ ] Current `vi.setSystemTime(new Date(2026, 1, 15))` is February 2026 — mid-session — so sessions table will have 2026GS active
    - [ ] Rename to `'calls provider.getBillsBySession for active session when in session'`
    - [ ] Expect: `provider.getBillsBySession` called once with `'2026GS'`
  - [ ] Add new test `'calls provider.getBillsBySession for 2 sessions when inter-session'`:
    - [ ] Set `vi.setSystemTime(new Date(2026, 5, 15))` — June 2026 (inter-session)
    - [ ] Expect: `provider.getBillsBySession` called twice — with `'2026GS'` and `'2025GS'`
  - [ ] Update test `'calls provider.getBillsBySession exactly once per call'` → keep if in-session; add inter-session variant expects 2 calls
  - [ ] Update `scheduleBillsRefresh` tests if needed (minimal changes — these test error/success logging, not session selection)
  - [ ] **Important**: The `vi.setSystemTime` fake date must be set BEFORE `seedSessions(testDb)` is called... actually `seedSessions` doesn't use the clock — it only writes static data. So order doesn't matter for seeding. The clock matters for `getSessionsForRefresh(db)` which reads from the table.
  - [ ] Note: In `refresh.test.ts`, the `warmUpBillsCache` describe already has `vi.setSystemTime(new Date(2026, 1, 15))` in `beforeEach`. This is February 2026 (in-session). Tests that need inter-session behavior should override with a different date.

- [ ] Task 8: Update `apps/mcp-server/src/index.ts` (AC: 10)
  - [ ] Import `seedSessions` from `./cache/sessions.js`
  - [ ] After `initializeSchema(db)` and before the logger.info line, add: `seedSessions(db)`
  - [ ] Add log: `logger.info({ source: 'cache' }, 'Sessions seeded')`

- [ ] Task 9: Final verification (AC: 11, 12, 13, 14, 15)
  - [ ] `pnpm --filter mcp-server typecheck` exits 0
  - [ ] `pnpm --filter mcp-server test` exits 0 — all 162 tests still pass + new sessions tests
  - [ ] `pnpm --filter mcp-server lint` exits 0
  - [ ] Confirm no `better-sqlite3` imports outside `apps/mcp-server/src/cache/`
  - [ ] Confirm no `console.log` introduced

## Dev Notes

### Scope — What Story 3.4 IS and IS NOT

**In scope:**
- `apps/mcp-server/src/cache/schema.ts` — extend: add `sessions` table DDL
- `apps/mcp-server/src/cache/sessions.ts` — CREATE NEW: seed + session query functions
- `apps/mcp-server/src/cache/sessions.test.ts` — CREATE NEW: full test coverage
- `apps/mcp-server/src/cache/bills.ts` — remove: delete the `getActiveSession()` stub
- `apps/mcp-server/src/cache/bills.test.ts` — update: remove `getActiveSession` tests
- `apps/mcp-server/src/cache/refresh.ts` — update: multi-session refresh logic
- `apps/mcp-server/src/cache/refresh.test.ts` — update: seed sessions, add inter-session tests
- `apps/mcp-server/src/index.ts` — update: call `seedSessions(db)` at startup

**NOT in scope:**
- `tools/search-bills.ts` MCP tool — Story 3.5 (applies the 5-bill limit at the tool response layer)
- `components/BillCard.tsx` / `CitationTag.tsx` — Story 3.6
- `searchBillsByTheme` in bills.ts — unchanged (already queries across all cached sessions)
- `packages/types/` — no changes; `Bill.session` field already present
- `SearchBillsResult.session` formatting — Story 3.5 constructs this from the bills returned

### Session Table Design

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,   -- e.g. '2026GS'
  year       INTEGER NOT NULL,      -- e.g. 2026
  type       TEXT    NOT NULL,      -- 'GS' = General Session
  start_date TEXT    NOT NULL,      -- ISO 8601 date: 'YYYY-MM-DD'
  end_date   TEXT    NOT NULL       -- ISO 8601 date: 'YYYY-MM-DD'
)
```

**Why no `is_active` column**: Active/inactive is computed dynamically from today's date vs start/end range. Storing it as a column would require updates and could become stale. Pure date-range comparison is always correct.

**Why `start_date <= ? AND ? <= end_date`**: Both comparisons use the same date string to check if today is within the inclusive session range. This is equivalent to SQLite's `date('now') BETWEEN start_date AND end_date` but uses a JS-controlled `now` parameter so tests can inject specific dates without relying on SQLite's `date('now')` (which ignores `vi.setSystemTime`).

### Utah General Session Dates — Seed Data

```typescript
// Verify these dates against https://le.utah.gov before implementing.
// Utah General Sessions begin on the 3rd Monday of January and run 45 legislative days.
const UTAH_GENERAL_SESSIONS = [
  { id: '2023GS', year: 2023, type: 'GS', start_date: '2023-01-17', end_date: '2023-03-03' },
  { id: '2024GS', year: 2024, type: 'GS', start_date: '2024-01-16', end_date: '2024-03-01' },
  { id: '2025GS', year: 2025, type: 'GS', start_date: '2025-01-21', end_date: '2025-03-07' },
  { id: '2026GS', year: 2026, type: 'GS', start_date: '2026-01-20', end_date: '2026-03-06' },
  { id: '2027GS', year: 2027, type: 'GS', start_date: '2027-01-19', end_date: '2027-03-05' },
  { id: '2028GS', year: 2028, type: 'GS', start_date: '2028-01-18', end_date: '2028-03-03' },
]
```

**Dev action required**: Verify these dates at https://le.utah.gov before committing. The site publishes "General Session" dates for each year. These dates are approximate (3rd Monday of January, 45-day session). Correct any wrong dates before seeding. Common errors: day-of-week calculation off by 1, session end date wrong year.

**Note on today (2026-03-08)**: The 2026GS nominally ended around March 6, 2026, so we are currently in inter-session. `getSessionsForRefresh()` should return `['2026GS', '2025GS']` today. This means `warmUpBillsCache` will fetch bills for BOTH 2026GS and 2025GS on the next refresh, caching a larger dataset. This is intentional — users looking up legislators in March–December need historically relevant bills.

### `sessions.ts` Complete Implementation

```typescript
// apps/mcp-server/src/cache/sessions.ts
// Session metadata module — manages known Utah legislative session records.
// Boundary 4: only cache/ modules import better-sqlite3.
// All functions receive db as a parameter (dependency injection) for testability.
// Called from: index.ts (seedSessions), refresh.ts (getSessionsForRefresh),
//   and potentially tools/ via getActiveSession (see Story 3.5).
import type Database from 'better-sqlite3'

interface SessionRow {
  id: string
  year: number
  type: string
  start_date: string
  end_date: string
}

// Known Utah General Session dates.
// Verify against https://le.utah.gov before deploying.
// Utah GS begins on the 3rd Monday of January and runs 45 legislative days.
const UTAH_GENERAL_SESSIONS: SessionRow[] = [
  { id: '2023GS', year: 2023, type: 'GS', start_date: '2023-01-17', end_date: '2023-03-03' },
  { id: '2024GS', year: 2024, type: 'GS', start_date: '2024-01-16', end_date: '2024-03-01' },
  { id: '2025GS', year: 2025, type: 'GS', start_date: '2025-01-21', end_date: '2025-03-07' },
  { id: '2026GS', year: 2026, type: 'GS', start_date: '2026-01-20', end_date: '2026-03-06' },
  { id: '2027GS', year: 2027, type: 'GS', start_date: '2027-01-19', end_date: '2027-03-05' },
  { id: '2028GS', year: 2028, type: 'GS', start_date: '2028-01-18', end_date: '2028-03-03' },
]

/**
 * Seeds the sessions table with known Utah General Session records.
 * Uses INSERT OR IGNORE so calling multiple times is idempotent.
 * Receives db as a parameter (dependency injection — Boundary 4).
 * Called once at server startup (index.ts) after initializeSchema().
 */
export function seedSessions(db: Database.Database): void {
  const stmt = db.prepare<[string, number, string, string, string]>(
    `INSERT OR IGNORE INTO sessions (id, year, type, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
  )
  db.transaction(() => {
    for (const s of UTAH_GENERAL_SESSIONS) {
      stmt.run(s.id, s.year, s.type, s.start_date, s.end_date)
    }
  })()
}

/**
 * Returns true if the given date falls within any known session's date range.
 * Reads from the sessions table — not hardcoded Jan-Mar comparison.
 * Falls back to calendar heuristic (month < 3) if sessions table is empty.
 *
 * @param db  - SQLite database instance
 * @param now - Optional current date; defaults to new Date() (injectable for tests)
 */
export function isInSession(db: Database.Database, now?: Date): boolean {
  const today = (now ?? new Date()).toISOString().slice(0, 10)
  const row = db
    .prepare<[string, string], { id: string }>(
      `SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`,
    )
    .get(today, today)
  if (row !== undefined) return true

  // Fallback if no session data — calendar heuristic
  const d = now ?? new Date()
  return d.getMonth() < 3
}

/**
 * Returns the active session ID if in session, or the most recently completed session ID.
 * Reads from the sessions table — not hardcoded year math.
 * Falls back to calendar computation if sessions table is empty.
 *
 * @param db  - SQLite database instance
 * @param now - Optional current date; defaults to new Date()
 */
export function getActiveSession(db: Database.Database, now?: Date): string {
  const today = (now ?? new Date()).toISOString().slice(0, 10)

  // Active session check
  const activeRow = db
    .prepare<[string, string], { id: string }>(
      `SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`,
    )
    .get(today, today)
  if (activeRow !== undefined) return activeRow.id

  // Most recently completed session
  const completedRow = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM sessions WHERE end_date < ? ORDER BY end_date DESC LIMIT 1`,
    )
    .get(today)
  if (completedRow !== undefined) return completedRow.id

  // Fallback: calendar computation (Jan-Mar = current year, else prior year)
  const d = now ?? new Date()
  const year = d.getFullYear()
  return d.getMonth() < 3 ? `${year}GS` : `${year - 1}GS`
}

/**
 * Returns the session IDs to fetch bills for.
 * - Active session: returns [activeSessionId]
 * - Inter-session: returns the 2 most recently completed session IDs (most recent first)
 * Used by warmUpBillsCache to determine which sessions to refresh from the API.
 *
 * @param db  - SQLite database instance
 * @param now - Optional current date; defaults to new Date()
 */
export function getSessionsForRefresh(db: Database.Database, now?: Date): string[] {
  const today = (now ?? new Date()).toISOString().slice(0, 10)

  // Check for active session
  const activeRow = db
    .prepare<[string, string], { id: string }>(
      `SELECT id FROM sessions WHERE start_date <= ? AND ? <= end_date LIMIT 1`,
    )
    .get(today, today)
  if (activeRow !== undefined) return [activeRow.id]

  // Inter-session: last 2 completed sessions
  const completed = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM sessions WHERE end_date < ? ORDER BY end_date DESC LIMIT 2`,
    )
    .all(today)
  if (completed.length > 0) return completed.map((r) => r.id)

  // Fallback: single session from calendar
  return [getActiveSession(db, now)]
}
```

### Changes to `bills.ts` — Remove the Stub

Delete lines 46–58 (the `getActiveSession` stub) completely. The final `bills.ts` exports:
- `getBillsBySponsor` (unchanged)
- `getBillsBySession` (unchanged)
- `searchBillsByTheme` (unchanged)
- `writeBills` (unchanged)

The stub comment says "STUB: Story 3.4 (inter-session bill handling) replaces this with full logic" — that replacement is now in `sessions.ts`.

### Changes to `refresh.ts` — Multi-Session Refresh

```typescript
// Updated import
import { writeBills } from './bills.js'
import { getSessionsForRefresh } from './sessions.js'

// Updated warmUpBillsCache
export async function warmUpBillsCache(
  db: Database.Database,
  provider: LegislatureDataProvider,
): Promise<void> {
  const sessions = getSessionsForRefresh(db)
  const allBills = await Promise.all(sessions.map((s) => provider.getBillsBySession(s)))
  writeBills(db, allBills.flat())
}
```

**Rate-limit note**: During inter-session, this makes 2 API calls (vs 1 during active session). The rate limit is ≤1 refresh per hour total. The 2 sessions are fetched in parallel — still within "≤1 refresh per hour" semantics since both calls happen in a single refresh cycle.

**Log update**: The existing success log in `scheduleBillsRefresh` says `'Bills cache refreshed'`. Consider adding session context:
```typescript
logger.info({ source: 'cache', sessions }, 'Bills cache refreshed')
```
This helps operators see which sessions were refreshed.

### Changes to `index.ts` — Startup Seed

```typescript
// After initializeSchema(db) and before the logger.info line:
import { seedSessions } from './cache/sessions.js'
// ...
initializeSchema(db)
seedSessions(db)  // Idempotent — safe on every restart
logger.info({ source: 'cache' }, 'SQLite schema initialized')
```

Or log separately:
```typescript
initializeSchema(db)
logger.info({ source: 'cache' }, 'SQLite schema initialized')
seedSessions(db)
logger.info({ source: 'cache' }, 'Sessions seeded')
```

### Test Strategy for `sessions.test.ts`

The functions receive `db` as a parameter (no singleton), so the test setup is simpler than `bills.test.ts`:

```typescript
// No vi.mock('./db.js') needed — functions receive db as parameter
// No vi.setSystemTime needed — functions receive now as parameter

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import { seedSessions, isInSession, getActiveSession, getSessionsForRefresh } from './sessions.js'

describe('sessions', () => {
  let testDb: Database.Database

  beforeEach(() => {
    testDb = new Database(':memory:')
    initializeSchema(testDb)
    seedSessions(testDb)
  })

  afterEach(() => {
    testDb.close()
  })

  // Tests use explicit `now` parameter for date control
  const IN_SESSION = new Date('2026-02-15')    // Mid-February 2026 (in 2026GS)
  const INTER_SESSION = new Date('2026-06-15') // June 2026 (after 2026GS ended ~March 6)
  const BEFORE_SESSION = new Date('2026-01-01') // Before 2026GS start (2026-01-20)
})
```

**Critical test for inter-session calendar fallback contrast:**

The whole point of Story 3.4 is that the DB-backed implementation is BETTER than the calendar fallback. Demonstrate this with a test:

```typescript
it('DB-backed getActiveSession returns 2026GS in June 2026 (more accurate than calendar which would return 2025GS)', () => {
  // Calendar heuristic: June 2026, month >= 3, so year - 1 = 2025GS (WRONG — 2026GS just completed!)
  // DB-backed: 2026GS ended March 2026, is most recent completed → returns 2026GS (CORRECT)
  const result = getActiveSession(testDb, new Date('2026-06-15'))
  expect(result).toBe('2026GS')
})
```

This test documents WHY the story was needed: the calendar stub would have said `2025GS` for the most recent completed session when we're in summer 2026, but `2026GS` just ended and is the most recent. The DB lookup correctly returns `2026GS`.

### `bills.test.ts` Changes — Test Count Impact

Current test count: 162 (from Story 3.3 code review).

Remove from `bills.test.ts`:
- `import type { getActiveSession as GetActiveSessionFn } from './bills.js'` (update the import type block)
- `let getActiveSession: typeof GetActiveSessionFn`
- `getActiveSession = mod.getActiveSession` (in beforeAll)
- `describe('getActiveSession', ...)` block — 2 tests

After removal: 160 tests in bills.test.ts.

New `sessions.test.ts` will add approximately 12–15 tests.

Total expected: ~172–175 tests passing after Story 3.4.

### `refresh.test.ts` Changes — Key Updates

In `warmUpBillsCache` describe block:

1. Add `seedSessions(testDb)` in `beforeEach` (after `initializeSchema(testDb)`)
2. Add import `import { seedSessions } from './sessions.js'`
3. The existing `vi.setSystemTime(new Date(2026, 1, 15))` sets February 2026 — this IS in-session per the seeded dates (2026GS: Jan 20 – Mar 6). So the existing test `'calls provider.getBillsBySession with the result of getActiveSession()'` should continue to expect a single call with `'2026GS'` — but this now comes from DB lookup, not the stub. The test passes unchanged in assertion, but the mechanism underneath is now SQLite-backed.

4. Add test for inter-session scenario:
```typescript
it('fetches bills for 2 sessions when inter-session', async () => {
  vi.setSystemTime(new Date(2026, 5, 15)) // June 2026 — inter-session
  const provider = makeProvider()
  await warmUpBillsCache(testDb, provider)

  expect(provider.getBillsBySession).toHaveBeenCalledTimes(2)
  expect(provider.getBillsBySession).toHaveBeenCalledWith('2026GS')
  expect(provider.getBillsBySession).toHaveBeenCalledWith('2025GS')
})
```

Note: `vi.setSystemTime` in the test sets `new Date()` in JS. The `getSessionsForRefresh(db)` function uses `(now ?? new Date()).toISOString()` — so `vi.setSystemTime` DOES control the date used in the query. This is the correct approach.

However, `vi.setSystemTime` must be called BEFORE `warmUpBillsCache` is invoked, but the `beforeEach` already calls `vi.useFakeTimers()` and `vi.setSystemTime(new Date(2026, 1, 15))`. A test that needs a different date can call `vi.setSystemTime(new Date(...))` inside the test body to override.

### ESLint / TypeScript Enforcement Reminders

- `console.log` FORBIDDEN in `apps/mcp-server/` — no logger calls needed in `sessions.ts` itself (pure data functions); logger calls only in `refresh.ts` and `index.ts` where appropriate
- `strict: true` + `exactOptionalPropertyTypes: true` — use `??` for optional params with defaults
- `better-sqlite3` imports only in `cache/` — `sessions.ts` imports `type Database from 'better-sqlite3'` ✓
- No `any`, no `@ts-ignore`
- Import paths use `.js` extensions: `import { seedSessions } from './cache/sessions.js'`
- No barrel file — do NOT create or modify `cache/index.ts`
- `sessions.ts` must export only: `seedSessions`, `isInSession`, `getActiveSession`, `getSessionsForRefresh`
- `UTAH_GENERAL_SESSIONS` must NOT be exported (internal constant)
- `SessionRow` interface must NOT be exported (internal type)

### Previous Story Intelligence (Story 3.3)

From Story 3.3 completion:
1. **DB singleton access pattern**: `sessions.ts` does NOT need to use the singleton since its functions receive `db` as a parameter. This is intentional — `sessions.ts` is called from index.ts and refresh.ts, both of which have `db` injected.
2. **Test isolation**: `sessions.test.ts` creates its own in-memory db per `beforeEach` + calls `testDb.close()` in `afterEach`. No shared state between tests.
3. **Error-path tests**: assert specific `nature` and `action` string values if any `AppError` is thrown — but `sessions.ts` functions do not throw `AppError`; they return fallback values (empty-table fallback to calendar).
4. **No barrel files**: No `cache/index.ts` — import from `./cache/sessions.js` directly.
5. **Vitest rejection tests**: N/A for `sessions.ts` (synchronous, no rejected promises).

### Git Intelligence (Recent Commits)

The last 5 commits are all Story 3.3 related:
- `fix(story-3.3): address code review findings — FTS query gaps and error handling`
- `feat(story-3.3): implement FTS5 bill theme search with synonym expansion`

Established patterns from those commits to follow:
- File header comments with boundary notes (see `bills.ts` header style)
- JSDoc on all exported functions
- TypeScript generic types on `db.prepare<[params], RowShape>(...)`
- `db.transaction(() => { ... })()` for write operations

### Story 3.5 Dependency Note

Story 3.5 (`search_bills` MCP tool) calls `searchBillsByTheme(sponsorId, theme)`. After Story 3.4:
- `searchBillsByTheme` already queries across ALL bills in the cache (no session filter)
- During inter-session, the cache now contains 2 sessions → `searchBillsByTheme` naturally searches both
- Story 3.5 applies the "up to 5 bills" limit (`results.slice(0, 5)` or SQL `LIMIT 5` in the FTS query)
- Story 3.5 may also call `getActiveSession(db)` or `isInSession(db)` to populate `SearchBillsResult.session`. If called from `tools/`, it would need the db singleton — consider exporting singleton-based wrappers in that story rather than adding them now.

### Project Structure Notes

```
apps/mcp-server/src/
  cache/
    schema.ts         — MODIFIED: add sessions table DDL
    sessions.ts       — CREATED: seedSessions, isInSession, getActiveSession, getSessionsForRefresh
    sessions.test.ts  — CREATED: full test coverage for sessions.ts
    bills.ts          — MODIFIED: remove getActiveSession stub
    bills.test.ts     — MODIFIED: remove getActiveSession import and 2 tests
    refresh.ts        — MODIFIED: import getSessionsForRefresh; multi-session warmUp
    refresh.test.ts   — MODIFIED: seed sessions, add inter-session test
  index.ts            — MODIFIED: import and call seedSessions(db) at startup
```

No new files outside `cache/`. No changes to `packages/types/`.

### References

- [Source: apps/mcp-server/src/cache/bills.ts#lines 46–58] — `getActiveSession` stub to be removed; JSDoc comment explains exactly what Story 3.4 must implement
- [Source: apps/mcp-server/src/cache/bills.ts#lines 1–12] — File header style and boundary comment pattern to replicate in sessions.ts
- [Source: apps/mcp-server/src/cache/refresh.ts#lines 76–83] — `warmUpBillsCache` current implementation showing `getActiveSession()` call site
- [Source: apps/mcp-server/src/cache/refresh.test.ts#lines 248–308] — `warmUpBillsCache` test suite to extend with inter-session scenario
- [Source: apps/mcp-server/src/cache/bills.test.ts#lines 449–472] — `getActiveSession` tests to remove
- [Source: apps/mcp-server/src/cache/schema.ts] — DDL style; add sessions table inside the existing transaction
- [Source: apps/mcp-server/src/index.ts#lines 9–15] — Startup sequence; add seedSessions(db) here
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — FR9 AC: inter-session serves up to 5 bills from last 2 sessions
- [Source: _bmad-output/planning-artifacts/architecture.md#Gap Analysis] — "Session awareness logic: inter-session period detection belongs in `cache/bills.ts` and `cache/refresh.ts` — implement as date comparison against Utah Legislature session calendar (Jan–Mar). Store session metadata in SQLite."
- [Source: _bmad-output/implementation-artifacts/3-3-fts5-bill-theme-search.md#Completion Notes] — 162 tests passing before Story 3.4; test count baseline

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- apps/mcp-server/src/cache/schema.ts
- apps/mcp-server/src/cache/sessions.ts (new)
- apps/mcp-server/src/cache/sessions.test.ts (new)
- apps/mcp-server/src/cache/bills.ts
- apps/mcp-server/src/cache/bills.test.ts
- apps/mcp-server/src/cache/refresh.ts
- apps/mcp-server/src/cache/refresh.test.ts
- apps/mcp-server/src/index.ts
