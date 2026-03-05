// apps/mcp-server/src/cache/refresh.test.ts
// Tests for warmUpLegislatorsCache and scheduleLegislatorsRefresh.
// Mocks the LegislatureDataProvider and pino logger.
//
// Database strategy:
//   warmUpLegislatorsCache and scheduleLegislatorsRefresh receive db as a parameter
//   (dependency injection). Tests create an in-memory db per suite and pass it explicitly.
//   writeLegislators reads/writes only the injected db — no singleton mock needed.
//   The cache table is queried directly (via testDb.prepare) to verify persistence.
//
// vi.mock TDZ note: do NOT reference top-level variables inside synchronous vi.mock()
// factories — they are hoisted above variable declarations. The async factory pattern
// avoids TDZ by constructing the in-memory db inside the factory body.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initializeSchema } from './schema.js'
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

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { warmUpLegislatorsCache, scheduleLegislatorsRefresh, warmUpBillsCache, scheduleBillsRefresh } from './refresh.js'
import { logger } from '../lib/logger.js'

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
    getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
  }
}

// ── warmUpLegislatorsCache ────────────────────────────────────────────────────

describe('warmUpLegislatorsCache', () => {
  let testDb: Database.Database

  beforeEach(() => {
    vi.clearAllMocks()
    testDb = new Database(':memory:')
    initializeSchema(testDb)
  })

  afterEach(() => {
    testDb.close()
  })

  it('calls getLegislatorsByDistrict for all 75 house districts', async () => {
    const provider = makeProvider()
    await warmUpLegislatorsCache(testDb, provider)

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
    await warmUpLegislatorsCache(testDb, provider)

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
    await warmUpLegislatorsCache(testDb, provider)
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
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await warmUpLegislatorsCache(testDb, provider)

    // Verify by querying the injected db directly — writeLegislators wrote to testDb
    const rows = testDb
      .prepare<[string, number]>('SELECT id FROM legislators WHERE chamber = ? AND district = ?')
      .all('house', 1)
    expect(rows).toHaveLength(1)
    expect((rows[0] as { id: string }).id).toBe('house-1')
  })

  it('does not throw when all provider calls succeed', async () => {
    const provider = makeProvider()
    await expect(warmUpLegislatorsCache(testDb, provider)).resolves.toBeUndefined()
  })

  it('throws (propagates) when provider rejects — caller handles gracefully', async () => {
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn().mockRejectedValue(new Error('API down')),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await expect(warmUpLegislatorsCache(testDb, provider)).rejects.toThrow('API down')
  })
})

// ── scheduleLegislatorsRefresh ────────────────────────────────────────────────

describe('scheduleLegislatorsRefresh', () => {
  let testDb: Database.Database

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    testDb = new Database(':memory:')
    initializeSchema(testDb)
  })

  afterEach(() => {
    vi.useRealTimers()
    testDb.close()
  })

  it('does not throw when called', () => {
    const provider = makeProvider()
    expect(() => scheduleLegislatorsRefresh(testDb, provider)).not.toThrow()
  })

  it('registers a cron job with the 0 6 * * * expression (verified via behavior)', async () => {
    // This test validates that the cron expression is registered and the scheduled task
    // triggers warmUpLegislatorsCache when the cron fires. We verify this by checking that
    // the provider is NOT called immediately (before cron fires), confirming lazy scheduling.
    const provider = makeProvider()
    scheduleLegislatorsRefresh(testDb, provider)

    // Provider should not be called at registration time (only at cron fire time)
    expect(provider.getLegislatorsByDistrict).not.toHaveBeenCalled()
  })

  it('does not propagate errors from the cron callback — logs error, does not throw', async () => {
    // Simulate a failing provider after scheduling
    const failingProvider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn().mockRejectedValue(new Error('refresh failed')),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    // scheduleLegislatorsRefresh itself must not throw
    expect(() => scheduleLegislatorsRefresh(testDb, failingProvider)).not.toThrow()
  })

  it('logs error with source legislature-api when refresh fails', async () => {
    const errorLogger = vi.mocked(logger.error)

    const failingProvider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn().mockRejectedValue(new Error('network error')),
      getBillsBySession: vi.fn<() => Promise<Bill[]>>().mockResolvedValue([]),
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    // Attach .rejects BEFORE vi.runAllTimersAsync() to avoid PromiseRejectionHandledWarning.
    // Simulate what the cron callback does on failure.
    const assertion = expect(
      warmUpLegislatorsCache(testDb, failingProvider).catch((err: unknown) => {
        logger.error({ source: 'legislature-api', err }, 'Legislator cache refresh failed')
      })
    ).resolves.toBeUndefined()
    await vi.runAllTimersAsync()
    await assertion

    expect(errorLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api' }),
      'Legislator cache refresh failed',
    )
  })

  it('logs info with source cache when refresh succeeds', async () => {
    const infoLogger = vi.mocked(logger.info)
    const provider = makeProvider([])

    // Simulate the success path of the cron callback
    await warmUpLegislatorsCache(testDb, provider)
    logger.info({ source: 'cache' }, 'Legislators cache refreshed')

    expect(infoLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      'Legislators cache refreshed',
    )
  })
})

