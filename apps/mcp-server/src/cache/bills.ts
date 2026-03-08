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

// Internal constant — not exported. Maps normalized (lowercase) theme keywords
// and their synonyms to FTS5 OR query strings.
// Both canonical theme names AND individual synonyms are keys, so input like
// 'Medicaid' (after normalization to 'medicaid') resolves to the healthcare query.
const THEME_QUERIES: Record<string, string> = {
  // Healthcare
  healthcare: 'health OR insurance OR Medicaid OR prescription',
  health: 'health OR insurance OR Medicaid OR prescription',
  insurance: 'health OR insurance OR Medicaid OR prescription',
  medicaid: 'health OR insurance OR Medicaid OR prescription',
  prescription: 'health OR insurance OR Medicaid OR prescription',
  // Education
  education: 'school OR teacher OR student OR education',
  school: 'school OR teacher OR student OR education',
  teacher: 'school OR teacher OR student OR education',
  student: 'school OR teacher OR student OR education',
  // Housing
  housing: 'rent OR landlord OR affordable OR housing',
  rent: 'rent OR landlord OR affordable OR housing',
  landlord: 'rent OR landlord OR affordable OR housing',
  affordable: 'rent OR landlord OR affordable OR housing',
  // Redistricting
  redistricting: 'redistricting OR gerrymandering OR district',
  gerrymandering: 'redistricting OR gerrymandering OR district',
  'prop 4': 'redistricting OR gerrymandering OR district',
  district: 'redistricting OR gerrymandering OR district',
  // Environment
  environment: 'climate OR pollution OR water OR environment',
  climate: 'climate OR pollution OR water OR environment',
  pollution: 'climate OR pollution OR water OR environment',
  water: 'climate OR pollution OR water OR environment',
  // Taxes
  taxes: 'revenue OR budget OR fiscal OR tax',
  tax: 'revenue OR budget OR fiscal OR tax',
  revenue: 'revenue OR budget OR fiscal OR tax',
  budget: 'revenue OR budget OR fiscal OR tax',
  fiscal: 'revenue OR budget OR fiscal OR tax',
}

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

  // Collect all unique sessions present in this batch (normally one, but handle mixed payloads).
  const sessions = [...new Set(bills.map((b) => b.session))]

  const deleteStmt = db.prepare<[string]>('DELETE FROM bills WHERE session = ?')
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
    // Delete all prior bills for every session in this batch so stale rows are removed when
    // upstream returns fewer bills than the previous refresh (AC3 overwrite semantics).
    for (const s of sessions) {
      deleteStmt.run(s)
    }
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
