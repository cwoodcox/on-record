// apps/mcp-server/src/cache/refresh.test.ts
// Tests for warmUpLegislatorsCache, scheduleLegislatorsRefresh, warmUpBillsCache, scheduleBillsRefresh.
// Uses env.DB from cloudflare:test — real Miniflare D1 binding.
// Cron mocks remain (node-cron callback capture) — logger mocks remain.
// Date control in warmUpBillsCache tests uses vi.setSystemTime (controls new Date()
// inside getSessionsForRefresh, which warmUpBillsCache calls without an explicit now param).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { env } from 'cloudflare:test'
import { applySchema } from './schema.js'
import { seedSessions } from './sessions.js'
import type { LegislatureDataProvider } from '../providers/types.js'
import type { Legislator, Bill, BillDetail } from '@on-record/types'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Capture cron callbacks so scheduler tests can fire them directly without relying on
// wall-clock timers. lastScheduleCallback holds the most recently registered callback.
let lastScheduleCallback: (() => void) | undefined

vi.mock('node-cron', () => ({
  schedule: vi.fn((_expression: string, callback: () => void) => {
    lastScheduleCallback = callback
  }),
}))

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { warmUpLegislatorsCache, scheduleLegislatorsRefresh, warmUpBillsCache, scheduleBillsRefresh } from './refresh.js'
import { logger } from '../lib/logger.js'

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

// ── scheduleLegislatorsRefresh ────────────────────────────────────────────────

describe('scheduleLegislatorsRefresh', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    lastScheduleCallback = undefined
    await env.DB.prepare('DELETE FROM legislators').run()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not throw when called', () => {
    const provider = makeProvider()
    expect(() => scheduleLegislatorsRefresh(env.DB, provider)).not.toThrow()
  })

  it('does not invoke provider at registration time (lazy — only fires on cron)', () => {
    // Provider should not be called at registration time (only at cron fire time)
    const provider = makeProvider()
    scheduleLegislatorsRefresh(env.DB, provider)

    expect(provider.getLegislatorsByDistrict).not.toHaveBeenCalled()
  })

  it('logs error with source legislature-api when cron fires and refresh fails', async () => {
    const errorLogger = vi.mocked(logger.error)

    const failingProvider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn().mockRejectedValue(new Error('network error')),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    scheduleLegislatorsRefresh(env.DB, failingProvider)
    expect(lastScheduleCallback).toBeDefined()

    // Fire the captured cron callback directly — this is what node-cron would invoke at 6 AM.
    // The callback is synchronous and starts an async .catch() chain.
    lastScheduleCallback!()
    await vi.runAllTimersAsync()

    expect(errorLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api' }),
      'Legislator cache refresh failed',
    )
  })

  it('logs info with source cache when cron fires and refresh succeeds', async () => {
    const infoLogger = vi.mocked(logger.info)
    const provider = makeProvider([])

    scheduleLegislatorsRefresh(env.DB, provider)
    expect(lastScheduleCallback).toBeDefined()

    // Fire the captured cron callback and flush the async .then() chain.
    lastScheduleCallback!()
    await vi.runAllTimersAsync()

    expect(infoLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      'Legislators cache refreshed',
    )
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

// ── scheduleBillsRefresh ──────────────────────────────────────────────────────

describe('scheduleBillsRefresh', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    lastScheduleCallback = undefined
    await env.DB.prepare('DELETE FROM bills').run()
    await env.DB.prepare('DELETE FROM sessions').run()
    await seedSessions(env.DB)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not throw when called', () => {
    const provider = makeProvider()
    expect(() => scheduleBillsRefresh(env.DB, provider)).not.toThrow()
  })

  it('does not invoke provider at registration time (lazy — only fires on cron)', () => {
    const provider = makeProvider()
    scheduleBillsRefresh(env.DB, provider)

    // Provider should not be called at registration time (only at cron fire time)
    expect(provider.getBillsBySession).not.toHaveBeenCalled()
  })

  it('logs error with { source: legislature-api } when cron fires and refresh fails', async () => {
    const errorLogger = vi.mocked(logger.error)

    const failingProvider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockRejectedValue(new Error('network error')),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    scheduleBillsRefresh(env.DB, failingProvider)
    expect(lastScheduleCallback).toBeDefined()

    // Fire the captured cron callback directly — this is what node-cron would invoke at
    // the top of each hour. The callback is synchronous and starts an async .catch() chain.
    lastScheduleCallback!()
    await vi.runAllTimersAsync()

    expect(errorLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api' }),
      'Bills cache refresh failed',
    )
  })

  it('logs info with { source: cache } when cron fires and refresh succeeds', async () => {
    const infoLogger = vi.mocked(logger.info)
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockResolvedValue([makeBill()]),
      getBillDetail: vi.fn<(billId: string, session: string) => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    scheduleBillsRefresh(env.DB, provider)
    expect(lastScheduleCallback).toBeDefined()

    // Fire the captured cron callback and flush the async .then() chain.
    lastScheduleCallback!()
    await vi.runAllTimersAsync()

    expect(infoLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      'Bills cache refreshed',
    )
  })
})
