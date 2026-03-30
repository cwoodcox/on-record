// apps/mcp-server/src/cache/bills.ts
// Cache read/write module for bills.
// Boundary 4: only cache/ modules import better-sqlite3.
// Column-to-type mapping (snake_case DB → camelCase Bill) is confined here only.
// Also exports singleton wrappers for sessions.ts functions (getActiveSessionId) for use from tools/.
//
// Architecture note on db access:
//   - getBillsBySponsor, getBillsBySession, searchBillsByTheme, searchBills: called from tools/
//     (outside cache/) which cannot import the db singleton — these functions use the db singleton directly.
//   - getActiveSessionId: singleton wrapper for getActiveSession(db), callable from tools/.
//   - writeBills: called exclusively from cache/refresh.ts (inside cache/); receives
//     db as a parameter for dependency injection and testability.
import { db } from './db.js'
import type Database from 'better-sqlite3'
import type { Bill, SearchBillsParams, SearchBillsResult } from '@on-record/types'
import { getActiveSession } from './sessions.js'

// ── Row shape returned from SQLite ──────────────────────────────────────────
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
}

function rowToBill(row: BillRow): Bill {
  const bill: Bill = {
    id: row.id,
    session: row.session,
    title: row.title,
    summary: row.summary,
    status: row.status,
    sponsorId: row.sponsor_id,
  }
  // null in DB → undefined in returned Bill (exactOptionalPropertyTypes: true)
  if (row.floor_sponsor_id !== null) {
    bill.floorSponsorId = row.floor_sponsor_id
  }
  if (row.vote_result !== null) {
    bill.voteResult = row.vote_result
  }
  if (row.vote_date !== null) {
    bill.voteDate = row.vote_date
  }
  return bill
}

/**
 * Reads bills from the SQLite cache for a specific sponsor.
 * Returns an empty array on cache miss — the tool handler treats this as appropriate.
 * Uses the db singleton directly since this function is called from tools/ which
 * cannot import cache/db per the ESLint boundary rules.
 *
 * @param sponsorId - Legislator ID
 */
export function getBillsBySponsor(sponsorId: string): Bill[] {
  const rows = db
    .prepare<[string], BillRow>(
      'SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date FROM bills WHERE sponsor_id = ?',
    )
    .all(sponsorId)
  return rows.map(rowToBill)
}

/**
 * Reads bills from the SQLite cache for a specific legislative session.
 * Returns an empty array on cache miss.
 * Uses the db singleton directly since this function is called from tools/ which
 * cannot import cache/db per the ESLint boundary rules.
 *
 * @param session - Legislative session string (e.g. '2026GS')
 */
export function getBillsBySession(session: string): Bill[] {
  const rows = db
    .prepare<[string], BillRow>(
      'SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date FROM bills WHERE session = ?',
    )
    .all(session)
  return rows.map(rowToBill)
}

/**
 * Full-text searches the bills cache by issue theme keyword.
 * @deprecated Use searchBills({ query, sponsorId }) instead. Retained for test compatibility only — do not add new callers.
 *
 * @param sponsorId - Legislator ID (e.g. 'RRabbitt')
 * @param theme     - Issue theme keyword passed directly to FTS5
 */
export function searchBillsByTheme(sponsorId: string, theme: string): Bill[] {
  const normalized = theme.trim()
  if (normalized === '') return []

  try {
    const rows = db
      .prepare<[string, string], BillRow>(
        `SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.floor_sponsor_id, b.vote_result, b.vote_date
         FROM bill_fts
         JOIN bills b ON b.rowid = bill_fts.rowid
         WHERE bill_fts MATCH ?
           AND b.sponsor_id = ?
         ORDER BY bill_fts.rank`,
      )
      .all(normalized, sponsorId)

    return rows.map(rowToBill)
  } catch {
    // Malformed FTS5 query syntax (e.g. bare operators, unmatched quotes) —
    // return empty results rather than propagating a SQLite error.
    return []
  }
}

/**
 * Parses a bill ID string into a { prefix, num } object for zero-padding-agnostic matching.
 * Internal helper — not exported. Tests exercise it indirectly via searchBills({ billId }).
 *
 * Examples:
 *   "HB88"   → { prefix: "HB", num: 88 }
 *   "HB0088" → { prefix: "HB", num: 88 }
 *   "hb88"   → { prefix: "HB", num: 88 }
 *   "HJR01"  → { prefix: "HJR", num: 1 }
 *   "HB"     → null (no digits)
 */
function parseBillId(raw: string): { prefix: string; num: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(raw.trim())
  if (!match) return null
  return {
    prefix: match[1]!.toUpperCase(),
    num: parseInt(match[2]!, 10),
  }
}

/**
 * Searches the bills cache with all-optional composable filters.
 * Returns a paginated SearchBillsResult with total count.
 *
 * @param params - Optional filters: query, billId, sponsorId, floorSponsorId, session, chamber, count, offset
 */
