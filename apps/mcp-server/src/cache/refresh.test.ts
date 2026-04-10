// apps/mcp-server/src/cache/refresh.test.ts
// Tests for warmUpLegislatorsCache and warmUpBillsCache.
// Uses env.DB from cloudflare:test — real Miniflare D1 binding.
// Date control in warmUpBillsCache tests uses vi.setSystemTime (controls new Date()
// inside getSessionsForRefresh, which warmUpBillsCache calls without an explicit now param).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'
import { applySchema } from './schema.js'
import { seedSessions } from './sessions.js'
import type { LegislatureDataProvider } from '../providers/types.js'
import type { Legislator, Bill, BillDetail } from '@on-record/types'

// ── Imports ───────────────────────────────────────────────────────────────────

import { warmUpLegislatorsCache, warmUpBillsCache, type BillRefreshConfig } from './refresh.js'

// ── Logger mock (needed for wall-time and error-path assertions) ──────────────
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))
import { logger } from '../lib/logger.js'

// ── Schema (once for all tests) ───────────────────────────────────────────────

beforeAll(async () => {
  await applySchema(env.DB)
})

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeLegislator(overrides: Partial<Legislator> = {}): Legislator {
  return {
    id: 'leg-001',
    chamber: 'house',
    district: 1,
    name: 'Jane Smith',
    email: 'jsmith@utah.gov',
    phone: '801-555-0100',
    phoneTypeUnknown: true,
    session: '2025GS',
    ...overrides,
  }
}

function makeProvider(
  legislators: Legislator[] = [makeLegislator()],
): LegislatureDataProvider {
  return {
    getLegislatorsByDistrict: vi.fn().mockResolvedValue(legislators),
    getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue([]),
    getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
    getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
  }
}

// ── warmUpLegislatorsCache ────────────────────────────────────────────────────

describe('warmUpLegislatorsCache', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await env.DB.prepare('DELETE FROM legislators').run()
  })

  it('calls getLegislatorsByDistrict for all 75 house districts', async () => {
    const provider = makeProvider()
    await warmUpLegislatorsCache(env.DB, provider)

    const houseDistricts = (provider.getLegislatorsByDistrict as ReturnType<typeof vi.fn>).mock.calls
      .filter((call) => call[0] === 'house')
      .map((call) => call[1] as number)

    expect(houseDistricts).toHaveLength(75)
    for (let d = 1; d <= 75; d++) {
      expect(houseDistricts).toContain(d)
    }
  })

  it('calls getLegislatorsByDistrict for all 29 senate districts', async () => {
    const provider = makeProvider()
    await warmUpLegislatorsCache(env.DB, provider)

    const senateDistricts = (provider.getLegislatorsByDistrict as ReturnType<typeof vi.fn>).mock.calls
      .filter((call) => call[0] === 'senate')
      .map((call) => call[1] as number)

    expect(senateDistricts).toHaveLength(29)
    for (let d = 1; d <= 29; d++) {
      expect(senateDistricts).toContain(d)
    }
  })

  it('makes 104 total calls (75 house + 29 senate)', async () => {
    const provider = makeProvider()
    await warmUpLegislatorsCache(env.DB, provider)
    expect(provider.getLegislatorsByDistrict).toHaveBeenCalledTimes(104)
  })

  it('writes flattened legislators into the cache', async () => {
    const houseRep = makeLegislator({ id: 'house-1', chamber: 'house', district: 1 })
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi
        .fn()
        .mockImplementation((chamber: 'house' | 'senate', district: number) => {
          if (chamber === 'house' && district === 1) {
            return Promise.resolve([houseRep])
          }
          return Promise.resolve([])
        }),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await warmUpLegislatorsCache(env.DB, provider)

    const result = await env.DB
      .prepare('SELECT id FROM legislators WHERE chamber = ? AND district = ?')
      .bind('house', 1)
      .all<{ id: string }>()
    expect(result.results).toHaveLength(1)
    expect(result.results[0]?.id).toBe('house-1')
  })

  it('does not throw when all provider calls succeed', async () => {
    const provider = makeProvider()
    await expect(warmUpLegislatorsCache(env.DB, provider)).resolves.toBeUndefined()
  })

  it('throws (propagates) when provider rejects — caller handles gracefully', async () => {
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn().mockRejectedValue(new Error('API down')),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await expect(warmUpLegislatorsCache(env.DB, provider)).rejects.toThrow('API down')
  })
})


// ── warmUpBillsCache ──────────────────────────────────────────────────────────

