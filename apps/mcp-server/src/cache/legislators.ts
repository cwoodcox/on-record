// apps/mcp-server/src/cache/legislators.ts
// Cache read/write module for legislators — D1 async API.
// All functions accept db: D1Database as first parameter (dependency injection).
// Column-to-type mapping (snake_case DB → camelCase Legislator) is confined here.
import type { Legislator } from '@on-record/types'

// ── Row shape returned from D1 ───────────────────────────────────────────────
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
 * Reads legislators from the D1 cache for a specific chamber and district.
 * Returns an empty array on cache miss.
 *
 * @param db       - D1Database instance
 * @param chamber  - 'house' | 'senate'
 * @param district - district number
 */
export async function getLegislatorsByDistrict(
  db: D1Database,
  chamber: 'house' | 'senate',
  district: number,
): Promise<Legislator[]> {
  const result = await db
    .prepare(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE chamber = ? AND district = ?`,
    )
    .bind(chamber, district)
    .all<LegislatorRow>()

  return result.results.map(mapRow)
}

/**
 * Reads a single legislator from the cache by exact ID match.
 * Returns null on cache miss.
 *
 * @param db - D1Database instance
 * @param id - Legislator ID (e.g. "DAILEJ")
 */
export async function getLegislatorById(db: D1Database, id: string): Promise<Legislator | null> {
  const row = await db
    .prepare(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE id = ?`,
    )
    .bind(id)
    .first<LegislatorRow>()
  return row ? mapRow(row) : null
}

/**
 * Reads legislators from the cache by partial name match (case-insensitive).
 * Returns an empty array when no match is found.
 *
 * @param db   - D1Database instance
 * @param name - Partial name to search (e.g. "Smith" matches "Jane Smith")
 */
export async function getLegislatorsByName(db: D1Database, name: string): Promise<Legislator[]> {
  const result = await db
    .prepare(
      `SELECT id, chamber, district, name, email, phone, phone_label, session
       FROM legislators
       WHERE name LIKE ?`,
    )
    .bind(`%${name}%`)
    .all<LegislatorRow>()

  return result.results.map(mapRow)
}

/**
 * Upserts legislators into the D1 cache.
 * Uses INSERT OR REPLACE keyed by primary key `id`.
 * Uses db.batch() for atomic multi-row insert (max 100 per batch — chunks if needed).
 * Sets `cached_at` to the current ISO 8601 datetime.
 *
 * @param db          - D1Database instance
 * @param legislators - Array of Legislator objects to persist
 */
export async function writeLegislators(db: D1Database, legislators: Legislator[]): Promise<void> {
  if (legislators.length === 0) return

  const cachedAt = new Date().toISOString()

  const stmts = legislators.map((leg) =>
    db
      .prepare(
        `INSERT OR REPLACE INTO legislators
          (id, chamber, district, name, email, phone, phone_label, session, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        leg.id,
        leg.chamber,
        leg.district,
        leg.name,
        leg.email,
        leg.phone,
        leg.phoneLabel ?? null,
        leg.session,
        cachedAt,
      ),
  )

  // D1 batch() limit is 100 statements — chunk to avoid exceeding it
  for (let i = 0; i < stmts.length; i += 100) {
    await db.batch(stmts.slice(i, i + 100))
  }
}
