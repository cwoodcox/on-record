// apps/mcp-server/src/cache/legislators.test.ts
// Tests for getLegislatorsByDistrict and writeLegislators using in-memory SQLite.
//
// Architecture:
//   - writeLegislators: receives db as a parameter — use in-memory db directly.
//   - getLegislatorsByDistrict: uses the db singleton from ./db.js — inject via vi.mock.
//
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import type { Legislator } from '@on-record/types'

// Create in-memory test DB before mock registration
const testDb = new Database(':memory:')
initializeSchema(testDb)

// Inject testDb as the `db` singleton before module under test is evaluated.
// Vitest hoists vi.mock() calls so the mock is in place when the module evaluates.
vi.mock('./db.js', () => ({ db: testDb }))

// Import after mock is registered — use dynamic import inside beforeAll to avoid
// TS1309 (top-level await not allowed in CommonJS modules).
import type {
  getLegislatorsByDistrict as GetByDistrictFn,
  getLegislatorById as GetByIdFn,
  getLegislatorsByName as GetByNameFn,
  writeLegislators as WriteFn,
} from './legislators.js'
let getLegislatorsByDistrict: typeof GetByDistrictFn
let getLegislatorById: typeof GetByIdFn
let getLegislatorsByName: typeof GetByNameFn
let writeLegislators: typeof WriteFn

beforeAll(async () => {
  const mod = await import('./legislators.js')
  getLegislatorsByDistrict = mod.getLegislatorsByDistrict
  getLegislatorById = mod.getLegislatorById
  getLegislatorsByName = mod.getLegislatorsByName
  writeLegislators = mod.writeLegislators
})

