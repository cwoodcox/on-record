// apps/mcp-server/src/cache/legislators.test.ts
// Tests for getLegislatorsByDistrict and upsertLegislators using in-memory SQLite.
// Uses vi.mock('./db.js') to inject test database — does NOT import the disk singleton.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import type { Legislator } from '@on-record/types'

// Create in-memory test DB before mock registration
const testDb = new Database(':memory:')
initializeSchema(testDb)

// Inject testDb as the `db` singleton before module under test is evaluated
vi.mock('./db.js', () => ({ db: testDb }))

// Import after mock is registered — use dynamic import inside beforeAll to avoid
// TS1309 (top-level await not allowed in CommonJS modules).
// Vitest hoists vi.mock() calls so the mock is in place when the module evaluates.
import type { getLegislatorsByDistrict as GetFn, upsertLegislators as UpsertFn } from './legislators.js'
let getLegislatorsByDistrict: typeof GetFn
let upsertLegislators: typeof UpsertFn

beforeAll(async () => {
  const mod = await import('./legislators.js')
  getLegislatorsByDistrict = mod.getLegislatorsByDistrict
  upsertLegislators = mod.upsertLegislators
})

describe('legislators cache', () => {
  beforeEach(() => {
    // Clear table between tests for isolation
    testDb.prepare('DELETE FROM legislators').run()
  })

  // ── Fixture helpers ──────────────────────────────────────────────────────

  function makeLegislator(overrides: Partial<Legislator> = {}): Legislator {
    return {
      id: 'leg-001',
      chamber: 'house',
      district: 10,
      name: 'Jane Smith',
      email: 'jsmith@utah.gov',
      phone: '801-555-0100',
      phoneLabel: 'cell',
      session: '2025GS',
      ...overrides,
    }
  }

  // ── upsertLegislators ────────────────────────────────────────────────────

  describe('upsertLegislators', () => {
    it('inserts legislators into the table', () => {
      const leg = makeLegislator()
      upsertLegislators([leg])

      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(1)
    })

    it('upserts by primary key — does not create duplicates on second write', () => {
      const leg = makeLegislator()
      upsertLegislators([leg])
      upsertLegislators([leg])

      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(1)
    })

    it('replaces existing row on upsert — updates name', () => {
      upsertLegislators([makeLegislator({ name: 'Original Name' })])
      upsertLegislators([makeLegislator({ name: 'Updated Name' })])

      const row = testDb.prepare('SELECT name FROM legislators WHERE id = ?').get('leg-001') as { name: string } | undefined
      expect(row?.name).toBe('Updated Name')
    })

    it('sets cached_at to a non-empty ISO 8601 string', () => {
      upsertLegislators([makeLegislator()])

      const row = testDb.prepare('SELECT cached_at FROM legislators WHERE id = ?').get('leg-001') as { cached_at: string } | undefined
      expect(row?.cached_at).toBeTruthy()
      expect(new Date(row?.cached_at ?? '').toISOString()).toBeTruthy()
    })

    it('stores phone_label as NULL when phoneTypeUnknown is true', () => {
      const leg: Legislator = {
        id: 'leg-002',
        chamber: 'senate',
        district: 5,
        name: 'Bob Jones',
        email: 'bjones@utah.gov',
        phone: '801-555-0200',
        phoneTypeUnknown: true,
        session: '2025GS',
      }
      upsertLegislators([leg])

      const row = testDb.prepare('SELECT phone_label FROM legislators WHERE id = ?').get('leg-002') as { phone_label: string | null } | undefined
      expect(row?.phone_label).toBeNull()
    })

    it('stores phone_label when phoneLabel is set', () => {
      upsertLegislators([makeLegislator({ phoneLabel: 'district office' })])

      const row = testDb.prepare('SELECT phone_label FROM legislators WHERE id = ?').get('leg-001') as { phone_label: string | null } | undefined
      expect(row?.phone_label).toBe('district office')
    })

    it('inserts multiple legislators in one call', () => {
      const legs = [
        makeLegislator({ id: 'leg-001', district: 10 }),
        makeLegislator({ id: 'leg-002', district: 11 }),
        makeLegislator({ id: 'leg-003', district: 12 }),
      ]
      upsertLegislators(legs)

      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(3)
    })

    it('is a no-op when passed an empty array', () => {
      expect(() => upsertLegislators([])).not.toThrow()
      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(0)
    })
  })

  // ── getLegislatorsByDistrict ─────────────────────────────────────────────

  describe('getLegislatorsByDistrict', () => {
    it('returns empty array when no legislators are cached (AC#8 — cache miss)', () => {
      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toEqual([])
    })

    it('returns legislators matching chamber and district', () => {
      upsertLegislators([makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 })])

      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('leg-001')
    })

    it('filters by chamber — does not return senate results for house query', () => {
      upsertLegislators([
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'senate', district: 10 }),
      ])

      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.chamber).toBe('house')
    })

    it('filters by district — does not return a different district', () => {
      upsertLegislators([
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'house', district: 11 }),
      ])

      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.district).toBe(10)
    })

    it('maps snake_case DB columns to camelCase Legislator fields (camelCase ↔ snake_case round-trip)', () => {
      upsertLegislators([makeLegislator({
        id: 'leg-001',
        chamber: 'house',
        district: 10,
        name: 'Jane Smith',
        email: 'jsmith@utah.gov',
        phone: '801-555-0100',
        phoneLabel: 'cell',
        session: '2025GS',
      })])

      const result = getLegislatorsByDistrict('house', 10)
      const leg = result[0]

      expect(leg).toMatchObject({
        id: 'leg-001',
        chamber: 'house',
        district: 10,
        name: 'Jane Smith',
        email: 'jsmith@utah.gov',
        phone: '801-555-0100',
        phoneLabel: 'cell',
        session: '2025GS',
      })
    })

    it('phone_label = null in DB → phoneTypeUnknown: true (AC#2, AC#3)', () => {
      const leg: Legislator = {
        id: 'leg-003',
        chamber: 'senate',
        district: 5,
        name: 'Bob Jones',
        email: 'bjones@utah.gov',
        phone: '801-555-0200',
        phoneTypeUnknown: true,
        session: '2025GS',
      }
      upsertLegislators([leg])

      const result = getLegislatorsByDistrict('senate', 5)
      expect(result[0]?.phoneTypeUnknown).toBe(true)
      expect(result[0]?.phoneLabel).toBeUndefined()
    })

    it('phone_label = "cell" in DB → { phoneLabel: "cell" } (no phoneTypeUnknown field)', () => {
      upsertLegislators([makeLegislator({ phoneLabel: 'cell', id: 'leg-004', district: 20 })])

      const result = getLegislatorsByDistrict('house', 20)
      expect(result[0]?.phoneLabel).toBe('cell')
      expect(result[0]?.phoneTypeUnknown).toBeUndefined()
    })

    it('round-trips all Legislator fields correctly', () => {
      const original = makeLegislator({
        id: 'leg-rt',
        chamber: 'senate',
        district: 15,
        name: 'Round Trip',
        email: 'rt@utah.gov',
        phone: '801-555-9999',
        phoneLabel: 'cell',
        session: '2026GS',
      })
      upsertLegislators([original])

      const result = getLegislatorsByDistrict('senate', 15)
      const leg = result[0]
      expect(leg?.id).toBe(original.id)
      expect(leg?.chamber).toBe(original.chamber)
      expect(leg?.district).toBe(original.district)
      expect(leg?.name).toBe(original.name)
      expect(leg?.email).toBe(original.email)
      expect(leg?.phone).toBe(original.phone)
      expect(leg?.phoneLabel).toBe(original.phoneLabel)
      expect(leg?.session).toBe(original.session)
    })
  })
})
