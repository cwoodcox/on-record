// apps/mcp-server/src/cache/bills.ts
// Cache read/write module for bills — D1 async API.
// All functions accept db: D1Database as first parameter (dependency injection).
// Column-to-type mapping (snake_case DB → camelCase Bill) is confined here.
import type { Bill, SearchBillsParams, SearchBillsResult } from '@on-record/types'
import { getActiveSession } from './sessions.js'

// ── Row shape returned from D1 ───────────────────────────────────────────────
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
 * Reads bills from the D1 cache for a specific sponsor.
 *
 * @param db        - D1Database instance
 * @param sponsorId - Legislator ID
 */
export async function getBillsBySponsor(db: D1Database, sponsorId: string): Promise<Bill[]> {
  const result = await db
    .prepare(
      'SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date FROM bills WHERE sponsor_id = ?',
    )
    .bind(sponsorId)
    .all<BillRow>()
  return result.results.map(rowToBill)
}

/**
 * Reads bills from the D1 cache for a specific legislative session.
 *
 * @param db      - D1Database instance
 * @param session - Legislative session string (e.g. '2026GS')
 */
export async function getBillsBySession(db: D1Database, session: string): Promise<Bill[]> {
  const result = await db
    .prepare(
      'SELECT id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date FROM bills WHERE session = ?',
    )
    .bind(session)
    .all<BillRow>()
  return result.results.map(rowToBill)
}

/**
 * Full-text searches the bills cache by issue theme keyword.
 * @deprecated Use searchBills({ query, sponsorId }) instead.
 *
 * @param db        - D1Database instance
 * @param sponsorId - Legislator ID
 * @param theme     - Issue theme keyword passed directly to FTS5
 */
export async function searchBillsByTheme(
  db: D1Database,
  sponsorId: string,
  theme: string,
): Promise<Bill[]> {
  const normalized = theme.trim()
  if (normalized === '') return []

  try {
    const result = await db
      .prepare(
        `SELECT b.id, b.session, b.title, b.summary, b.status, b.sponsor_id, b.floor_sponsor_id, b.vote_result, b.vote_date
         FROM bill_fts
         JOIN bills b ON b.rowid = bill_fts.rowid
         WHERE bill_fts MATCH ?
           AND b.sponsor_id = ?
         ORDER BY bill_fts.rank`,
      )
      .bind(normalized, sponsorId)
      .all<BillRow>()

    return result.results.map(rowToBill)
  } catch {
    // Malformed FTS5 query syntax — return empty results
    return []
  }
}

/**
 * Parses a bill ID string into a { prefix, num } object for zero-padding-agnostic matching.
 * Internal helper — not exported.
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
 * @param db     - D1Database instance
 * @param params - Optional filters: query, billId, sponsorId, floorSponsorId, session, chamber, count, offset
 */
export async function searchBills(
  db: D1Database,
  params: SearchBillsParams,
): Promise<SearchBillsResult> {
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

    const countRow = await db.prepare(countSql).bind(...countArgs).first<{ total: number }>()
    total = countRow?.total ?? 0

    const pageResult = await db.prepare(pageSql).bind(...pageArgs).all<BillRow>()
    bills = pageResult.results.map(rowToBill)
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

    const countRow = await db.prepare(countSql).bind(...countArgs).first<{ total: number }>()
    total = countRow?.total ?? 0

    const pageResult = await db.prepare(pageSql).bind(...pageArgs).all<BillRow>()
    bills = pageResult.results.map(rowToBill)
  }

  return { bills, total, count: bills.length, offset }
}

/**
 * Returns the active or most recently completed legislative session ID.
 * Wraps getActiveSession(db) using the injected D1 binding.
 *
 * @param db - D1Database instance
 */
export async function getActiveSessionId(db: D1Database): Promise<string> {
  return getActiveSession(db)
}

/**
 * Upserts bills into the D1 cache.
 * Uses db.batch() for atomic multi-row insert (max 100 per batch — chunks if needed).
 * Rebuilds FTS5 index after all inserts.
 * Sets `cached_at` to the current ISO 8601 datetime.
 *
 * Design: pure upsert — no upfront DELETE. A bill that fails to fetch this run
 * retains its previously-cached value until it successfully refreshes on the next cycle.
 *
 * @param db    - D1Database instance
 * @param bills - Array of Bill objects to persist
 */
export async function writeBills(db: D1Database, bills: Bill[]): Promise<void> {
  if (bills.length === 0) return

  const cachedAt = new Date().toISOString()

  const stmts = bills.map((bill) =>
    db
      .prepare(
        `INSERT OR REPLACE INTO bills
          (id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
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
      ),
  )

  // D1 batch() limit is 100 statements — chunk to avoid exceeding it
  for (let i = 0; i < stmts.length; i += 100) {
    await db.batch(stmts.slice(i, i + 100))
  }

  // Rebuild FTS5 index after bulk inserts (must run after batch commits)
  await db.prepare("INSERT INTO bill_fts(bill_fts) VALUES('rebuild')").run()
}
