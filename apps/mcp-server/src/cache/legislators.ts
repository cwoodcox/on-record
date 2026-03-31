// apps/mcp-server/src/cache/legislators.ts
// Cache read/write module for legislators.
// Boundary 4: only cache/ modules import better-sqlite3.
// Column-to-type mapping (snake_case DB → camelCase Legislator) is confined here only.
//
// Architecture note on db access:
//   - getLegislatorsByDistrict: called from tools/ (outside cache/) which cannot import
//     the db singleton — this function uses the db singleton directly.
//   - writeLegislators: called exclusively from cache/refresh.ts (inside cache/); receives
//     db as a parameter for dependency injection and testability.
import { db } from './db.js'
import type Database from 'better-sqlite3'
import type { Legislator } from '@on-record/types'

// ── Row shape returned from SQLite ──────────────────────────────────────────
interface LegislatorRow {
  id: string
  chamber: string
  district: number
  name: string
  email: string
  phone: string
  phone_label: string | null
  session: string
}

// ── Row → Legislator mapping helper ─────────────────────────────────────────

function mapRow(row: LegislatorRow): Legislator {
  const base = {
    id: row.id,
    chamber: row.chamber as 'house' | 'senate',
    district: row.district,
    name: row.name,
    email: row.email,
    phone: row.phone,
    session: row.session,
  }

  // phone_label NULL → phoneTypeUnknown: true; present → phoneLabel
  if (row.phone_label === null) {
    return { ...base, phoneTypeUnknown: true }
  }
  return { ...base, phoneLabel: row.phone_label }
}

/**
 * Reads legislators from the SQLite cache for a specific chamber and district.
 * Returns an empty array on cache miss — the tool handler treats this as an error.
 * Uses the db singleton directly since this function is called from tools/ which
 * cannot import cache/db per the ESLint boundary rules.
 *
 * @param chamber  - 'house' | 'senate'
 * @param district - district number
 */
export function getLegislatorsByDistrict(
  chamber: 'house' | 'senate',
  district: number,
): Legislator[] {
  const rows = db
    .prepare<[string, number], LegislatorRow>(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE chamber = ? AND district = ?`,
    )
    .all(chamber, district)

  return rows.map(mapRow)
}

/**
 * Reads a single legislator from the cache by exact ID match.
 * Returns null on cache miss.
 *
 * @param id - Legislator ID (e.g. "DAILEJ" — matches sponsorId on bill search results)
 */
export function getLegislatorById(id: string): Legislator | null {
  const row = db
    .prepare<[string], LegislatorRow>(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE id = ?`,
    )
    .get(id)
  return row ? mapRow(row) : null
}

/**
 * Reads legislators from the cache by partial name match (case-insensitive).
 * Returns an empty array when no match is found.
 *
 * @param name - Partial name to search (e.g. "Smith" matches "Jane Smith")
 */
export function getLegislatorsByName(name: string): Legislator[] {
  const rows = db
    .prepare<[string], LegislatorRow>(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE name LIKE ?`,
    )
    .all(`%${name}%`)
  return rows.map(mapRow)
}

/**
 * Upserts legislators into the SQLite cache.
 * Uses INSERT OR REPLACE keyed by primary key `id`.
 * All rows are wrapped in a single transaction for atomicity.
 * Sets `cached_at` to the current ISO 8601 datetime.
 * Called by cache warm-up on server startup and daily cron refresh (Story 2.3).
 *
 * Receives db as a parameter (dependency injection — Boundary 4):
 * cache/refresh.ts receives db from index.ts and passes it here.
 * This keeps writeLegislators testable with an in-memory db without mocking the singleton.
 *
 * @param db          - Injected SQLite database instance
 * @param legislators - Array of Legislator objects to persist
 */
export function writeLegislators(db: Database.Database, legislators: Legislator[]): void {
  if (legislators.length === 0) return

  const stmt = db.prepare<[string, string, number, string, string, string, string | null, string, string]>(`
    INSERT OR REPLACE INTO legislators
      (id, chamber, district, name, email, phone, phone_label, session, cached_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const cachedAt = new Date().toISOString()

  db.transaction(() => {
    for (const leg of legislators) {
      stmt.run(
        leg.id,
        leg.chamber,
        leg.district,
        leg.name,
        leg.email,
        leg.phone,
        leg.phoneLabel ?? null,
        leg.session,
        cachedAt,
      )
    }
  })()
}
