// apps/mcp-server/src/cache/bills.ts
// Cache read/write module for bills.
// Boundary 4: only cache/ modules import better-sqlite3.
// Column-to-type mapping (snake_case DB → camelCase Bill) is confined here only.
//
// Architecture note on db access:
//   - getBillsBySponsor, getBillsBySession: called from tools/ (outside cache/) which cannot
//     import the db singleton — these functions use the db singleton directly.
//   - writeBills: called exclusively from cache/refresh.ts (inside cache/); receives
//     db as a parameter for dependency injection and testability.
import { db } from './db.js'
import type Database from 'better-sqlite3'
import type { Bill } from '@on-record/types'

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
    .prepare<[string], BillRow>('SELECT * FROM bills WHERE sponsor_id = ?')
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
    .prepare<[string], BillRow>('SELECT * FROM bills WHERE session = ?')
    .all(session)
  return rows.map(rowToBill)
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
    db.exec("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')")
  })()
}
