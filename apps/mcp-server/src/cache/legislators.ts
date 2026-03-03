// apps/mcp-server/src/cache/legislators.ts
// Cache read/write module for legislators.
// Boundary 4: receives `db` as a parameter — does NOT import better-sqlite3 or cache/db.
// Column-to-type mapping (snake_case DB → camelCase Legislator) is confined here only.
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
  cached_at: string
}

/**
 * Upserts all legislators into the `legislators` table in a single transaction.
 * Uses INSERT OR REPLACE to update existing rows by primary key `id`.
 * Sets `cached_at` to the current ISO 8601 datetime.
 *
 * @param db   - Database instance injected by the caller (never imported here)
 * @param legislators - Array of Legislator objects to persist
 */
export function writeLegislators(db: Database.Database, legislators: Legislator[]): void {
  const cachedAt = new Date().toISOString()

  const stmt = db.prepare<[string, string, number, string, string, string, string | null, string, string]>(`
    INSERT OR REPLACE INTO legislators
      (id, chamber, district, name, email, phone, phone_label, session, cached_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

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

/**
 * Reads legislators from the cache by chamber and district.
 * Maps snake_case DB columns to camelCase Legislator fields.
 * phone_label NULL → phoneTypeUnknown: true; phone_label present → phoneLabel set.
 *
 * @param db      - Database instance injected by the caller
 * @param chamber - 'house' | 'senate'
 * @param district - district number
 * @returns Array of Legislator objects (empty if not cached)
 */
export function getLegislatorsByDistrict(
  db: Database.Database,
  chamber: 'house' | 'senate',
  district: number,
): Legislator[] {
  const rows = db
    .prepare<[string, number], LegislatorRow>(
      `SELECT id, chamber, district, name, email, phone, phone_label, session, cached_at
       FROM legislators
       WHERE chamber = ? AND district = ?`,
    )
    .all(chamber, district)

  return rows.map((row): Legislator => {
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
  })
}
