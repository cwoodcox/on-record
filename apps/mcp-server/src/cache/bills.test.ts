// apps/mcp-server/src/cache/bills.test.ts
// Tests for writeBills, getBillsBySponsor, getBillsBySession, getActiveSessionId,
// searchBillsByTheme, searchBills (including parseBillId via searchBills) using in-memory SQLite.
//
// Architecture:
//   - writeBills: receives db as a parameter — use in-memory db directly.
//   - getBillsBySponsor, getBillsBySession, searchBills: use the db singleton from ./db.js — inject via vi.mock.
//
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import { seedSessions } from './sessions.js'
import type { Bill } from '@on-record/types'

// Create in-memory test DB before mock registration
const testDb = new Database(':memory:')
initializeSchema(testDb)
seedSessions(testDb)

// Inject testDb as the `db` singleton before module under test is evaluated.
// Vitest hoists vi.mock() calls so the mock is in place when the module evaluates.
vi.mock('./db.js', () => ({ db: testDb }))

// Import after mock is registered — use dynamic import inside beforeAll to avoid
// TS1309 (top-level await not allowed in CommonJS modules).
import type {
  getBillsBySponsor as GetBySponsorFn,
  getBillsBySession as GetBySessionFn,
  writeBills as WriteFn,
  searchBillsByTheme as SearchFn,
  getActiveSessionId as GetActiveSessionIdFn,
  searchBills as SearchBillsFn,
} from './bills.js'
let getBillsBySponsor: typeof GetBySponsorFn
let getBillsBySession: typeof GetBySessionFn
let writeBills: typeof WriteFn
let searchBillsByTheme: typeof SearchFn
let getActiveSessionId: typeof GetActiveSessionIdFn
let searchBills: typeof SearchBillsFn

beforeAll(async () => {
  const mod = await import('./bills.js')
  getBillsBySponsor = mod.getBillsBySponsor
  getBillsBySession = mod.getBillsBySession
  writeBills = mod.writeBills
  searchBillsByTheme = mod.searchBillsByTheme
  getActiveSessionId = mod.getActiveSessionId
  searchBills = mod.searchBills
})

