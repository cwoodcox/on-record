// apps/mcp-server/src/cache/bills.test.ts
// Tests for writeBills, getBillsBySponsor, getBillsBySession, getActiveSession using in-memory SQLite.
//
// Architecture:
//   - writeBills: receives db as a parameter — use in-memory db directly.
//   - getBillsBySponsor, getBillsBySession: use the db singleton from ./db.js — inject via vi.mock.
//   - getActiveSession: pure function (no db) — test with vi.setSystemTime to control date.
//
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
import type { Bill } from '@on-record/types'

// Create in-memory test DB before mock registration
const testDb = new Database(':memory:')
initializeSchema(testDb)

// Inject testDb as the `db` singleton before module under test is evaluated.
// Vitest hoists vi.mock() calls so the mock is in place when the module evaluates.
vi.mock('./db.js', () => ({ db: testDb }))

// Import after mock is registered — use dynamic import inside beforeAll to avoid
// TS1309 (top-level await not allowed in CommonJS modules).
import type {
  getBillsBySponsor as GetBySponsorFn,
  getBillsBySession as GetBySessionFn,
  writeBills as WriteFn,
  getActiveSession as GetActiveSessionFn,
} from './bills.js'
let getBillsBySponsor: typeof GetBySponsorFn
let getBillsBySession: typeof GetBySessionFn
let writeBills: typeof WriteFn
let getActiveSession: typeof GetActiveSessionFn

beforeAll(async () => {
  const mod = await import('./bills.js')
  getBillsBySponsor = mod.getBillsBySponsor
  getBillsBySession = mod.getBillsBySession
  writeBills = mod.writeBills
  getActiveSession = mod.getActiveSession
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
      expect(row?.cached_at).toBeTruthy()
      expect(new Date(row?.cached_at ?? '').toISOString()).toBeTruthy()
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

    it('clears prior bills for session before refresh — stale rows removed when upstream returns fewer bills', () => {
      // Simulate first refresh: 3 bills
      writeBills(testDb, [
        makeBill({ id: 'HB0001', session: '2026GS' }),
        makeBill({ id: 'HB0002', session: '2026GS' }),
        makeBill({ id: 'HB0003', session: '2026GS' }),
      ])
      // Simulate second refresh: upstream returns only 1 bill (HB0001 and HB0003 dropped)
      writeBills(testDb, [makeBill({ id: 'HB0002', session: '2026GS' })])

      const rows = testDb.prepare("SELECT id FROM bills WHERE session = '2026GS'").all()
      expect(rows).toHaveLength(1)
      expect((rows[0] as { id: string }).id).toBe('HB0002')
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

  // ── getActiveSession ─────────────────────────────────────────────────────

  describe('getActiveSession', () => {
    it('returns current year GS when month is January–March (month index < 3)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 1, 15)) // February 2026: month index 1 < 3
      try {
        expect(getActiveSession()).toBe('2026GS')
      } finally {
        vi.useRealTimers()
      }
    })

    it('returns prior year GS when month is April or later (month index >= 3)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 6, 15)) // July 2026: month index 6 >= 3
      try {
        expect(getActiveSession()).toBe('2025GS')
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
