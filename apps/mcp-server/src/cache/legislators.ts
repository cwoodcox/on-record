// apps/mcp-server/src/cache/legislators.ts
// Cache read/write module for legislators.
// Boundary 4: only cache/ modules import better-sqlite3 — this file imports db singleton from ./db.js.
// Column-to-type mapping (snake_case DB → camelCase Legislator) is confined here only.
import { db } from './db.js'
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

/**
 * Reads legislators from the SQLite cache for a specific chamber and district.
 * Returns an empty array on cache miss — the tool handler treats this as an error.
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

/**
 * Upserts legislators into the SQLite cache.
 * Uses INSERT OR REPLACE keyed by primary key `id`.
 * All rows are wrapped in a single transaction for atomicity.
 * Sets `cached_at` to the current ISO 8601 datetime.
 * Called by cache warm-up on server startup and daily cron refresh (Story 2.3).
 *
 * @param legislators - Array of Legislator objects to persist
 */
export function upsertLegislators(legislators: Legislator[]): void {
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
