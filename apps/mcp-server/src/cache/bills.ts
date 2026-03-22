// apps/mcp-server/src/cache/bills.ts
// Cache read/write module for bills.
// Boundary 4: only cache/ modules import better-sqlite3.
// Column-to-type mapping (snake_case DB → camelCase Bill) is confined here only.
// Also exports singleton wrappers for sessions.ts functions (getActiveSessionId) for use from tools/.
//
// Architecture note on db access:
//   - getBillsBySponsor, getBillsBySession, searchBills: called from tools/ (outside cache/)
//     which cannot import the db singleton — these functions use the db singleton directly.
//   - getActiveSessionId: singleton wrapper for getActiveSession(db), callable from tools/.
//   - writeBills: called exclusively from cache/refresh.ts (inside cache/); receives
//     db as a parameter for dependency injection and testability.
import { db } from './db.js'
import type Database from 'better-sqlite3'
import type { Bill, SearchBillsParams } from '@on-record/types'
import { getActiveSession } from './sessions.js'

// ── Row shape returned from SQLite ──────────────────────────────────────────
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
      'SELECT id, session, title, summary, status, sponsor_id, vote_result, vote_date FROM bills WHERE sponsor_id = ?',
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
      'SELECT id, session, title, summary, status, sponsor_id, vote_result, vote_date FROM bills WHERE session = ?',
    )
    .all(session)
  return rows.map(rowToBill)
}

/**
 * Looks up bills by exact bill ID, optionally scoped to a session.
 * Returns bills sorted by session descending (newest first).
 * When no session filter is provided, may return multiple rows (bill IDs repeat across sessions).
 */
function lookupBillById(id: string, session?: string): Bill[] {
  if (session !== undefined) {
    const rows = db
      .prepare<[string, string], BillRow>(
        'SELECT id, session, title, summary, status, sponsor_id, vote_result, vote_date FROM bills WHERE id = ? AND session = ? ORDER BY session DESC',
      )
      .all(id, session)
    return rows.map(rowToBill)
  }
  const rows = db
    .prepare<[string], BillRow>(
      'SELECT id, session, title, summary, status, sponsor_id, vote_result, vote_date FROM bills WHERE id = ? ORDER BY session DESC',
    )
    .all(id)
  return rows.map(rowToBill)
}

/**
 * Full-text searches the bills cache using FTS5.
 * Optionally filters by sponsor_id and/or session.
 * Results are ordered by FTS5 relevance (BM25 rank) with LIMIT applied in SQL.
 */
function runFtsSearch(params: SearchBillsParams): Bill[] {
  const query = params.query ?? ''
  const limit = Math.min(params.limit ?? 5, 20)

  const conditions: string[] = ['bill_fts MATCH ?']
  const args: (string | number)[] = [query]

  if (params.sponsorId !== undefined) {
    conditions.push('b.sponsor_id = ?')
    args.push(params.sponsorId)
  }

  if (params.session !== undefined) {
    conditions.push('b.session = ?')
    args.push(params.session)
  }

  args.push(limit)

  const sql = `
    SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.vote_result, b.vote_date
    FROM bill_fts
    JOIN bills b ON b.rowid = bill_fts.rowid
    WHERE ${conditions.join(' AND ')}
    ORDER BY bill_fts.rank
    LIMIT ?
  `

  try {
    const rows = db.prepare<(string | number)[], BillRow>(sql).all(...args)
    return rows.map(rowToBill)
  } catch {
    // Malformed FTS5 query syntax (e.g. bare operators, unmatched quotes) —
    // return empty results rather than propagating a SQLite error.
    return []
  }
}

/**
 * Searches the bills cache using either exact bill ID lookup or FTS5 full-text search.
 *
 * Guards:
 * - Returns [] if billId is provided but is empty string
 * - Returns [] if neither billId nor query is provided
 * - Returns [] if query is empty string
 *
 * When billId is provided, delegates to lookupBillById (exact match, sorted newest-first).
 * When query is provided, delegates to runFtsSearch (FTS5 relevance ranking).
 *
 * @param params - Search parameters: query, billId, sponsorId, session, limit
 */
export function searchBills(params: SearchBillsParams): Bill[] {
  if (params.billId !== undefined) {
    if (params.billId === '') return []
    return lookupBillById(params.billId, params.session)
  }

  if (params.query === undefined || params.query === '') return []

  return runFtsSearch(params)
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
    [string, string, string, string, string, string, string | null, string | null, string]
  >(`
    INSERT OR REPLACE INTO bills
      (id, session, title, summary, status, sponsor_id, vote_result, vote_date, cached_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        bill.voteResult ?? null,
        bill.voteDate ?? null,
        cachedAt,
      )
    }
    db.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()
  })()
}