export function searchBills(params: SearchBillsParams): SearchBillsResult {
  const {
    query,
    billId,
    sponsorId,
    floorSponsorId,
    session,
    chamber,
    count = 50,
    offset = 0,
  } = params

  const limit = Math.min(count, 100)

  // Build WHERE conditions in parallel for both paths:
  //   conditions[]  — unaliased, for direct table scan (Path B)
  //   bConditions[] — b.-prefixed, for FTS5 JOIN path (Path A)
  // Both arrays stay in sync; conditionArgs is shared (same arg order for both paths).
  const conditions: string[] = []
  const bConditions: string[] = []
  const conditionArgs: unknown[] = []

  if (billId !== undefined) {
    const parsed = parseBillId(billId)
    if (parsed) {
      conditions.push('SUBSTR(id, 1, ?) = ? AND CAST(SUBSTR(id, ? + 1) AS INTEGER) = ?')
      bConditions.push('SUBSTR(b.id, 1, ?) = ? AND CAST(SUBSTR(b.id, ? + 1) AS INTEGER) = ?')
      conditionArgs.push(parsed.prefix.length, parsed.prefix, parsed.prefix.length, parsed.num)
    } else {
      // Unrecognized format — fall back to exact string match
      conditions.push('id = ?')
      bConditions.push('b.id = ?')
      conditionArgs.push(billId.trim())
    }
  }

  if (sponsorId !== undefined) {
    conditions.push('sponsor_id = ?')
    bConditions.push('b.sponsor_id = ?')
    conditionArgs.push(sponsorId)
  }

  if (floorSponsorId !== undefined) {
    conditions.push('floor_sponsor_id = ?')
    bConditions.push('b.floor_sponsor_id = ?')
    conditionArgs.push(floorSponsorId)
  }

  if (session !== undefined) {
    conditions.push('session = ?')
    bConditions.push('b.session = ?')
    conditionArgs.push(session)
  }

  if (chamber === 'house') {
    conditions.push("id LIKE 'H%'")
    bConditions.push("b.id LIKE 'H%'")
  } else if (chamber === 'senate') {
    conditions.push("id LIKE 'S%'")
    bConditions.push("b.id LIKE 'S%'")
  }

  // Determine if FTS5 path or direct table scan
  const normalizedQuery = (query ?? '').trim()
  const useFts = normalizedQuery !== ''

  let total: number
  let bills: Bill[]

  if (useFts) {

    const nonFtsWhere =
      bConditions.length > 0 ? 'AND ' + bConditions.join(' AND ') : ''

    const countSql = `
      SELECT COUNT(*) as total
      FROM bill_fts
      JOIN bills b ON b.rowid = bill_fts.rowid
      WHERE bill_fts MATCH ?
      ${nonFtsWhere}
    `
    const pageSql = `
      SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.floor_sponsor_id, b.vote_result, b.vote_date
      FROM bill_fts
      JOIN bills b ON b.rowid = bill_fts.rowid
      WHERE bill_fts MATCH ?
      ${nonFtsWhere}
      ORDER BY bill_fts.rank
      LIMIT ? OFFSET ?
    `

    const countArgs = [normalizedQuery, ...conditionArgs]
    const pageArgs = [normalizedQuery, ...conditionArgs, limit, offset]

    const countRow = db.prepare<unknown[], { total: number }>(countSql).get(...countArgs)
    total = countRow?.total ?? 0

    const rows = db.prepare<unknown[], BillRow>(pageSql).all(...pageArgs)
    bills = rows.map(rowToBill)
  } else {
    // Direct table scan path
    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countSql = `
      SELECT COUNT(*) as total FROM bills
      ${whereClause}
    `
    const pageSql = `
      SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date
      FROM bills
      ${whereClause}
      ORDER BY session DESC, id ASC
      LIMIT ? OFFSET ?
    `

    const countArgs = [...conditionArgs]
    const pageArgs = [...conditionArgs, limit, offset]

    const countRow = db.prepare<unknown[], { total: number }>(countSql).get(...countArgs)
    total = countRow?.total ?? 0

    const rows = db.prepare<unknown[], BillRow>(pageSql).all(...pageArgs)
    bills = rows.map(rowToBill)
  }

  return { bills, total, count: bills.length, offset }
}

/**
 * Returns the active or most recently completed legislative session ID.
 * Wraps getActiveSession(db) using the db singleton.
 * Callable from tools/ where the db singleton cannot be imported directly (Boundary 4).
 */
export function getActiveSessionId(): string {
  return getActiveSession(db)
}

/**
 * Upserts bills into the SQLite cache.
 * Uses INSERT OR REPLACE keyed by primary key `id`.
 * All writes + FTS5 rebuild are wrapped in a single transaction for atomicity.
 * Sets `cached_at` to the current ISO 8601 datetime.
 * Called by cache warm-up on server startup and hourly cron refresh (Story 3.2).
 *
 * Receives db as a parameter (dependency injection — Boundary 4):
 * cache/refresh.ts receives db from index.ts and passes it here.
 * This keeps writeBills testable with an in-memory db without mocking the singleton.
 *
 * Design: pure upsert — no upfront DELETE. The provider uses Promise.allSettled to
 * skip transient bill-detail fetch failures; a pre-session DELETE would permanently
 * evict bills that failed to fetch this cycle, making the cache incomplete. Upsert
 * semantics mean a bill that fails to fetch this run retains its previously-cached
 * value until it successfully refreshes on the next hourly cycle.
 *
 * @param db    - Injected SQLite database instance
 * @param bills - Array of Bill objects to persist
 */
export function writeBills(db: Database.Database, bills: Bill[]): void {
  if (bills.length === 0) return

  const stmt = db.prepare<
    [string, string, string, string, string, string, string | null, string | null, string | null, string]
  >(`
    INSERT OR REPLACE INTO bills
      (id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date, cached_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const cachedAt = new Date().toISOString()

  db.transaction(() => {
    for (const bill of bills) {
      stmt.run(
        bill.id,
        bill.session,
        bill.title,
        bill.summary,
        bill.status,
        bill.sponsorId,
        bill.floorSponsorId ?? null,
        bill.voteResult ?? null,
        bill.voteDate ?? null,
        cachedAt,
      )
    }
    db.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()
  })()
}