describe('legislators cache', () => {
  beforeEach(() => {
    // Clear table between tests for isolation
    testDb.prepare('DELETE FROM legislators').run()
  })

  afterEach(() => {
    // Note: testDb is shared across all tests in this module; close is deferred until
    // the module is torn down. Individual tests clear the table in beforeEach instead.
    // (Closing a module-level in-memory db in afterEach would break subsequent tests.)
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

  // ── writeLegislators ────────────────────────────────────────────────────

  describe('writeLegislators', () => {
    it('inserts legislators into the table', () => {
      const leg = makeLegislator()
      writeLegislators(testDb, [leg])

      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(1)
    })

    it('upserts by primary key — does not create duplicates on second write', () => {
      const leg = makeLegislator()
      writeLegislators(testDb, [leg])
      writeLegislators(testDb, [leg])

      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(1)
    })

    it('replaces existing row on upsert — updates name', () => {
      writeLegislators(testDb, [makeLegislator({ name: 'Original Name' })])
      writeLegislators(testDb, [makeLegislator({ name: 'Updated Name' })])

      const row = testDb.prepare('SELECT name FROM legislators WHERE id = ?').get('leg-001') as { name: string } | undefined
      expect(row?.name).toBe('Updated Name')
    })

    it('sets cached_at to a non-empty ISO 8601 string', () => {
      writeLegislators(testDb, [makeLegislator()])

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
      writeLegislators(testDb, [leg])

      const row = testDb.prepare('SELECT phone_label FROM legislators WHERE id = ?').get('leg-002') as { phone_label: string | null } | undefined
      expect(row?.phone_label).toBeNull()
    })

    it('stores phone_label when phoneLabel is set', () => {
      writeLegislators(testDb, [makeLegislator({ phoneLabel: 'district office' })])

      const row = testDb.prepare('SELECT phone_label FROM legislators WHERE id = ?').get('leg-001') as { phone_label: string | null } | undefined
      expect(row?.phone_label).toBe('district office')
    })

    it('inserts multiple legislators in one call', () => {
      const legs = [
        makeLegislator({ id: 'leg-001', district: 10 }),
        makeLegislator({ id: 'leg-002', district: 11 }),
        makeLegislator({ id: 'leg-003', district: 12 }),
      ]
      writeLegislators(testDb, legs)

      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(3)
    })

    it('is a no-op when passed an empty array', () => {
      expect(() => writeLegislators(testDb, [])).not.toThrow()
      const rows = testDb.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(0)
    })
  })

  // ── getLegislatorsByDistrict ─────────────────────────────────────────────

  describe('getLegislatorsByDistrict', () => {
    it('returns empty array when no legislators are cached (AC#2 — cache miss)', () => {
      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toEqual([])
    })

    it('returns legislators matching chamber and district', () => {
      writeLegislators(testDb, [makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 })])

      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('leg-001')
    })

    it('filters by chamber — does not return senate results for house query', () => {
      writeLegislators(testDb, [
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'senate', district: 10 }),
      ])

      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.chamber).toBe('house')
    })

    it('filters by district — does not return a different district', () => {
      writeLegislators(testDb, [
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'house', district: 11 }),
      ])

      const result = getLegislatorsByDistrict('house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.district).toBe(10)
    })

    it('maps snake_case DB columns to camelCase Legislator fields (camelCase ↔ snake_case round-trip)', () => {
      writeLegislators(testDb, [makeLegislator({
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

    it('phone_label = null in DB → phoneTypeUnknown: true (AC#1, AC#6)', () => {
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
      writeLegislators(testDb, [leg])

      const result = getLegislatorsByDistrict('senate', 5)
      expect(result[0]?.phoneTypeUnknown).toBe(true)
      expect(result[0]?.phoneLabel).toBeUndefined()
    })

    it('phone_label = "cell" in DB → { phoneLabel: "cell" } (no phoneTypeUnknown field)', () => {
      writeLegislators(testDb, [makeLegislator({ phoneLabel: 'cell', id: 'leg-004', district: 20 })])

      const result = getLegislatorsByDistrict('house', 20)
      expect(result[0]?.phoneLabel).toBe('cell')
      expect(result[0]?.phoneTypeUnknown).toBeUndefined()
    })

    it('round-trips all Legislator fields correctly (getLegislatorsByDistrict)', () => {
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
      writeLegislators(testDb, [original])

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

  // ── getLegislatorById ────────────────────────────────────────────────────

  describe('getLegislatorById', () => {
    it('returns the legislator for an exact ID match', () => {
      writeLegislators(testDb, [makeLegislator({ id: 'DAILEJ', name: 'Jennifer Dailey-Provost' })])

      const result = getLegislatorById('DAILEJ')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('DAILEJ')
      expect(result?.name).toBe('Jennifer Dailey-Provost')
    })

    it('returns null for an unknown ID', () => {
      const result = getLegislatorById('NOBODY')
      expect(result).toBeNull()
    })

    it('phone_label null → phoneTypeUnknown: true', () => {
      const leg: import('@on-record/types').Legislator = {
        id: 'UNKNWN',
        chamber: 'house',
        district: 5,
        name: 'Unknown Phone',
        email: 'up@utah.gov',
        phone: '801-555-0001',
        phoneTypeUnknown: true,
        session: '2026GS',
      }
      writeLegislators(testDb, [leg])

      const result = getLegislatorById('UNKNWN')
      expect(result?.phoneTypeUnknown).toBe(true)
      expect(result?.phoneLabel).toBeUndefined()
    })

    it('phone_label present → phoneLabel field set', () => {
      writeLegislators(testDb, [makeLegislator({ id: 'LABELD', phoneLabel: 'district office' })])

      const result = getLegislatorById('LABELD')
      expect(result?.phoneLabel).toBe('district office')
      expect(result?.phoneTypeUnknown).toBeUndefined()
    })
  })

  // ── getLegislatorsByName ─────────────────────────────────────────────────

  describe('getLegislatorsByName', () => {
    it('returns matching legislators for a partial name', () => {
      writeLegislators(testDb, [
        makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' }),
        makeLegislator({ id: 'SMITHB', name: 'Bob Smithson', district: 11 }),
        makeLegislator({ id: 'JONESE', name: 'Eric Jones', district: 12 }),
      ])

      const result = getLegislatorsByName('Smith')
      expect(result).toHaveLength(2)
      const ids = result.map((l) => l.id)
      expect(ids).toContain('SMITHJ')
      expect(ids).toContain('SMITHB')
    })

    it('name match is case-insensitive — "smith" matches "Jane Smith"', () => {
      writeLegislators(testDb, [makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' })])

      const result = getLegislatorsByName('smith')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('SMITHJ')
    })

    it('returns empty array when no name matches', () => {
      writeLegislators(testDb, [makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' })])

      const result = getLegislatorsByName('Zzznotaname')
      expect(result).toEqual([])
    })

    it('phone_label null → phoneTypeUnknown: true', () => {
      const leg: import('@on-record/types').Legislator = {
        id: 'NOLAB',
        chamber: 'senate',
        district: 3,
        name: 'No Label',
        email: 'nl@utah.gov',
        phone: '801-555-0002',
        phoneTypeUnknown: true,
        session: '2026GS',
      }
      writeLegislators(testDb, [leg])

      const result = getLegislatorsByName('No Label')
      expect(result[0]?.phoneTypeUnknown).toBe(true)
      expect(result[0]?.phoneLabel).toBeUndefined()
    })

    it('phone_label present → phoneLabel field set', () => {
      writeLegislators(testDb, [makeLegislator({ id: 'LABLN', name: 'Labeled Name', phoneLabel: 'cell' })])

      const result = getLegislatorsByName('Labeled Name')
      expect(result[0]?.phoneLabel).toBe('cell')
      expect(result[0]?.phoneTypeUnknown).toBeUndefined()
    })
  })
})

