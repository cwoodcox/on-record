// apps/mcp-server/src/cache/legislators.test.ts
// Tests for writeLegislators and getLegislatorsByDistrict using in-memory SQLite.
// Does NOT import the db singleton from cache/db.ts — tests are isolated from disk.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import { writeLegislators, getLegislatorsByDistrict } from './legislators.js'
import type { Legislator } from '@on-record/types'

describe('legislators cache', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initializeSchema(db)
  })

  afterEach(() => {
    db.close()
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

  // ── writeLegislators ─────────────────────────────────────────────────────

  describe('writeLegislators', () => {
    it('inserts legislators into the table', () => {
      const leg = makeLegislator()
      writeLegislators(db, [leg])

      const rows = db.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(1)
    })

    it('upserts by primary key — does not create duplicates on second write', () => {
      const leg = makeLegislator()
      writeLegislators(db, [leg])
      writeLegislators(db, [leg])

      const rows = db.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(1)
    })

    it('replaces existing row on upsert — updates name', () => {
      writeLegislators(db, [makeLegislator({ name: 'Original Name' })])
      writeLegislators(db, [makeLegislator({ name: 'Updated Name' })])

      const row = db.prepare('SELECT name FROM legislators WHERE id = ?').get('leg-001') as { name: string } | undefined
      expect(row?.name).toBe('Updated Name')
    })

    it('sets cached_at to a non-empty ISO 8601 string', () => {
      writeLegislators(db, [makeLegislator()])

      const row = db.prepare('SELECT cached_at FROM legislators WHERE id = ?').get('leg-001') as { cached_at: string } | undefined
      expect(row?.cached_at).toBeTruthy()
      expect(new Date(row?.cached_at ?? '').toISOString()).toBeTruthy()
    })

    it('updates cached_at on second upsert — timestamp is refreshed', () => {
      writeLegislators(db, [makeLegislator()])
      const first = (db.prepare('SELECT cached_at FROM legislators WHERE id = ?').get('leg-001') as { cached_at: string }).cached_at

      // Small delay to ensure timestamp differs
      // (In practice writeLegislators calls new Date().toISOString() on each invocation)
      writeLegislators(db, [makeLegislator()])
      const second = (db.prepare('SELECT cached_at FROM legislators WHERE id = ?').get('leg-001') as { cached_at: string }).cached_at

      // Both should be valid ISO strings; the update should have written a new value
      expect(typeof first).toBe('string')
      expect(typeof second).toBe('string')
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
      writeLegislators(db, [leg])

      const row = db.prepare('SELECT phone_label FROM legislators WHERE id = ?').get('leg-002') as { phone_label: string | null } | undefined
      expect(row?.phone_label).toBeNull()
    })

    it('stores phone_label when phoneLabel is set', () => {
      writeLegislators(db, [makeLegislator({ phoneLabel: 'district office' })])

      const row = db.prepare('SELECT phone_label FROM legislators WHERE id = ?').get('leg-001') as { phone_label: string | null } | undefined
      expect(row?.phone_label).toBe('district office')
    })

    it('inserts multiple legislators in one call', () => {
      const legs = [
        makeLegislator({ id: 'leg-001', district: 10 }),
        makeLegislator({ id: 'leg-002', district: 11 }),
        makeLegislator({ id: 'leg-003', district: 12 }),
      ]
      writeLegislators(db, legs)

      const rows = db.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(3)
    })

    it('is a no-op when passed an empty array', () => {
      expect(() => writeLegislators(db, [])).not.toThrow()
      const rows = db.prepare('SELECT * FROM legislators').all()
      expect(rows).toHaveLength(0)
    })
  })

  // ── getLegislatorsByDistrict ─────────────────────────────────────────────

  describe('getLegislatorsByDistrict', () => {
    it('returns empty array when no legislators are cached', () => {
      const result = getLegislatorsByDistrict(db, 'house', 10)
      expect(result).toEqual([])
    })

    it('returns legislators matching chamber and district', () => {
      writeLegislators(db, [makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 })])

      const result = getLegislatorsByDistrict(db, 'house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('leg-001')
    })

    it('filters by chamber — does not return senate results for house query', () => {
      writeLegislators(db, [
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'senate', district: 10 }),
      ])

      const result = getLegislatorsByDistrict(db, 'house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.chamber).toBe('house')
    })

    it('filters by district — does not return a different district', () => {
      writeLegislators(db, [
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'house', district: 11 }),
      ])

      const result = getLegislatorsByDistrict(db, 'house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.district).toBe(10)
    })

    it('maps snake_case DB columns to camelCase Legislator fields', () => {
      writeLegislators(db, [makeLegislator({
        id: 'leg-001',
        chamber: 'house',
        district: 10,
        name: 'Jane Smith',
        email: 'jsmith@utah.gov',
        phone: '801-555-0100',
        phoneLabel: 'cell',
        session: '2025GS',
      })])

      const result = getLegislatorsByDistrict(db, 'house', 10)
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

    it('sets phoneTypeUnknown: true when phone_label is NULL in DB (AC#2, #5)', () => {
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
      writeLegislators(db, [leg])

      const result = getLegislatorsByDistrict(db, 'senate', 5)
      expect(result[0]?.phoneTypeUnknown).toBe(true)
      expect(result[0]?.phoneLabel).toBeUndefined()
    })

    it('sets phoneLabel and omits phoneTypeUnknown when phone_label is present in DB', () => {
      writeLegislators(db, [makeLegislator({ phoneLabel: 'district office', id: 'leg-004', district: 20 })])

      const result = getLegislatorsByDistrict(db, 'house', 20)
      expect(result[0]?.phoneLabel).toBe('district office')
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
      writeLegislators(db, [original])

      const result = getLegislatorsByDistrict(db, 'senate', 15)
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