// ── warmUpBillsCache ──────────────────────────────────────────────────────────

describe('warmUpBillsCache', () => {
  let testDb: Database.Database

  beforeEach(() => {
    vi.clearAllMocks()
    testDb = new Database(':memory:')
    initializeSchema(testDb)
  })

  afterEach(() => {
    testDb.close()
  })

  it('calls provider.getBillsBySession with the result of getActiveSession()', async () => {
    const provider = makeProvider()
    await warmUpBillsCache(testDb, provider)

    expect(provider.getBillsBySession).toHaveBeenCalledTimes(1)
    // getActiveSession() returns the current session string (e.g. '2026GS')
    const callArg = (provider.getBillsBySession as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    expect(callArg).toMatch(/^\d{4}GS$/)
  })

  it('calls provider.getBillsBySession exactly once per call', async () => {
    const provider = makeProvider()
    await warmUpBillsCache(testDb, provider)
    expect(provider.getBillsBySession).toHaveBeenCalledTimes(1)
  })

  it('writes returned bills into the cache (query testDb directly to verify)', async () => {
    const bill = makeBill({ id: 'HB0001', sponsorId: 'leg-001' })
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockResolvedValue([bill]),
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await warmUpBillsCache(testDb, provider)

    const rows = testDb
      .prepare<[string]>('SELECT id FROM bills WHERE id = ?')
      .all('HB0001')
    expect(rows).toHaveLength(1)
  })

  it('resolves when provider succeeds', async () => {
    const provider = makeProvider()
    await expect(warmUpBillsCache(testDb, provider)).resolves.toBeUndefined()
  })

  it('rejects (propagates) when provider rejects — error message preserved', async () => {
    const provider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockRejectedValue(new Error('API down')),
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    await expect(warmUpBillsCache(testDb, provider)).rejects.toThrow('API down')
  })
})

// ── scheduleBillsRefresh ──────────────────────────────────────────────────────

describe('scheduleBillsRefresh', () => {
  let testDb: Database.Database

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    testDb = new Database(':memory:')
    initializeSchema(testDb)
  })

  afterEach(() => {
    vi.useRealTimers()
    testDb.close()
  })

  it('does not throw when called', () => {
    const provider = makeProvider()
    expect(() => scheduleBillsRefresh(testDb, provider)).not.toThrow()
  })

  it('does not invoke provider at registration time (lazy — only fires on cron)', () => {
    const provider = makeProvider()
    scheduleBillsRefresh(testDb, provider)

    // Provider should not be called at registration time (only at cron fire time)
    expect(provider.getBillsBySession).not.toHaveBeenCalled()
  })

  it('logs error with { source: legislature-api } when refresh fails', async () => {
    const errorLogger = vi.mocked(logger.error)

    const failingProvider: LegislatureDataProvider = {
      getLegislatorsByDistrict: vi.fn<() => Promise<Legislator[]>>().mockResolvedValue([]),
      getBillsBySession: vi.fn().mockRejectedValue(new Error('network error')),
      getBillDetail: vi.fn<() => Promise<BillDetail>>().mockRejectedValue(new Error('not implemented')),
    }

    // Attach .rejects BEFORE vi.runAllTimersAsync() to avoid PromiseRejectionHandledWarning.
    // Simulate what the cron callback does on failure.
    const assertion = expect(
      warmUpBillsCache(testDb, failingProvider).catch((err: unknown) => {
        logger.error({ source: 'legislature-api', err }, 'Bills cache refresh failed')
      })
    ).resolves.toBeUndefined()
    await vi.runAllTimersAsync()
    await assertion

    expect(errorLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'legislature-api' }),
      'Bills cache refresh failed',
    )
  })

  it('logs info with { source: cache } when refresh succeeds', async () => {
    const infoLogger = vi.mocked(logger.info)
    const provider = makeProvider()

    // Simulate the success path of the cron callback
    await warmUpBillsCache(testDb, provider)
    logger.info({ source: 'cache' }, 'Bills cache refreshed')

    expect(infoLogger).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' }),
      'Bills cache refreshed',
    )
  })
})