describe('warmUpBillsCache', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 1, 15)) // February 2026 — in session (2026GS: Jan 20 – Mar 6)
    vi.clearAllMocks()
    await env.DB.prepare('DELETE FROM sessions').run()
    await seedSessions(env.DB)
    await env.DB.prepare('DELETE FROM bills').run()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls provider.getBillStubsForSession for active session when in session', async () => {
    const provider = makeProvider()
    await warmUpBillsCache(env.DB, provider)

    expect(provider.getBillStubsForSession).toHaveBeenCalledTimes(1)
    expect(provider.getBillStubsForSession).toHaveBeenCalledWith('2026GS')
  })

  it('fetches bill stubs for 2 sessions when inter-session', async () => {
    vi.setSystemTime(new Date(2026, 5, 15)) // June 2026 — inter-session
    const provider = makeProvider()
    await warmUpBillsCache(env.DB, provider)

    expect(provider.getBillStubsForSession).toHaveBeenCalledTimes(2)
    expect(provider.getBillStubsForSession).toHaveBeenCalledWith('2026GS')
    expect(provider.getBillStubsForSession).toHaveBeenCalledWith('2025GS')
  })

  it('writes fetched bills into the cache (query DB directly to verify)', async () => {
    const detail: BillDetail = {
      id: 'HB0001',
      session: '2026GS',
      title: 'Test Bill',
      summary: 'A test bill for unit testing',
      status: 'enrolled',
      sponsorId: 'leg-001',
    }
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue(['HB0001']),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockResolvedValue(detail),
    }

    await warmUpBillsCache(env.DB, provider)

    const result = await env.DB
      .prepare('SELECT id FROM bills WHERE id = ?')
      .bind('HB0001')
      .all<{ id: string }>()
    expect(result.results).toHaveLength(1)
  })

  it('resolves with sessions array when provider succeeds', async () => {
    const provider = makeProvider()
    const sessions = await warmUpBillsCache(env.DB, provider)
    expect(sessions).toEqual(['2026GS'])
  })

  it('logs error and skips session when getBillStubsForSession throws — does not propagate', async () => {
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockRejectedValue(new Error('API down')),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    // Should not throw — skips the session and returns empty array
    const sessions = await warmUpBillsCache(env.DB, provider)
    expect(sessions).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      expect.stringContaining('fetch bill stubs'),
    )
  })

  it('skips getBillDetail calls when all bills are fresh (cached_at within TTL)', async () => {
    // Pre-seed a fresh bill
    const cachedAt = new Date(Date.now() - 100).toISOString() // 100ms ago — well within 1-hour TTL
    await env.DB.prepare(
      `INSERT OR REPLACE INTO bills (id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`
    ).bind('HB0001', '2026GS', 'Test Bill', 'Summary', 'enrolled', 'leg-001', cachedAt).run()

    const getBillDetail = vi.fn<(billId: string, session: string) => Promise<BillDetail>>()
      .mockRejectedValue(new Error('should not be called'))
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue(['HB0001']),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail,
    }

    const config: BillRefreshConfig = { staleSecondsInSession: 3600, staleSecondsOutOfSession: 86400 }
    await warmUpBillsCache(env.DB, provider, config)

    expect(getBillDetail).not.toHaveBeenCalled()
  })

  it('only fetches stale bills when some are fresh and some are stale', async () => {
    // Pre-seed HB0001 as fresh (100ms ago) — HB0002 is not in cache (stale/missing)
    const cachedAt = new Date(Date.now() - 100).toISOString()
    await env.DB.prepare(
      `INSERT OR REPLACE INTO bills (id, session, title, summary, status, sponsor_id, floor_sponsor_id, vote_result, vote_date, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`
    ).bind('HB0001', '2026GS', 'Test Bill 1', 'Summary 1', 'enrolled', 'leg-001', cachedAt).run()

    const detail2: BillDetail = {
      id: 'HB0002',
      session: '2026GS',
      title: 'Test Bill 2',
      summary: 'Summary 2',
      status: 'enrolled',
      sponsorId: 'leg-001',
    }
    const getBillDetail = vi.fn<(billId: string, session: string) => Promise<BillDetail>>()
      .mockResolvedValue(detail2)
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue(['HB0001', 'HB0002']),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail,
    }

    const config: BillRefreshConfig = { staleSecondsInSession: 3600, staleSecondsOutOfSession: 86400 }
    await warmUpBillsCache(env.DB, provider, config)

    // Only HB0002 should be fetched
    expect(getBillDetail).toHaveBeenCalledTimes(1)
    expect(getBillDetail).toHaveBeenCalledWith('HB0002', '2026GS')
  })

  it('exits after first batch and writes fetched bills when wall-time budget expires', async () => {
    // 30 stale bills — two batches of 20/10. Wall-time expires before second batch.
    const staleIds = Array.from({ length: 30 }, (_, i) => `HB${String(i + 1).padStart(4, '0')}`)

    const getBillDetail = vi.fn<(billId: string, session: string) => Promise<BillDetail>>()
      .mockImplementation((billId, session) => Promise.resolve({
        id: billId,
        session,
        title: `Bill ${billId}`,
        summary: 'Summary',
        status: 'enrolled',
        sponsorId: 'leg-001',
      }))

    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillStubsForSession: vi.fn<() => Promise<string[]>>().mockResolvedValue(staleIds),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail,
    }

    // Manually advance time after first batch by mocking Date.now()
    // The wall-time check happens at the start of each batch loop iteration.
    // Strategy: use a real wall-time config of 3 seconds (3-2=1s limit).
    // Since vi.useFakeTimers is active, Date.now() won't auto-advance.
    // We advance time past the limit after the first batch fetch resolves.
    const batchSize = 20
    let callCount = 0
    const originalImpl = getBillDetail.getMockImplementation()!
    getBillDetail.mockImplementation(async (billId, session) => {
      callCount++
      if (callCount === batchSize) {
        // Advance fake time past the wall-time limit after the last call of the first batch
        vi.advanceTimersByTime(2000) // Advance 2s — past (3-2)*1000 = 1000ms limit
      }
      return originalImpl(billId, session)
    })

    const config: BillRefreshConfig = {
      staleSecondsInSession: 3600,
      staleSecondsOutOfSession: 86400,
      wallTimeSeconds: 3, // limit = (3-2)*1000 = 1000ms
    }

    const sessions = await warmUpBillsCache(env.DB, provider, config)

    // Should have stopped after first batch (20 bills)
    expect(getBillDetail).toHaveBeenCalledTimes(batchSize)
    expect(sessions).toEqual(['2026GS'])

    // First batch of bills should be written to D1
    const result = await env.DB
      .prepare('SELECT COUNT(*) as n FROM bills WHERE session = ?')
      .bind('2026GS')
      .first<{ n: number }>()
    expect(result?.n).toBe(batchSize)

    // Wall-time log message should contain 'wall-time budget'
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      expect.stringContaining('wall-time budget'),
    )
  })
})

