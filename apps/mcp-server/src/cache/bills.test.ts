// apps/mcp-server/src/cache/bills.test.ts
// Tests for writeBills, getBillsBySponsor, getBillsBySession, getActiveSessionId,
// searchBillsByTheme, searchBills using the D1 binding from cloudflare:test.
// All functions are async and accept D1Database — no singleton mock needed.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { applySchema } from './schema.js'
import { seedSessions } from './sessions.js'
import type { Bill } from '@on-record/types'
import {
  getBillsBySponsor,
  getBillsBySession,
  writeBills,
  searchBillsByTheme,
  getActiveSessionId,
  searchBills,
} from './bills.js'

beforeAll(async () => {
  await applySchema(env.DB)
  await seedSessions(env.DB)
})

describe('bills cache', () => {
  beforeEach(async () => {
    // Clear bills table and reset FTS5 between tests
    await env.DB.prepare('DELETE FROM bills').run()
    await env.DB.prepare("INSERT INTO bill_fts(bill_fts) VALUES('delete-all')").run()
  })

  // ── Fixture helpers ──────────────────────────────────────────────────────

  function makeBill(overrides: Partial<Bill> = {}): Bill {
    return {
      id: 'HB0001',
      session: '2026GS',
      title: 'Test Bill',
      summary: 'A test bill for unit testing',
      status: 'enrolled',
      sponsorId: 'leg-001',
      ...overrides,
    }
  }

  // ── writeBills ───────────────────────────────────────────────────────────

  describe('writeBills', () => {
    it('inserts bills into the bills table', async () => {
      await writeBills(env.DB, [makeBill()])

      const result = await env.DB.prepare('SELECT * FROM bills').all()
      expect(result.results).toHaveLength(1)
    })

    it('upserts by primary key — no duplicate rows on second call with same ids', async () => {
      const bill = makeBill()
      await writeBills(env.DB, [bill])
      await writeBills(env.DB, [bill])

      const result = await env.DB.prepare('SELECT * FROM bills').all()
      expect(result.results).toHaveLength(1)
    })

    it('replaces existing row on upsert — updated title is reflected', async () => {
      await writeBills(env.DB, [makeBill({ title: 'Original Title' })])
      await writeBills(env.DB, [makeBill({ title: 'Updated Title' })])

      const row = await env.DB.prepare('SELECT title FROM bills WHERE id = ?').bind('HB0001').first<{ title: string }>()
      expect(row?.title).toBe('Updated Title')
    })

    it('sets cached_at to a non-empty ISO 8601 string', async () => {
      await writeBills(env.DB, [makeBill()])

      const row = await env.DB.prepare('SELECT cached_at FROM bills WHERE id = ?').bind('HB0001').first<{ cached_at: string }>()
      expect(row?.cached_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('stores NULL for vote_result/vote_date when Bill fields are undefined', async () => {
      await writeBills(env.DB, [makeBill()])

      const row = await env.DB.prepare('SELECT vote_result, vote_date FROM bills WHERE id = ?').bind('HB0001').first<{ vote_result: string | null; vote_date: string | null }>()
      expect(row?.vote_result).toBeNull()
      expect(row?.vote_date).toBeNull()
    })

    it('stores values for vote_result/vote_date when present', async () => {
      await writeBills(env.DB, [makeBill({ voteResult: 'Passed', voteDate: '2026-03-01' })])

      const row = await env.DB.prepare('SELECT vote_result, vote_date FROM bills WHERE id = ?').bind('HB0001').first<{ vote_result: string | null; vote_date: string | null }>()
      expect(row?.vote_result).toBe('Passed')
      expect(row?.vote_date).toBe('2026-03-01')
    })

    it('inserts multiple bills in one call', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001' }),
        makeBill({ id: 'HB0002' }),
        makeBill({ id: 'HB0003' }),
      ])

      const result = await env.DB.prepare('SELECT * FROM bills').all()
      expect(result.results).toHaveLength(3)
    })

    it('is a no-op when passed empty array — does not throw', async () => {
      await expect(writeBills(env.DB, [])).resolves.toBeUndefined()
      const result = await env.DB.prepare('SELECT * FROM bills').all()
      expect(result.results).toHaveLength(0)
    })

    it('retains previously-cached bills not present in the new batch — partial refresh does not evict', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
      ])
      await writeBills(env.DB, [makeBill({ id: 'HB0002', session: '2026GS' })])

      const result = await env.DB.prepare("SELECT id FROM bills WHERE session = '2026GS' ORDER BY id").all<{ id: string }>()
      expect(result.results).toHaveLength(3)
      const ids = result.results.map((r) => r.id)
      expect(ids).toEqual(['HB0001', 'HB0002', 'HB0003'])
    })

    it('second call updates (not duplicates) bills already in cache', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS', title: 'Original Title' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'SB0001', session: '2025GS' }),
        makeBill({ id: 'SB0002', session: '2025GS' }),
      ])
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS', title: 'Updated Title' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
      ])

      const rows2026 = await env.DB.prepare("SELECT id, title FROM bills WHERE session = '2026GS' ORDER BY id").all<{ id: string; title: string }>()
      const rows2025 = await env.DB.prepare("SELECT id FROM bills WHERE session = '2025GS' ORDER BY id").all<{ id: string }>()

      expect(rows2026.results).toHaveLength(3)
      expect(rows2026.results.find((r) => r.id === 'HB0001')?.title).toBe('Updated Title')
      expect(rows2026.results.map((r) => r.id)).toContain('HB0002')
      expect(rows2026.results.map((r) => r.id)).toContain('HB0003')
      expect(rows2025.results).toHaveLength(2)
    })

    it('rebuilds FTS5 — after writeBills, FTS5 match query returns consistent results', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0001', title: 'Healthcare Reform Act' })])

      const ftsResult = await env.DB
        .prepare("SELECT rowid FROM bill_fts WHERE bill_fts MATCH 'Healthcare'")
        .all()
      expect(ftsResult.results.length).toBeGreaterThan(0)
    })
  })

  // ── getBillsBySponsor ────────────────────────────────────────────────────

  describe('getBillsBySponsor', () => {
    it('returns empty array when no bills cached (cache miss)', async () => {
      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result).toEqual([])
    })

    it('returns bills matching sponsorId', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0001', sponsorId: 'leg-001' })])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0001')
    })

    it('does not return bills with a different sponsorId', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-002' }),
      ])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result).toHaveLength(1)
      expect(result[0]?.sponsorId).toBe('leg-001')
    })

    it('maps snake_case DB columns to camelCase Bill fields (round-trip test)', async () => {
      await writeBills(env.DB, [
        makeBill({
          id: 'HB0001',
          session: '2026GS',
          title: 'Test Bill',
          summary: 'A test bill',
          status: 'enrolled',
          sponsorId: 'leg-001',
          voteResult: 'Passed',
          voteDate: '2026-03-01',
        }),
      ])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      const bill = result[0]
      expect(bill).toMatchObject({
        id: 'HB0001',
        session: '2026GS',
        title: 'Test Bill',
        summary: 'A test bill',
        status: 'enrolled',
        sponsorId: 'leg-001',
        voteResult: 'Passed',
        voteDate: '2026-03-01',
      })
    })

    it('vote_result = NULL in DB → voteResult is undefined (not null) in returned Bill', async () => {
      await writeBills(env.DB, [makeBill({ sponsorId: 'leg-001' })])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result[0]?.voteResult).toBeUndefined()
    })

    it('vote_result = Passed in DB → voteResult: Passed in returned Bill', async () => {
      await writeBills(env.DB, [makeBill({ sponsorId: 'leg-001', voteResult: 'Passed' })])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result[0]?.voteResult).toBe('Passed')
    })
  })

  // ── getBillsBySession ────────────────────────────────────────────────────

  describe('getBillsBySession', () => {
    it('returns empty array when no bills cached', async () => {
      const result = await getBillsBySession(env.DB, '2026GS')
      expect(result).toEqual([])
    })

    it('returns all bills for the session', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
      ])

      const result = await getBillsBySession(env.DB, '2026GS')
      expect(result).toHaveLength(2)
    })

    it('does not return bills from a different session', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2025GS' }),
      ])

      const result = await getBillsBySession(env.DB, '2026GS')
      expect(result).toHaveLength(1)
      expect(result[0]?.session).toBe('2026GS')
    })

    it('vote_result = NULL in DB → voteResult is undefined (not null) in returned Bill', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0001', session: '2026GS' })])

      const result = await getBillsBySession(env.DB, '2026GS')
      expect(result[0]?.voteResult).toBeUndefined()
      expect(result[0]?.voteDate).toBeUndefined()
    })
  })

  // ── getActiveSessionId ───────────────────────────────────────────────────

  describe('getActiveSessionId', () => {
    it('returns a non-empty string session ID', async () => {
      const result = await getActiveSessionId(env.DB)
      expect(result).toBeTypeOf('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  // ── searchBillsByTheme (deprecated — use searchBills) ───────────────────

  describe('searchBillsByTheme', () => {
    it('returns empty array when cache is empty', async () => {
      const result = await searchBillsByTheme(env.DB, 'leg-001', 'healthcare')
      expect(result).toEqual([])
    })

    it('returns matching bills when theme term appears in title or summary', async () => {
      const bill = makeBill({
        id: 'HB0042',
        title: 'Healthcare Reform Act',
        summary: 'Expands access to healthcare services statewide',
        sponsorId: 'leg-001',
      })
      await writeBills(env.DB, [bill])
      const result = await searchBillsByTheme(env.DB, 'leg-001', 'healthcare')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0042')
    })

    it('does not return bills for a different sponsor', async () => {
      const bill = makeBill({
        id: 'HB0042',
        title: 'Healthcare Reform Act',
        summary: 'Expands healthcare access',
        sponsorId: 'leg-001',
      })
      await writeBills(env.DB, [bill])
      const result = await searchBillsByTheme(env.DB, 'leg-002', 'healthcare')
      expect(result).toEqual([])
    })

    it('raw term — transportation matches transportation in summary', async () => {
      const bill = makeBill({
        id: 'HB0014',
        title: 'Infrastructure Act',
        summary: 'Funds public transportation improvements statewide',
        sponsorId: 'leg-001',
      })
      await writeBills(env.DB, [bill])
      const result = await searchBillsByTheme(env.DB, 'leg-001', 'transportation')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0014')
    })

    it('empty string theme returns empty array without throwing', async () => {
      expect((await searchBillsByTheme(env.DB, 'leg-001', '')).length).toBe(0)
    })

    it('whitespace-only theme returns empty array without throwing', async () => {
      expect((await searchBillsByTheme(env.DB, 'leg-001', '   ')).length).toBe(0)
    })

    it('malformed FTS5 input returns empty array instead of throwing', async () => {
      expect((await searchBillsByTheme(env.DB, 'leg-001', 'OR')).length).toBe(0)
      expect((await searchBillsByTheme(env.DB, 'leg-001', '"unclosed')).length).toBe(0)
      expect((await searchBillsByTheme(env.DB, 'leg-001', '*')).length).toBe(0)
    })

    it('returns only bills matching theme, not all sponsor bills', async () => {
      const healthcareBill = makeBill({
        id: 'HB0015',
        title: 'Healthcare Coverage Act',
        summary: 'Expands healthcare benefits',
        sponsorId: 'leg-001',
      })
      const transportBill = makeBill({
        id: 'HB0016',
        title: 'Transit Funding Act',
        summary: 'Funds public transportation improvements',
        sponsorId: 'leg-001',
      })
      await writeBills(env.DB, [healthcareBill, transportBill])
      const result = await searchBillsByTheme(env.DB, 'leg-001', 'healthcare')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0015')
    })
  })

  // ── searchBills ──────────────────────────────────────────────────────────

  describe('searchBills', () => {
    it('returns all bills (paginated) when no params provided', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'SB0001', session: '2025GS' }),
      ])

      const result = await searchBills(env.DB, {})
      expect(result.total).toBe(3)
      expect(result.bills).toHaveLength(3)
      expect(result.offset).toBe(0)
    })

    it('filters by sponsorId', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-002' }),
        makeBill({ id: 'HB0003', sponsorId: 'leg-001' }),
      ])

      const result = await searchBills(env.DB, { sponsorId: 'leg-001' })
      expect(result.total).toBe(2)
      expect(result.bills.every((b) => b.sponsorId === 'leg-001')).toBe(true)
    })

    it('filters by floorSponsorId', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001', floorSponsorId: 'HARPEWA' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-002' }),
        makeBill({ id: 'SB0001', sponsorId: 'leg-003', floorSponsorId: 'HARPEWA' }),
      ])

      const result = await searchBills(env.DB, { floorSponsorId: 'HARPEWA' })
      expect(result.total).toBe(2)
      expect(result.bills.every((b) => b.floorSponsorId === 'HARPEWA')).toBe(true)
    })

    it('filters by session', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2025GS' }),
      ])

      const result = await searchBills(env.DB, { session: '2026GS' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.session).toBe('2026GS')
    })

    it('filters chamber: house returns only H-prefix bills', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001' }),
        makeBill({ id: 'HB0002' }),
        makeBill({ id: 'SB0001' }),
        makeBill({ id: 'SR0001' }),
      ])

      const result = await searchBills(env.DB, { chamber: 'house' })
      expect(result.bills.every((b) => b.id.startsWith('H'))).toBe(true)
      expect(result.total).toBe(2)
    })

    it('filters chamber: senate returns only S-prefix bills', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001' }),
        makeBill({ id: 'SB0001' }),
        makeBill({ id: 'SJR0001' }),
      ])

      const result = await searchBills(env.DB, { chamber: 'senate' })
      expect(result.bills.every((b) => b.id.startsWith('S'))).toBe(true)
      expect(result.total).toBe(2)
    })

    it('filters by query using FTS5 — matches titles', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', title: 'Healthcare Reform Act', summary: 'Expands coverage' }),
        makeBill({ id: 'HB0002', title: 'Transportation Infrastructure', summary: 'Funds roads' }),
      ])

      const result = await searchBills(env.DB, { query: 'Healthcare' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HB0001')
    })

    it('empty query string falls through to table scan (does not throw SQLite error)', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0001' })])

      await expect(searchBills(env.DB, { query: '' })).resolves.toBeDefined()
      const result = await searchBills(env.DB, { query: '' })
      expect(result.total).toBe(1)
    })

    it('count + offset pagination: page 2 of size 2 from 5 bills', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
        makeBill({ id: 'HB0004', session: '2026GS' }),
        makeBill({ id: 'HB0005', session: '2026GS' }),
      ])

      const result = await searchBills(env.DB, { count: 2, offset: 2, session: '2026GS' })
      expect(result.bills).toHaveLength(2)
      expect(result.offset).toBe(2)
      expect(result.count).toBe(2)
      expect(result.total).toBe(5)
    })

    it('total field reflects full count, not just page size', async () => {
      await writeBills(env.DB, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0003', sponsorId: 'leg-001' }),
      ])

      const result = await searchBills(env.DB, { sponsorId: 'leg-001', count: 1, offset: 0 })
      expect(result.total).toBe(3)
      expect(result.bills).toHaveLength(1)
    })

    it('returns empty result (not error) when no bills match', async () => {
      const result = await searchBills(env.DB, { sponsorId: 'nobody' })
      expect(result.bills).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ── billUrl computation ──────────────────────────────────────────────────

  describe('billUrl computation', () => {
    it('computes billUrl for a GS session — year extracted from first 4 chars', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0001', session: '2026GS', sponsorId: 'leg-001' })])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result[0]?.billUrl).toBe('https://le.utah.gov/~2026/bills/static/HB0001.html')
    })

    it('computes billUrl for a special session — year extracted from first 4 chars', async () => {
      await writeBills(env.DB, [makeBill({ id: 'SB0013', session: '2025S1', sponsorId: 'leg-002' })])

      const result = await getBillsBySponsor(env.DB, 'leg-002')
      expect(result[0]?.billUrl).toBe('https://le.utah.gov/~2025/bills/static/SB0013.html')
    })
  })

  // ── fullText storage and retrieval ──────────────────────────────────────

  describe('fullText storage and retrieval', () => {
    it('stores and returns fullText when bill has fullText', async () => {
      await writeBills(env.DB, [makeBill({ fullText: 'Amends Section 53G-7-218 to require school cybersecurity plans' })])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result[0]?.fullText).toBe('Amends Section 53G-7-218 to require school cybersecurity plans')
    })

    it('returns fullText as undefined when bill has no fullText', async () => {
      await writeBills(env.DB, [makeBill()])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result[0]?.fullText).toBeUndefined()
    })

    it('strips HTML tags from fullText before storing', async () => {
      await writeBills(env.DB, [makeBill({ fullText: '<b>Amends</b> Section 53G-7-218 to <em>require</em> plans' })])

      const result = await getBillsBySponsor(env.DB, 'leg-001')
      expect(result[0]?.fullText).toBe('Amends Section 53G-7-218 to require plans')
    })

    it('FTS5 query matches content only in fullText — bill surfaces in search results', async () => {
      await writeBills(env.DB, [makeBill({
        id: 'HB0001',
        title: 'School Funding Act',
        summary: 'General school funding amendments',
        fullText: 'uniqueprovisionterm that appears nowhere else in this bill',
      })])

      const result = await searchBills(env.DB, { query: 'uniqueprovisionterm' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HB0001')
    })
  })

  // ── parseBillId (via searchBills) ────────────────────────────────────────

  describe('parseBillId (via searchBills)', () => {
    it('"HB88" matches stored "HB0088" via integer comparison', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0088' })])

      const result = await searchBills(env.DB, { billId: 'HB88' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HB0088')
    })

    it('"HB0088" matches stored "HB0088"', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0088' })])

      const result = await searchBills(env.DB, { billId: 'HB0088' })
      expect(result.total).toBe(1)
    })

    it('"hb88" (lowercase) matches stored "HB0088" — case-normalized', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0088' })])

      const result = await searchBills(env.DB, { billId: 'hb88' })
      expect(result.total).toBe(1)
    })

    it('"HJR01" matches stored "HJR0001"', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HJR0001' })])

      const result = await searchBills(env.DB, { billId: 'HJR01' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HJR0001')
    })

    it('unrecognized format (no digits) falls back to exact match — returns nothing for "HB"', async () => {
      await writeBills(env.DB, [makeBill({ id: 'HB0001' })])

      const result = await searchBills(env.DB, { billId: 'HB' })
      expect(result.total).toBe(0)
    })
  })
})