describe('bills cache', () => {
  beforeEach(() => {
    // Clear table between tests for isolation
    testDb.prepare('DELETE FROM bills').run()
    // Reset FTS5 after clearing bills table
    testDb.prepare("INSERT INTO bill_fts(bill_fts) VALUES('delete-all')").run()
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
    it('inserts bills into the bills table', () => {
      const bill = makeBill()
      writeBills(testDb, [bill])

      const rows = testDb.prepare('SELECT * FROM bills').all()
      expect(rows).toHaveLength(1)
    })

    it('upserts by primary key — no duplicate rows on second call with same ids', () => {
      const bill = makeBill()
      writeBills(testDb, [bill])
      writeBills(testDb, [bill])

      const rows = testDb.prepare('SELECT * FROM bills').all()
      expect(rows).toHaveLength(1)
    })

    it('replaces existing row on upsert — updated title is reflected', () => {
      writeBills(testDb, [makeBill({ title: 'Original Title' })])
      writeBills(testDb, [makeBill({ title: 'Updated Title' })])

      const row = testDb
        .prepare('SELECT title FROM bills WHERE id = ?')
        .get('HB0001') as { title: string } | undefined
      expect(row?.title).toBe('Updated Title')
    })

    it('sets cached_at to a non-empty ISO 8601 string', () => {
      writeBills(testDb, [makeBill()])

      const row = testDb
        .prepare('SELECT cached_at FROM bills WHERE id = ?')
        .get('HB0001') as { cached_at: string } | undefined
      expect(row?.cached_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('stores NULL for vote_result/vote_date when Bill fields are undefined', () => {
      // makeBill() leaves voteResult/voteDate absent (undefined) by default
      writeBills(testDb, [makeBill()])

      const row = testDb
        .prepare('SELECT vote_result, vote_date FROM bills WHERE id = ?')
        .get('HB0001') as { vote_result: string | null; vote_date: string | null } | undefined
      expect(row?.vote_result).toBeNull()
      expect(row?.vote_date).toBeNull()
    })

    it('stores values for vote_result/vote_date when present', () => {
      writeBills(testDb, [makeBill({ voteResult: 'Passed', voteDate: '2026-03-01' })])

      const row = testDb
        .prepare('SELECT vote_result, vote_date FROM bills WHERE id = ?')
        .get('HB0001') as { vote_result: string | null; vote_date: string | null } | undefined
      expect(row?.vote_result).toBe('Passed')
      expect(row?.vote_date).toBe('2026-03-01')
    })

    it('inserts multiple bills in one call', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001' }),
        makeBill({ id: 'HB0002' }),
        makeBill({ id: 'HB0003' }),
      ])

      const rows = testDb.prepare('SELECT * FROM bills').all()
      expect(rows).toHaveLength(3)
    })

    it('is a no-op when passed empty array — does not throw', () => {
      expect(() => writeBills(testDb, [])).not.toThrow()
      const rows = testDb.prepare('SELECT * FROM bills').all()
      expect(rows).toHaveLength(0)
    })

    it('retains previously-cached bills not present in the new batch — partial refresh does not evict', () => {
      // Simulate first (complete) refresh: 3 bills
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
      ])
      // Simulate second refresh where HB0001 and HB0003 fail to fetch (Promise.allSettled
      // skips them); only HB0002 is in the batch.
      // With upsert semantics, HB0001 and HB0003 must remain in cache — not evicted.
      writeBills(testDb, [makeBill({ id: 'HB0002', session: '2026GS' })])

      const rows = testDb.prepare("SELECT id FROM bills WHERE session = '2026GS' ORDER BY id").all()
      expect(rows).toHaveLength(3)
      const ids = (rows as { id: string }[]).map((r) => r.id)
      expect(ids).toEqual(['HB0001', 'HB0002', 'HB0003'])
    })

    it('second call updates (not duplicates) bills already in cache', () => {
      // Pre-populate both sessions
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS', title: 'Original Title' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'SB0001', session: '2025GS' }),
        makeBill({ id: 'SB0002', session: '2025GS' }),
      ])
      // Refresh with a mixed payload that includes HB0001 with an updated title, and adds
      // HB0003; HB0002, SB0001, SB0002 are absent from this batch but must be retained.
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS', title: 'Updated Title' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
      ])

      const rows2026 = testDb.prepare("SELECT id, title FROM bills WHERE session = '2026GS' ORDER BY id").all() as { id: string; title: string }[]
      const rows2025 = testDb.prepare("SELECT id FROM bills WHERE session = '2025GS' ORDER BY id").all() as { id: string }[]

      // All 2026GS bills present (HB0001 updated, HB0002 retained, HB0003 new)
      expect(rows2026).toHaveLength(3)
      expect(rows2026.find((r) => r.id === 'HB0001')?.title).toBe('Updated Title')
      expect(rows2026.map((r) => r.id)).toContain('HB0002')
      expect(rows2026.map((r) => r.id)).toContain('HB0003')

      // 2025GS bills retained (not touched by this 2026GS batch)
      expect(rows2025).toHaveLength(2)
    })

    it('rebuilds FTS5 — after writeBills, FTS5 match query returns consistent results', () => {
      writeBills(testDb, [makeBill({ id: 'HB0001', title: 'Healthcare Reform Act' })])

      const ftsRows = testDb
        .prepare("SELECT rowid FROM bill_fts WHERE bill_fts MATCH 'Healthcare'")
        .all()
      expect(ftsRows.length).toBeGreaterThan(0)
    })
  })

  // ── getBillsBySponsor ────────────────────────────────────────────────────

  describe('getBillsBySponsor', () => {
    it('returns empty array when no bills cached (cache miss)', () => {
      const result = getBillsBySponsor('leg-001')
      expect(result).toEqual([])
    })

    it('returns bills matching sponsorId', () => {
      writeBills(testDb, [makeBill({ id: 'HB0001', sponsorId: 'leg-001' })])

      const result = getBillsBySponsor('leg-001')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0001')
    })

    it('does not return bills with a different sponsorId', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-002' }),
      ])

      const result = getBillsBySponsor('leg-001')
      expect(result).toHaveLength(1)
      expect(result[0]?.sponsorId).toBe('leg-001')
    })

    it('maps snake_case DB columns to camelCase Bill fields (round-trip test)', () => {
      writeBills(testDb, [
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

      const result = getBillsBySponsor('leg-001')
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

    it('vote_result = NULL in DB → voteResult is undefined (not null) in returned Bill', () => {
      // makeBill() leaves voteResult absent (undefined) by default
      writeBills(testDb, [makeBill({ sponsorId: 'leg-001' })])

      const result = getBillsBySponsor('leg-001')
      expect(result[0]?.voteResult).toBeUndefined()
    })

    it('vote_result = Passed in DB → voteResult: Passed in returned Bill', () => {
      writeBills(testDb, [makeBill({ sponsorId: 'leg-001', voteResult: 'Passed' })])

      const result = getBillsBySponsor('leg-001')
      expect(result[0]?.voteResult).toBe('Passed')
    })
  })

  // ── getBillsBySession ────────────────────────────────────────────────────

  describe('getBillsBySession', () => {
    it('returns empty array when no bills cached', () => {
      const result = getBillsBySession('2026GS')
      expect(result).toEqual([])
    })

    it('returns all bills for the session', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
      ])

      const result = getBillsBySession('2026GS')
      expect(result).toHaveLength(2)
    })

    it('does not return bills from a different session', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2025GS' }),
      ])

      const result = getBillsBySession('2026GS')
      expect(result).toHaveLength(1)
      expect(result[0]?.session).toBe('2026GS')
    })

    it('vote_result = NULL in DB → voteResult is undefined (not null) in returned Bill', () => {
      // makeBill() leaves voteResult/voteDate absent (undefined) → stored as NULL
      writeBills(testDb, [makeBill({ id: 'HB0001', session: '2026GS' })])

      const result = getBillsBySession('2026GS')
      expect(result[0]?.voteResult).toBeUndefined()
      expect(result[0]?.voteDate).toBeUndefined()
    })
  })

  // ── getActiveSessionId ───────────────────────────────────────────────────

  describe('getActiveSessionId', () => {
    it('returns a non-empty string session ID', () => {
      const result = getActiveSessionId()
      expect(result).toBeTypeOf('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  // ── searchBillsByTheme (deprecated — use searchBills) ───────────────────
  // Note: THEME_QUERIES synonym expansion removed in Story 3.7. Function now
  // passes the raw theme term directly to FTS5. Tests reflect simplified behavior.

  describe('searchBillsByTheme', () => {
    it('returns empty array when cache is empty', () => {
      const result = searchBillsByTheme('leg-001', 'healthcare')
      expect(result).toEqual([])
    })

    it('returns matching bills when theme term appears in title or summary', () => {
      const bill = makeBill({
        id: 'HB0042',
        title: 'Healthcare Reform Act',
        summary: 'Expands access to healthcare services statewide',
        sponsorId: 'leg-001',
      })
      writeBills(testDb, [bill])
      const result = searchBillsByTheme('leg-001', 'healthcare')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0042')
    })

    it('does not return bills for a different sponsor', () => {
      const bill = makeBill({
        id: 'HB0042',
        title: 'Healthcare Reform Act',
        summary: 'Expands healthcare access',
        sponsorId: 'leg-001',
      })
      writeBills(testDb, [bill])
      const result = searchBillsByTheme('leg-002', 'healthcare')
      expect(result).toEqual([])
    })

    it('raw term — transportation matches transportation in summary', () => {
      const bill = makeBill({
        id: 'HB0014',
        title: 'Infrastructure Act',
        summary: 'Funds public transportation improvements statewide',
        sponsorId: 'leg-001',
      })
      writeBills(testDb, [bill])
      const result = searchBillsByTheme('leg-001', 'transportation')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0014')
    })

    it('empty string theme returns empty array without throwing', () => {
      expect(searchBillsByTheme('leg-001', '').length).toBe(0)
    })

    it('whitespace-only theme returns empty array without throwing', () => {
      expect(searchBillsByTheme('leg-001', '   ').length).toBe(0)
    })

    it('malformed FTS5 input returns empty array instead of throwing', () => {
      expect(searchBillsByTheme('leg-001', 'OR').length).toBe(0)
      expect(searchBillsByTheme('leg-001', '"unclosed').length).toBe(0)
      expect(searchBillsByTheme('leg-001', '*').length).toBe(0)
    })

    it('returns only bills matching theme, not all sponsor bills', () => {
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
      writeBills(testDb, [healthcareBill, transportBill])
      const result = searchBillsByTheme('leg-001', 'healthcare')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('HB0015')
    })
  })

  // ── searchBills ──────────────────────────────────────────────────────────

  describe('searchBills', () => {
    it('returns all bills (paginated) when no params provided', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'SB0001', session: '2025GS' }),
      ])

      const result = searchBills({})
      expect(result.total).toBe(3)
      expect(result.bills).toHaveLength(3)
      expect(result.offset).toBe(0)
    })

    it('filters by sponsorId', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-002' }),
        makeBill({ id: 'HB0003', sponsorId: 'leg-001' }),
      ])

      const result = searchBills({ sponsorId: 'leg-001' })
      expect(result.total).toBe(2)
      expect(result.bills.every((b) => b.sponsorId === 'leg-001')).toBe(true)
    })

    it('filters by floorSponsorId', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001', floorSponsorId: 'HARPEWA' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-002' }), // no floor sponsor
        makeBill({ id: 'SB0001', sponsorId: 'leg-003', floorSponsorId: 'HARPEWA' }),
      ])

      const result = searchBills({ floorSponsorId: 'HARPEWA' })
      expect(result.total).toBe(2)
      expect(result.bills.every((b) => b.floorSponsorId === 'HARPEWA')).toBe(true)
    })

    it('filters by session', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2025GS' }),
      ])

      const result = searchBills({ session: '2026GS' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.session).toBe('2026GS')
    })

    it('filters chamber: house returns only H-prefix bills', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001' }),
        makeBill({ id: 'HB0002' }),
        makeBill({ id: 'SB0001' }),
        makeBill({ id: 'SR0001' }),
      ])

      const result = searchBills({ chamber: 'house' })
      expect(result.bills.every((b) => b.id.startsWith('H'))).toBe(true)
      expect(result.total).toBe(2)
    })

    it('filters chamber: senate returns only S-prefix bills', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001' }),
        makeBill({ id: 'SB0001' }),
        makeBill({ id: 'SJR0001' }),
      ])

      const result = searchBills({ chamber: 'senate' })
      expect(result.bills.every((b) => b.id.startsWith('S'))).toBe(true)
      expect(result.total).toBe(2)
    })

    it('filters by query using FTS5 — matches titles', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', title: 'Healthcare Reform Act', summary: 'Expands coverage' }),
        makeBill({ id: 'HB0002', title: 'Transportation Infrastructure', summary: 'Funds roads' }),
      ])

      const result = searchBills({ query: 'Healthcare' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HB0001')
    })

    it('empty query string falls through to table scan (does not throw SQLite error)', () => {
      writeBills(testDb, [makeBill({ id: 'HB0001' })])

      expect(() => searchBills({ query: '' })).not.toThrow()
      const result = searchBills({ query: '' })
      expect(result.total).toBe(1)
    })

    it('count + offset pagination: page 2 of size 2 from 5 bills', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
        makeBill({ id: 'HB0004', session: '2026GS' }),
        makeBill({ id: 'HB0005', session: '2026GS' }),
      ])

      const result = searchBills({ count: 2, offset: 2, session: '2026GS' })
      expect(result.bills).toHaveLength(2)
      expect(result.offset).toBe(2)
      expect(result.count).toBe(2)
      // total is 5 (all matching rows, not just the page)
      expect(result.total).toBe(5)
    })

    it('total field reflects full count, not just page size', () => {
      writeBills(testDb, [
        makeBill({ id: 'HB0001', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0002', sponsorId: 'leg-001' }),
        makeBill({ id: 'HB0003', sponsorId: 'leg-001' }),
      ])

      const result = searchBills({ sponsorId: 'leg-001', count: 1, offset: 0 })
      expect(result.total).toBe(3)
      expect(result.bills).toHaveLength(1)
    })

    it('returns empty result (not error) when no bills match', () => {
      const result = searchBills({ sponsorId: 'nobody' })
      expect(result.bills).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ── parseBillId (via searchBills) ────────────────────────────────────────

  describe('parseBillId (via searchBills)', () => {
    it('"HB88" matches stored "HB0088" via integer comparison', () => {
      writeBills(testDb, [makeBill({ id: 'HB0088' })])

      const result = searchBills({ billId: 'HB88' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HB0088')
    })

    it('"HB0088" matches stored "HB0088"', () => {
      writeBills(testDb, [makeBill({ id: 'HB0088' })])

      const result = searchBills({ billId: 'HB0088' })
      expect(result.total).toBe(1)
    })

    it('"hb88" (lowercase) matches stored "HB0088" — case-normalized', () => {
      writeBills(testDb, [makeBill({ id: 'HB0088' })])

      const result = searchBills({ billId: 'hb88' })
      expect(result.total).toBe(1)
    })

    it('"HJR01" matches stored "HJR0001"', () => {
      writeBills(testDb, [makeBill({ id: 'HJR0001' })])

      const result = searchBills({ billId: 'HJR01' })
      expect(result.total).toBe(1)
      expect(result.bills[0]?.id).toBe('HJR0001')
    })

    it('unrecognized format (no digits) falls back to exact match — returns nothing for "HB"', () => {
      writeBills(testDb, [makeBill({ id: 'HB0001' })])

      const result = searchBills({ billId: 'HB' })
      // "HB" has no digits → exact match fallback → no row with id = "HB"
      expect(result.total).toBe(0)
    })
  })

})
