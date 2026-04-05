// apps/mcp-server/src/cache/legislators.test.ts
// Tests for getLegislatorsByDistrict, getLegislatorById, getLegislatorsByName, writeLegislators.
// All functions are async and accept D1Database — use env.DB from cloudflare:test.
// No db singleton mock needed: all functions receive db as a parameter.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { applySchema } from './schema.js'
import type { Legislator } from '@on-record/types'
import {
  getLegislatorsByDistrict,
  getLegislatorById,
  getLegislatorsByName,
  writeLegislators,
} from './legislators.js'

beforeAll(async () => {
  await applySchema(env.DB)
})

describe('legislators cache', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM legislators').run()
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
    it('inserts legislators into the table', async () => {
      await writeLegislators(env.DB, [makeLegislator()])

      const result = await env.DB.prepare('SELECT * FROM legislators').all()
      expect(result.results).toHaveLength(1)
    })

    it('upserts by primary key — does not create duplicates on second write', async () => {
      const leg = makeLegislator()
      await writeLegislators(env.DB, [leg])
      await writeLegislators(env.DB, [leg])

      const result = await env.DB.prepare('SELECT * FROM legislators').all()
      expect(result.results).toHaveLength(1)
    })

    it('replaces existing row on upsert — updates name', async () => {
      await writeLegislators(env.DB, [makeLegislator({ name: 'Original Name' })])
      await writeLegislators(env.DB, [makeLegislator({ name: 'Updated Name' })])

      const row = await env.DB.prepare('SELECT name FROM legislators WHERE id = ?').bind('leg-001').first<{ name: string }>()
      expect(row?.name).toBe('Updated Name')
    })

    it('sets cached_at to a non-empty ISO 8601 string', async () => {
      await writeLegislators(env.DB, [makeLegislator()])

      const row = await env.DB.prepare('SELECT cached_at FROM legislators WHERE id = ?').bind('leg-001').first<{ cached_at: string }>()
      expect(row?.cached_at).toBeTruthy()
      expect(new Date(row?.cached_at ?? '').toISOString()).toBeTruthy()
    })

    it('stores phone_label as NULL when phoneTypeUnknown is true', async () => {
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
      await writeLegislators(env.DB, [leg])

      const row = await env.DB.prepare('SELECT phone_label FROM legislators WHERE id = ?').bind('leg-002').first<{ phone_label: string | null }>()
      expect(row?.phone_label).toBeNull()
    })

    it('stores phone_label when phoneLabel is set', async () => {
      await writeLegislators(env.DB, [makeLegislator({ phoneLabel: 'district office' })])

      const row = await env.DB.prepare('SELECT phone_label FROM legislators WHERE id = ?').bind('leg-001').first<{ phone_label: string | null }>()
      expect(row?.phone_label).toBe('district office')
    })

    it('inserts multiple legislators in one call', async () => {
      const legs = [
        makeLegislator({ id: 'leg-001', district: 10 }),
        makeLegislator({ id: 'leg-002', district: 11 }),
        makeLegislator({ id: 'leg-003', district: 12 }),
      ]
      await writeLegislators(env.DB, legs)

      const result = await env.DB.prepare('SELECT * FROM legislators').all()
      expect(result.results).toHaveLength(3)
    })

    it('is a no-op when passed an empty array', async () => {
      await expect(writeLegislators(env.DB, [])).resolves.toBeUndefined()
      const result = await env.DB.prepare('SELECT * FROM legislators').all()
      expect(result.results).toHaveLength(0)
    })
  })

  // ── getLegislatorsByDistrict ─────────────────────────────────────────────

  describe('getLegislatorsByDistrict', () => {
    it('returns empty array when no legislators are cached (AC#2 — cache miss)', async () => {
      const result = await getLegislatorsByDistrict(env.DB, 'house', 10)
      expect(result).toEqual([])
    })

    it('returns legislators matching chamber and district', async () => {
      await writeLegislators(env.DB, [makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 })])

      const result = await getLegislatorsByDistrict(env.DB, 'house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('leg-001')
    })

    it('filters by chamber — does not return senate results for house query', async () => {
      await writeLegislators(env.DB, [
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'senate', district: 10 }),
      ])

      const result = await getLegislatorsByDistrict(env.DB, 'house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.chamber).toBe('house')
    })

    it('filters by district — does not return a different district', async () => {
      await writeLegislators(env.DB, [
        makeLegislator({ id: 'leg-001', chamber: 'house', district: 10 }),
        makeLegislator({ id: 'leg-002', chamber: 'house', district: 11 }),
      ])

      const result = await getLegislatorsByDistrict(env.DB, 'house', 10)
      expect(result).toHaveLength(1)
      expect(result[0]?.district).toBe(10)
    })

    it('maps snake_case DB columns to camelCase Legislator fields (round-trip)', async () => {
      await writeLegislators(env.DB, [makeLegislator({
        id: 'leg-001',
        chamber: 'house',
        district: 10,
        name: 'Jane Smith',
        email: 'jsmith@utah.gov',
        phone: '801-555-0100',
        phoneLabel: 'cell',
        session: '2025GS',
      })])

      const result = await getLegislatorsByDistrict(env.DB, 'house', 10)
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

    it('phone_label = null in DB → phoneTypeUnknown: true', async () => {
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
      await writeLegislators(env.DB, [leg])

      const result = await getLegislatorsByDistrict(env.DB, 'senate', 5)
      expect(result[0]?.phoneTypeUnknown).toBe(true)
      expect(result[0]?.phoneLabel).toBeUndefined()
    })

    it('phone_label = "cell" in DB → { phoneLabel: "cell" } (no phoneTypeUnknown field)', async () => {
      await writeLegislators(env.DB, [makeLegislator({ phoneLabel: 'cell', id: 'leg-004', district: 20 })])

      const result = await getLegislatorsByDistrict(env.DB, 'house', 20)
      expect(result[0]?.phoneLabel).toBe('cell')
      expect(result[0]?.phoneTypeUnknown).toBeUndefined()
    })

    it('round-trips all Legislator fields correctly', async () => {
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
      await writeLegislators(env.DB, [original])

      const result = await getLegislatorsByDistrict(env.DB, 'senate', 15)
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
    it('returns the legislator for an exact ID match', async () => {
      await writeLegislators(env.DB, [makeLegislator({ id: 'DAILEJ', name: 'Jennifer Dailey-Provost' })])

      const result = await getLegislatorById(env.DB, 'DAILEJ')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('DAILEJ')
      expect(result?.name).toBe('Jennifer Dailey-Provost')
    })

    it('returns null for an unknown ID', async () => {
      const result = await getLegislatorById(env.DB, 'NOBODY')
      expect(result).toBeNull()
    })

    it('phone_label null → phoneTypeUnknown: true', async () => {
      const leg: Legislator = {
        id: 'UNKNWN',
        chamber: 'house',
        district: 5,
        name: 'Unknown Phone',
        email: 'up@utah.gov',
        phone: '801-555-0001',
        phoneTypeUnknown: true,
        session: '2026GS',
      }
      await writeLegislators(env.DB, [leg])

      const result = await getLegislatorById(env.DB, 'UNKNWN')
      expect(result?.phoneTypeUnknown).toBe(true)
      expect(result?.phoneLabel).toBeUndefined()
    })

    it('phone_label present → phoneLabel field set', async () => {
      await writeLegislators(env.DB, [makeLegislator({ id: 'LABELD', phoneLabel: 'district office' })])

      const result = await getLegislatorById(env.DB, 'LABELD')
      expect(result?.phoneLabel).toBe('district office')
      expect(result?.phoneTypeUnknown).toBeUndefined()
    })
  })

  // ── getLegislatorsByName ─────────────────────────────────────────────────

  describe('getLegislatorsByName', () => {
    it('returns matching legislators for a partial name', async () => {
      await writeLegislators(env.DB, [
        makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' }),
        makeLegislator({ id: 'SMITHB', name: 'Bob Smithson', district: 11 }),
        makeLegislator({ id: 'JONESE', name: 'Eric Jones', district: 12 }),
      ])

      const result = await getLegislatorsByName(env.DB, 'Smith')
      expect(result).toHaveLength(2)
      const ids = result.map((l) => l.id)
      expect(ids).toContain('SMITHJ')
      expect(ids).toContain('SMITHB')
    })

    it('name match is case-insensitive — "smith" matches "Jane Smith"', async () => {
      await writeLegislators(env.DB, [makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' })])

      const result = await getLegislatorsByName(env.DB, 'smith')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('SMITHJ')
    })

    it('returns empty array when no name matches', async () => {
      await writeLegislators(env.DB, [makeLegislator({ id: 'SMITHJ', name: 'Jane Smith' })])

      const result = await getLegislatorsByName(env.DB, 'Zzznotaname')
      expect(result).toEqual([])
    })

    it('phone_label null → phoneTypeUnknown: true', async () => {
      const leg: Legislator = {
        id: 'NOLAB',
        chamber: 'senate',
        district: 3,
        name: 'No Label',
        email: 'nl@utah.gov',
        phone: '801-555-0002',
        phoneTypeUnknown: true,
        session: '2026GS',
      }
      await writeLegislators(env.DB, [leg])

      const result = await getLegislatorsByName(env.DB, 'No Label')
      expect(result[0]?.phoneTypeUnknown).toBe(true)
      expect(result[0]?.phoneLabel).toBeUndefined()
    })

    it('phone_label present → phoneLabel field set', async () => {
      await writeLegislators(env.DB, [makeLegislator({ id: 'LABLN', name: 'Labeled Name', phoneLabel: 'cell' })])

      const result = await getLegislatorsByName(env.DB, 'Labeled Name')
      expect(result[0]?.phoneLabel).toBe('cell')
      expect(result[0]?.phoneTypeUnknown).toBeUndefined()
    })
  })
})
