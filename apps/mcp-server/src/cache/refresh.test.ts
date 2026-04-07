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

import { warmUpLegislatorsCache, warmUpBillsCache } from './refresh.js'

// ── Schema (once for all tests) ───────────────────────────────────────────────

beforeAll(async () => {
  await applySchema(env.DB)
})

// ── Fixtures ─────────────────────────────────────────────────────────────────

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

  it('calls provider.getBillsBySession for active session when in session', async () => {
    const provider = makeProvider()
    await warmUpBillsCache(env.DB, provider)

    expect(provider.getBillsBySession).toHaveBeenCalledTimes(1)
    expect(provider.getBillsBySession).toHaveBeenCalledWith('2026GS')
  })

  it('fetches bills for 2 sessions when inter-session', async () => {
    vi.setSystemTime(new Date(2026, 5, 15)) // June 2026 — inter-session
    const provider = makeProvider()
    await warmUpBillsCache(env.DB, provider)

    expect(provider.getBillsBySession).toHaveBeenCalledTimes(2)
    expect(provider.getBillsBySession).toHaveBeenCalledWith('2026GS')
    expect(provider.getBillsBySession).toHaveBeenCalledWith('2025GS')
  })

  it('writes returned bills into the cache (query DB directly to verify)', async () => {
    const bill = makeBill({ id: 'HB0001', sponsorId: 'leg-001' })
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockResolvedValue([bill]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
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

  it('rejects (propagates) when provider rejects — error message preserved', async () => {
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockRejectedValue(new Error('API down')),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await expect(warmUpBillsCache(env.DB, provider)).rejects.toThrow('API down')
  })
})

